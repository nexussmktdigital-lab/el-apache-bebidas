import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { GastoCategoria, GastoVista } from '@/tipos/supabase'

export const clavesGastos = {
  gastos: ['gastos'] as const,
  categorias: ['gasto-categorias'] as const,
}

export function useGastos(desde: string, hasta: string) {
  return useQuery({
    queryKey: [...clavesGastos.gastos, desde, hasta],
    queryFn: async () => {
      const { data, error } = await supabase.from('v_gastos').select('*').gte('fecha', desde).lte('fecha', hasta).order('fecha', { ascending: false }).order('creado_en', { ascending: false })
      if (error) throw error
      return data as unknown as GastoVista[]
    },
  })
}

export function useGastoCategorias() {
  return useQuery({
    queryKey: clavesGastos.categorias,
    queryFn: async () => {
      const { data, error } = await supabase.from('gasto_categorias').select('*').order('nombre')
      if (error) throw error
      return data as GastoCategoria[]
    },
  })
}

function invalidar(qc: ReturnType<typeof useQueryClient>) {
  void qc.invalidateQueries({ queryKey: clavesGastos.gastos })
  void qc.invalidateQueries({ queryKey: clavesGastos.categorias })
  void qc.invalidateQueries({ queryKey: ['balance'] })
  void qc.invalidateQueries({ queryKey: ['auditoria'] })
}

export function useCargarGasto() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (g: { fecha: string; monto: number; categoria_id: string | null; medio_pago: 'efectivo' | 'transferencia'; pagado_a: string; detalle: string }) => {
      const { error } = await supabase.from('gastos').insert(g)
      if (error) throw error
    },
    onSuccess: () => invalidar(qc),
  })
}

export function useAnularGasto() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (p: { id: string; motivo: string }) => {
      const { error } = await supabase.from('gastos').update({ anulado: true, anulado_motivo: p.motivo }).eq('id', p.id)
      if (error) throw error
    },
    onSuccess: () => invalidar(qc),
  })
}

export function useGuardarGastoCategoria() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (item: { id?: string; nombre: string; activo?: boolean }) => {
      const { id, ...resto } = item
      const consulta = id ? supabase.from('gasto_categorias').update(resto).eq('id', id).select('id').single() : supabase.from('gasto_categorias').insert(resto).select('id').single()
      const { data, error } = await consulta
      if (error) throw error
      return data.id as string
    },
    onSuccess: () => invalidar(qc),
  })
}
