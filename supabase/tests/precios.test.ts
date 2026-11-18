import { describe, it, expect, beforeAll } from 'vitest'
import type { Client } from 'pg'
import { como, comoYGuardar, debeFallar } from './_db'

// Datos compartidos por las pruebas de este archivo (se crean una vez como Lorena).
let catGaseosas: string
let catCervezas: string
let provCentro: string
let provNorte: string

async function crearProducto(c: Client, datos: Record<string, unknown>): Promise<string> {
  const r = await c.query(`select public.guardar_producto($1::jsonb) as id`, [JSON.stringify(datos)])
  return r.rows[0].id
}

async function leer(c: Client, id: string) {
  const r = await c.query(
    `select nombre, codigo, precio_venta::int, costo_actual::int, margen_pct::float, precio_manual::int, margen_pesos::int, margen_real_pct::float, bajo_costo, activo, stock_actual
     from public.v_productos where id = $1`,
    [id],
  )
  return r.rows[0]
}

beforeAll(async () => {
  await comoYGuardar('lorena', async (c) => {
    const cats = await c.query(`insert into public.categorias (nombre) values ('Gaseosas'), ('Cervezas') returning id, nombre`)
    catGaseosas = cats.rows.find((r) => r.nombre === 'Gaseosas').id
    catCervezas = cats.rows.find((r) => r.nombre === 'Cervezas').id
    const provs = await c.query(
      `insert into public.proveedores (nombre, telefono) values ('Distribuidora Centro', '351 1'), ('Mayorista del Norte', '351 2') returning id, nombre`,
    )
    provCentro = provs.rows.find((r) => r.nombre === 'Distribuidora Centro').id
    provNorte = provs.rows.find((r) => r.nombre === 'Mayorista del Norte').id
  })
})

describe('cálculo de precios', () => {
  it('redondea a 1, 10, 50 y 100', async () => {
    await como('servidor', async (c) => {
      const r = await c.query(`select
        public.redondear_precio(17324, 1)::int as a,
        public.redondear_precio(17324, 10)::int as b,
        public.redondear_precio(17325, 10)::int as c,
        public.redondear_precio(17324, 50)::int as d,
        public.redondear_precio(17351, 100)::int as e`)
      expect(r.rows[0]).toEqual({ a: 17324, b: 17320, c: 17330, d: 17300, e: 17400 })
    })
  })

  it('precio = costo + % de ganancia redondeado, o el precio a mano', async () => {
    await como('servidor', async (c) => {
      const r = await c.query(`select
        public.calcular_precio(14200, 22, null, 10)::int as calculado,
        public.calcular_precio(14200, 22, 17999, 10)::int as manual,
        public.calcular_precio(0, 30, null, 10)::int as sin_costo`)
      // 14200 × 1,22 = 17324 → 17320
      expect(r.rows[0]).toEqual({ calculado: 17320, manual: 17999, sin_costo: 0 })
    })
  })
})

