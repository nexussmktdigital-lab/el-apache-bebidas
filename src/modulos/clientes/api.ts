import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { CcMovimientoVista, ClienteVista, FormaPago } from '@/tipos/supabase'
import { invalidarVentas } from '@/modulos/ventas/api'

export const clavesClientes = {
  clientes: ['clientes'] as const,
  movimientos: (id: string) => ['cc-movimientos', id] as const,
}

export function useClientes() {
  return useQuery({
    queryKey: clavesClientes.clientes,
    queryFn: async () => {
      const { data, error } = await supabase.from('v_clientes').select('*').order('nombre')
      if (error) throw error
      return data as unknown as ClienteVista[]
    },
  })
}

export function useCcMovimientos(clienteId: string | null) {
  return useQuery({
    queryKey: clavesClientes.movimientos(clienteId ?? ''),
    enabled: Boolean(clienteId),
    queryFn: async () => {
      const { data, error } = await supabase.from('v_cc_movimientos').select('*').eq('cliente_id', clienteId!).order('id', { ascending: false }).limit(200)
      if (error) throw error
      return data as unknown as CcMovimientoVista[]
    },
  })
}

export interface DatosCliente {
  id?: string
  nombre: string
  telefono: string
  direccion: string
  zona: string
  cuit: string
  notas: string
  activo: boolean
}

export function useGuardarCliente() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (d: DatosCliente) => {
      const { id, ...resto } = d
      const consulta = id ? supabase.from('clientes').update(resto).eq('id', id).select('id').single() : supabase.from('clientes').insert(resto).select('id').single()
      const { data, error } = await consulta
      if (error) throw error
      return data.id as string
    },
    onSuccess: () => invalidarVentas(qc),
  })
}

export function useRegistrarPago() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (p: { cliente_id: string; importe: number; medio: Exclude<FormaPago, 'cuenta_corriente'>; nota: string }) => {
      const { error } = await supabase.rpc('registrar_pago', { p_cliente_id: p.cliente_id, p_importe: p.importe, p_medio: p.medio, p_nota: p.nota })
      if (error) throw error
    },
    onSuccess: () => invalidarVentas(qc),
  })
}

export function useAjustarCc() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (p: { cliente_id: string; importe: number; nota: string; vence_el?: string | null; saldo_inicial?: boolean }) => {
      const { error } = await supabase.rpc('ajustar_cc', {
        p_cliente_id: p.cliente_id,
        p_importe: p.importe,
        p_nota: p.nota,
        p_vence_el: p.vence_el ?? undefined,
        p_saldo_inicial: p.saldo_inicial ?? false,
      })
      if (error) throw error
    },
    onSuccess: () => invalidarVentas(qc),
  })
}
