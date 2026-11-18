import { describe, it, expect, beforeAll } from 'vitest'
import type { Client } from 'pg'
import { como, comoYGuardar, debeFallar } from './_db'

let catId: string
let provId: string

async function crearProducto(c: Client, nombre: string, costo = 1000, margen = 20, minimo = 0): Promise<string> {
  const r = await c.query(`select public.guardar_producto($1::jsonb) as id`, [
    JSON.stringify({ nombre, categoria_id: catId, proveedor_id: provId, costo_actual: costo, margen_pct: margen, stock_minimo: minimo }),
  ])
  return r.rows[0].id
}

async function stock(c: Client, id: string) {
  const r = await c.query(`select stock_actual, stock_bajo, precio_venta::int, costo_actual::int, vence_proximo::text from public.v_productos where id = $1`, [id])
  return r.rows[0]
}

async function lotes(c: Client, id: string) {
  const r = await c.query(
    `select fecha_vencimiento::text as vence, cantidad_inicial as inicial, cantidad_disponible as disponible, costo_unitario::int as costo
     from public.lotes where producto_id = $1 order by fecha_vencimiento nulls last, creado_en`,
    [id],
  )
  return r.rows
}

async function comprar(c: Client, items: Array<Record<string, unknown>>, extra: Record<string, unknown> = {}): Promise<string> {
  const r = await c.query(`select public.registrar_compra($1::jsonb) as id`, [JSON.stringify({ proveedor_id: provId, ...extra, items })])
  return r.rows[0].id
}

beforeAll(async () => {
  await comoYGuardar('lorena', async (c) => {
    catId = (await c.query(`insert into public.categorias (nombre) values ('Stock pruebas') returning id`)).rows[0].id
    provId = (await c.query(`insert into public.proveedores (nombre) values ('Proveedor stock') returning id`)).rows[0].id
  })
})

describe('compras', () => {
  it('una compra crea cabecera, ítems, lotes y movimientos, suma stock y actualiza el costo', async () => {
    await como('lorena', async (c) => {
      const coca = await crearProducto(c, 'Coca compra', 14200, 22, 20) // precio 17320
      const sprite = await crearProducto(c, 'Sprite compra', 13600, 22)

      const compraId = await comprar(
        c,
        [
          { producto_id: coca, cantidad: 30, costo_unitario: 15000, fecha_vencimiento: '2027-03-15' },
          { producto_id: sprite, cantidad: 10, costo_unitario: 13600 },
        ],
        { fecha: '2026-11-18', observaciones: 'Remito 123' },
      )

      const compra = await c.query(`select numero, total::int, proveedor, items, usuario, detalle from public.v_compras where id = $1`, [compraId])
      expect(compra.rows[0]).toMatchObject({ total: 30 * 15000 + 10 * 13600, proveedor: 'Proveedor stock', items: 2, usuario: 'Lorena' })
      expect(compra.rows[0].detalle).toContain('30 x Coca compra')

      const s = await stock(c, coca)
      expect(s.stock_actual).toBe(30)
      expect(s.stock_bajo).toBe(false) // 30 > mínimo 20
      expect(s.costo_actual).toBe(15000) // último costo de compra
      expect(s.precio_venta).toBe(18300) // 15000 × 1,22 = 18300, recalculado
      expect(s.vence_proximo).toBe('2027-03-15')

      expect(await lotes(c, coca)).toEqual([{ vence: '2027-03-15', inicial: 30, disponible: 30, costo: 15000 }])
      expect((await stock(c, sprite)).stock_actual).toBe(10)

      const movs = await c.query(`select tipo, cantidad, producto, usuario from public.v_movimientos_stock where referencia_id = $1 order by producto`, [compraId])
      expect(movs.rows).toEqual([
        { tipo: 'compra', cantidad: 30, producto: 'Coca compra', usuario: 'Lorena' },
        { tipo: 'compra', cantidad: 10, producto: 'Sprite compra', usuario: 'Lorena' },
      ])

      const hist = await c.query(`select motivo, costo::int from public.precios_historial where producto_id = $1 order by id desc limit 1`, [coca])
      expect(hist.rows[0]).toEqual({ motivo: 'compra', costo: 15000 })
    })
  })

  it('si un ítem falla, no queda nada de la compra', async () => {
    await como('lorena', async (c) => {
      const p = await crearProducto(c, 'Atómico')
      const antes = (await c.query(`select count(*)::int as n from public.compras`)).rows[0].n
      await debeFallar(c, 'mayor a cero', `select public.registrar_compra($1::jsonb)`, [
        JSON.stringify({ items: [{ producto_id: p, cantidad: 5, costo_unitario: 100 }, { producto_id: p, cantidad: 0, costo_unitario: 100 }] }),
      ])
      expect((await c.query(`select count(*)::int as n from public.compras`)).rows[0].n).toBe(antes)
      expect((await stock(c, p)).stock_actual).toBe(0)
      await debeFallar(c, 'al menos un producto', `select public.registrar_compra('{"items":[]}'::jsonb)`)
    })
  })
})

