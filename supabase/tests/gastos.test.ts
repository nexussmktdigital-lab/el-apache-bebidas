import { describe, it, expect, beforeAll } from 'vitest'
import type { Client } from 'pg'
import { como, comoYGuardar, cambiarUsuario, debeFallar } from './_db'

let catProd: string

async function producto(c: Client, nombre: string, costo: number, margen: number, stock: number): Promise<string> {
  const id = (await c.query(`select public.guardar_producto($1::jsonb) as id`, [JSON.stringify({ nombre, categoria_id: catProd, costo_actual: costo, margen_pct: margen })])).rows[0].id
  await c.query(`select public.cargar_stock_inicial($1, $2)`, [id, stock])
  return id
}

async function vender(c: Client, producto_id: string, cantidad: number): Promise<string> {
  return (await c.query(`select public.confirmar_venta($1::jsonb) as id`, [JSON.stringify({ forma_pago: 'efectivo', items: [{ producto_id, cantidad }] })])).rows[0].id
}

async function gastar(c: Client, monto: number, categoria: string, extra: Record<string, unknown> = {}): Promise<string> {
  const cat = (await c.query(`select id from public.gasto_categorias where nombre = $1`, [categoria])).rows[0].id
  const r = await c.query(
    `insert into public.gastos (monto, categoria_id, medio_pago, pagado_a, detalle, fecha) values ($1, $2, $3, $4, $5, coalesce($6::date, public.hoy_ar())) returning id`,
    [monto, cat, extra.medio_pago ?? 'efectivo', extra.pagado_a ?? '', extra.detalle ?? '', extra.fecha ?? null],
  )
  return r.rows[0].id
}

beforeAll(async () => {
  await comoYGuardar('lorena', async (c) => {
    catProd = (await c.query(`insert into public.categorias (nombre) values ('Informes pruebas') returning id`)).rows[0].id
  })
})

describe('gastos', () => {
  it('arranca con las seis categorías del cliente', async () => {
    await como('lorena', async (c) => {
      const r = await c.query(`select nombre from public.gasto_categorias where activo order by nombre`)
      expect(r.rows.map((x) => x.nombre)).toEqual(['Alquiler', 'Combustible', 'Mantenimiento', 'Otros', 'Servicios', 'Sueldos'])
      await debeFallar(c, 'gasto_categorias_nombre_unico', `insert into public.gasto_categorias (nombre) values (' combustible ')`)
    })
  })

  it('administración carga un gasto con fecha, monto, categoría, medio y a quién; queda quién lo cargó', async () => {
    await como('lorena', async (c) => {
      const id = await gastar(c, 38000, 'Combustible', { pagado_a: 'YPF', detalle: 'Carga camioneta reparto' })
      const r = await c.query(`select monto::int, categoria, medio_pago::text, pagado_a, detalle, usuario, anulado from public.v_gastos where id = $1`, [id])
      expect(r.rows[0]).toEqual({ monto: 38000, categoria: 'Combustible', medio_pago: 'efectivo', pagado_a: 'YPF', detalle: 'Carga camioneta reparto', usuario: 'Lorena', anulado: false })
      await debeFallar(c, 'check', `insert into public.gastos (monto) values (0)`)
      await debeFallar(c, 'check', `insert into public.gastos (monto, medio_pago) values (100, 'cuenta_corriente')`)
    })
  })

  it('un gasto no se edita ni se borra: se anula con motivo y queda registrado', async () => {
    await como('lorena', async (c) => {
      const id = await gastar(c, 5000, 'Otros')
      await debeFallar(c, 'no se modifica', `update public.gastos set monto = 6000 where id = $1`, [id])
      await debeFallar(c, 'motivo', `update public.gastos set anulado = true where id = $1`, [id])
      await c.query(`update public.gastos set anulado = true, anulado_motivo = 'Cargado dos veces' where id = $1`, [id])
      const r = await c.query(`select anulado, anulado_motivo, anulado_por_nombre from public.v_gastos where id = $1`, [id])
      expect(r.rows[0]).toEqual({ anulado: true, anulado_motivo: 'Cargado dos veces', anulado_por_nombre: 'Lorena' })
      await debeFallar(c, 'no se puede volver a activar', `update public.gastos set anulado = false where id = $1`, [id])
      await debeFallar(c, 'permission denied', `delete from public.gastos where id = $1`, [id])
    })
  })

  it('ventas y cobros (Patricia) no ve ni carga gastos', async () => {
    await como('thiago', async (c) => {
      expect((await c.query(`select * from public.gastos`)).rowCount).toBe(0)
      expect((await c.query(`select * from public.gasto_categorias`)).rowCount).toBe(0)
      await debeFallar(c, 'row-level security', `insert into public.gastos (monto) values (100)`)
    })
  })
})

