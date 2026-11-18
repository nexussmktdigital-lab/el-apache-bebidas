import { useMemo, useState, type FormEvent } from 'react'
import { Minus, Plus, Printer, Search, Trash2, XCircle } from 'lucide-react'
import { usePerfil } from '@/app/AuthProvider'
import { puede } from '@/lib/permisos'
import { fechaHora, hoyISO, pesos } from '@/lib/formato'
import { etiquetaUnidad, NOMBRE_FORMA_PAGO, type FormaPago, type ProductoVista, type VentaVista } from '@/tipos/supabase'
import { Aviso, Boton, Campo, Entrada, Insignia, Panel, Selector, Tabla, Vacio } from '@/componentes/ui'
import { Modal } from '@/componentes/Modal'
import { useAvisar } from '@/componentes/Toast'
import { useProductos, mensajeError } from '@/modulos/productos/api'
import { useClientes } from '@/modulos/clientes/api'
import { useAnularVenta, useConfirmarVenta, useVentas } from './api'
import { Comprobante } from './Comprobante'

interface Renglon {
  producto: ProductoVista
  cantidad: number
}

function restarDias(iso: string, n: number): string {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d - n)).toISOString().slice(0, 10)
}

export function Ventas() {
  const perfil = usePerfil()
  const veCostos = puede(perfil.rol, 'ver_ganancias')
  const anula = puede(perfil.rol, 'anular_ventas')
  const avisar = useAvisar()

  const productos = useProductos()
  const clientes = useClientes()
  const confirmar = useConfirmarVenta()

  const [busqueda, setBusqueda] = useState('')
  const [carrito, setCarrito] = useState<Renglon[]>([])
  const [clienteId, setClienteId] = useState('')
  const [forma, setForma] = useState<FormaPago>('efectivo')
  const [nota, setNota] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [comprobante, setComprobante] = useState<string | null>(null)
  const [rango, setRango] = useState<'hoy' | '7' | '30'>('hoy')
  const [anulando, setAnulando] = useState<VentaVista | null>(null)

  const hoy = hoyISO()
  const desde = rango === 'hoy' ? hoy : restarDias(hoy, rango === '7' ? 6 : 29)
  const ventas = useVentas(desde, hoy)

  const disponibles = useMemo(() => {
    const q = normalizar(busqueda)
    return (productos.data ?? [])
      .filter((p) => p.activo)
      .filter((p) => !q || normalizar(`${p.nombre} ${p.codigo ?? ''} ${p.marca ?? ''}`).includes(q))
      .slice(0, 12)
  }, [productos.data, busqueda])

  const enCarrito = (id: string) => carrito.find((r) => r.producto.id === id)?.cantidad ?? 0
  const total = carrito.reduce((s, r) => s + r.cantidad * r.producto.precio_venta, 0)
  const clienteSel = clientes.data?.find((c) => c.id === clienteId) ?? null

  function agregar(p: ProductoVista, cantidad = 1) {
    setError(null)
    const ya = enCarrito(p.id)
    if (ya + cantidad > p.stock_actual) {
      avisar(`No alcanza el stock de ${p.nombre}: quedan ${p.stock_actual}`, 'mal')
      return
    }
    setCarrito((c) => (ya ? c.map((r) => (r.producto.id === p.id ? { ...r, cantidad: r.cantidad + cantidad } : r)) : [...c, { producto: p, cantidad }]))
    setBusqueda('')
  }

  function cambiar(id: string, delta: number) {
    setCarrito((c) =>
      c
        .map((r) => {
          if (r.producto.id !== id) return r
          const n = r.cantidad + delta
          if (n > r.producto.stock_actual) {
            avisar(`No alcanza el stock: quedan ${r.producto.stock_actual}`, 'mal')
            return r
          }
          return { ...r, cantidad: n }
        })
        .filter((r) => r.cantidad > 0),
    )
  }

  function fijarCantidad(id: string, valor: string) {
    const n = Number.parseInt(valor, 10)
    if (!Number.isFinite(n)) return
    setCarrito((c) => c.map((r) => (r.producto.id === id ? { ...r, cantidad: Math.max(1, Math.min(n, r.producto.stock_actual)) } : r)))
  }

  function agregarPorBusqueda() {
    if (disponibles.length === 1) agregar(disponibles[0])
    else if (disponibles.length > 1) {
      // Si escribió un código exacto, lo agrega directo.
      const exacto = disponibles.find((p) => p.codigo && normalizar(p.codigo) === normalizar(busqueda))
      if (exacto) agregar(exacto)
    }
  }

  function buscarEnter(e: FormEvent) {
    e.preventDefault()
    agregarPorBusqueda()
  }

  function confirmarVenta() {
    setError(null)
    if (carrito.length === 0) return setError('Agregá al menos un producto.')
    if (forma === 'cuenta_corriente' && !clienteId) return setError('Para cuenta corriente elegí un cliente.')
    confirmar.mutate(
      { cliente_id: clienteId || null, forma_pago: forma, nota: nota.trim(), items: carrito.map((r) => ({ producto_id: r.producto.id, cantidad: r.cantidad })) },
      {
        onSuccess: (id) => {
          const bajos = carrito.filter((r) => r.producto.stock_minimo > 0 && r.producto.stock_actual - r.cantidad <= r.producto.stock_minimo).map((r) => r.producto.nombre)
          avisar(bajos.length ? `Venta confirmada por ${pesos(total)}. Stock mínimo: ${bajos.join(', ')}` : `Venta confirmada por ${pesos(total)}`, 'ok')
          setCarrito([])
          setClienteId('')
          setForma('efectivo')
          setNota('')
          setComprobante(id)
        },
        onError: (e) => setError(mensajeError(e)),
      },
    )
  }

  const lista = ventas.data ?? []
  const totalRango = lista.filter((v) => v.estado === 'confirmada').reduce((s, v) => s + v.total, 0)
  const gananciaRango = veCostos ? lista.filter((v) => v.estado === 'confirmada').reduce((s, v) => s + (v.ganancia ?? 0), 0) : null

  return (
    <>
      <p className="mb-4 text-tinta-2">Armá la venta con todos los productos que haga falta. Puede ir a nombre de un cliente o sin cliente. Al confirmar, el stock baja solo.</p>

      <div className="grid gap-3 lg:grid-cols-[2fr_1fr]">
        <Panel titulo="Nueva venta">
          <form onSubmit={buscarEnter} className="relative">
            <Search size={16} className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-mudo" />
            <Entrada
              className="w-full pl-8 py-2.5"
              placeholder="Buscar producto por nombre o código y Enter para agregar"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  agregarPorBusqueda()
                }
              }}
              inputMode="search"
              autoFocus
            />
          </form>
          {busqueda && (
            <div className="mt-2 max-h-[260px] overflow-y-auto rounded-xl border border-borde">
              {disponibles.length === 0 && <Vacio>No hay productos con esa búsqueda.</Vacio>}
              {disponibles.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => agregar(p)}
                  disabled={p.stock_actual <= enCarrito(p.id)}
                  className="flex w-full items-center justify-between gap-3 border-b border-[#F0F0F3] px-3 py-2 text-left last:border-b-0 hover:bg-fondo disabled:opacity-50"
                >
                  <div className="min-w-0">
                    <div className="truncate font-semibold">{p.nombre}</div>
                    <div className="text-xs text-tinta-3">
                      {etiquetaUnidad(p.unidad_venta, p.unidades_por_bulto)} · quedan {p.stock_actual - enCarrito(p.id)}
                    </div>
                  </div>
                  <b className="whitespace-nowrap">{pesos(p.precio_venta)}</b>
                </button>
              ))}
            </div>
          )}

          <div className="mt-3">
            <Tabla>
              <thead>
                <tr>
                  <th>Producto</th>
                  <th className="text-right!">Cantidad</th>
                  <th className="text-right!">Precio</th>
                  <th className="text-right!">Subtotal</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {carrito.length === 0 && (
                  <tr>
                    <td colSpan={5} className="text-mudo">Todavía no agregaste productos a esta venta.</td>
                  </tr>
                )}
                {carrito.map((r) => (
                  <tr key={r.producto.id}>
                    <td>
                      <b>{r.producto.nombre}</b>
                      <small className="block text-mudo">{etiquetaUnidad(r.producto.unidad_venta, r.producto.unidades_por_bulto)}</small>
                    </td>
                    <td className="text-right whitespace-nowrap">
                      <Boton chico onClick={() => cambiar(r.producto.id, -1)} aria-label="Menos"><Minus size={14} /></Boton>{' '}
                      <input
                        type="number"
                        min={1}
                        max={r.producto.stock_actual}
                        value={r.cantidad}
                        onChange={(e) => fijarCantidad(r.producto.id, e.target.value)}
                        className="w-[56px] rounded-md border border-borde px-1.5 py-1 text-center text-sm"
                        aria-label="Cantidad"
                      />{' '}
                      <Boton chico onClick={() => cambiar(r.producto.id, 1)} aria-label="Más"><Plus size={14} /></Boton>
                    </td>
                    <td className="text-right">{pesos(r.producto.precio_venta)}</td>
                    <td className="text-right font-semibold">{pesos(r.cantidad * r.producto.precio_venta)}</td>
                    <td className="text-right">
                      <Boton chico variante="fantasma" onClick={() => setCarrito((c) => c.filter((x) => x.producto.id !== r.producto.id))} aria-label="Quitar"><Trash2 size={14} /></Boton>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Tabla>
          </div>
        </Panel>

        <Panel titulo="Cerrar la venta">
          <div className="flex flex-col gap-3">
            <Campo etiqueta="Cliente">
              <Selector value={clienteId} onChange={(e) => setClienteId(e.target.value)}>
                <option value="">Sin cliente · venta de mostrador</option>
                {clientes.data?.filter((c) => c.activo).map((c) => (
                  <option key={c.id} value={c.id}>{c.nombre}{c.zona ? ` · ${c.zona}` : ''}</option>
                ))}
              </Selector>
            </Campo>
            <Campo etiqueta="Forma de pago">
              <Selector value={forma} onChange={(e) => setForma(e.target.value as FormaPago)}>
                {(Object.keys(NOMBRE_FORMA_PAGO) as FormaPago[]).map((f) => (
                  <option key={f} value={f}>{NOMBRE_FORMA_PAGO[f]}</option>
                ))}
              </Selector>
            </Campo>
            {forma === 'cuenta_corriente' && clienteSel && clienteSel.saldo > 0 && (
              <Aviso tono={clienteSel.estado === 'vencida' ? 'mal' : 'aviso'}>
                {clienteSel.nombre} ya debe <b>{pesos(clienteSel.saldo)}</b>{clienteSel.estado === 'vencida' ? ' y tiene cuenta vencida' : ''}. Con esta venta pasaría a {pesos(clienteSel.saldo + total)}.
              </Aviso>
            )}
            <Campo etiqueta="Nota" ayuda="Opcional. Sale en el comprobante.">
              <Entrada value={nota} onChange={(e) => setNota(e.target.value)} />
            </Campo>
            <div className="flex items-end justify-between border-t border-borde pt-3">
              <span className="text-sm text-tinta-2">{carrito.length} {carrito.length === 1 ? 'producto' : 'productos'}</span>
              <span className="font-titulo text-[28px] font-semibold tracking-tight">{pesos(total)}</span>
            </div>
            <Boton variante="primario" className="w-full py-2.75" onClick={confirmarVenta} cargando={confirmar.isPending} disabled={carrito.length === 0}>
              Confirmar venta
            </Boton>
            <div className="text-xs text-tinta-2">La cuenta corriente necesita un cliente. Efectivo y transferencia pueden ir sin cliente.</div>
            {error && <div className="rounded-lg bg-mal-tinte px-3 py-2 text-[13px] text-mal">{error}</div>}
          </div>
        </Panel>
      </div>

      <Panel
        titulo={
          <>
            {rango === 'hoy' ? 'Ventas de hoy' : rango === '7' ? 'Ventas de los últimos 7 días' : 'Ventas de los últimos 30 días'}
            <span className="text-[13px] font-normal text-mudo">{pesos(totalRango)}{gananciaRango != null ? ` · ganancia ${pesos(gananciaRango)}` : ''}</span>
          </>
        }
        extra={
          <div className="flex gap-1">
            {(['hoy', '7', '30'] as const).map((r) => (
              <Boton key={r} chico variante={rango === r ? 'primario' : 'secundario'} onClick={() => setRango(r)}>
                {r === 'hoy' ? 'Hoy' : `${r} días`}
              </Boton>
            ))}
          </div>
        }
      >
        {ventas.isLoading && <Vacio>Cargando…</Vacio>}
        {ventas.data?.length === 0 && <Vacio>Todavía no hay ventas en este período.</Vacio>}
        {lista.length > 0 && (
          <Tabla>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Cliente</th>
                <th>Detalle</th>
                <th>Pago</th>
                <th className="text-right!">Total</th>
                {veCostos && <th className="text-right!">Ganancia</th>}
                <th>Quién</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {lista.map((v) => (
                <tr key={v.id} className={v.estado === 'anulada' ? 'opacity-60' : ''}>
                  <td className="whitespace-nowrap">
                    {fechaHora(v.fecha)}
                    <small className="block text-mudo">N.º {v.numero}</small>
                  </td>
                  <td>{v.cliente ?? <Insignia tono="neutro">Sin cliente</Insignia>}</td>
                  <td className="max-w-[300px] truncate text-tinta-2" title={v.detalle ?? ''}>{v.detalle}</td>
                  <td><Insignia tono={v.forma_pago === 'cuenta_corriente' ? 'aviso' : 'neutro'}>{NOMBRE_FORMA_PAGO[v.forma_pago]}</Insignia></td>
                  <td className="text-right font-semibold">
                    {v.estado === 'anulada' ? <s>{pesos(v.total)}</s> : pesos(v.total)}
                    {v.estado === 'anulada' && <small className="block font-normal text-mal">Anulada</small>}
                  </td>
                  {veCostos && <td className="text-right">{v.estado === 'anulada' ? '—' : pesos(v.ganancia)}</td>}
                  <td className="whitespace-nowrap text-tinta-2">{v.usuario ?? '—'}</td>
                  <td className="text-right whitespace-nowrap">
                    <Boton chico onClick={() => setComprobante(v.id)} title="Comprobante"><Printer size={14} /></Boton>{' '}
                    {anula && v.estado === 'confirmada' && (
                      <Boton chico variante="fantasma" onClick={() => setAnulando(v)} title="Anular venta"><XCircle size={14} /></Boton>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </Tabla>
        )}
      </Panel>

      {comprobante && <Comprobante ventaId={comprobante} onCerrar={() => setComprobante(null)} />}
      {anulando && <AnularVenta venta={anulando} onCerrar={() => setAnulando(null)} />}
    </>
  )
}

function AnularVenta({ venta, onCerrar }: { venta: VentaVista; onCerrar: () => void }) {
  const anular = useAnularVenta()
  const avisar = useAvisar()
  const [motivo, setMotivo] = useState('')
  const [error, setError] = useState<string | null>(null)

  function confirmar() {
    if (!motivo.trim()) return setError('Escribí el motivo de la anulación.')
    anular.mutate(
      { venta_id: venta.id, motivo: motivo.trim() },
      {
        onSuccess: () => {
          avisar(`Venta N.º ${venta.numero} anulada. El stock volvió al depósito.`, 'ok')
          onCerrar()
        },
        onError: (e) => setError(mensajeError(e)),
      },
    )
  }

  return (
    <Modal
      titulo={`Anular venta N.º ${venta.numero}`}
      onCerrar={onCerrar}
      ancho="sm"
      pie={
        <>
          <Boton onClick={onCerrar}>Cancelar</Boton>
          <Boton variante="peligro" onClick={confirmar} cargando={anular.isPending}>Anular venta</Boton>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <div className="text-sm text-tinta-2">
          {venta.detalle} · <b className="text-tinta">{pesos(venta.total)}</b> · {NOMBRE_FORMA_PAGO[venta.forma_pago]}
          {venta.cliente ? ` · ${venta.cliente}` : ''}
        </div>
        <Aviso tono="aviso">
          El stock vuelve a los mismos lotes de los que salió{venta.forma_pago === 'cuenta_corriente' ? ' y se descuenta el importe de la cuenta corriente del cliente' : ''}. La venta queda marcada como anulada; no se borra.
        </Aviso>
        <Campo etiqueta="Motivo">
          <Entrada value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Ej.: el cliente devolvió la mercadería" autoFocus />
        </Campo>
        {error && <div className="rounded-lg bg-mal-tinte px-3 py-2 text-[13px] text-mal">{error}</div>}
      </div>
    </Modal>
  )
}

function normalizar(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim()
}
