import type { RolUsuario } from '@/tipos/supabase'

// Qué puede ver y hacer cada rol en la interfaz.
// La base de datos aplica lo mismo con RLS: esto solo decide qué mostrar.

export type Pantalla =
  | 'inicio'
  | 'ventas'
  | 'clientes'
  | 'productos'
  | 'compras'
  | 'gastos'
  | 'informes'
  | 'usuarios'
  | 'configuracion'
  | 'importacion'

export type Accion =
  | 'ver_costos'
  | 'ver_ganancias'
  | 'editar_productos'
  | 'editar_precios'
  | 'ajustar_stock'
  | 'cargar_compras'
  | 'vender'
  | 'anular_ventas'
  | 'anular_ventas_antiguas'
  | 'editar_clientes'
  | 'registrar_pagos'
  | 'cargar_gastos'
  | 'ver_informes'
  | 'administrar_usuarios'
  | 'importar_datos'

const PANTALLAS: Record<RolUsuario, Pantalla[]> = {
  superusuario: ['inicio', 'ventas', 'clientes', 'productos', 'compras', 'gastos', 'informes', 'usuarios', 'configuracion', 'importacion'],
  administracion: ['inicio', 'ventas', 'clientes', 'productos', 'compras', 'gastos'],
  reparto: ['inicio', 'ventas', 'clientes', 'productos'],
}

const ACCIONES: Record<RolUsuario, Accion[]> = {
  superusuario: [
    'ver_costos',
    'ver_ganancias',
    'editar_productos',
    'editar_precios',
    'ajustar_stock',
    'cargar_compras',
    'vender',
    'anular_ventas',
    'anular_ventas_antiguas',
    'editar_clientes',
    'registrar_pagos',
    'cargar_gastos',
    'ver_informes',
    'administrar_usuarios',
    'importar_datos',
  ],
  administracion: [
    'ver_costos',
    'editar_productos',
    'editar_precios',
    'ajustar_stock',
    'cargar_compras',
    'vender',
    'anular_ventas',
    'editar_clientes',
    'registrar_pagos',
    'cargar_gastos',
  ],
  reparto: ['vender', 'registrar_pagos'],
}

export function puedeVer(rol: RolUsuario | null | undefined, pantalla: Pantalla): boolean {
  return rol ? PANTALLAS[rol].includes(pantalla) : false
}

export function puede(rol: RolUsuario | null | undefined, accion: Accion): boolean {
  return rol ? ACCIONES[rol].includes(accion) : false
}

export const NOMBRE_ROL: Record<RolUsuario, string> = {
  superusuario: 'Superusuario',
  administracion: 'Administración',
  reparto: 'Ventas y cobros',
}

export const DESCRIPCION_ROL: Record<RolUsuario, string> = {
  superusuario: 'Ve y hace todo, incluidos ganancias, informes, usuarios y configuración.',
  administracion: 'Productos, compras, ventas, cuentas corrientes y gastos. Ve costos y cambia precios, pero no ve ganancias.',
  reparto: 'Solo vende y cobra. No ve costos, no cambia precios.',
}
