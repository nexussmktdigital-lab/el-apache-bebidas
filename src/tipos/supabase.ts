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
  cajon: 'Cajón',
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

// ---- Ventas y cuentas corrientes ----

export type FormaPago = Enums['forma_pago']
export type EstadoVenta = Enums['estado_venta']
export type TipoCc = Enums['tipo_cc']
export type Cliente = Tablas['clientes']['Row']
export type VentaItem = Tablas['venta_items']['Row']

export type EstadoCuenta = 'al_dia' | 'por_vencer' | 'vencida'

export type ClienteVista = {
  id: string
  nombre: string
  telefono: string
  direccion: string
  zona: string
  cuit: string
  notas: string
  activo: boolean
  saldo: number
  vence_el: string | null
  dias: number | null
  estado: EstadoCuenta
  ultimo_pago: string | null
  creado_en: string
  actualizado_en: string
}

export type VentaVista = {
  id: string
  numero: number
  fecha: string
  dia: string
  cliente_id: string | null
  cliente: string | null
  forma_pago: FormaPago
  estado: EstadoVenta
  total: number
  vence_el: string | null
  nota: string
  anulada_en: string | null
  anulada_por: string | null
  motivo_anulacion: string | null
  creado_por: string | null
  usuario: string | null
  anulada_por_nombre: string | null
  items: number
  detalle: string | null
  costo_total: number | null
  ganancia: number | null
}

export type CcMovimientoVista = {
  id: number
  fecha: string
  cliente_id: string
  tipo: TipoCc
  importe: number
  venta_id: string | null
  venta_numero: number | null
  medio_pago: FormaPago | null
  vence_el: string | null
  nota: string
  usuario_id: string | null
  usuario: string | null
  saldo_acumulado: number
}

export type VentasPorDia = { dia: string; cantidad: number; ventas: number; costo: number | null; ganancia: number | null }

export const NOMBRE_FORMA_PAGO: Record<FormaPago, string> = {
  efectivo: 'Efectivo',
  transferencia: 'Transferencia',
  cuenta_corriente: 'Cuenta corriente',
}

export const NOMBRE_TIPO_CC: Record<TipoCc, string> = {
  saldo_inicial: 'Saldo inicial',
  venta: 'Venta',
  pago: 'Pago',
  anulacion_venta: 'Anulación de venta',
  ajuste: 'Ajuste',
}