describe('el stock sale de los movimientos', () => {
  it('nunca queda negativo', async () => {
    await como('lorena', async (c) => {
      const p = await crearProducto(c, 'Escaso')
      await comprar(c, [{ producto_id: p, cantidad: 3, costo_unitario: 100 }])
      await debeFallar(c, 'No alcanza el stock', `select public.ajustar_stock($1, -4, 'conteo', 'conteo de prueba')`, [p])
      expect((await stock(c, p)).stock_actual).toBe(3)
      await c.query(`select public.ajustar_stock($1, -3, 'conteo', 'ahora sí')`, [p])
      expect((await stock(c, p)).stock_actual).toBe(0)
      await debeFallar(c, 'No alcanza el stock', `select public.ajustar_stock($1, -1, 'rotura', '')`, [p])
    })
  })

  it('descuenta primero lo que vence antes (FEFO) y los sin vencimiento al final', async () => {
    await como('lorena', async (c) => {
      const p = await crearProducto(c, 'FEFO')
      await comprar(c, [{ producto_id: p, cantidad: 10, costo_unitario: 100, fecha_vencimiento: '2027-02-01' }]) // vence después
      await comprar(c, [{ producto_id: p, cantidad: 5, costo_unitario: 100 }]) // sin vencimiento
      await comprar(c, [{ producto_id: p, cantidad: 4, costo_unitario: 100, fecha_vencimiento: '2026-12-20' }]) // vence antes
      expect((await stock(c, p)).vence_proximo).toBe('2026-12-20')

      // Saca 6: 4 del que vence antes y 2 del siguiente.
      await c.query(`select public.ajustar_stock($1, -6, 'conteo', 'faltante')`, [p])
      expect(await lotes(c, p)).toEqual([
        { vence: '2026-12-20', inicial: 4, disponible: 0, costo: 100 },
        { vence: '2027-02-01', inicial: 10, disponible: 8, costo: 100 },
        { vence: null, inicial: 5, disponible: 5, costo: 100 },
      ])
      expect((await stock(c, p)).stock_actual).toBe(13)
      expect((await stock(c, p)).vence_proximo).toBe('2027-02-01') // el agotado ya no cuenta

      const movs = await c.query(`select cantidad, lote_vence::text from public.v_movimientos_stock where producto_id = $1 and tipo = 'ajuste' order by id`, [p])
      expect(movs.rows).toEqual([
        { cantidad: -4, lote_vence: '2026-12-20' },
        { cantidad: -2, lote_vence: '2027-02-01' },
      ])

      // Saca 9 más: agota el de febrero y toma 1 del sin vencimiento.
      await c.query(`select public.ajustar_stock($1, -9, 'rotura', 'cayó un pallet')`, [p])
      expect((await lotes(c, p)).map((l) => l.disponible)).toEqual([0, 0, 4])
    })
  })

  it('un ajuste puede apuntar a un lote puntual (por ejemplo, dar de baja vencidos)', async () => {
    await como('lorena', async (c) => {
      const p = await crearProducto(c, 'Vencidos')
      await comprar(c, [{ producto_id: p, cantidad: 6, costo_unitario: 100, fecha_vencimiento: '2026-11-01' }])
      await comprar(c, [{ producto_id: p, cantidad: 6, costo_unitario: 100, fecha_vencimiento: '2027-06-01' }])
      const loteNuevo = (await c.query(`select id from public.lotes where producto_id = $1 and fecha_vencimiento = '2027-06-01'`, [p])).rows[0].id
      // Baja 2 del lote nuevo aunque el viejo venza antes.
      await c.query(`select public.ajustar_stock($1, -2, 'rotura', 'botellas rotas del lote nuevo', null, $2)`, [p, loteNuevo])
      expect((await lotes(c, p)).map((l) => l.disponible)).toEqual([6, 4])
      // Y no deja sacar más de lo que tiene ese lote.
      await debeFallar(c, 'No alcanza el stock', `select public.ajustar_stock($1, -5, 'vencido', '', null, $2)`, [p, loteNuevo])
    })
  })

  it('un ajuste positivo crea un lote con el costo actual del producto', async () => {
    await como('lorena', async (c) => {
      const p = await crearProducto(c, 'Hallazgo', 2500, 10)
      await c.query(`select public.ajustar_stock($1, 7, 'conteo', 'aparecieron en el depósito', '2027-01-31')`, [p])
      expect(await lotes(c, p)).toEqual([{ vence: '2027-01-31', inicial: 7, disponible: 7, costo: 2500 }])
      expect((await stock(c, p)).stock_actual).toBe(7)
      const mov = await c.query(`select tipo, motivo_ajuste, nota from public.v_movimientos_stock where producto_id = $1`, [p])
      expect(mov.rows[0]).toEqual({ tipo: 'ajuste', motivo_ajuste: 'conteo', nota: 'aparecieron en el depósito' })
    })
  })

  it('exige motivo y cantidad distinta de cero', async () => {
    await como('lorena', async (c) => {
      const p = await crearProducto(c, 'Sin motivo')
      await debeFallar(c, 'cuánto entra o cuánto sale', `select public.ajustar_stock($1, 0, 'conteo', '')`, [p])
      await debeFallar(c, 'motivo', `select public.ajustar_stock($1, 1, null, '')`, [p])
    })
  })

  it('la carga inicial crea el lote con el costo indicado o el del producto', async () => {
    await como('lorenzo', async (c) => {
      const p = await crearProducto(c, 'Inicial', 900, 10)
      await c.query(`select public.cargar_stock_inicial($1, 12, null, null)`, [p])
      await c.query(`select public.cargar_stock_inicial($1, 3, 800, '2027-05-05')`, [p])
      expect(await lotes(c, p)).toEqual([
        { vence: '2027-05-05', inicial: 3, disponible: 3, costo: 800 },
        { vence: null, inicial: 12, disponible: 12, costo: 900 },
      ])
      const tipos = await c.query(`select distinct tipo from public.v_movimientos_stock where producto_id = $1`, [p])
      expect(tipos.rows).toEqual([{ tipo: 'carga_inicial' }])
    })
  })
})