describe('alta y edición de productos', () => {
  it('Lorena crea un producto con costo y margen; el precio y el margen salen solos', async () => {
    await como('lorena', async (c) => {
      const id = await crearProducto(c, {
        nombre: '  Coca-Cola 2,25 L ',
        categoria_id: catGaseosas,
        proveedor_id: provCentro,
        unidad_venta: 'pack',
        unidades_por_bulto: 6,
        codigo: 'COCA225',
        stock_minimo: 20,
        costo_actual: 14200,
        margen_pct: 22,
      })
      const p = await leer(c, id)
      expect(p).toMatchObject({
        nombre: 'Coca-Cola 2,25 L',
        codigo: 'COCA225',
        precio_venta: 17320,
        costo_actual: 14200,
        margen_pct: 22,
        precio_manual: null,
        margen_pesos: 3120,
        bajo_costo: false,
        activo: true,
        stock_actual: 0,
      })
      expect(p.margen_real_pct).toBeCloseTo(18.0, 1)

      const h = await c.query(`select motivo, precio_venta::int from public.precios_historial where producto_id = $1 order by id`, [id])
      expect(h.rows).toEqual([{ motivo: 'alta', precio_venta: 17320 }])
    })
  })

  it('cambiar el % de ganancia recalcula el precio y deja historial', async () => {
    await como('lorena', async (c) => {
      const id = await crearProducto(c, { nombre: 'Sprite 2,25 L', categoria_id: catGaseosas, costo_actual: 13600, margen_pct: 22 })
      await c.query(`update public.producto_costos set margen_pct = 30 where producto_id = $1`, [id])
      expect((await leer(c, id)).precio_venta).toBe(17680) // 13600 × 1,30 = 17680
      const h = await c.query(`select motivo from public.precios_historial where producto_id = $1 order by id`, [id])
      expect(h.rows.map((r) => r.motivo)).toEqual(['alta', 'edicion'])
    })
  })

  it('el precio a mano manda, y avisa si queda por debajo del costo', async () => {
    await como('lorena', async (c) => {
      const id = await crearProducto(c, { nombre: 'Brahma lata 473', categoria_id: catCervezas, costo_actual: 26800, margen_pct: 24 })
      await c.query(`update public.producto_costos set precio_manual = 35000 where producto_id = $1`, [id])
      let p = await leer(c, id)
      expect(p.precio_venta).toBe(35000)
      expect(p.bajo_costo).toBe(false)

      await c.query(`update public.producto_costos set precio_manual = 25000 where producto_id = $1`, [id])
      p = await leer(c, id)
      expect(p.precio_venta).toBe(25000)
      expect(p.bajo_costo).toBe(true)
      expect(p.margen_pesos).toBe(-1800)

      // Volver al cálculo automático.
      await c.query(`update public.producto_costos set precio_manual = null where producto_id = $1`, [id])
      expect((await leer(c, id)).precio_venta).toBe(33230) // 26800 × 1,24 = 33232 → 33230
    })
  })

  it('editar por guardar_producto conserva el id y actualiza datos y costos', async () => {
    await como('lorena', async (c) => {
      const id = await crearProducto(c, { nombre: 'Agua 2 L', categoria_id: catGaseosas, costo_actual: 5400, margen_pct: 30 })
      const mismo = await crearProducto(c, { id, nombre: 'Agua mineral 2 L', categoria_id: catGaseosas, costo_actual: 5600, margen_pct: 30, stock_minimo: 30 })
      expect(mismo).toBe(id)
      const p = await leer(c, id)
      expect(p.nombre).toBe('Agua mineral 2 L')
      expect(p.precio_venta).toBe(7280) // 5600 × 1,3 = 7280
    })
  })

  it('no admite dos productos con el mismo código (sin distinguir mayúsculas)', async () => {
    await como('lorena', async (c) => {
      await crearProducto(c, { nombre: 'Fernet 750', categoria_id: catCervezas, codigo: 'FER750', costo_actual: 1, margen_pct: 0 })
      await debeFallar(c, 'productos_codigo_unico', `select public.guardar_producto($1::jsonb)`, [
        JSON.stringify({ nombre: 'Otro', categoria_id: catCervezas, codigo: ' fer750 ' }),
      ])
      // Código vacío no cuenta como duplicado.
      await crearProducto(c, { nombre: 'Sin código 1', categoria_id: catCervezas, codigo: '' })
      await crearProducto(c, { nombre: 'Sin código 2', categoria_id: catCervezas, codigo: '  ' })
    })
  })

  it('la baja es lógica: desactivar mantiene la fila y nadie puede borrar', async () => {
    await como('lorena', async (c) => {
      const id = await crearProducto(c, { nombre: 'Viejo', categoria_id: catCervezas, costo_actual: 100, margen_pct: 10 })
      await c.query(`update public.productos set activo = false where id = $1`, [id])
      expect((await leer(c, id)).activo).toBe(false)
      await debeFallar(c, 'permission denied', `delete from public.productos where id = $1`, [id])
    })
  })
})

describe('columnas protegidas', () => {
  it('el stock y el precio de venta no se editan directo', async () => {
    await como('lorena', async (c) => {
      const id = await crearProducto(c, { nombre: 'Protegido', categoria_id: catCervezas, costo_actual: 1000, margen_pct: 20 })
      await debeFallar(c, 'no se edita directo', `update public.productos set stock_actual = 5 where id = $1`, [id])
      await debeFallar(c, 'se calcula desde el costo', `update public.productos set precio_venta = 999 where id = $1`, [id])
      await debeFallar(c, 'stock 0', `insert into public.productos (nombre, stock_actual) values ('Con stock', 3)`)
    })
  })
})

