import type { LucideIcon } from 'lucide-react'
import {
  Home,
  Receipt,
  Users,
  Package,
  Truck,
  Wallet,
  BarChart3,
  ShieldCheck,
  Settings,
  FileUp,
} from 'lucide-react'
import type { Pantalla } from '@/lib/permisos'

export interface ItemNav {
  pantalla: Pantalla
  ruta: string
  titulo: string
  corto: string
  icono: LucideIcon
}

export interface GrupoNav {
  titulo: string
  items: ItemNav[]
}

// Mismo orden y agrupación que la demo aprobada.
export const GRUPOS: GrupoNav[] = [
  {
    titulo: 'Operación',
    items: [
      { pantalla: 'inicio', ruta: '/', titulo: 'Inicio', corto: 'Inicio', icono: Home },
      { pantalla: 'ventas', ruta: '/ventas', titulo: 'Ventas y repartos', corto: 'Ventas', icono: Receipt },
      { pantalla: 'clientes', ruta: '/clientes', titulo: 'Cuentas corrientes', corto: 'Clientes', icono: Users },
    ],
  },
  {
    titulo: 'Mercadería',
    items: [
      { pantalla: 'productos', ruta: '/productos', titulo: 'Productos y stock', corto: 'Productos', icono: Package },
      { pantalla: 'compras', ruta: '/compras', titulo: 'Compras', corto: 'Compras', icono: Truck },
    ],
  },
  {
    titulo: 'Administración',
    items: [
      { pantalla: 'gastos', ruta: '/gastos', titulo: 'Gastos', corto: 'Gastos', icono: Wallet },
      { pantalla: 'informes', ruta: '/informes', titulo: 'Informes', corto: 'Informes', icono: BarChart3 },
      { pantalla: 'usuarios', ruta: '/usuarios', titulo: 'Usuarios', corto: 'Usuarios', icono: ShieldCheck },
      { pantalla: 'configuracion', ruta: '/configuracion', titulo: 'Configuración', corto: 'Config.', icono: Settings },
      { pantalla: 'importacion', ruta: '/importacion', titulo: 'Importar datos', corto: 'Importar', icono: FileUp },
    ],
  },
]

export function tituloDeRuta(ruta: string): string {
  if (ruta === '/productos/listas') return 'Categorías, marcas y proveedores'
  if (ruta === '/productos/movimientos') return 'Movimientos de stock'
  for (const g of GRUPOS) for (const i of g.items) if (i.ruta === ruta) return i.titulo
  return 'El Apache Bebidas'
}
