import { Insignia, Panel, Vacio } from '@/componentes/ui'
import { fecha } from '@/lib/formato'
import { etiquetaUnidad } from '@/tipos/supabase'
import { useLotesPorVencer } from './api'

/** Lotes con stock que vencen dentro del plazo configurado (o ya vencidos). */
export function PanelPorVencer({ maximo = 12 }: { maximo?: number }) {
  const lotes = useLotesPorVencer()
  const lista = lotes.data ?? []
  return (
    <Panel
      titulo={
        <>
          Productos por vencer {lista.length > 0 && <Insignia tono={lista.some((l) => l.dias < 0) ? 'mal' : 'aviso'}>{lista.length}</Insignia>}
        </>
      }
    >
      {lotes.isLoading && <Vacio>Cargando…</Vacio>}
      {lotes.data && lista.length === 0 && <Vacio>Nada por vencer dentro del plazo de aviso.</Vacio>}
      {lista.slice(0, maximo).map((l) => (
        <div key={l.lote_id} className="flex items-center justify-between gap-2.5 border-b border-[#F0F0F3] py-2 last:border-b-0">
          <div className="min-w-0">
            <b className="block truncate">{l.producto}</b>
            <small className="text-tinta-2">
              {l.cantidad_disponible} {etiquetaUnidad(l.unidad_venta, l.unidades_por_bulto)} en stock
            </small>
          </div>
          <Insignia tono={l.dias < 0 ? 'mal' : l.dias <= 7 ? 'mal' : 'aviso'}>
            {l.dias < 0 ? `Vencido hace ${-l.dias} ${-l.dias === 1 ? 'día' : 'días'}` : l.dias === 0 ? 'Vence hoy' : `Vence el ${fecha(l.fecha_vencimiento)}`}
          </Insignia>
        </div>
      ))}
      {lista.length > maximo && <div className="pt-2 text-xs text-mudo">y {lista.length - maximo} más</div>}
    </Panel>
  )
}
