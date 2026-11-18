import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Categoria, Marca, PrecioHistorial, ProductoVista, Proveedor, UnidadVenta, ValorStock } from '@/tipos/supabase'

// Acceso a datos del módulo Productos. Todo pasa por RLS: lo que el rol no
// puede ver llega nulo o vacío, y lo que no puede hacer falla.

export const claves = {
  productos: ['productos'] as const,
  categorias: ['categorias'] as const,
  marcas: ['marcas'] as const,
  proveedores: ['proveedores'] as const,
  valorStock: ['valor-stock'] as const,
  historial: (id: string) => ['precios-historial', id] as const,
}

export function useProductos() {
  return useQuery({
    queryKey: claves.productos,
    queryFn: async () => {
      const { data, error } = await supabase.from('v_productos').select('*').order('nombre')
      if (error) throw error
      return data as unknown as ProductoVista[]
    },
  })
}

export function useValorStock() {
  return useQuery({
    queryKey: claves.valorStock,
    queryFn: async () => {
      const { data, error } = await supabase.from('v_valor_stock').select('*').maybeSingle()
      if (error) throw error
      return (data as ValorStock | null) ?? null
    },
  })
}

function listaActiva<T extends { nombre: string }>(tabla: 'categorias' | 'marcas' | 'proveedores', clave: readonly string[]) {
  return () =>
    useQuery({
      queryKey: clave,
      queryFn: async () => {
        const { data, error } = await supabase.from(tabla).select('*').order('nombre')
        if (error) throw error
        return data as unknown as T[]
      },
    })
}

export const useCategorias = listaActiva<Categoria>('categorias', claves.categorias)
export const useMarcas = listaActiva<Marca>('marcas', claves.marcas)
export const useProveedores = listaActiva<Proveedor>('proveedores', claves.proveedores)

export function useHistorialPrecios(productoId: string | null) {
  return useQuery({
    queryKey: claves.historial(productoId ?? ''),
    enabled: Boolean(productoId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('precios_historial')
        .select('*')
        .eq('producto_id', productoId!)
        .order('fecha', { ascending: false })
        .limit(30)
      if (error) throw error
      return data as PrecioHistorial[]
    },
  })
}

/** Lo que recibe guardar_producto. Los campos ausentes no se tocan al editar. */
export interface DatosProducto {
  id?: string
  nombre: string
  categoria_id: string | null
  marca_id: string | null
  proveedor_id: string | null
  unidad_venta: UnidadVenta
  unidades_por_bulto: number
  codigo: string
  stock_minimo: number
  activo: boolean
  costo_actual: number
  margen_pct: number
  precio_manual: number | null
}

function invalidarProductos(qc: ReturnType<typeof useQueryClient>) {
  void qc.invalidateQueries({ queryKey: claves.productos })
  void qc.invalidateQueries({ queryKey: claves.valorStock })
  void qc.invalidateQueries({ queryKey: ['precios-historial'] })
  void qc.invalidateQueries({ queryKey: ['auditoria'] })
}

export function useGuardarProducto() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (datos: DatosProducto) => {
      const { data, error } = await supabase.rpc('guardar_producto', { p: datos as never })
      if (error) throw error
      return data as string
    },
    onSuccess: () => invalidarProductos(qc),
  })
}

/** Cambios chicos desde la tabla: mínimo, activo. */
export function useEditarProducto() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (p: { id: string; cambios: { stock_minimo?: number; activo?: boolean } }) => {
      const { error } = await supabase.from('productos').update(p.cambios).eq('id', p.id)
      if (error) throw error
    },
    onSuccess: () => invalidarProductos(qc),
  })
}

/** Cambios chicos de costo y precio desde la tabla. */
export function useEditarCostos() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (p: { id: string; cambios: { costo_actual?: number; margen_pct?: number; precio_manual?: number | null } }) => {
      const { error } = await supabase.from('producto_costos').update(p.cambios).eq('producto_id', p.id)
      if (error) throw error
    },
    onSuccess: () => invalidarProductos(qc),
  })
}

export function useAumentarPrecios() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (p: { pct: number; categoria_id: string | null; proveedor_id: string | null }) => {
      const { data, error } = await supabase.rpc('aumentar_precios', {
        p_pct: p.pct,
        p_categoria_id: p.categoria_id ?? undefined,
        p_proveedor_id: p.proveedor_id ?? undefined,
      })
      if (error) throw error
      return data as number
    },
    onSuccess: () => invalidarProductos(qc),
  })
}

type TablaLista = 'categorias' | 'marcas' | 'proveedores'

export function useGuardarItemLista(tabla: TablaLista) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (item: { id?: string; nombre: string; activo?: boolean; telefono?: string; contacto?: string; notas?: string }) => {
      const { id, ...resto } = item
      // Las tres tablas comparten columnas; el tipado por unión no lo entiende, por eso el cast.
      const consulta = id
        ? supabase.from(tabla).update(resto as never).eq('id', id).select('id').single()
        : supabase.from(tabla).insert(resto as never).select('id').single()
      const { data, error } = await consulta
      if (error) throw error
      return data.id as string
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [tabla] })
      invalidarProductos(qc)
    },
  })
}

/** Mensaje entendible para los errores más comunes de la base. */
export function mensajeError(e: unknown): string {
  const msg = (e as { message?: string })?.message ?? ''
  if (msg.includes('productos_codigo_unico')) return 'Ya hay otro producto con ese código.'
  if (msg.includes('_nombre_unico')) return 'Ya existe uno con ese nombre.'
  if (msg.includes('No tenés permiso')) return 'No tenés permiso para hacer esto.'
  if (msg.includes('row-level security')) return 'No tenés permiso para hacer esto.'
  if (msg.includes('Failed to fetch')) return 'No hay conexión con el servidor.'
  if (msg) return msg
  return 'No se pudo guardar. Probá de nuevo.'
}
