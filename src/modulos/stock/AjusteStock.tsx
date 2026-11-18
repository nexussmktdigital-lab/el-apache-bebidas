import { useState } from 'react'
import { Modal } from '@/componentes/Modal'
import { Aviso, Boton, Campo, Entrada, Selector } from '@/componentes/ui'
import { useAvisar } from '@/componentes/Toast'
import { fecha, hoyISO } from '@/lib/formato'
import { etiquetaUnidad, NOMBRE_MOTIVO_AJUSTE, type MotivoAjuste, type ProductoVista } from '@/tipos/supabase'
import { mensajeError } from '@/modulos/productos/api'
import { useAjustarStock, useLotes } from './api'

type Sentido = 'sale' | 'entra'

export function AjusteStock({ producto, onCerrar }: { producto: ProductoVista; onCerrar: () => void }) {
  const avisar = useAvisar()
  const ajustar = useAjustarStock()
  const lotes = useLotes(producto.id)

  const [sentido, setSentido] = useState<Sentido>('sale')
  const [cantidad, setCantidad] = useState('1')
  const [motivo, setMotivo] = useState<MotivoAjuste>('conteo')
  const [nota, setNota] = useState('')
  const [vencimiento, setVencimiento] = useState('')
  const [lote, setLote] = useState('')
  const [error, setError] = useState<string | null>(null)

  const n = Number.parseInt(cantidad, 10)
  const valida = Number.isFinite(n) && n > 0
  const nuevoStock = sentido === 'sale' ? producto.stock_actual - (valida ? n : 0) : producto.stock_actual + (valida ? n : 0)
  const unidad = etiquetaUnidad(producto.unidad_venta, producto.unidades_por_bulto)

  function confirmar() {
    setError(null)
    if (!valida) return setError('Escribí una cantidad mayor a cero.')
    if (sentido === 'sale' && n > producto.stock_actual) return setError(`No alcanza el stock: hay ${producto.stock_actual}.`)
    ajustar.mutate(
      {
        producto_id: producto.id,
        cantidad: sentido === 'sale' ? -n : n,
        motivo,
        nota: nota.trim(),
        fecha_vencimiento: sentido === 'entra' && vencimiento ? vencimiento : null,
        lote_id: sentido === 'sale' && lote ? lote : null,
      },
      {
        onSuccess: () => {
          avisar(`Stock de ${producto.nombre}: ${nuevoStock}`, 'ok')
          onCerrar()
        },
        onError: (e) => setError(mensajeError(e)),
      },
    )
  }

  return (
    <Modal
      titulo={`Ajustar stock · ${producto.nombre}`}
      onCerrar={onCerrar}
      ancho="sm"
      pie={
        <>
          <Boton onClick={onCerrar}>Cancelar</Boton>
          <Boton variante="primario" onClick={confirmar} cargando={ajustar.isPending}>
            Registrar ajuste
          </Boton>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <div className="text-sm text-tinta-2">
          Stock actual: <b className="text-tinta">{producto.stock_actual}</b> {unidad}
          {valida && (
            <>
              {' '}→ queda en <b className={nuevoStock < 0 ? 'text-mal' : 'text-tinta'}>{nuevoStock}</b>
            </>
          )}
        </div>

        <div className="flex gap-1 rounded-lg bg-fondo p-1 text-sm">
          {(['sale', 'entra'] as const).map((s) => (
            <button key={s} type="button" onClick={() => setSentido(s)} className={`flex-1 rounded-md px-3 py-1.5 font-medium ${sentido === s ? 'bg-white text-azul shadow-tarjeta' : 'text-tinta-2'}`}>
              {s === 'sale' ? 'Sale stock' : 'Entra stock'}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Campo etiqueta={`Cantidad (${unidad})`}>
            <Entrada type="number" min={1} inputMode="numeric" value={cantidad} onChange={(e) => setCantidad(e.target.value)} autoFocus />
          </Campo>
          <Campo etiqueta="Motivo">
            <Selector value={motivo} onChange={(e) => setMotivo(e.target.value as MotivoAjuste)}>
              {(Object.keys(NOMBRE_MOTIVO_AJUSTE) as MotivoAjuste[]).map((m) => (
                <option key={m} value={m}>{NOMBRE_MOTIVO_AJUSTE[m]}</option>
              ))}
            </Selector>
          </Campo>
        </div>

        {sentido === 'sale' && lotes.data && lotes.data.length > 1 && (
          <Campo etiqueta="De qué lote sale" ayuda="Si no elegís, sale primero lo que vence antes.">
            <Selector value={lote} onChange={(e) => setLote(e.target.value)}>
              <option value="">Automático (primero lo que vence antes)</option>
              {lotes.data.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.fecha_vencimiento ? `Vence ${fecha(l.fecha_vencimiento)}` : 'Sin vencimiento'} · quedan {l.cantidad_disponible}
                </option>
              ))}
            </Selector>
          </Campo>
        )}

        {sentido === 'entra' && (
          <Campo etiqueta="Vencimiento de lo que entra" ayuda="Opcional.">
            <Entrada type="date" min={hoyISO()} value={vencimiento} onChange={(e) => setVencimiento(e.target.value)} />
          </Campo>
        )}

        <Campo etiqueta="Nota" ayuda="Qué pasó, para que quede en el historial.">
          <Entrada value={nota} onChange={(e) => setNota(e.target.value)} placeholder={sentido === 'sale' ? 'Ej.: se rompieron en el reparto' : 'Ej.: aparecieron en el depósito'} />
        </Campo>

        {sentido === 'entra' && <Aviso>Para mercadería que compraste, usá <b>Compras</b>: ahí se guarda el proveedor y se actualiza el costo.</Aviso>}
        {error && <div className="rounded-lg bg-mal-tinte px-3 py-2 text-[13px] text-mal">{error}</div>}
      </div>
    </Modal>
  )
}