describe('nada se toca directo', () => {
  it('los movimientos no se editan ni se borran, y no se insertan desde la API', async () => {
    await como('lorena', async (c) => {
      const p = await crearProducto(c, 'Intocable')
      await comprar(c, [{ producto_id: p, cantidad: 2, costo_unitario: 50 }])
      const mov = (await c.query(`select id from public.movimientos_stock where producto_id = $1`, [p])).rows[0].id
      await debeFallar(c, 'permission denied', `update public.movimientos_stock set cantidad = 99 where id = $1`, [mov])
      await debeFallar(c, 'permission denied', `delete from public.movimientos_stock where id = $1`, [mov])
      await debeFallar(c, 'permission denied', `insert into public.movimientos_stock (producto_id, tipo, cantidad) values ($1, 'ajuste', 5)`, [p])
      await debeFallar(c, 'permission denied', `update public.lotes set cantidad_disponible = 99 where producto_id = $1`, [p])
      await debeFallar(c, 'no se edita directo', `update public.productos set stock_actual = 99 where id = $1`, [p])
    })
    // Ni siquiera el dueño de la base puede modificar un movimiento.
    await como('servidor', async (c) => {
      const prod = (await c.query(`insert into public.productos (nombre) values ('Intocable servidor') returning id`)).rows[0].id
      await c.query(`select public.ingresar_stock($1, 2, 50, null, 'carga_inicial')`, [prod])
      const mov = (await c.query(`select id from public.movimientos_stock where producto_id = $1`, [prod])).rows[0].id
      await debeFallar(c, 'no se modifican ni se borran', `update public.movimientos_stock set cantidad = 99 where id = $1`, [mov])
      await debeFallar(c, 'no se modifican ni se borran', `delete from public.movimientos_stock where id = $1`, [mov])
    })
  })

  it('el stock del producto siempre es la suma de sus movimientos', async () => {
    await como('servidor', async (c) => {
      const r = await c.query(`
        select count(*)::int as desfasados
        from public.productos p
        left join (select producto_id, sum(cantidad)::int as total from public.movimientos_stock group by producto_id) m on m.producto_id = p.id
        where p.stock_actual <> coalesce(m.total, 0)`)
      expect(r.rows[0].desfasados).toBe(0)
      const l = await c.query(`
        select count(*)::int as desfasados
        from public.lotes l
        join (select lote_id, sum(cantidad)::int as total from public.movimientos_stock where lote_id is not null group by lote_id) m on m.lote_id = l.id
        where l.cantidad_disponible <> m.total`)
      expect(l.rows[0].desfasados).toBe(0)
    })
  })
})

