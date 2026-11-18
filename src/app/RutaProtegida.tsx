import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useSesion } from './AuthProvider'
import { puedeVer, type Pantalla } from '@/lib/permisos'
import { PantallaCarga } from '@/componentes/ui'

/** Exige sesión y perfil activo. Si no, manda a /entrar. */
export function RutaProtegida() {
  const { cargando, session, perfil } = useSesion()
  const ubicacion = useLocation()
  if (cargando) return <PantallaCarga />
  if (!session || !perfil) return <Navigate to="/entrar" replace state={{ desde: ubicacion.pathname }} />
  return <Outlet />
}

/** Exige además que el rol pueda ver esa pantalla. */
export function RutaPorRol({ pantalla, children }: { pantalla: Pantalla; children: React.ReactNode }) {
  const { perfil } = useSesion()
  if (!puedeVer(perfil?.rol, pantalla)) return <Navigate to="/" replace />
  return <>{children}</>
}
