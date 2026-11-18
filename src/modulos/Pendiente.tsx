import { Panel } from '@/componentes/ui'

/** Marcador para las pantallas que llegan en fases siguientes. */
export function Pendiente({ titulo, fase }: { titulo: string; fase: number }) {
  return (
    <Panel titulo={titulo}>
      <p className="text-tinta-2">Esta pantalla se habilita en la fase {fase}. Por ahora no hay nada para cargar acá.</p>
    </Panel>
  )
}
