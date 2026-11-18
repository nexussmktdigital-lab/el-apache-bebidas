import { describe, it, expect, beforeAll } from 'vitest'
import type { Client } from 'pg'
import { como, comoYGuardar, cambiarUsuario, debeFallar } from './_db'

let catId: string
let clienteId: string
let clienteInactivo: string

async function producto(c: Client, nombre: string, costo: number, margen: number, stock: number, vence: string | null = null): Promise<string> {
  const r = await c.query(`select public.guardar_producto($1::jsonb) as id`, [
    JSON.stringify({ nombre, categoria_id: catId, costo_actual: costo, margen_pct: margen }),
  ])
  const id = r.rows[0].id as string
  if (stock > 0) await c.query(`select public.cargar_stock_inicial($1, $2, null, $3)`, [id, stock, vence])
  return id
}

async function vender(c: Client, items: Array<{ producto_id: string; cantidad: number }>, forma = 'efectivo', cliente_id: string | null = null, nota = ''): Promise<string> {
  const r = await c.query(`select public.confirmar_venta($1::jsonb) as id`, [JSON.stringify({ items, forma_pago: forma, cliente_id, nota })])
  return r.rows[0].id
}

async function venta(c: Client, id: string) {
  const r = await c.query(
    `select numero, cliente, forma_pago::text, estado::text, total::int, costo_total::int, ganancia::int, items, detalle, usuario, vence_el::text, motivo_anulacion
     from public.v_ventas where id = $1`,
    [id],
  )
  return r.rows[0]
}

async function stockDe(c: Client, id: string): Promise<number> {
  return (await c.query(`select stock_actual from public.productos where id = $1`, [id])).rows[0].stock_actual
}

async function cliente(c: Client, id: string) {
  const r = await c.query(`select nombre, saldo::int, vence_el::text, dias, estado from public.v_clientes where id = $1`, [id])
  return r.rows[0]
}

beforeAll(async () => {
  await comoYGuardar('lorena', async (c) => {
    catId = (await c.query(`insert into public.categorias (nombre) values ('Ventas pruebas') returning id`)).rows[0].id
    clienteId = (
      await c.query(`insert into public.clientes (nombre, telefono, zona) values ('Kiosco El Trébol', '351 555-1234', 'Alta Córdoba') returning id`)
    ).rows[0].id
    clienteInactivo = (await c.query(`insert into public.clientes (nombre, activo) values ('Cerrado', false) returning id`)).rows[0].id
  })
})