describe('balance', () => {
  it('suma ventas confirmadas, costo, ganancia bruta y gastos por día; las anuladas no cuentan', async () => {
    await como('lorenzo', async (c) => {
      const p = await producto(c, 'Balance prod', 1000, 50, 100) // precio 1500
      await vender(c, p, 4) // 6000, costo 4000
      const anulada = await vender(c, p, 10)
      await c.query(`select public.anular_venta($1, 'prueba')`, [anulada])
      await gastar(c, 700, 'Servicios')
      const anulado = await gastar(c, 99999, 'Otros')
      await c.query(`update public.gastos set anulado = true, anulado_motivo = 'no va' where id = $1`, [anulado])

      // Como la base de pruebas comparte el día con otras pruebas, comparamos contra la suma directa.
      const esperado = await c.query(`
        select
          (select coalesce(sum(total), 0)::int from public.ventas where estado = 'confirmada' and public.fecha_ar(fecha) = public.hoy_ar()) as ventas,
          (select coalesce(sum(i.cantidad * vc.costo_unitario), 0)::int
             from public.venta_items i join public.ventas v on v.id = i.venta_id join public.venta_item_costos vc on vc.venta_item_id = i.id
            where v.estado = 'confirmada' and public.fecha_ar(v.fecha) = public.hoy_ar()) as costo,
          (select coalesce(sum(monto), 0)::int from public.gastos where not anulado and fecha = public.hoy_ar()) as gastos`)
      const e = esperado.rows[0]
      const b = await c.query(`select dia::text, ventas::int, costo::int, ganancia_bruta::int, gastos::int, resultado::int from public.balance(public.hoy_ar(), public.hoy_ar())`)
      expect(b.rows).toHaveLength(1)
      expect(b.rows[0]).toMatchObject({ ventas: e.ventas, costo: e.costo, ganancia_bruta: e.ventas - e.costo, gastos: e.gastos, resultado: e.ventas - e.costo - e.gastos })
      expect(e.ventas).toBeGreaterThanOrEqual(6000)
      expect(e.gastos).toBeGreaterThanOrEqual(700)
      expect(e.gastos).toBeLessThan(99999)
    })
  })

  it('devuelve una fila por día del rango, con ceros donde no hubo nada', async () => {
    await como('lorenzo', async (c) => {
      const r = await c.query(`select dia::text, ventas::int, gastos::int from public.balance('2020-01-01', '2020-01-03')`)
      expect(r.rows).toEqual([
        { dia: '2020-01-01', ventas: 0, gastos: 0 },
        { dia: '2020-01-02', ventas: 0, gastos: 0 },
        { dia: '2020-01-03', ventas: 0, gastos: 0 },
      ])
      expect((await c.query(`select * from public.balance('2020-02-01', '2020-01-01')`)).rowCount).toBe(0)
    })
  })

  it('el balance es solo para el superusuario', async () => {
    await como('lorena', async (c) => {
      expect((await c.query(`select * from public.balance(public.hoy_ar(), public.hoy_ar())`)).rowCount).toBe(0)
    })
    await como('thiago', async (c) => {
      expect((await c.query(`select * from public.balance(public.hoy_ar(), public.hoy_ar())`)).rowCount).toBe(0)
    })
  })
})

describe('resúmenes del tablero', () => {
  it('productos más vendidos y ventas por categoría; la ganancia solo para el superusuario', async () => {
    await como('lorena', async (c) => {
      const a = await producto(c, 'Top A', 1000, 100, 50) // 2000
      const b = await producto(c, 'Top B', 1000, 100, 50)
      await vender(c, a, 5) // 10000
      await vender(c, b, 2) // 4000

      let top = await c.query(`select producto, cantidad::int, ventas::int, ganancia from public.productos_mas_vendidos(public.hoy_ar(), public.hoy_ar(), 50) where producto in ('Top A', 'Top B') order by ventas desc`)
      expect(top.rows).toEqual([
        { producto: 'Top A', cantidad: 5, ventas: 10000, ganancia: null },
        { producto: 'Top B', cantidad: 2, ventas: 4000, ganancia: null },
      ])

      await cambiarUsuario(c, 'lorenzo')
      top = await c.query(`select producto, ganancia::int from public.productos_mas_vendidos(public.hoy_ar(), public.hoy_ar(), 50) where producto = 'Top A'`)
      expect(top.rows[0].ganancia).toBe(5000)

      const cat = await c.query(`select categoria, ventas::int, porcentaje::float from public.ventas_por_categoria(public.hoy_ar(), public.hoy_ar())`)
      const fila = cat.rows.find((r) => r.categoria === 'Informes pruebas')
      expect(fila.ventas).toBeGreaterThanOrEqual(14000)
      const suma = cat.rows.reduce((s, r) => s + Number(r.porcentaje), 0)
      expect(suma).toBeGreaterThan(99)
      expect(suma).toBeLessThan(101)
    })
  })
})
