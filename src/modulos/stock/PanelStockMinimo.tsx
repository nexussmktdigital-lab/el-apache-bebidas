import { Link } from 'react-router-dom'
import { Insignia, Panel, Vacio } from '@/componentes/ui'
import { etiquetaUnidad } from '@/tipos/supabase'
import { useProductos } from '@/modulos/productos/api'

/** Productos activos cuyo stock llegó al mínimo elegido. */
export function PanelStockMinimo({ maximo = 12 }: { maximo?: number }) {
  const productos = useProductos()
  const lista = (productos.data ?? []).filter((p) => p.activo && p.stock_bajo).sort((a, b) => a.stock_actual - b.stock_actual)
  return (
    <Panel
      titulo={
        <>
          Stock en el mínimo {lista.length > 0 && <Insignia tono="mal">{lista.length}</Insignia>}
        </>
      }
    >
      {productos.isLoading && <Vacio>Cargando…</Vacio>}
      {productos.data && lista.length === 0 && <Vacio>Ningún producto en el mínimo.</Vacio>}
      {lista.slice(0, maximo).map((p) => (
        <div key={p.id} className="flex items-center justify-between gap-2.5 border-b border-[#F0F0F3] py-2 last:border-b-0">
          <div className="min-w-0">
            <b className="block truncate">{p.nombre}</b>
            <small className="text-tinta-2">
              Mínimo elegido: {p.stock_minimo} · {etiquetaUnidad(p.unidad_venta, p.unidades_por_bulto)}
            </small>
          </div>
          <Insignia tono="mal">{p.stock_actual === 0 ? 'Sin stock' : `Quedan ${p.stock_actual}`}</Insignia>
        </div>
      ))}
      {lista.length > maximo && (
        <Link to="/productos" className="block pt-2 text-xs font-medium text-azul">
          Ver los {lista.length} en Productos
        </Link>
      )}
    </Panel>
  )
}
