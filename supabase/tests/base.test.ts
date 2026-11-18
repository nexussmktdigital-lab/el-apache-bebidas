import { describe, it, expect } from 'vitest'
import { como, debeFallar, USUARIOS } from './_db'

describe('perfiles y roles', () => {
  it('el alta en auth.users crea el perfil con el rol indicado', async () => {
    await como('servidor', async (c) => {
      const r = await c.query(`select nombre, rol::text, activo from public.perfiles order by nombre`)
      expect(r.rows).toEqual([
        { nombre: 'Ex empleado', rol: 'administracion', activo: false },
        { nombre: 'Lorena', rol: 'administracion', activo: true },
        { nombre: 'Lorenzo', rol: 'superusuario', activo: true },
        { nombre: 'Thiago', rol: 'reparto', activo: true },
      ])
    })
  })

  it('un usuario sin rol válido en los metadatos queda como reparto', async () => {
    await como('servidor', async (c) => {
      await c.query(`insert into auth.users (email, raw_user_meta_data) values ('x@pruebas.local', '{"rol":"gerente"}')`)
      const r = await c.query(`select rol::text, nombre from public.perfiles where nombre = 'x'`)
      expect(r.rows[0]).toEqual({ rol: 'reparto', nombre: 'x' })
    })
  })

  it('auth_rol() y ve_costos() responden según el usuario', async () => {
    const casos: Array<[keyof typeof USUARIOS, string | null, boolean]> = [
      ['lorenzo', 'superusuario', true],
      ['lorena', 'administracion', true],
      ['thiago', 'reparto', false],
      ['inactivo', null, false],
    ]
    for (const [u, rol, costos] of casos) {
      await como(u, async (c) => {
        const r = await c.query(`select public.auth_rol()::text as rol, public.ve_costos() as costos`)
        expect(r.rows[0], u).toEqual({ rol, costos })
      })
    }
  })

  it('un anónimo no lee perfiles ni configuración', async () => {
    await como('anon', async (c) => {
      await debeFallar(c, 'permission denied', `select * from public.perfiles`)
      await debeFallar(c, 'permission denied', `select * from public.configuracion`)
    })
  })

  it('un usuario desactivado no lee la configuración ni los perfiles ajenos', async () => {
    await como('inactivo', async (c) => {
      const conf = await c.query(`select * from public.configuracion`)
      expect(conf.rowCount).toBe(0)
      const perfiles = await c.query(`select id from public.perfiles`)
      expect(perfiles.rows.map((r) => r.id)).toEqual([USUARIOS.inactivo])
    })
  })
})

describe('permisos sobre perfiles', () => {
  it('Thiago puede cambiar su nombre pero no su rol ni el de otros', async () => {
    await como('thiago', async (c) => {
      const ok = await c.query(`update public.perfiles set nombre = 'Thiago R.' where id = $1 returning nombre`, [USUARIOS.thiago])
      expect(ok.rows[0].nombre).toBe('Thiago R.')

      // Intento de auto-ascenso: la política with check lo rechaza.
      await debeFallar(c, 'row-level security', `update public.perfiles set rol = 'superusuario' where id = $1`, [USUARIOS.thiago])

      // Otro usuario: la fila no es visible para update, así que afecta 0 filas.
      const otro = await c.query(`update public.perfiles set nombre = 'Hackeado' where id = $1`, [USUARIOS.lorenzo])
      expect(otro.rowCount).toBe(0)
    })
  })

  it('Lorenzo puede cambiar el rol y desactivar usuarios', async () => {
    await como('lorenzo', async (c) => {
      const r = await c.query(
        `update public.perfiles set rol = 'administracion', activo = false where id = $1 returning rol::text, activo`,
        [USUARIOS.thiago],
      )
      expect(r.rows[0]).toEqual({ rol: 'administracion', activo: false })
    })
  })
})

describe('configuración', () => {
  it('todos los activos la leen; solo el superusuario la cambia', async () => {
    await como('thiago', async (c) => {
      const r = await c.query(`select plazo_cc_dias, redondeo_precio from public.configuracion`)
      expect(r.rows[0]).toEqual({ plazo_cc_dias: 15, redondeo_precio: 10 })
      const upd = await c.query(`update public.configuracion set plazo_cc_dias = 30`)
      expect(upd.rowCount).toBe(0)
    })
    await como('lorenzo', async (c) => {
      const upd = await c.query(`update public.configuracion set plazo_cc_dias = 30 returning plazo_cc_dias`)
      expect(upd.rows[0].plazo_cc_dias).toBe(30)
    })
  })

  it('no acepta una segunda fila ni valores fuera de rango', async () => {
    await como('servidor', async (c) => {
      await debeFallar(c, 'check', `insert into public.configuracion (id) values (false)`)
      await debeFallar(c, 'check', `update public.configuracion set redondeo_precio = 7`)
    })
  })
})

describe('auditoría', () => {
  it('registra quién cambió qué y solo la lee el superusuario', async () => {
    await como('lorena', async (c) => {
      await c.query(`update public.perfiles set nombre = 'Lorena G.' where id = $1`, [USUARIOS.lorena])
      // Lorena no es superusuario: no ve la auditoría.
      const propia = await c.query(`select * from public.auditoria`)
      expect(propia.rowCount).toBe(0)
      // Pero quedó registrada (lo vemos como servidor dentro de la misma transacción).
      await c.query('reset role')
      const r = await c.query(
        `select usuario_id, tabla, accion, antes ->> 'nombre' as antes, despues ->> 'nombre' as despues
         from public.auditoria where tabla = 'perfiles' order by id desc limit 1`,
      )
      expect(r.rows[0]).toEqual({ usuario_id: USUARIOS.lorena, tabla: 'perfiles', accion: 'update', antes: 'Lorena', despues: 'Lorena G.' })
    })
  })

  it('el superusuario ve la auditoría con el nombre del usuario y nadie la borra', async () => {
    await como('lorenzo', async (c) => {
      await c.query(`update public.configuracion set telefono = '351 123'`)
      const r = await c.query(`select usuario, tabla, accion from public.v_auditoria order by id desc limit 1`)
      expect(r.rows[0]).toEqual({ usuario: 'Lorenzo', tabla: 'configuracion', accion: 'update' })
      await debeFallar(c, 'permission denied', `delete from public.auditoria`)
      await debeFallar(c, 'permission denied', `insert into public.auditoria (tabla, registro_id, accion) values ('x', '1', 'insert')`)
    })
  })

  it('un update sin cambios reales no genera fila de auditoría', async () => {
    await como('lorenzo', async (c) => {
      const antes = await c.query(`select count(*)::int as n from public.auditoria`)
      await c.query(`update public.perfiles set nombre = nombre where id = $1`, [USUARIOS.lorenzo])
      const despues = await c.query(`select count(*)::int as n from public.auditoria`)
      expect(despues.rows[0].n).toBe(antes.rows[0].n)
    })
  })
})

describe('fechas del negocio', () => {
  it('fecha_ar corta el día en hora de Córdoba (UTC-3)', async () => {
    await como('servidor', async (c) => {
      const r = await c.query(
        `select public.fecha_ar('2026-12-01 02:30:00+00')::text as madrugada,
                public.fecha_ar('2026-12-01 03:00:00+00')::text as tres_utc`,
      )
      // A las 02:30 UTC todavía es 30 de noviembre en Córdoba; a las 03:00 ya es 1 de diciembre.
      expect(r.rows[0]).toEqual({ madrugada: '2026-11-30', tres_utc: '2026-12-01' })
    })
  })
})
