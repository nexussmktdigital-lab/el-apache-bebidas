// Tipos de la base de datos.
// `supabase.gen.ts` se genera desde la base real con `npm run db:types` (no editar a mano).
// Acá van los alias cómodos que usa la interfaz.

import type { Database as DatabaseGen } from './supabase.gen'

export type Database = DatabaseGen
export type { Json } from './supabase.gen'

type Tablas = Database['public']['Tables']
type Vistas = Database['public']['Views']
type Enums = Database['public']['Enums']

export type RolUsuario = Enums['rol_usuario']
export type UnidadVenta = Enums['unidad_venta']

export type Perfil = Tablas['perfiles']['Row']
export type Configuracion = Tablas['configuracion']['Row']
export type Auditoria = Vistas['v_auditoria']['Row']

export type Categoria = Tablas['categorias']['Row']
export type Marca = Tablas['marcas']['Row']
export type Proveedor = Tablas['proveedores']['Row']
export type Producto = Tablas['productos']['Row']
export type ProductoCostos = Tablas['producto_costos']['Row']
export type PrecioHistorial = Tablas['precios_historial']['Row']

/** Fila de v_productos con la nulabilidad real: los costos son nulos para quien no puede verlos. */
export type ProductoVista = {
  id: string
  nombre: string
  codigo: string | null
  unidad_venta: UnidadVenta
  unidades_por_bulto: number
  categoria_id: string | null
  categoria: string | null
  marca_id: string | null
  marca: string | null
  proveedor_id: string | null
  proveedor: string | null
  stock_actual: number
  stock_minimo: number
  precio_venta: number
  activo: boolean
  stock_bajo: boolean
  costo_actual: number | null
  margen_pct: number | null
  precio_manual: number | null
  margen_pesos: number | null
  margen_real_pct: number | null
  bajo_costo: boolean | null
  actualizado_en: string
  vence_proximo: string | null
}

export type ValorStock = { productos: number; valor_costo: number; en_minimo: number }

export const NOMBRE_UNIDAD: Record<UnidadVenta, string> = {
  unidad: 'Unidad',
  pack: 'Pack',
  caja: 'Caja',
}

/** "pack x6", "caja x12", "unidad" */
export function etiquetaUnidad(unidad: UnidadVenta, porBulto: number): string {
  if (unidad === 'unidad' || porBulto <= 1) return NOMBRE_UNIDAD[unidad].toLowerCase()
  return `${NOMBRE_UNIDAD[unidad].toLowerCase()} x${porBulto}`
}

// ---- Stock y compras ----

export type TipoMovimiento = Enums['tipo_movimiento']
export type MotivoAjuste = Enums['motivo_ajuste']
export type Compra = Tablas['compras']['Row']
export type CompraItem = Tablas['compra_items']['Row']
export type Lote = Tablas['lotes']['Row']

export type CompraVista = {
  id: string
  numero: number
  fecha: string
  proveedor_id: string | null
  proveedor: string | null
  total: number
  observaciones: string
  creado_en: string
  creado_por: string | null
  usuario: string | null
  items: number
  detalle: string | null
}

export type LotePorVencer = {
  lote_id: string
  producto_id: string
  producto: string
  unidad_venta: UnidadVenta
  unidades_por_bulto: number
  fecha_vencimiento: string
  cantidad_disponible: number
  costo_unitario: number
  dias: number
}

export type MovimientoVista = {
  id: number
  fecha: string
  producto_id: string
  producto: string
  unidad_venta: UnidadVenta
  unidades_por_bulto: number
  tipo: TipoMovimiento
  cantidad: number
  motivo_ajuste: MotivoAjuste | null
  nota: string
  referencia_id: string | null
  lote_id: string | null
  lote_vence: string | null
  usuario_id: string | null
  usuario: string | null
}

export const NOMBRE_TIPO_MOVIMIENTO: Record<TipoMovimiento, string> = {
  carga_inicial: 'Carga inicial',
  compra: 'Compra',
  venta: 'Venta',
  anulacion_venta: 'Anulación de venta',
  ajuste: 'Ajuste',
}

export const NOMBRE_MOTIVO_AJUSTE: Record<MotivoAjuste, string> = {
  rotura: 'Rotura',
  vencido: 'Vencido',
  conteo: 'Conteo',
  otro: 'Otro',
}
