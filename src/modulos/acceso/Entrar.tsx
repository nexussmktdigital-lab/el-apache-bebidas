import { useState, type FormEvent } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useSesion } from '@/app/AuthProvider'
import { Boton, Campo, Entrada, Aviso, PantallaCarga } from '@/componentes/ui'
import { supabaseConfigurado } from '@/lib/supabase'
import logo from '@/recursos/logo.webp'

export function Entrar() {
  const { cargando, session, perfil, bloqueo, entrar, salir } = useSesion()
  const ubicacion = useLocation() as { state?: { desde?: string } }
  const [email, setEmail] = useState('')
  const [clave, setClave] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  if (cargando) return <PantallaCarga />
  if (session && perfil) return <Navigate to={ubicacion.state?.desde ?? '/'} replace />

  async function enviar(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (!email.trim() || !clave) {
      setError('Completá el email y la contraseña.')
      return
    }
    setEnviando(true)
    const msg = await entrar(email, clave)
    setEnviando(false)
    if (msg) setError(msg)
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-fondo px-4 py-8">
      <div className="w-full max-w-[400px]">
        <div className="mb-6 text-center">
          <img src={logo} alt="El Apache Bebidas" className="mx-auto w-[180px]" />
          <p className="mt-2 text-[13px] text-mudo">Sistema de gestión · Sucursal Alta Córdoba</p>
        </div>

        <div className="rounded-tarjeta border border-borde bg-white p-6 shadow-tarjeta">
          <h1 className="mb-1 text-xl font-semibold">Entrar</h1>
          <p className="mb-5 text-[13px] text-tinta-3">Usá el email y la contraseña que te dieron.</p>

          {!supabaseConfigurado && (
            <Aviso tono="aviso">Falta configurar la conexión con la base (archivo .env). Esto lo ve solo quien instala el sistema.</Aviso>
          )}

          {session && bloqueo ? (
            <>
              <Aviso tono="mal">{bloqueo}</Aviso>
              <Boton onClick={() => void salir()} className="w-full">
                Salir e intentar con otro usuario
              </Boton>
            </>
          ) : (
            <form onSubmit={enviar} className="flex flex-col gap-3.5">
              <Campo etiqueta="Email">
                <Entrada
                  type="email"
                  autoComplete="username"
                  inputMode="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nombre@correo.com"
                  autoFocus
                />
              </Campo>
              <Campo etiqueta="Contraseña">
                <Entrada type="password" autoComplete="current-password" value={clave} onChange={(e) => setClave(e.target.value)} />
              </Campo>
              {error && <div className="rounded-lg bg-mal-tinte px-3 py-2 text-[13px] text-mal">{error}</div>}
              <Boton type="submit" variante="primario" cargando={enviando} className="mt-1 w-full py-2.5">
                Entrar
              </Boton>
              <p className="text-center text-[12px] text-mudo">¿Te olvidaste la contraseña? Avisale a Lorenzo: él le pide una nueva a NEXUSS.</p>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
