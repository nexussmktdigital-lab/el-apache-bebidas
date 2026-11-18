import { useEffect, type ReactNode } from 'react'
import { X } from 'lucide-react'

/** Ventana flotante. En celular ocupa casi toda la pantalla y se desliza desde abajo. */
export function Modal({
  titulo,
  onCerrar,
  children,
  pie,
  ancho = 'md',
}: {
  titulo: string
  onCerrar: () => void
  children: ReactNode
  pie?: ReactNode
  ancho?: 'sm' | 'md' | 'lg'
}) {
  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCerrar()
    }
    document.addEventListener('keydown', tecla)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', tecla)
      document.body.style.overflow = ''
    }
  }, [onCerrar])

  const anchos = { sm: 'md:max-w-[440px]', md: 'md:max-w-[620px]', lg: 'md:max-w-[860px]' }

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center md:items-center md:p-4" role="dialog" aria-modal="true" aria-label={titulo}>
      <button type="button" className="absolute inset-0 bg-[rgba(20,20,30,0.45)]" onClick={onCerrar} aria-label="Cerrar" />
      <div className={`relative flex max-h-[94dvh] w-full flex-col rounded-t-2xl bg-white shadow-xl md:max-h-[90vh] md:rounded-2xl ${anchos[ancho]}`}>
        <div className="flex items-center justify-between gap-3 border-b border-borde px-5 py-3.5">
          <h3 className="text-[17px] font-semibold">{titulo}</h3>
          <button type="button" onClick={onCerrar} className="-mr-2 rounded-lg p-2 text-tinta-3 hover:bg-fondo" aria-label="Cerrar">
            <X size={20} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {pie && <div className="flex flex-wrap items-center justify-end gap-2 border-t border-borde px-5 py-3">{pie}</div>}
      </div>
    </div>
  )
}
