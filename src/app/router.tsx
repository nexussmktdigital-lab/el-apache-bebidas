import { createBrowserRouter, Navigate } from 'react-router-dom'
import { Layout } from './Layout'
import { RutaPorRol, RutaProtegida } from './RutaProtegida'
import { Entrar } from '@/modulos/acceso/Entrar'
import { Inicio } from '@/modulos/inicio/Inicio'
import { Usuarios } from '@/modulos/usuarios/Usuarios'
import { Configuracion } from '@/modulos/configuracion/Configuracion'
import { Pendiente } from '@/modulos/Pendiente'
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
          { path: '/ventas', element: <RutaPorRol pantalla="ventas"><Pendiente titulo="Ventas y repartos" fase={3} /></RutaPorRol> },
          { path: '/clientes', element: <RutaPorRol pantalla="clientes"><Pendiente titulo="Cuentas corrientes" fase={3} /></RutaPorRol> },
          { path: '/productos', element: <RutaPorRol pantalla="productos"><Pendiente titulo="Productos y stock" fase={1} /></RutaPorRol> },
          { path: '/compras', element: <RutaPorRol pantalla="compras"><Pendiente titulo="Compras" fase={2} /></RutaPorRol> },
          { path: '/gastos', element: <RutaPorRol pantalla="gastos"><Pendiente titulo="Gastos" fase={4} /></RutaPorRol> },
          { path: '/informes', element: <RutaPorRol pantalla="informes"><Pendiente titulo="Informes" fase={4} /></RutaPorRol> },
          { path: '/usuarios', element: <RutaPorRol pantalla="usuarios"><Usuarios /></RutaPorRol> },
          { path: '/configuracion', element: <RutaPorRol pantalla="configuracion"><Configuracion /></RutaPorRol> },
          { path: '/inicio', element: <Navigate to="/" replace /> },
          { path: '*', element: <NoEncontrado /> },
        ],
      },
    ],
  },
])
