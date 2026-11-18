import { createPortal } from 'react-dom'
import type { ReactNode } from 'react'

/**
 * Lo que va adentro se imprime solo: una copia se monta directo en el body
 * (fuera de ventanas flotantes y barras) y el CSS de impresión oculta el
 * resto de la página. En pantalla no se ve.
 */
export function Impresion({ children }: { children: ReactNode }) {
  return createPortal(<div className="solo-impresion">{children}</div>, document.body)
}
