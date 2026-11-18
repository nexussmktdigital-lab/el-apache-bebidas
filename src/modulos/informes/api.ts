import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { BalanceFila, TopProducto, VentasCategoria } from '@/tipos/supabase'

export function useBalance(desde: string, hasta: string, habilitado = true) {
  return useQuery({
    queryKey: ['balance', desde, hasta],
    enabled: habilitado && desde <= hasta,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('balance', { p_desde: desde, p_hasta: hasta })
      if (error) throw error
      return data as unknown as BalanceFila[]
    },
  })
}

export function useMasVendidos(desde: string, hasta: string, limite = 5) {
  return useQuery({
    queryKey: ['mas-vendidos', desde, hasta, limite],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('productos_mas_vendidos', { p_desde: desde, p_hasta: hasta, p_limite: limite })
      if (error) throw error
      return data as unknown as TopProducto[]
    },
  })
}

export function useVentasPorCategoria(desde: string, hasta: string) {
  return useQuery({
    queryKey: ['ventas-por-categoria', desde, hasta],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('ventas_por_categoria', { p_desde: desde, p_hasta: hasta })
      if (error) throw error
      return data as unknown as VentasCategoria[]
    },
  })
}

/** Suma de filas del balance. */
export function totalizar(filas: BalanceFila[]): Omit<BalanceFila, 'dia'> {
  return filas.reduce(
    (t, f) => ({
      ventas_cantidad: t.ventas_cantidad + f.ventas_cantidad,
      ventas: t.ventas + f.ventas,
      costo: t.costo + f.costo,
      ganancia_bruta: t.ganancia_bruta + f.ganancia_bruta,
      gastos_cantidad: t.gastos_cantidad + f.gastos_cantidad,
      gastos: t.gastos + f.gastos,
      resultado: t.resultado + f.resultado,
    }),
    { ventas_cantidad: 0, ventas: 0, costo: 0, ganancia_bruta: 0, gastos_cantidad: 0, gastos: 0, resultado: 0 },
  )
}

/** Agrupa las filas diarias por mes (AAAA-MM). */
export function porMes(filas: BalanceFila[]): BalanceFila[] {
  const m = new Map<string, BalanceFila>()
  for (const f of filas) {
    const clave = f.dia.slice(0, 7)
    const acum = m.get(clave) ?? { dia: clave, ventas_cantidad: 0, ventas: 0, costo: 0, ganancia_bruta: 0, gastos_cantidad: 0, gastos: 0, resultado: 0 }
    acum.ventas_cantidad += f.ventas_cantidad
    acum.ventas += f.ventas
    acum.costo += f.costo
    acum.ganancia_bruta += f.ganancia_bruta
    acum.gastos_cantidad += f.gastos_cantidad
    acum.gastos += f.gastos
    acum.resultado += f.resultado
    m.set(clave, acum)
  }
  return [...m.values()]
}