describe('confirmar venta', () => {
  it('una venta de mostrador guarda precio y costo del momento, descuenta stock y deja movimientos', async () => {
    await como('lorena', async (c) => {
      const coca = await producto(c, 'Coca venta', 14200, 22, 20) // precio 17320
      const agua = await producto(c, 'Agua venta', 5400, 30, 10) // precio 7020

      // Thiago puede vender aunque no vea costos.
      await cambiarUsuario(c, 'thiago')
      const id = await vender(c, [{ producto_id: coca, cantidad: 2 }, { producto_id: agua, cantidad: 1 }])

      const v = await venta(c, id)
      expect(v).toMatchObject({ cliente: null, forma_pago: 'efectivo', estado: 'confirmada', total: 2 * 17320 + 7020, items: 2, usuario: 'Thiago', vence_el: null })
      expect(v.detalle).toContain('2 x Coca venta')
      // Sin permiso de costos: la vista no le muestra costo ni ganancia.
      expect(v.costo_total).toBeNull()
      expect(v.ganancia).toBeNull()

      expect(await stockDe(c, coca)).toBe(18)
      expect(await stockDe(c, agua)).toBe(9)

      const items = await c.query(`select descripcion, unidad, cantidad, precio_unitario::int, subtotal::int from public.venta_items where venta_id = $1 order by descripcion`, [id])
      expect(items.rows).toEqual([
        { descripcion: 'Agua venta', unidad: 'unidad', cantidad: 1, precio_unitario: 7020, subtotal: 7020 },
        { descripcion: 'Coca venta', unidad: 'unidad', cantidad: 2, precio_unitario: 17320, subtotal: 34640 },
      ])
      expect((await c.query(`select * from public.venta_item_costos`)).rowCount).toBe(0)
      expect((await c.query(`select * from public.v_movimientos_stock where referencia_id = $1`, [id])).rowCount).toBe(0) // Thiago no ve movimientos
    })
  })

  it('quien ve costos ve el costo y la ganancia de la venta, y los movimientos quedaron con la venta como referencia', async () => {
    await como('lorena', async (c) => {
      const p = await producto(c, 'Con costo', 10000, 50, 5) // precio 15000
      const id = await vender(c, [{ producto_id: p, cantidad: 3 }])
      const v = await venta(c, id)
      expect(v.total).toBe(45000)
      expect(v.costo_total).toBe(30000)
      expect(v.ganancia).toBe(15000)
      const movs = await c.query(`select tipo, cantidad from public.v_movimientos_stock where referencia_id = $1`, [id])
      expect(movs.rows).toEqual([{ tipo: 'venta', cantidad: -3 }])
    })
  })

  it('si después cambia el precio o el costo, la venta no cambia', async () => {
    await como('lorena', async (c) => {
      const p = await producto(c, 'Congelado', 1000, 20, 5) // 1200
      const id = await vender(c, [{ producto_id: p, cantidad: 1 }])
      await c.query(`update public.producto_costos set costo_actual = 5000, precio_manual = 9000 where producto_id = $1`, [p])
      const v = await venta(c, id)
      expect(v.total).toBe(1200)
      expect(v.costo_total).toBe(1000)
    })
  })

  it('descuenta primero lo que vence antes', async () => {
    await como('lorena', async (c) => {
      const p = await producto(c, 'FEFO venta', 100, 10, 0)
      await c.query(`select public.cargar_stock_inicial($1, 5, null, '2027-06-01')`, [p])
      await c.query(`select public.cargar_stock_inicial($1, 3, null, '2026-12-15')`, [p])
      const id = await vender(c, [{ producto_id: p, cantidad: 4 }])
      const movs = await c.query(`select cantidad, lote_vence::text from public.v_movimientos_stock where referencia_id = $1 order by id`, [id])
      expect(movs.rows).toEqual([
        { cantidad: -3, lote_vence: '2026-12-15' },
        { cantidad: -1, lote_vence: '2027-06-01' },
      ])
    })
  })

  it('si falta stock de un producto, no se guarda nada de la venta', async () => {
    await como('lorena', async (c) => {
      const ok = await producto(c, 'Hay', 100, 10, 10)
      const poco = await producto(c, 'No hay', 100, 10, 1)
      const antes = (await c.query(`select count(*)::int as n from public.ventas`)).rows[0].n
      await debeFallar(c, 'No alcanza el stock de No hay', `select public.confirmar_venta($1::jsonb)`, [
        JSON.stringify({ forma_pago: 'efectivo', items: [{ producto_id: ok, cantidad: 5 }, { producto_id: poco, cantidad: 2 }] }),
      ])
      expect((await c.query(`select count(*)::int as n from public.ventas`)).rows[0].n).toBe(antes)
      expect(await stockDe(c, ok)).toBe(10) // el primero tampoco se descontó
      expect(await stockDe(c, poco)).toBe(1)
    })
  })

  it('valida lo básico: ítems, cantidades, producto activo, forma de pago', async () => {
    await como('lorena', async (c) => {
      const p = await producto(c, 'Validado', 100, 10, 10)
      await debeFallar(c, 'al menos un producto', `select public.confirmar_venta('{"forma_pago":"efectivo","items":[]}'::jsonb)`)
      await debeFallar(c, 'mayor a cero', `select public.confirmar_venta($1::jsonb)`, [JSON.stringify({ forma_pago: 'efectivo', items: [{ producto_id: p, cantidad: 0 }] })])
      await debeFallar(c, 'forma de pago', `select public.confirmar_venta($1::jsonb)`, [JSON.stringify({ forma_pago: 'tarjeta', items: [{ producto_id: p, cantidad: 1 }] })])
      await c.query(`update public.productos set activo = false where id = $1`, [p])
      await debeFallar(c, 'está desactivado', `select public.confirmar_venta($1::jsonb)`, [JSON.stringify({ forma_pago: 'efectivo', items: [{ producto_id: p, cantidad: 1 }] })])
    })
  })
})

