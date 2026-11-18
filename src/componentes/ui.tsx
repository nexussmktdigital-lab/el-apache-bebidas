import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react'
import { Loader2 } from 'lucide-react'

// Piezas básicas de interfaz con el estilo de la demo.

type Variante = 'primario' | 'secundario' | 'whatsapp' | 'peligro' | 'fantasma'

export function Boton({
  variante = 'secundario',
  chico,
  cargando,
  className = '',
  children,
  disabled,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variante?: Variante; chico?: boolean; cargando?: boolean }) {
  const base = 'inline-flex items-center justify-center gap-1.5 rounded-lg border font-medium transition disabled:cursor-not-allowed disabled:opacity-60'
  const tam = chico ? 'px-2.5 py-1 text-[12.5px]' : 'px-3 py-[7px] text-sm'
  const estilos: Record<Variante, string> = {
    primario: 'border-azul bg-azul text-white hover:brightness-95',
    secundario: 'border-borde bg-white text-tinta hover:border-mudo',
    whatsapp: 'border-whatsapp bg-whatsapp text-white hover:brightness-95',
    peligro: 'border-mal-tinte bg-mal-tinte text-mal hover:brightness-95',
    fantasma: 'border-transparent bg-transparent text-tinta-2 hover:bg-fondo',
  }
  return (
    <button className={`${base} ${tam} ${estilos[variante]} ${className}`} disabled={disabled || cargando} {...rest}>
      {cargando && <Loader2 size={16} className="animate-spin" />}
      {children}
    </button>
  )
}

export function Tarjeta({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-tarjeta border border-borde bg-white shadow-tarjeta ${className}`}>{children}</div>
}

export function Panel({ titulo, extra, children, className = '' }: { titulo?: ReactNode; extra?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <Tarjeta className={`mb-3 px-4 py-4 md:px-[18px] ${className}`}>
      {(titulo || extra) && (
        <div className="mb-2.5 flex items-center justify-between gap-2">
          {titulo && <h3 className="flex items-center gap-2 text-[15px] font-semibold">{titulo}</h3>}
          {extra}
        </div>
      )}
      {children}
    </Tarjeta>
  )
}

type Tono = 'ok' | 'aviso' | 'mal' | 'neutro' | 'azul'

export function Insignia({ tono = 'neutro', children }: { tono?: Tono; children: ReactNode }) {
  const estilos: Record<Tono, string> = {
    ok: 'bg-ok-tinte text-ok',
    aviso: 'bg-aviso-tinte text-aviso',
    mal: 'bg-mal-tinte text-mal',
    neutro: 'bg-fondo text-tinta-2',
    azul: 'bg-azul-tinte text-azul',
  }
  return <span className={`inline-block rounded-full px-2.25 py-0.5 text-[11.5px] font-semibold whitespace-nowrap ${estilos[tono]}`}>{children}</span>
}

export function Aviso({ tono = 'azul', children }: { tono?: 'azul' | 'aviso' | 'mal' | 'ok'; children: ReactNode }) {
  const estilos = {
    azul: 'border-azul bg-azul-tinte text-tinta-2',
    aviso: 'border-aviso bg-aviso-tinte text-aviso',
    mal: 'border-mal bg-mal-tinte text-mal',
    ok: 'border-ok bg-ok-tinte text-ok',
  }
  return <div className={`mb-3.5 rounded-r-lg border-l-[3px] px-3 py-2.25 text-[13px] ${estilos[tono]}`}>{children}</div>
}

export function Campo({ etiqueta, ayuda, children, className = '' }: { etiqueta: string; ayuda?: string; children: ReactNode; className?: string }) {
  return (
    <label className={`flex flex-col gap-1 text-xs text-tinta-2 ${className}`}>
      <span>{etiqueta}</span>
      {children}
      {ayuda && <span className="text-[11.5px] text-mudo">{ayuda}</span>}
    </label>
  )
}

const claseEntrada =
  'rounded-lg border border-borde bg-white px-2.25 py-[7px] text-sm text-tinta outline-none focus:border-azul focus:ring-2 focus:ring-azul-tinte disabled:bg-fondo'

export function Entrada({ className = '', ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`${claseEntrada} ${className}`} {...rest} />
}

export function AreaTexto({ className = '', ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={`${claseEntrada} ${className}`} {...rest} />
}

export function Selector({ className = '', children, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={`${claseEntrada} ${className}`} {...rest}>
      {children}
    </select>
  )
}

export function Vacio({ children }: { children: ReactNode }) {
  return <div className="py-2 text-mudo">{children}</div>
}

export function PantallaCarga() {
  return (
    <div className="flex h-dvh items-center justify-center text-tinta-3">
      <Loader2 className="animate-spin" />
    </div>
  )
}

export function Tabla({ children }: { children: ReactNode }) {
  return (
    <div className="-mx-4 overflow-x-auto px-4 md:mx-0 md:px-0">
      <table className="w-full border-collapse text-sm [&_td]:border-b [&_td]:border-[#F0F0F3] [&_td]:px-2 [&_td]:py-2 [&_td]:align-middle [&_th]:border-b [&_th]:border-borde [&_th]:px-2 [&_th]:py-1.5 [&_th]:text-left [&_th]:text-[11px] [&_th]:font-medium [&_th]:tracking-[0.1em] [&_th]:whitespace-nowrap [&_th]:text-mudo [&_th]:uppercase [&_tr:last-child_td]:border-b-0">
        {children}
      </table>
    </div>
  )
}