describe('aumento masivo', () => {
  it('sube un % por categoría: ajusta el margen en los calculados y el precio en los puestos a mano', async () => {
    await como('lorena', async (c) => {
      const auto = await crearProducto(c, { nombre: 'Quilmes 1 L', categoria_id: catCervezas, proveedor_id: provNorte, costo_actual: 20000, margen_pct: 25 })
      const manual = await crearProducto(c, { nombre: 'Stella 1 L', categoria_id: catCervezas, proveedor_id: provNorte, costo_actual: 20000, precio_manual: 30000 })
      const otra = await crearProducto(c, { nombre: 'Pepsi 2 L', categoria_id: catGaseosas, proveedor_id: provNorte, costo_actual: 10000, margen_pct: 20 })
      const inactivo = await crearProducto(c, { nombre: 'Andes vieja', categoria_id: catCervezas, costo_actual: 10000, margen_pct: 20, activo: false })

      const r = await c.query(`select public.aumentar_precios(10, $1, null) as n`, [catCervezas])
      expect(r.rows[0].n).toBe(2)

      const a = await leer(c, auto)
      expect(a.precio_venta).toBe(27500) // 25000 × 1,10
      expect(a.margen_pct).toBeCloseTo(37.5, 2) // (1,25 × 1,10 − 1) = 37,5 %
      expect((await leer(c, manual)).precio_venta).toBe(33000)
      expect((await leer(c, otra)).precio_venta).toBe(12000) // otra categoría: igual
      expect((await leer(c, inactivo)).precio_venta).toBe(12000) // inactivo: igual

      const h = await c.query(`select motivo from public.precios_historial where producto_id = $1 order by id desc limit 1`, [auto])
      expect(h.rows[0].motivo).toBe('aumento masivo')
    })
  })

  it('también por proveedor, y acepta rebajas', async () => {
    await como('lorena', async (c) => {
      const a = await crearProducto(c, { nombre: 'Toro 1 L', categoria_id: catCervezas, proveedor_id: provCentro, costo_actual: 10000, margen_pct: 20 })
      const b = await crearProducto(c, { nombre: 'Gancia', categoria_id: catCervezas, proveedor_id: provNorte, costo_actual: 10000, margen_pct: 20 })
      const r = await c.query(`select public.aumentar_precios(-10, null, $1) as n`, [provCentro])
      expect(r.rows[0].n).toBe(1)
      expect((await leer(c, a)).precio_venta).toBe(10800) // 12000 × 0,9
      expect((await leer(c, b)).precio_venta).toBe(12000)
    })
  })

  it('rechaza porcentajes absurdos', async () => {
    await como('lorena', async (c) => {
      await debeFallar(c, 'entre -99 y 1000', `select public.aumentar_precios(-100, null, null)`)
    })
  })
})

describe('redondeo configurable', () => {
  it('cambiar el redondeo recalcula los precios automáticos y respeta los puestos a mano', async () => {
    await como('lorenzo', async (c) => {
      const auto = await crearProducto(c, { nombre: 'Redondeo auto', categoria_id: catGaseosas, costo_actual: 14200, margen_pct: 22 }) // 17324
      const manual = await crearProducto(c, { nombre: 'Redondeo manual', categoria_id: catGaseosas, costo_actual: 14200, precio_manual: 17999 })
      expect((await leer(c, auto)).precio_venta).toBe(17320)
      await c.query(`update public.configuracion set redondeo_precio = 100`)
      expect((await leer(c, auto)).precio_venta).toBe(17300)
      expect((await leer(c, manual)).precio_venta).toBe(17999)
      await c.query(`update public.configuracion set redondeo_precio = 1`)
      expect((await leer(c, auto)).precio_venta).toBe(17324)
    })
  })
})

describe('permisos', () => {
  let id: string
  beforeAll(async () => {
    id = await comoYGuardar('lorena', (c) =>
      crearProducto(c, { nombre: 'Visible para todos', categoria_id: catGaseosas, codigo: 'VIS1', costo_actual: 1000, margen_pct: 50 }),
    )
  })

  it('Thiago ve el producto y el precio de venta, pero ningún costo', async () => {
    await como('thiago', async (c) => {
      const p = await leer(c, id)
      expect(p.nombre).toBe('Visible para todos')
      expect(p.precio_venta).toBe(1500)
      expect(p.costo_actual).toBeNull()
      expect(p.margen_pct).toBeNull()
      expect(p.margen_pesos).toBeNull()
      expect(p.bajo_costo).toBeNull()

      expect((await c.query(`select * from public.producto_costos`)).rowCount).toBe(0)
      expect((await c.query(`select * from public.precios_historial`)).rowCount).toBe(0)
      expect((await c.query(`select * from public.v_valor_stock`)).rows[0].productos).toBe(0)
    })
  })

  it('Thiago no puede crear, editar ni cambiar precios', async () => {
    await como('thiago', async (c) => {
      await debeFallar(c, 'No tenés permiso', `select public.guardar_producto('{"nombre":"Hackeado"}'::jsonb)`)
      await debeFallar(c, 'No tenés permiso', `select public.aumentar_precios(50, null, null)`)
      expect((await c.query(`update public.productos set stock_minimo = 99 where id = $1`, [id])).rowCount).toBe(0)
      expect((await c.query(`update public.producto_costos set margen_pct = 0 where producto_id = $1`, [id])).rowCount).toBe(0)
      await debeFallar(c, 'row-level security', `insert into public.categorias (nombre) values ('Intrusa')`)
    })
  })

  it('Lorenzo ve costos y el valor del stock', async () => {
    await como('lorenzo', async (c) => {
      expect((await leer(c, id)).costo_actual).toBe(1000)
      const v = await c.query(`select productos, valor_costo::int, en_minimo from public.v_valor_stock`)
      expect(v.rows[0].productos).toBeGreaterThan(0)
      expect(v.rows[0].valor_costo).toBe(0) // todavía sin stock (fase 2)
    })
  })

  it('un anónimo no ve nada', async () => {
    await como('anon', async (c) => {
      await debeFallar(c, 'permission denied', `select * from public.productos`)
      await debeFallar(c, 'permission denied', `select * from public.v_productos`)
    })
  })
})
