import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { Campo, Entrada, Insignia, Panel, Selector, Tabla, Vacio } from '@/componentes/ui'
import { fecha, fechaHora } from '@/lib/formato'
import { NOMBRE_MOTIVO_AJUSTE, NOMBRE_TIPO_MOVIMIENTO, type MovimientoVista, type TipoMovimiento } from '@/tipos/supabase'
import { useMovimientos } from './api'

/** Historial de movimientos de stock de todos los productos. */
export function Movimientos() {
  const movimientos = useMovimientos(null, 500)
  const [busqueda, setBusqueda] = useState('')
  const [tipo, setTipo] = useState<TipoMovimiento | ''>('')

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase()
    return (movimientos.data ?? []).filter((m) => {
      if (tipo && m.tipo !== tipo) return false
      if (q && !`${m.producto} ${m.nota} ${m.usuario ?? ''}`.toLowerCase().includes(q)) return false
      return true
    })
  }, [movimientos.data, busqueda, tipo])

  return (
    <>
      <Link to="/productos" className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-azul">
        <ArrowLeft size={16} /> Volver a productos
      </Link>
      <p className="mb-4 text-tinta-2">Cada entrada y salida de mercadería, con quién la hizo. Nada de esto se puede borrar ni editar.</p>
      <Panel>
        <div className="flex flex-col gap-2.5 md:flex-row md:items-end">
          <Campo etiqueta="Buscar" className="flex-1">
            <Entrada placeholder="Producto, nota o usuario" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
          </Campo>
          <Campo etiqueta="Tipo">
            <Selector value={tipo} onChange={(e) => setTipo(e.target.value as TipoMovimiento | '')}>
              <option value="">Todos</option>
              {(Object.keys(NOMBRE_TIPO_MOVIMIENTO) as TipoMovimiento[]).map((t) => (
                <option key={t} value={t}>{NOMBRE_TIPO_MOVIMIENTO[t]}</option>
              ))}
            </Selector>
          </Campo>
        </div>
      </Panel>
      <Panel titulo={`${filtrados.length} movimientos`}>
        {movimientos.isLoading && <Vacio>Cargando…</Vacio>}
        {movimientos.data?.length === 0 && <Vacio>Todavía no hay movimientos.</Vacio>}
        {filtrados.length > 0 && <TablaMovimientos movimientos={filtrados} conProducto />}
      </Panel>
    </>
  )
}

export function TablaMovimientos({ movimientos, conProducto }: { movimientos: MovimientoVista[]; conProducto?: boolean }) {
  return (
    <Tabla>
      <thead>
        <tr>
          <th>Fecha</th>
          {conProducto && <th>Producto</th>}
          <th>Movimiento</th>
          <th className="text-right!">Cantidad</th>
          <th>Lote</th>
          <th>Detalle</th>
          <th>Usuario</th>
        </tr>
      </thead>
      <tbody>
        {movimientos.map((m) => (
          <tr key={m.id}>
            <td className="whitespace-nowrap text-tinta-2">{fechaHora(m.fecha)}</td>
            {conProducto && <td className="font-semibold">{m.producto}</td>}
            <td><TipoInsignia m={m} /></td>
            <td className={`text-right font-semibold ${m.cantidad < 0 ? 'text-mal' : 'text-ok'}`}>{m.cantidad > 0 ? `+${m.cantidad}` : m.cantidad}</td>
            <td className="whitespace-nowrap text-tinta-2">{m.lote_vence ? `vence ${fecha(m.lote_vence)}` : m.lote_id ? 'sin venc.' : '—'}</td>
            <td className="max-w-[260px] text-tinta-2">{m.nota || '—'}</td>
            <td className="whitespace-nowrap">{m.usuario ?? 'Sistema'}</td>
          </tr>
        ))}
      </tbody>
    </Tabla>
  )
}

function TipoInsignia({ m }: { m: MovimientoVista }) {
  const tono = m.tipo === 'compra' || m.tipo === 'carga_inicial' ? 'ok' : m.tipo === 'venta' ? 'azul' : m.tipo === 'anulacion_venta' ? 'aviso' : 'neutro'
  const texto = m.tipo === 'ajuste' && m.motivo_ajuste ? `Ajuste · ${NOMBRE_MOTIVO_AJUSTE[m.motivo_ajuste]}` : NOMBRE_TIPO_MOVIMIENTO[m.tipo]
  return <Insignia tono={tono}>{texto}</Insignia>
}
