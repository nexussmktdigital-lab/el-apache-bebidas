import { useMemo, useState, type FormEvent } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { Aviso, Boton, Campo, Entrada, Insignia, Panel, Selector, Tabla, Vacio } from '@/componentes/ui'
import { Modal } from '@/componentes/Modal'
import { useAvisar } from '@/componentes/Toast'
import { aPesos, fecha, fechaHora, hoyISO, pesos } from '@/lib/formato'
import { etiquetaUnidad, type CompraVista, type ProductoVista } from '@/tipos/supabase'
import { useProductos, useProveedores, useGuardarItemLista, mensajeError } from '@/modulos/productos/api'
import { useCompraItems, useCompras, useRegistrarCompra, type ItemCompra } from '@/modulos/stock/api'
import { PanelPorVencer } from '@/modulos/stock/PanelPorVencer'

interface Renglon extends ItemCompra {
  clave: number
}

export function Compras() {
  const avisar = useAvisar()
  const productos = useProductos()
  const proveedores = useProveedores()
  const compras = useCompras()
  const registrar = useRegistrarCompra()
  const nuevoProveedor = useGuardarItemLista('proveedores')

  const [proveedor, setProveedor] = useState('')
  const [fechaCompra, setFechaCompra] = useState(hoyISO())
  const [observaciones, setObservaciones] = useState('')
  const [renglones, setRenglones] = useState<Renglon[]>([])
  const [productoSel, setProductoSel] = useState('')
  const [cantidad, setCantidad] = useState('')
  const [costoUnidad, setCostoUnidad] = useState('')
  const [vencimiento, setVencimiento] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [detalle, setDetalle] = useState<CompraVista | null>(null)

  const activos = useMemo(() => (productos.data ?? []).filter((p) => p.activo), [productos.data])
  const porId = useMemo(() => new Map(activos.map((p) => [p.id, p])), [activos])
  const seleccionado = porId.get(productoSel) ?? null
  const total = renglones.reduce((s, r) => s + r.cantidad * r.costo_unitario, 0)

  // El costo se carga por unidad (botella o lata); el sistema calcula el costo del bulto.
  const porBulto = seleccionado?.unidades_por_bulto ?? 1
  const costoUnidadNum = aPesos(costoUnidad)
  const costoBulto = costoUnidadNum != null ? costoUnidadNum * porBulto : null

  function elegirProducto(id: string) {
    setProductoSel(id)
    const p = porId.get(id)
    setCostoUnidad(p?.costo_actual != null ? String(Math.ceil(p.costo_actual / (p.unidades_por_bulto || 1))) : '')
  }

  async function agregarProveedor() {
    const nombre = window.prompt('Nombre del nuevo proveedor:')?.trim()
    if (!nombre) return
    try {
      const id = await nuevoProveedor.mutateAsync({ nombre })
      setProveedor(id)
      avisar(`Se agregó el proveedor ${nombre}`, 'ok')
    } catch (e) {
      avisar(mensajeError(e), 'mal')
    }
  }

  function agregar(e: FormEvent) {
    e.preventDefault()
    setError(null)
    const n = Number.parseInt(cantidad, 10)
    if (!seleccionado) return setError('Elegí un producto.')
    if (!Number.isFinite(n) || n <= 0) return setError(`Escribí cuántos ${etiquetaUnidad(seleccionado.unidad_venta, seleccionado.unidades_por_bulto)} ingresan.`)
    if (costoBulto == null || costoBulto < 0) return setError('Escribí el costo por unidad (botella o lata).')
    setRenglones((r) => [...r, { clave: Date.now(), producto_id: seleccionado.id, cantidad: n, costo_unitario: costoBulto, fecha_vencimiento: vencimiento || null }])
    setProductoSel('')
    setCantidad('')
    setCostoUnidad('')
    setVencimiento('')
  }

  function confirmar() {
    setError(null)
    if (renglones.length === 0) return setError('Agregá al menos un producto.')
    registrar.mutate(
      { proveedor_id: proveedor || null, fecha: fechaCompra, observaciones: observaciones.trim(), items: renglones.map(({ clave: _c, ...r }) => r) },
      {
        onSuccess: () => {
          avisar(`Ingreso registrado: ${renglones.length} ${renglones.length === 1 ? 'producto' : 'productos'} por ${pesos(total)}`, 'ok')
          setRenglones([])
          setObservaciones('')
          setFechaCompra(hoyISO())
        },
        onError: (err) => setError(mensajeError(err)),
      },
    )
  }

  return (
    <>
      <p className="mb-4 text-tinta-2">Cada ingreso suma stock, actualiza el costo del producto al último costo de compra y guarda la fecha de vencimiento.</p>

      <Panel titulo="Nuevo ingreso">
        <div className="mb-3 grid gap-3 md:grid-cols-3">
          <Campo etiqueta="Proveedor">
            <div className="flex gap-1.5">
              <Selector className="min-w-0 flex-1" value={proveedor} onChange={(e) => setProveedor(e.target.value)}>
                <option value="">Sin proveedor</option>
                {proveedores.data?.filter((p) => p.activo).map((p) => (
                  <option key={p.id} value={p.id}>{p.nombre}</option>
                ))}
              </Selector>
              <Boton type="button" onClick={() => void agregarProveedor()} title="Nuevo proveedor">
                <Plus size={16} /> Nuevo
              </Boton>
            </div>
          </Campo>
          <Campo etiqueta="Fecha">
            <Entrada type="date" value={fechaCompra} max={hoyISO()} onChange={(e) => setFechaCompra(e.target.value)} />
          </Campo>
          <Campo etiqueta="Observaciones" ayuda="Número de remito o factura, por ejemplo.">
            <Entrada value={observaciones} onChange={(e) => setObservaciones(e.target.value)} />
          </Campo>
        </div>

        <form onSubmit={agregar} className="grid gap-2.5 rounded-xl border border-borde bg-fondo/60 p-3 md:grid-cols-[2fr_1fr_1fr_1fr_auto] md:items-end">
          <Campo etiqueta="Producto">
            <Selector value={productoSel} onChange={(e) => elegirProducto(e.target.value)}>
              <option value="">Elegí un producto</option>
              {activos.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre} · {etiquetaUnidad(p.unidad_venta, p.unidades_por_bulto)} · quedan {p.stock_actual}
                </option>
              ))}
            </Selector>
          </Campo>
          <Campo etiqueta={seleccionado ? `Cantidad (${etiquetaUnidad(seleccionado.unidad_venta, seleccionado.unidades_por_bulto)})` : 'Cantidad'}>
            <Entrada type="number" min={1} inputMode="numeric" value={cantidad} onChange={(e) => setCantidad(e.target.value)} />
          </Campo>
          <Campo
            etiqueta="Costo por unidad (botella o lata)"
            ayuda={
              seleccionado
                ? costoBulto != null && porBulto > 1
                  ? `= ${pesos(costoBulto)} por ${etiquetaUnidad(seleccionado.unidad_venta, seleccionado.unidades_por_bulto)}`
                  : seleccionado.costo_actual != null
                    ? `Costo actual: ${pesos(seleccionado.costo_actual)} por ${etiquetaUnidad(seleccionado.unidad_venta, seleccionado.unidades_por_bulto)}`
                    : undefined
                : undefined
            }
          >
            <Entrada inputMode="numeric" value={costoUnidad} onChange={(e) => setCostoUnidad(e.target.value)} />
          </Campo>
          <Campo etiqueta="Vencimiento" ayuda="Opcional.">
            <Entrada type="date" min={hoyISO()} value={vencimiento} onChange={(e) => setVencimiento(e.target.value)} />
          </Campo>
          <Boton type="submit" className="md:mb-[22px]">
            <Plus size={16} /> Agregar
          </Boton>
        </form>

        <Tabla>
          <thead>
            <tr>
              <th>Producto</th>
              <th className="text-right!">Cantidad</th>
              <th className="text-right!">Costo por unidad</th>
              <th className="text-right!">Costo por bulto</th>
              <th className="text-right!">Subtotal</th>
              <th>Vence</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {renglones.length === 0 && (
              <tr>
                <td colSpan={7} className="text-mudo">Todavía no agregaste productos a este ingreso.</td>
              </tr>
            )}
            {renglones.map((r) => {
              const p = porId.get(r.producto_id) as ProductoVista | undefined
              const cambiaCosto = p?.costo_actual != null && p.costo_actual !== r.costo_unitario
              return (
                <tr key={r.clave}>
                  <td>
                    <b>{p?.nombre ?? 'Producto'}</b>
                    {cambiaCosto && (
                      <small className="block text-aviso">
                        El costo pasa de {pesos(p!.costo_actual)} a {pesos(r.costo_unitario)}; el precio se recalcula si es automático.
                      </small>
                    )}
                  </td>
                  <td className="text-right whitespace-nowrap">{r.cantidad} {p ? etiquetaUnidad(p.unidad_venta, p.unidades_por_bulto) : ''}</td>
                  <td className="text-right">{pesos(Math.round(r.costo_unitario / (p?.unidades_por_bulto || 1)))}</td>
                  <td className="text-right">{pesos(r.costo_unitario)}</td>
                  <td className="text-right font-semibold">{pesos(r.cantidad * r.costo_unitario)}</td>
                  <td>{r.fecha_vencimiento ? fecha(r.fecha_vencimiento) : '—'}</td>
                  <td className="text-right">
                    <Boton chico variante="fantasma" onClick={() => setRenglones((rs) => rs.filter((x) => x.clave !== r.clave))} aria-label="Quitar">
                      <Trash2 size={14} />
                    </Boton>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </Tabla>

        <div className="mt-3 flex flex-col items-end gap-2 md:flex-row md:items-center md:justify-end">
          <div className="text-sm text-tinta-2">
            Total del ingreso: <b className="font-titulo text-xl text-tinta">{pesos(total)}</b>
          </div>
          <Boton variante="primario" onClick={confirmar} cargando={registrar.isPending} disabled={renglones.length === 0}>
            Ingresar stock
          </Boton>
        </div>
        {error && <div className="mt-2 rounded-lg bg-mal-tinte px-3 py-2 text-[13px] text-mal">{error}</div>}
      </Panel>

      <div className="grid gap-3 lg:grid-cols-[2fr_1fr]">
        <Panel titulo="Últimos ingresos">
          {compras.isLoading && <Vacio>Cargando…</Vacio>}
          {compras.data?.length === 0 && <Vacio>Todavía no hay compras registradas.</Vacio>}
          {compras.data && compras.data.length > 0 && (
            <Tabla>
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Proveedor</th>
                  <th>Detalle</th>
                  <th className="text-right!">Total</th>
                  <th>Cargó</th>
                </tr>
              </thead>
              <tbody>
                {compras.data.map((c) => (
                  <tr key={c.id} className="cursor-pointer hover:bg-fondo" onClick={() => setDetalle(c)}>
                    <td className="whitespace-nowrap">
                      {fecha(c.fecha)}
                      <small className="block text-mudo">N.º {c.numero}</small>
                    </td>
                    <td>{c.proveedor ?? <Insignia tono="neutro">Sin proveedor</Insignia>}</td>
                    <td className="max-w-[320px] truncate text-tinta-2" title={c.detalle ?? ''}>{c.detalle}</td>
                    <td className="text-right font-semibold">{pesos(c.total)}</td>
                    <td className="whitespace-nowrap text-tinta-2">{c.usuario ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </Tabla>
          )}
        </Panel>
        <PanelPorVencer />
      </div>

      {detalle && <DetalleCompra compra={detalle} onCerrar={() => setDetalle(null)} />}
    </>
  )
}

function DetalleCompra({ compra, onCerrar }: { compra: CompraVista; onCerrar: () => void }) {
  const items = useCompraItems(compra.id)
  return (
    <Modal titulo={`Ingreso N.º ${compra.numero} · ${fecha(compra.fecha)}`} onCerrar={onCerrar}>
      <div className="mb-3 text-sm text-tinta-2">
        {compra.proveedor ?? 'Sin proveedor'} · cargó {compra.usuario ?? '—'} el {fechaHora(compra.creado_en)}
        {compra.observaciones && <div>Observaciones: {compra.observaciones}</div>}
      </div>
      {items.isLoading && <Vacio>Cargando…</Vacio>}
      {items.data && (
        <Tabla>
          <thead>
            <tr>
              <th>Producto</th>
              <th className="text-right!">Cantidad</th>
              <th className="text-right!">Costo</th>
              <th className="text-right!">Subtotal</th>
              <th>Vence</th>
            </tr>
          </thead>
          <tbody>
            {items.data.map((i) => (
              <tr key={i.id}>
                <td className="font-semibold">{i.productos?.nombre ?? '—'}</td>
                <td className="text-right">{i.cantidad}</td>
                <td className="text-right">{pesos(i.costo_unitario)}</td>
                <td className="text-right">{pesos(i.subtotal ?? i.cantidad * i.costo_unitario)}</td>
                <td>{i.fecha_vencimiento ? fecha(i.fecha_vencimiento) : '—'}</td>
              </tr>
            ))}
          </tbody>
        </Tabla>
      )}
      <div className="mt-3 text-right text-sm">
        Total: <b className="font-titulo text-lg">{pesos(compra.total)}</b>
      </div>
      <div className="mt-3"><Aviso>Una compra no se borra. Si hubo un error, corregilo con un ajuste de stock en Productos y, si hace falta, el costo del producto.</Aviso></div>
    </Modal>
  )
}
