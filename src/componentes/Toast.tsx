import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react'

// Mensajes cortos abajo de la pantalla ("Venta confirmada", "Guardado").

interface Mensaje {
  id: number
  texto: string
  tono: 'ok' | 'mal' | 'neutro'
}

const Ctx = createContext<(texto: string, tono?: Mensaje['tono']) => void>(() => {})

export function ToastProvider({ children }: { children: ReactNode }) {
  const [mensajes, setMensajes] = useState<Mensaje[]>([])
  const contador = useRef(0)

  const avisar = useCallback((texto: string, tono: Mensaje['tono'] = 'neutro') => {
    const id = ++contador.current
    setMensajes((m) => [...m, { id, texto, tono }])
    window.setTimeout(() => setMensajes((m) => m.filter((x) => x.id !== id)), 2600)
  }, [])

  return (
    <Ctx.Provider value={avisar}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-20 z-50 flex flex-col items-center gap-2 px-4 md:bottom-6">
        {mensajes.map((m) => (
          <div
            key={m.id}
            role="status"
            className={`rounded-[10px] px-4 py-2.5 text-sm text-white shadow-lg ${
              m.tono === 'ok' ? 'bg-ok' : m.tono === 'mal' ? 'bg-mal' : 'bg-tinta'
            }`}
          >
            {m.texto}
          </div>
        ))}
      </div>
    </Ctx.Provider>
  )
}

export function useAvisar() {
  return useContext(Ctx)
}
