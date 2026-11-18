import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import type { Perfil } from '@/tipos/supabase'

interface Sesion {
  cargando: boolean
  session: Session | null
  perfil: Perfil | null
  /** Mensaje para mostrar cuando el usuario existe en Auth pero no puede entrar. */
  bloqueo: string | null
  entrar: (email: string, clave: string) => Promise<string | null>
  salir: () => Promise<void>
  recargarPerfil: () => Promise<void>
}

const Ctx = createContext<Sesion | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [cargando, setCargando] = useState(true)
  const [session, setSession] = useState<Session | null>(null)
  const [perfil, setPerfil] = useState<Perfil | null>(null)
  const [bloqueo, setBloqueo] = useState<string | null>(null)

  const cargarPerfil = useCallback(async (s: Session | null) => {
    if (!s) {
      setPerfil(null)
      setBloqueo(null)
      return
    }
    const { data, error } = await supabase.from('perfiles').select('*').eq('id', s.user.id).maybeSingle()
    if (error) {
      setPerfil(null)
      setBloqueo('No pudimos cargar tu usuario. Probá de nuevo en un momento.')
      return
    }
    if (!data) {
      setPerfil(null)
      setBloqueo('Tu usuario todavía no está dado de alta en el sistema. Avisale a Lorenzo.')
      return
    }
    if (!data.activo) {
      setPerfil(null)
      setBloqueo('Tu usuario está desactivado. Avisale a Lorenzo si creés que es un error.')
      return
    }
    setPerfil(data as Perfil)
    setBloqueo(null)
  }, [])

  useEffect(() => {
    let vivo = true
    supabase.auth.getSession().then(async ({ data }) => {
      if (!vivo) return
      setSession(data.session)
      await cargarPerfil(data.session)
      if (vivo) setCargando(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_evento, s) => {
      setSession(s)
      // No se puede await dentro del callback; se dispara aparte.
      void cargarPerfil(s)
    })
    return () => {
      vivo = false
      sub.subscription.unsubscribe()
    }
  }, [cargarPerfil])

  const entrar = useCallback(async (email: string, clave: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: clave })
    if (!error) return null
    if (error.message.toLowerCase().includes('invalid login')) return 'El email o la contraseña no son correctos.'
    if (error.message.toLowerCase().includes('fetch')) return 'No hay conexión con el servidor. Revisá internet e intentá de nuevo.'
    return 'No pudimos iniciar sesión. Intentá de nuevo.'
  }, [])

  const salir = useCallback(async () => {
    await supabase.auth.signOut()
    setPerfil(null)
    setBloqueo(null)
  }, [])

  const recargarPerfil = useCallback(async () => cargarPerfil(session), [cargarPerfil, session])

  const valor = useMemo<Sesion>(
    () => ({ cargando, session, perfil, bloqueo, entrar, salir, recargarPerfil }),
    [cargando, session, perfil, bloqueo, entrar, salir, recargarPerfil],
  )

  return <Ctx.Provider value={valor}>{children}</Ctx.Provider>
}

export function useSesion(): Sesion {
  const v = useContext(Ctx)
  if (!v) throw new Error('useSesion debe usarse dentro de AuthProvider')
  return v
}

/** Perfil garantizado: solo para usar dentro de rutas protegidas. */
export function usePerfil(): Perfil {
  const { perfil } = useSesion()
  if (!perfil) throw new Error('No hay perfil cargado')
  return perfil
}