describe('cuenta corriente', () => {
  it('cuenta corriente exige cliente activo y debita con vencimiento según la configuración', async () => {
    await como('lorena', async (c) => {
      const p = await producto(c, 'Fiado', 1000, 20, 10) // 1200
      await cambiarUsuario(c, 'thiago')
      await debeFallar(c, 'hay que elegir un cliente', `select public.confirmar_venta($1::jsonb)`, [
        JSON.stringify({ forma_pago: 'cuenta_corriente', items: [{ producto_id: p, cantidad: 1 }] }),
      ])
      await debeFallar(c, 'está desactivado', `select public.confirmar_venta($1::jsonb)`, [
        JSON.stringify({ forma_pago: 'cuenta_corriente', cliente_id: clienteInactivo, items: [{ producto_id: p, cantidad: 1 }] }),
      ])

      const id = await vender(c, [{ producto_id: p, cantidad: 3 }], 'cuenta_corriente', clienteId)
      const v = await venta(c, id)
      const en15 = (await c.query(`select (public.hoy_ar() + 15)::text as d`)).rows[0].d
      expect(v.cliente).toBe('Kiosco El Trébol')
      expect(v.vence_el).toBe(en15)

      const cl = await cliente(c, clienteId)
      expect(cl).toEqual({ nombre: 'Kiosco El Trébol', saldo: 3600, vence_el: en15, dias: 15, estado: 'al_dia' })

      const mov = await c.query(`select tipo, importe::int, venta_numero, vence_el::text, usuario from public.v_cc_movimientos where cliente_id = $1`, [clienteId])
      expect(mov.rows).toEqual([{ tipo: 'venta', importe: 3600, venta_numero: v.numero, vence_el: en15, usuario: 'Thiago' }])
    })
  })

  it('los pagos bajan el saldo y el vencimiento pasa a la deuda siguiente', async () => {
    await como('lorena', async (c) => {
      const p = await producto(c, 'Fiado 2', 1000, 0, 100) // 1000
      // Deuda vieja (vencida hace 3 días) cargada por administración, y una venta nueva de Thiago.
      await c.query(`select public.ajustar_cc($1, 10000, 'Saldo del sistema viejo', (public.hoy_ar() - 3)::date, true)`, [clienteId])
      await cambiarUsuario(c, 'thiago')
      const v2 = await vender(c, [{ producto_id: p, cantidad: 5 }], 'cuenta_corriente', clienteId) // 5000

      let cl = await cliente(c, clienteId)
      expect(cl.saldo).toBe(15000)
      expect(cl.estado).toBe('vencida')
      expect(cl.dias).toBe(-3)

      // Paga 4.000: sigue debiendo parte de la deuda vieja.
      await c.query(`select public.registrar_pago($1, 4000, 'efectivo', 'a cuenta')`, [clienteId])
      cl = await cliente(c, clienteId)
      expect(cl.saldo).toBe(11000)
      expect(cl.estado).toBe('vencida')

      // Paga 6.000 más: la vieja queda cubierta; el vencimiento pasa a la venta nueva.
      await c.query(`select public.registrar_pago($1, 6000, 'transferencia', '')`, [clienteId])
      cl = await cliente(c, clienteId)
      expect(cl.saldo).toBe(5000)
      const venceV2 = (await c.query(`select vence_el::text as d from public.ventas where id = $1`, [v2])).rows[0].d
      expect(cl.vence_el).toBe(venceV2)
      expect(cl.estado).toBe('al_dia')

      // Paga todo: queda al día sin vencimiento.
      await c.query(`select public.registrar_pago($1, 5000, 'efectivo', '')`, [clienteId])
      cl = await cliente(c, clienteId)
      expect(cl).toMatchObject({ saldo: 0, vence_el: null, dias: null, estado: 'al_dia' })

      const saldos = await c.query(`select tipo, importe::int, saldo_acumulado::int from public.v_cc_movimientos where cliente_id = $1 order by id`, [clienteId])
      expect(saldos.rows.at(-1)!.saldo_acumulado).toBe(0)
      expect(saldos.rows.map((r) => r.tipo)).toEqual(['saldo_inicial', 'venta', 'pago', 'pago', 'pago'])
    })
  })

  it('estado por vencer y vencida según el plazo de aviso', async () => {
    await como('lorena', async (c) => {
      const cl = (await c.query(`insert into public.clientes (nombre) values ('Moroso') returning id`)).rows[0].id
      await c.query(`select public.ajustar_cc($1, 20000, 'Saldo del sistema viejo', (public.hoy_ar() + 5)::date, true)`, [cl])
      expect((await cliente(c, cl)).estado).toBe('por_vencer') // vence en 5 días, aviso 7
      await cambiarUsuario(c, 'lorenzo')
      await c.query(`update public.configuracion set aviso_cc_dias = 2`)
      expect((await cliente(c, cl)).estado).toBe('al_dia')
      const cl2 = (await c.query(`insert into public.clientes (nombre) values ('Vencido') returning id`)).rows[0].id
      await c.query(`select public.ajustar_cc($1, 500, 'Deuda vieja', (public.hoy_ar() - 10)::date, true)`, [cl2])
      const estado = await cliente(c, cl2)
      expect(estado.estado).toBe('vencida')
      expect(estado.dias).toBe(-10)
    })
  })

  it('un pago no puede ser cero ni con tarjeta; la cuenta corriente no se toca directo', async () => {
    await como('lorena', async (c) => {
      await debeFallar(c, 'mayor a cero', `select public.registrar_pago($1, 0, 'efectivo', '')`, [clienteId])
      await debeFallar(c, 'efectivo o por transferencia', `select public.registrar_pago($1, 100, 'cuenta_corriente', '')`, [clienteId])
      await debeFallar(c, 'permission denied', `insert into public.cc_movimientos (cliente_id, tipo, importe) values ($1, 'pago', -100)`, [clienteId])
      await debeFallar(c, 'permission denied', `update public.cc_movimientos set importe = 1 where cliente_id = $1`, [clienteId])
      await debeFallar(c, 'motivo', `select public.ajustar_cc($1, -100, '')`, [clienteId])
    })
    await como('servidor', async (c) => {
      await debeFallar(c, 'se mueve con ventas, pagos y ajustes', `insert into public.cc_movimientos (cliente_id, tipo, importe) values ($1, 'pago', -100)`, [clienteId])
    })
  })
})

