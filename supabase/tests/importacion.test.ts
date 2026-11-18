import { describe, it, expect } from 'vitest'
import { como, debeFallar } from './_db'

describe('importación desde Excel', () => {
  it('proveedores: crea, actualiza sin duplicar y reporta filas sin nombre', async () => {
    await como('lorenzo', async (c) => {
      const filas = [
        { fila: 2, nombre: 'Imp Proveedor Uno', telefono: '351 1', contacto: 'Ana' },
        { fila: 3, nombre: '', telefono: 'x' },
        { fila: 4, nombre: 'imp proveedor uno', contacto: 'Beto' },
      ]
      const r = (await c.query(`select public.importar_proveedores($1::jsonb) as r`, [JSON.stringify(filas)])).rows[0].r
      expect(r.creados).toBe(1)
      expect(r.actualizados).toBe(1)
      expect(r.errores).toEqual([{ fila: '3', nombre: '', mensaje: 'Falta el nombre.' }])
      const p = await c.query(`select telefono, contacto from public.proveedores where lower(nombre) = 'imp proveedor uno'`)
      expect(p.rows).toEqual([{ telefono: '351 1', contacto: 'Beto' }]) // el teléfono se conserva, el contacto se actualiza
    })
  })

  it('productos: crea con categoría, marca y proveedor por nombre, precio, stock inicial y vencimiento', async () => {
    await como('lorenzo', async (c) => {
      const filas = [
        { fila: 2, nombre: 'Imp Coca 2,25', categoria: 'Imp Gaseosas', marca: 'Imp Coca', proveedor: 'Imp Distri', unidad_venta: 'pack', unidades_por_bulto: 6, codigo: 'IMP001', stock_actual: 18, stock_minimo: 20, costo: 14200, margen_pct: 22, fecha_vencimiento: '2027-03-15' },
        { fila: 3, nombre: 'Imp Brahma lata', categoria: 'Imp Cervezas', unidad_venta: 'Pack', unidades_por_bulto: 24, codigo: 'IMP002', stock_actual: 42, stock_minimo: 20, costo: 26800, precio_venta: 35000 },
        { fila: 4, nombre: 'Imp sin precio', categoria: 'Imp Cervezas', costo: 100 },
        { fila: 5, nombre: 'Imp unidad rara', categoria: 'Imp Cervezas', unidad_venta: 'bolsa', costo: 100, margen_pct: 10 },
      ]
      const r = (await c.query(`select public.importar_productos($1::jsonb) as r`, [JSON.stringify(filas)])).rows[0].r
      expect(r.creados).toBe(2)
      expect(r.con_stock).toBe(2)
      expect(r.errores.map((e: { fila: string; mensaje: string }) => [e.fila, e.mensaje])).toEqual([
        ['4', 'Falta el % de ganancia o el precio de venta.'],
        ['5', 'Unidad de venta "bolsa" no válida (unidad, pack, caja o cajon).'],
      ])

      const coca = (await c.query(`select categoria, marca, proveedor, unidad_venta::text, unidades_por_bulto, codigo, stock_actual, stock_minimo, costo_actual::int, precio_venta::int, vence_proximo::text from public.v_productos where codigo = 'IMP001'`)).rows[0]
      expect(coca).toEqual({ categoria: 'Imp Gaseosas', marca: 'Imp Coca', proveedor: 'Imp Distri', unidad_venta: 'pack', unidades_por_bulto: 6, codigo: 'IMP001', stock_actual: 18, stock_minimo: 20, costo_actual: 14200, precio_venta: 17330, vence_proximo: '2027-03-15' })
      const brahma = (await c.query(`select precio_venta::int, precio_manual::int, stock_actual from public.v_productos where codigo = 'IMP002'`)).rows[0]
      expect(brahma).toEqual({ precio_venta: 35000, precio_manual: 35000, stock_actual: 42 })

      const movs = await c.query(`select tipo, cantidad, nota from public.v_movimientos_stock where producto_id = (select id from public.productos where codigo = 'IMP001')`)
      expect(movs.rows).toEqual([{ tipo: 'carga_inicial', cantidad: 18, nota: 'Carga inicial desde Excel' }])
      const hist = await c.query(`select motivo from public.precios_historial where producto_id = (select id from public.productos where codigo = 'IMP001') order by id desc limit 1`)
      expect(hist.rows[0].motivo).toBe('alta') // producto nuevo: el alta pisa el motivo de importación
    })
  })

  it('productos: volver a importar actualiza por código o nombre y no duplica el stock', async () => {
    await como('lorenzo', async (c) => {
      const base = { fila: 2, nombre: 'Imp Repetido', categoria: 'Imp Gaseosas', codigo: 'IMP900', stock_actual: 10, costo: 1000, margen_pct: 20 }
      await c.query(`select public.importar_productos($1::jsonb)`, [JSON.stringify([base])])
      // Misma planilla otra vez, con el costo cambiado y el nombre con otras mayúsculas.
      const r = (await c.query(`select public.importar_productos($1::jsonb) as r`, [JSON.stringify([{ ...base, nombre: 'IMP REPETIDO', costo: 1100, stock_actual: 99 }])])).rows[0].r
      expect(r).toMatchObject({ creados: 0, actualizados: 1, con_stock: 0, stock_saltado: 1 })
      const p = await c.query(`select count(*)::int as n from public.productos where codigo = 'IMP900'`)
      expect(p.rows[0].n).toBe(1)
      const v = (await c.query(`select stock_actual, costo_actual::int, nombre from public.v_productos where codigo = 'IMP900'`)).rows[0]
      expect(v).toEqual({ stock_actual: 10, costo_actual: 1100, nombre: 'IMP REPETIDO' })
      // Sin código, por nombre.
      const r2 = (await c.query(`select public.importar_productos($1::jsonb) as r`, [JSON.stringify([{ fila: 2, nombre: 'imp repetido', costo: 1200, margen_pct: 20 }])])).rows[0].r
      expect(r2.actualizados).toBe(1)
    })
  })

  it('clientes: crea con saldo inicial vencido según "debe desde" y el plazo configurado; no duplica', async () => {
    await como('lorenzo', async (c) => {
      const filas = [
        { fila: 2, nombre: 'Imp Kiosco', telefono: '351 555', direccion: 'Calle 1', zona: 'Imp Zona', saldo: 186000, debe_desde: '2026-11-01' },
        { fila: 3, nombre: 'Imp Al día', zona: 'Imp Zona', saldo: 0 },
        { fila: 4, nombre: '   ', saldo: 5 },
      ]
      const r = (await c.query(`select public.importar_clientes($1::jsonb) as r`, [JSON.stringify(filas)])).rows[0].r
      expect(r).toMatchObject({ creados: 2, actualizados: 0, con_saldo: 1 })
      expect(r.errores).toHaveLength(1)

      const k = (await c.query(`select saldo::int, vence_el::text, estado, zona from public.v_clientes where nombre = 'Imp Kiosco'`)).rows[0]
      expect(k.saldo).toBe(186000)
      expect(k.vence_el).toBe('2026-11-08') // debe desde 01/11 + 7 días de plazo
      expect(k.estado).toBe('vencida')
      expect(k.zona).toBe('Imp Zona')
      const mov = await c.query(`select tipo, importe::int, nota from public.v_cc_movimientos where cliente_id = (select id from public.clientes where nombre = 'Imp Kiosco')`)
      expect(mov.rows).toEqual([{ tipo: 'saldo_inicial', importe: 186000, nota: 'Saldo inicial del sistema anterior' }])

      // Otra vez: actualiza datos y no vuelve a cargar el saldo.
      const r2 = (await c.query(`select public.importar_clientes($1::jsonb) as r`, [JSON.stringify([{ fila: 2, nombre: 'imp kiosco', telefono: '351 999', saldo: 186000 }])])).rows[0].r
      expect(r2).toMatchObject({ creados: 0, actualizados: 1, con_saldo: 0, saldo_saltado: 1 })
      expect((await c.query(`select saldo::int, telefono from public.v_clientes where nombre = 'Imp Kiosco'`)).rows[0]).toEqual({ saldo: 186000, telefono: '351 999' })
    })
  })

  it('solo el superusuario importa', async () => {
    await como('lorena', async (c) => {
      await debeFallar(c, 'Solo el superusuario', `select public.importar_productos('[]'::jsonb)`)
      await debeFallar(c, 'Solo el superusuario', `select public.importar_clientes('[]'::jsonb)`)
      await debeFallar(c, 'Solo el superusuario', `select public.importar_proveedores('[]'::jsonb)`)
    })
    await como('thiago', async (c) => {
      await debeFallar(c, 'Solo el superusuario', `select public.importar_productos('[]'::jsonb)`)
      await debeFallar(c, 'permission denied', `select public.importar_buscar_o_crear('categorias', 'x')`)
    })
  })
})
