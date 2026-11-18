import { createBrowserRouter, Navigate } from 'react-router-dom'
import { Layout } from './Layout'
import { RutaPorAccion, RutaPorRol, RutaProtegida } from './RutaProtegida'
import { Entrar } from '@/modulos/acceso/Entrar'
import { Inicio } from '@/modulos/inicio/Inicio'
import { Usuarios } from '@/modulos/usuarios/Usuarios'
import { Configuracion } from '@/modulos/configuracion/Configuracion'
import { Productos } from '@/modulos/productos/Productos'
import { Listas } from '@/modulos/productos/Listas'
import { Movimientos } from '@/modulos/stock/Movimientos'
import { Compras } from '@/modulos/compras/Compras'
import { Ventas } from '@/modulos/ventas/Ventas'
import { Clientes } from '@/modulos/clientes/Clientes'
import { Gastos } from '@/modulos/gastos/Gastos'
import { Informes } from '@/modulos/informes/Informes'
import { NoEncontrado } from '@/modulos/NoEncontrado'

export const router = createBrowserRouter([
  { path: '/entrar', element: <Entrar /> },
  {
    element: <RutaProtegida />,
    children: [
      {
        element: <Layout />,
        children: [
          { path: '/', element: <Inicio /> },
          { path: '/ventas', element: <RutaPorRol pantalla="ventas"><Ventas /></RutaPorRol> },
          { path: '/clientes', element: <RutaPorRol pantalla="clientes"><Clientes /></RutaPorRol> },
          { path: '/productos', element: <RutaPorRol pantalla="productos"><Productos /></RutaPorRol> },
          { path: '/productos/listas', element: <RutaPorRol pantalla="productos"><RutaPorAccion accion="editar_productos"><Listas /></RutaPorAccion></RutaPorRol> },
          { path: '/productos/movimientos', element: <RutaPorRol pantalla="productos"><RutaPorAccion accion="ajustar_stock"><Movimientos /></RutaPorAccion></RutaPorRol> },
          { path: '/compras', element: <RutaPorRol pantalla="compras"><Compras /></RutaPorRol> },
          { path: '/gastos', element: <RutaPorRol pantalla="gastos"><Gastos /></RutaPorRol> },
          { path: '/informes', element: <RutaPorRol pantalla="informes"><Informes /></RutaPorRol> },
          { path: '/usuarios', element: <RutaPorRol pantalla="usuarios"><Usuarios /></RutaPorRol> },
          { path: '/configuracion', element: <RutaPorRol pantalla="configuracion"><Configuracion /></RutaPorRol> },
          { path: '/inicio', element: <Navigate to="/" replace /> },
          { path: '*', element: <NoEncontrado /> },
        ],
      },
    ],
  },
])