describe('anular venta', () => {
  it('devuelve el stock a los mismos lotes y revierte la cuenta corriente', async () => {
    await como('lorena', async (c) => {
      const p = await producto(c, 'Anulable', 100, 10, 0)
      await c.query(`select public.cargar_stock_inicial($1, 2, null, '2026-12-01')`, [p])
      await c.query(`select public.cargar_stock_inicial($1, 5, null, '2027-01-01')`, [p])
      const id = await vender(c, [{ producto_id: p, cantidad: 4 }], 'cuenta_corriente', clienteId)
      const saldoAntes = (await cliente(c, clienteId)).saldo
      expect(await stockDe(c, p)).toBe(3)

      await c.query(`select public.anular_venta($1, 'El cliente devolvió todo')`, [id])

      const v = await venta(c, id)
      expect(v.estado).toBe('anulada')
      expect(v.motivo_anulacion).toBe('El cliente devolvió todo')
      expect(await stockDe(c, p)).toBe(7)
      const lotes = await c.query(`select fecha_vencimiento::text as vence, cantidad_disponible as d from public.lotes where producto_id = $1 order by fecha_vencimiento`, [p])
      expect(lotes.rows).toEqual([{ vence: '2026-12-01', d: 2 }, { vence: '2027-01-01', d: 5 }])
      expect((await cliente(c, clienteId)).saldo).toBe(saldoAntes - 440)

      const movs = await c.query(`select tipo, cantidad from public.v_movimientos_stock where referencia_id = $1 order by id`, [id])
      expect(movs.rows).toEqual([
        { tipo: 'venta', cantidad: -2 },
        { tipo: 'venta', cantidad: -2 },
        { tipo: 'anulacion_venta', cantidad: 2 },
        { tipo: 'anulacion_venta', cantidad: 2 },
      ])

      await debeFallar(c, 'ya está anulada', `select public.anular_venta($1, 'otra vez')`, [id])
      await debeFallar(c, 'motivo', `select public.anular_venta($1, '  ')`, [id])
    })
  })

  it('las ventas anuladas no cuentan en el resumen del día', async () => {
    await como('lorena', async (c) => {
      const p = await producto(c, 'Resumen', 100, 100, 10) // precio 200
      const a = await vender(c, [{ producto_id: p, cantidad: 2 }])
      await vender(c, [{ producto_id: p, cantidad: 1 }])
      await c.query(`select public.anular_venta($1, 'error de carga')`, [a])
      const r = await c.query(`select ventas::int, costo::int, ganancia::int from public.v_ventas_por_dia where dia = public.hoy_ar()`)
      expect(r.rows[0].ventas).toBeGreaterThanOrEqual(200)
      const sumaConfirmadas = await c.query(`select coalesce(sum(total), 0)::int as t from public.ventas where estado = 'confirmada' and public.fecha_ar(fecha) = public.hoy_ar()`)
      expect(r.rows[0].ventas).toBe(sumaConfirmadas.rows[0].t)
    })
  })

  it('administración solo anula ventas del día; el superusuario, cualquiera; reparto, ninguna', async () => {
    await como('lorena', async (c) => {
      const p = await producto(c, 'Vieja', 100, 10, 10)
      const id = await vender(c, [{ producto_id: p, cantidad: 1 }])
      // Simulamos que la venta es de ayer (solo el dueño de la base puede tocar la fecha).
      await cambiarUsuario(c, 'servidor')
      await c.query(`select set_config('app.permitir_venta', '1', true)`)
      await c.query(`update public.ventas set fecha = fecha - interval '1 day' where id = $1`, [id])
      await c.query(`select set_config('app.permitir_venta', '0', true)`)
      await cambiarUsuario(c, 'lorena')
      await debeFallar(c, 'Solo el superusuario', `select public.anular_venta($1, 'tarde')`, [id])
      await cambiarUsuario(c, 'thiago')
      await debeFallar(c, 'No tenés permiso', `select public.anular_venta($1, 'x')`, [id])
      await cambiarUsuario(c, 'lorenzo')
      await c.query(`select public.anular_venta($1, 'Lorenzo sí puede')`, [id])
      expect((await venta(c, id)).estado).toBe('anulada')
    })
  })
})