describe('avisos y valor del stock', () => {
  it('productos por vencer respeta el plazo configurado y excluye lotes agotados', async () => {
    await como('lorenzo', async (c) => {
      const p = await crearProducto(c, 'Por vencer')
      const en10 = (await c.query(`select (public.hoy_ar() + 10)::text as d`)).rows[0].d
      const en60 = (await c.query(`select (public.hoy_ar() + 60)::text as d`)).rows[0].d
      const ayer = (await c.query(`select (public.hoy_ar() - 1)::text as d`)).rows[0].d
      await comprar(c, [
        { producto_id: p, cantidad: 5, costo_unitario: 10, fecha_vencimiento: en10 },
        { producto_id: p, cantidad: 5, costo_unitario: 10, fecha_vencimiento: en60 },
        { producto_id: p, cantidad: 2, costo_unitario: 10, fecha_vencimiento: ayer },
      ])
      let v = await c.query(`select fecha_vencimiento::text as vence, dias, cantidad_disponible as n from public.v_lotes_por_vencer where producto_id = $1 order by fecha_vencimiento`, [p])
      expect(v.rows).toEqual([
        { vence: ayer, dias: -1, n: 2 },
        { vence: en10, dias: 10, n: 5 },
      ])
      // Al dar de baja los vencidos, desaparecen del aviso.
      const loteVencido = (await c.query(`select id from public.lotes where producto_id = $1 and fecha_vencimiento = $2`, [p, ayer])).rows[0].id
      await c.query(`select public.ajustar_stock($1, -2, 'vencido', 'tirados', null, $2)`, [p, loteVencido])
      v = await c.query(`select count(*)::int as n from public.v_lotes_por_vencer where producto_id = $1`, [p])
      expect(v.rows[0].n).toBe(1)
      // Con un plazo de 90 días también entra el de 60.
      await c.query(`update public.configuracion set aviso_vencimiento_dias = 90`)
      v = await c.query(`select count(*)::int as n from public.v_lotes_por_vencer where producto_id = $1`, [p])
      expect(v.rows[0].n).toBe(2)
    })
  })

  it('el valor del stock es stock × costo actual y el aviso de mínimo se apaga al reponer', async () => {
    await como('lorenzo', async (c) => {
      const p = await crearProducto(c, 'Valorado', 1000, 20, 5)
      expect((await stock(c, p)).stock_bajo).toBe(true) // 0 <= 5
      await comprar(c, [{ producto_id: p, cantidad: 8, costo_unitario: 1200 }])
      const s = await stock(c, p)
      expect(s.stock_bajo).toBe(false)
      expect(s.costo_actual).toBe(1200)
      const valor = await c.query(
        `select sum(stock_actual * costo_actual)::int as v from public.v_productos where id = $1`,
        [p],
      )
      expect(valor.rows[0].v).toBe(9600)
      const total = await c.query(`select valor_costo::int as v from public.v_valor_stock`)
      expect(total.rows[0].v).toBeGreaterThanOrEqual(9600)
    })
  })
})

describe('permisos', () => {
  let p: string
  beforeAll(async () => {
    p = await comoYGuardar('lorena', async (c) => {
      const id = await crearProducto(c, 'Permisos stock')
      await comprar(c, [{ producto_id: id, cantidad: 4, costo_unitario: 100, fecha_vencimiento: '2026-12-01' }])
      return id
    })
  })

  it('Thiago ve el stock del producto pero no compras, lotes ni movimientos', async () => {
    await como('thiago', async (c) => {
      expect((await stock(c, p)).stock_actual).toBe(4)
      expect((await c.query(`select * from public.compras`)).rowCount).toBe(0)
      expect((await c.query(`select * from public.v_compras`)).rowCount).toBe(0)
      expect((await c.query(`select * from public.lotes`)).rowCount).toBe(0)
      expect((await c.query(`select * from public.v_movimientos_stock`)).rowCount).toBe(0)
      expect((await c.query(`select * from public.v_lotes_por_vencer`)).rowCount).toBe(0)
    })
  })

  it('Thiago no puede comprar ni ajustar', async () => {
    await como('thiago', async (c) => {
      await debeFallar(c, 'No tenés permiso', `select public.registrar_compra($1::jsonb)`, [JSON.stringify({ items: [{ producto_id: p, cantidad: 1, costo_unitario: 1 }] })])
      await debeFallar(c, 'No tenés permiso', `select public.ajustar_stock($1, -1, 'rotura', '')`, [p])
      await debeFallar(c, 'No tenés permiso', `select public.cargar_stock_inicial($1, 1)`, [p])
      // Las funciones internas no se pueden llamar desde la API.
      await debeFallar(c, 'permission denied', `select public.consumir_stock($1, 1, 'ajuste')`, [p])
    })
  })
})
