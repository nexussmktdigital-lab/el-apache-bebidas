import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { CompraVista, CompraItem, Lote, LotePorVencer, MotivoAjuste, MovimientoVista } from '@/tipos/supabase'
import { claves as clavesProductos } from '@/modulos/productos/api'

// Acceso a datos de stock y compras. Las escrituras pasan por funciones de
// Postgres: una compra o un ajuste es una sola transacción.

export const clavesStock = {
  compras: ['compras'] as const,
  compraItems: (id: string) => ['compra-items', id] as const,
  porVencer: ['lotes-por-vencer'] as const,
  movimientos: (productoId?: string | null) => ['movimientos', productoId ?? 'todos'] as const,
  lotes: (productoId: string) => ['lotes', productoId] as const,
}

export function useCompras(limite = 100) {
  return useQuery({
    queryKey: [...clavesStock.compras, limite],
    queryFn: async () => {
      const { data, error } = await supabase.from('v_compras').select('*').order('creado_en', { ascending: false }).limit(limite)
      if (error) throw error
      return data as unknown as CompraVista[]
    },
  })
}

export function useCompraItems(compraId: string | null) {
  return useQuery({
    queryKey: clavesStock.compraItems(compraId ?? ''),
    enabled: Boolean(compraId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('compra_items')
        .select('*, productos(nombre, unidad_venta, unidades_por_bulto)')
        .eq('compra_id', compraId!)
      if (error) throw error
      return data as unknown as Array<CompraItem & { productos: { nombre: string; unidad_venta: string; unidades_por_bulto: number } | null }>
    },
  })
}

export function useLotesPorVencer() {
  return useQuery({
    queryKey: clavesStock.porVencer,
    queryFn: async () => {
      const { data, error } = await supabase.from('v_lotes_por_vencer').select('*')
      if (error) throw error
      return data as unknown as LotePorVencer[]
    },
  })
}

export function useMovimientos(productoId?: string | null, limite = 300) {
  return useQuery({
    queryKey: [...clavesStock.movimientos(productoId), limite],
    queryFn: async () => {
      let q = supabase.from('v_movimientos_stock').select('*').order('id', { ascending: false }).limit(limite)
      if (productoId) q = q.eq('producto_id', productoId)
      const { data, error } = await q
      if (error) throw error
      return data as unknown as MovimientoVista[]
    },
  })
}

/** Lotes con stock de un producto, en orden de salida (primero el que vence antes). */
export function useLotes(productoId: string | null) {
  return useQuery({
    queryKey: clavesStock.lotes(productoId ?? ''),
    enabled: Boolean(productoId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lotes')
        .select('*')
        .eq('producto_id', productoId!)
        .gt('cantidad_disponible', 0)
        .order('fecha_vencimiento', { ascending: true, nullsFirst: false })
        .order('creado_en', { ascending: true })
      if (error) throw error
      return data as Lote[]
    },
  })
}

function invalidarStock(qc: ReturnType<typeof useQueryClient>) {
  void qc.invalidateQueries({ queryKey: clavesProductos.productos })
  void qc.invalidateQueries({ queryKey: clavesProductos.valorStock })
  void qc.invalidateQueries({ queryKey: ['precios-historial'] })
  void qc.invalidateQueries({ queryKey: clavesStock.compras })
  void qc.invalidateQueries({ queryKey: clavesStock.porVencer })
  void qc.invalidateQueries({ queryKey: ['movimientos'] })
  void qc.invalidateQueries({ queryKey: ['lotes'] })
  void qc.invalidateQueries({ queryKey: ['auditoria'] })
}

export interface ItemCompra {
  producto_id: string
  cantidad: number
  costo_unitario: number
  fecha_vencimiento: string | null
}

export function useRegistrarCompra() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (p: { proveedor_id: string | null; fecha: string; observaciones: string; items: ItemCompra[] }) => {
      const { data, error } = await supabase.rpc('registrar_compra', { p: p as never })
      if (error) throw error
      return data as string
    },
    onSuccess: () => invalidarStock(qc),
  })
}

export function useAjustarStock() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (p: { producto_id: string; cantidad: number; motivo: MotivoAjuste; nota: string; fecha_vencimiento?: string | null; lote_id?: string | null }) => {
      const { error } = await supabase.rpc('ajustar_stock', {
        p_producto_id: p.producto_id,
        p_cantidad: p.cantidad,
        p_motivo: p.motivo,
        p_nota: p.nota,
        p_fecha_vencimiento: p.fecha_vencimiento ?? undefined,
        p_lote_id: p.lote_id ?? undefined,
      })
      if (error) throw error
    },
    onSuccess: () => invalidarStock(qc),
  })
}
