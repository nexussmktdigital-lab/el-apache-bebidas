import { describe, it, expect } from 'vitest'
import { como, cambiarUsuario } from './_db'

describe('definiciones del cliente (migración 0005)', () => {
  it('la configuración arranca con 7 días de cuenta corriente, aviso 1 día y 15 días para vencimientos', async () => {
    await como('lorenzo', async (c) => {
      const r = await c.query(`select plazo_cc_dias, aviso_cc_dias, aviso_vencimiento_dias, mensaje_whatsapp, comprobante_mostrar_datos from public.configuracion`)
      expect(r.rows[0]).toMatchObject({ plazo_cc_dias: 7, aviso_cc_dias: 1, aviso_vencimiento_dias: 15, comprobante_mostrar_datos: false })
      expect(r.rows[0].mensaje_whatsapp).not.toContain('Podés abonar')
    })
  })

  it('una venta en cuenta corriente vence a los 7 días', async () => {
    await como('lorena', async (c) => {
      const cat = (await c.query(`insert into public.categorias (nombre) values ('Def pruebas') returning id`)).rows[0].id
      const p = (await c.query(`select public.guardar_producto($1::jsonb) as id`, [JSON.stringify({ nombre: 'Def producto', categoria_id: cat, costo_actual: 100, margen_pct: 50 })])).rows[0].id
      await c.query(`select public.cargar_stock_inicial($1, 5)`, [p])
      const cl = (await c.query(`insert into public.clientes (nombre) values ('Def cliente') returning id`)).rows[0].id
      const v = (await c.query(`select public.confirmar_venta($1::jsonb) as id`, [JSON.stringify({ forma_pago: 'cuenta_corriente', cliente_id: cl, items: [{ producto_id: p, cantidad: 1 }] })])).rows[0].id
      const r = await c.query(`select (vence_el - public.hoy_ar()) as dias from public.ventas where id = $1`, [v])
      expect(r.rows[0].dias).toBe(7)
      const estado = await c.query(`select estado from public.v_clientes where id = $1`, [cl])
      expect(estado.rows[0].estado).toBe('al_dia') // aviso recién 1 día antes
    })
  })

  it('administración ve costos de productos pero no la ganancia de las ventas; el superusuario sí', async () => {
    await como('lorena', async (c) => {
      const cat = (await c.query(`insert into public.categorias (nombre) values ('Ganancias pruebas') returning id`)).rows[0].id
      const p = (await c.query(`select public.guardar_producto($1::jsonb) as id`, [JSON.stringify({ nombre: 'Gan producto', categoria_id: cat, costo_actual: 1000, margen_pct: 50 })])).rows[0].id
      await c.query(`select public.cargar_stock_inicial($1, 5)`, [p])
      const v = (await c.query(`select public.confirmar_venta($1::jsonb) as id`, [JSON.stringify({ forma_pago: 'efectivo', items: [{ producto_id: p, cantidad: 2 }] })])).rows[0].id

      // Lorena (administración): costo del producto sí, ganancia de la venta no.
      expect((await c.query(`select costo_actual::int as c from public.v_productos where id = $1`, [p])).rows[0].c).toBe(1000)
      const venta = await c.query(`select total::int, costo_total, ganancia from public.v_ventas where id = $1`, [v])
      expect(venta.rows[0]).toEqual({ total: 3000, costo_total: null, ganancia: null })
      expect((await c.query(`select * from public.venta_item_costos`)).rowCount).toBe(0)
      const dia = await c.query(`select ganancia from public.v_ventas_por_dia where dia = public.hoy_ar()`)
      expect(dia.rows[0]?.ganancia ?? null).toBeNull()

      // Lorenzo (superusuario): ve todo.
      await cambiarUsuario(c, 'lorenzo')
      const total = await c.query(`select total::int, costo_total::int, ganancia::int from public.v_ventas where id = $1`, [v])
      expect(total.rows[0]).toEqual({ total: 3000, costo_total: 2000, ganancia: 1000 })
    })
  })
})
