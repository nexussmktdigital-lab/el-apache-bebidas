import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { FormaPago, VentaItem, VentaVista, VentasPorDia } from '@/tipos/supabase'
import { claves as clavesProductos } from '@/modulos/productos/api'

export const clavesVentas = {
  ventas: ['ventas'] as const,
  items: (id: string) => ['venta-items', id] as const,
  porDia: ['ventas-por-dia'] as const,
}

/** Ventas de un rango de días (AAAA-MM-DD, en hora de Córdoba). */
export function useVentas(desde: string, hasta: string) {
  return useQuery({
    queryKey: [...clavesVentas.ventas, desde, hasta],
    queryFn: async () => {
      const { data, error } = await supabase.from('v_ventas').select('*').gte('dia', desde).lte('dia', hasta).order('fecha', { ascending: false })
      if (error) throw error
      return data as unknown as VentaVista[]
    },
  })
}

export function useVenta(id: string | null) {
  return useQuery({
    queryKey: ['venta', id ?? ''],
    enabled: Boolean(id),
    queryFn: async () => {
      const { data, error } = await supabase.from('v_ventas').select('*').eq('id', id!).single()
      if (error) throw error
      return data as unknown as VentaVista
    },
  })
}

export function useVentaItems(id: string | null) {
  return useQuery({
    queryKey: clavesVentas.items(id ?? ''),
    enabled: Boolean(id),
    queryFn: async () => {
      const { data, error } = await supabase.from('venta_items').select('*').eq('venta_id', id!).order('descripcion')
      if (error) throw error
      return data as VentaItem[]
    },
  })
}

export function useVentasPorDia(desde: string, hasta: string) {
  return useQuery({
    queryKey: [...clavesVentas.porDia, desde, hasta],
    queryFn: async () => {
      const { data, error } = await supabase.from('v_ventas_por_dia').select('*').gte('dia', desde).lte('dia', hasta).order('dia')
      if (error) throw error
      return data as unknown as VentasPorDia[]
    },
  })
}

export function invalidarVentas(qc: ReturnType<typeof useQueryClient>) {
  void qc.invalidateQueries({ queryKey: clavesVentas.ventas })
  void qc.invalidateQueries({ queryKey: clavesVentas.porDia })
  void qc.invalidateQueries({ queryKey: ['venta'] })
  void qc.invalidateQueries({ queryKey: clavesProductos.productos })
  void qc.invalidateQueries({ queryKey: clavesProductos.valorStock })
  void qc.invalidateQueries({ queryKey: ['movimientos'] })
  void qc.invalidateQueries({ queryKey: ['lotes'] })
  void qc.invalidateQueries({ queryKey: ['lotes-por-vencer'] })
  void qc.invalidateQueries({ queryKey: ['clientes'] })
  void qc.invalidateQueries({ queryKey: ['cc-movimientos'] })
  void qc.invalidateQueries({ queryKey: ['auditoria'] })
}

export interface NuevaVenta {
  cliente_id: string | null
  forma_pago: FormaPago
  nota: string
  items: Array<{ producto_id: string; cantidad: number }>
}

export function useConfirmarVenta() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (p: NuevaVenta) => {
      const { data, error } = await supabase.rpc('confirmar_venta', { p: p as never })
      if (error) throw error
      return data as string
    },
    onSuccess: () => invalidarVentas(qc),
  })
}

export function useAnularVenta() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (p: { venta_id: string; motivo: string }) => {
      const { error } = await supabase.rpc('anular_venta', { p_venta_id: p.venta_id, p_motivo: p.motivo })
      if (error) throw error
    },
    onSuccess: () => invalidarVentas(qc),
  })
}