describe('clientes y permisos', () => {
  it('Thiago ve clientes con teléfono y dirección y registra pagos, pero no crea ni edita clientes', async () => {
    await como('thiago', async (c) => {
      const r = await c.query(`select nombre, telefono, zona from public.v_clientes where id = $1`, [clienteId])
      expect(r.rows[0]).toEqual({ nombre: 'Kiosco El Trébol', telefono: '351 555-1234', zona: 'Alta Córdoba' })
      await debeFallar(c, 'row-level security', `insert into public.clientes (nombre) values ('Nuevo de Thiago')`)
      expect((await c.query(`update public.clientes set zona = 'Otra' where id = $1`, [clienteId])).rowCount).toBe(0)
      await debeFallar(c, 'No tenés permiso', `select public.ajustar_cc($1, 100, 'x')`, [clienteId])
      const pago = await c.query(`select public.registrar_pago($1, 100, 'efectivo', 'cobrado en reparto') as id`, [clienteId])
      expect(Number(pago.rows[0].id)).toBeGreaterThan(0)
    })
  })

  it('no hay dos clientes con el mismo nombre y la baja es lógica', async () => {
    await como('lorena', async (c) => {
      await debeFallar(c, 'clientes_nombre_unico', `insert into public.clientes (nombre) values ('  kiosco el trébol ')`)
      await c.query(`update public.clientes set activo = false where id = $1`, [clienteId])
      expect((await c.query(`select activo from public.clientes where id = $1`, [clienteId])).rows[0].activo).toBe(false)
      await debeFallar(c, 'permission denied', `delete from public.clientes where id = $1`, [clienteId])
    })
  })

  it('nadie escribe ventas directo', async () => {
    await como('lorena', async (c) => {
      await debeFallar(c, 'permission denied', `insert into public.ventas (forma_pago) values ('efectivo')`)
      await debeFallar(c, 'permission denied', `update public.ventas set total = 1`)
    })
    await como('servidor', async (c) => {
      await debeFallar(c, 'confirmar_venta', `insert into public.ventas (forma_pago) values ('efectivo')`)
    })
  })
})
