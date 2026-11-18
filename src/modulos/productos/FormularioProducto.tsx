import { useState, type FormEvent } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { Modal } from '@/componentes/Modal'
import { Aviso, Boton, Campo, Entrada, Selector, Tabla, Vacio } from '@/componentes/ui'
import { useAvisar } from '@/componentes/Toast'
import { pesos, porcentaje, fecha, fechaHora, aPesos } from '@/lib/formato'
import { etiquetaUnidad, type ProductoVista, type UnidadVenta } from '@/tipos/supabase'
import { useLotes, useMovimientos } from '@/modulos/stock/api'
import { TablaMovimientos } from '@/modulos/stock/Movimientos'
import { useCategorias, useGuardarProducto, useHistorialPrecios, useMarcas, useProveedores, useGuardarItemLista, mensajeError, type DatosProducto } from './api'
import { calcularPrecio } from './precios'

type Modo = 'porcentaje' | 'manual'

export function FormularioProducto({
  producto,
  onCerrar,
  onAjustar,
}: {
  producto: ProductoVista | null
  onCerrar: () => void
  onAjustar?: (p: ProductoVista) => void
}) {
  const avisar = useAvisar()
  const categorias = useCategorias()
  const marcas = useMarcas()
  const proveedores = useProveedores()
  const guardar = useGuardarProducto()
  const nuevaCategoria = useGuardarItemLista('categorias')
  const nuevaMarca = useGuardarItemLista('marcas')
  const nuevoProveedor = useGuardarItemLista('proveedores')
  const historial = useHistorialPrecios(producto?.id ?? null)
  const redondeo = useQuery({
    queryKey: ['configuracion', 'redondeo'],
    queryFn: async () => {
      const { data } = await supabase.from('configuracion').select('redondeo_precio').single()
      return data?.redondeo_precio ?? 10
    },
  })

  const [f, setF] = useState<DatosProducto>({
    id: producto?.id,
    nombre: producto?.nombre ?? '',
    categoria_id: producto?.categoria_id ?? null,
    marca_id: producto?.marca_id ?? null,
    proveedor_id: producto?.proveedor_id ?? null,
    unidad_venta: producto?.unidad_venta ?? 'pack',
    unidades_por_bulto: producto?.unidades_por_bulto ?? 6,
    codigo: producto?.codigo ?? '',
    stock_minimo: producto?.stock_minimo ?? 0,
    activo: producto?.activo ?? true,
    costo_actual: producto?.costo_actual ?? 0,
    margen_pct: producto?.margen_pct ?? 25,
    precio_manual: producto?.precio_manual ?? null,
  })
  const [modo, setModo] = useState<Modo>(producto?.precio_manual != null ? 'manual' : 'porcentaje')
  const [pestana, setPestana] = useState<'datos' | 'historial' | 'stock'>('datos')
  const movimientos = useMovimientos(pestana === 'stock' ? (producto?.id ?? null) : null, 50)
  const lotes = useLotes(pestana === 'stock' ? (producto?.id ?? null) : null)
  const [error, setError] = useState<string | null>(null)

  const set = <K extends keyof DatosProducto>(k: K, v: DatosProducto[K]) => setF((prev) => ({ ...prev, [k]: v }))

  const precio = calcularPrecio(f.costo_actual, f.margen_pct, modo === 'manual' ? f.precio_manual : null, redondeo.data ?? 10)
  const bajoCosto = f.costo_actual > 0 && precio < f.costo_actual
  const margenPesos = precio - f.costo_actual

  async function agregarALista(tipo: 'categoria' | 'marca' | 'proveedor') {
    const nombre = window.prompt(`Nombre de la nueva ${tipo}:`)?.trim()
    if (!nombre) return
    try {
      if (tipo === 'categoria') set('categoria_id', await nuevaCategoria.mutateAsync({ nombre }))
      if (tipo === 'marca') set('marca_id', await nuevaMarca.mutateAsync({ nombre }))
      if (tipo === 'proveedor') set('proveedor_id', await nuevoProveedor.mutateAsync({ nombre }))
      avisar(`Se agregó ${nombre}`, 'ok')
    } catch (e) {
      avisar(mensajeError(e), 'mal')
    }
  }

  function enviar(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (!f.nombre.trim()) return setError('Escribí el nombre del producto.')
    if (f.unidades_por_bulto < 1) return setError('Las unidades por bulto tienen que ser 1 o más.')
    if (modo === 'manual' && (f.precio_manual == null || f.precio_manual < 0)) return setError('Escribí el precio de venta.')
    guardar.mutate(
      { ...f, nombre: f.nombre.trim(), precio_manual: modo === 'manual' ? f.precio_manual : null },
      {
        onSuccess: () => {
          avisar(producto ? 'Producto guardado' : 'Producto cargado', 'ok')
          onCerrar()
        },
        onError: (err) => setError(mensajeError(err)),
      },
    )
  }

  return (
    <Modal
      titulo={producto ? `Editar ${producto.nombre}` : 'Nuevo producto'}
      onCerrar={onCerrar}
      ancho="lg"
      pie={
        pestana === 'datos' ? (
          <>
            <Boton onClick={onCerrar}>Cancelar</Boton>
            <Boton variante="primario" form="form-producto" type="submit" cargando={guardar.isPending}>
              {producto ? 'Guardar cambios' : 'Cargar producto'}
            </Boton>
          </>
        ) : undefined
      }
    >
      {producto && (
        <div className="mb-4 flex gap-1 rounded-lg bg-fondo p-1 text-sm">
          {(['datos', 'stock', 'historial'] as const).map((t) => (
            <button key={t} type="button" onClick={() => setPestana(t)} className={`flex-1 rounded-md px-3 py-1.5 font-medium ${pestana === t ? 'bg-white text-azul shadow-tarjeta' : 'text-tinta-2'}`}>
              {t === 'datos' ? 'Datos y precio' : t === 'stock' ? 'Stock y lotes' : 'Historial de precios'}
            </button>
          ))}
        </div>
      )}

      {pestana === 'stock' && producto && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-sm text-tinta-2">
              Stock actual: <b className="font-titulo text-xl text-tinta">{producto.stock_actual}</b> {etiquetaUnidad(producto.unidad_venta, producto.unidades_por_bulto)}
              {' · '}mínimo {producto.stock_minimo}
            </div>
            {onAjustar && <Boton onClick={() => onAjustar(producto)}>Ajustar stock</Boton>}
          </div>
          <div>
            <div className="mb-1.5 text-sm font-semibold">Lotes con stock</div>
            {lotes.isLoading && <Vacio>Cargando…</Vacio>}
            {lotes.data?.length === 0 && <Vacio>Sin stock.</Vacio>}
            {lotes.data && lotes.data.length > 0 && (
              <Tabla>
                <thead>
                  <tr>
                    <th>Vence</th>
                    <th className="text-right!">Disponible</th>
                    <th className="text-right!">Ingresó</th>
                    <th className="text-right!">Costo</th>
                    <th>Desde</th>
                  </tr>
                </thead>
                <tbody>
                  {lotes.data.map((l) => (
                    <tr key={l.id}>
                      <td>{l.fecha_vencimiento ? fecha(l.fecha_vencimiento) : <span className="text-mudo">Sin vencimiento</span>}</td>
                      <td className="text-right font-semibold">{l.cantidad_disponible}</td>
                      <td className="text-right text-tinta-2">{l.cantidad_inicial}</td>
                      <td className="text-right">{pesos(l.costo_unitario)}</td>
                      <td className="text-tinta-2">{fecha(l.creado_en)}</td>
                    </tr>
                  ))}
                </tbody>
              </Tabla>
            )}
          </div>
          <div>
            <div className="mb-1.5 text-sm font-semibold">Últimos movimientos</div>
            {movimientos.isLoading && <Vacio>Cargando…</Vacio>}
            {movimientos.data?.length === 0 && <Vacio>Sin movimientos.</Vacio>}
            {movimientos.data && movimientos.data.length > 0 && <TablaMovimientos movimientos={movimientos.data} />}
          </div>
        </div>
      )}

      {pestana === 'historial' && (
        <div>
          {historial.isLoading && <Vacio>Cargando…</Vacio>}
          {historial.data?.length === 0 && <Vacio>Sin cambios de precio registrados.</Vacio>}
          {historial.data?.map((h) => (
            <div key={h.id} className="flex items-center justify-between gap-3 border-b border-[#F0F0F3] py-2 last:border-b-0">
              <div>
                <b>{pesos(h.precio_venta)}</b>{' '}
                <span className="text-tinta-2">
                  {h.precio_manual != null ? 'a mano' : `costo ${pesos(h.costo)} + ${porcentaje(h.margen_pct)}`}
                </span>
                <small className="block text-mudo">
                  {fechaHora(h.fecha)} · {h.motivo}
                </small>
              </div>
            </div>
          ))}
        </div>
      )}

      {pestana === 'datos' && (
        <form id="form-producto" onSubmit={enviar} className="flex flex-col gap-4">
          <div className="grid gap-3 md:grid-cols-2">
            <Campo etiqueta="Nombre" className="md:col-span-2">
              <Entrada value={f.nombre} onChange={(e) => set('nombre', e.target.value)} placeholder="Coca-Cola 2,25 L" autoFocus required />
            </Campo>
            <Campo etiqueta="Categoría">
              <div className="flex gap-1.5">
                <Selector className="flex-1" value={f.categoria_id ?? ''} onChange={(e) => set('categoria_id', e.target.value || null)}>
                  <option value="">Sin categoría</option>
                  {categorias.data?.filter((c) => c.activo || c.id === f.categoria_id).map((c) => (
                    <option key={c.id} value={c.id}>{c.nombre}</option>
                  ))}
                </Selector>
                <Boton type="button" onClick={() => void agregarALista('categoria')} title="Nueva categoría">+</Boton>
              </div>
            </Campo>
            <Campo etiqueta="Marca">
              <div className="flex gap-1.5">
                <Selector className="flex-1" value={f.marca_id ?? ''} onChange={(e) => set('marca_id', e.target.value || null)}>
                  <option value="">Sin marca</option>
                  {marcas.data?.filter((c) => c.activo || c.id === f.marca_id).map((c) => (
                    <option key={c.id} value={c.id}>{c.nombre}</option>
                  ))}
                </Selector>
                <Boton type="button" onClick={() => void agregarALista('marca')} title="Nueva marca">+</Boton>
              </div>
            </Campo>
            <Campo etiqueta="Proveedor">
              <div className="flex gap-1.5">
                <Selector className="flex-1" value={f.proveedor_id ?? ''} onChange={(e) => set('proveedor_id', e.target.value || null)}>
                  <option value="">Sin proveedor</option>
                  {proveedores.data?.filter((c) => c.activo || c.id === f.proveedor_id).map((c) => (
                    <option key={c.id} value={c.id}>{c.nombre}</option>
                  ))}
                </Selector>
                <Boton type="button" onClick={() => void agregarALista('proveedor')} title="Nuevo proveedor">+</Boton>
              </div>
            </Campo>
            <Campo etiqueta="Código interno o de barras" ayuda="Opcional. No puede repetirse.">
              <Entrada value={f.codigo} onChange={(e) => set('codigo', e.target.value)} placeholder="7790895000997" />
            </Campo>
            <Campo etiqueta="Se vende por">
              <Selector value={f.unidad_venta} onChange={(e) => set('unidad_venta', e.target.value as UnidadVenta)}>
                <option value="unidad">Unidad</option>
                <option value="pack">Pack</option>
                <option value="caja">Caja</option>
                <option value="cajon">Cajón</option>
              </Selector>
            </Campo>
            <Campo etiqueta="Unidades por pack, caja o cajón" ayuda="Cuántas botellas o latas trae. Si se vende por unidad, dejá 1.">
              <Entrada type="number" min={1} max={1000} value={f.unidades_por_bulto} disabled={f.unidad_venta === 'unidad'} onChange={(e) => set('unidades_por_bulto', Math.max(1, Number.parseInt(e.target.value || '1', 10) || 1))} />
            </Campo>
            <Campo etiqueta="Stock mínimo" ayuda="Cuando el stock llega a este número, el sistema avisa.">
              <Entrada type="number" min={0} value={f.stock_minimo} onChange={(e) => set('stock_minimo', Math.max(0, Number.parseInt(e.target.value || '0', 10) || 0))} />
            </Campo>
            {producto && (
              <label className="flex items-center gap-2 self-end pb-2 text-sm">
                <input type="checkbox" checked={f.activo} onChange={(e) => set('activo', e.target.checked)} className="h-4 w-4 accent-azul" />
                Producto activo
              </label>
            )}
          </div>

          <div className="rounded-xl border border-borde bg-fondo/60 p-3.5">
            <div className="mb-2.5 text-sm font-semibold">Costo y precio</div>
            <div className="grid gap-3 md:grid-cols-3">
              <Campo etiqueta="Costo (por unidad de venta)">
                <Entrada inputMode="numeric" value={f.costo_actual} onChange={(e) => set('costo_actual', aPesos(e.target.value) ?? 0)} />
              </Campo>
              <Campo etiqueta="Precio">
                <Selector value={modo} onChange={(e) => setModo(e.target.value as Modo)}>
                  <option value="porcentaje">Calculado con % de ganancia</option>
                  <option value="manual">Puesto a mano</option>
                </Selector>
              </Campo>
              {modo === 'porcentaje' ? (
                <Campo etiqueta="% de ganancia sobre el costo">
                  <Entrada inputMode="decimal" value={f.margen_pct} onChange={(e) => set('margen_pct', Number.parseFloat(e.target.value.replace(',', '.')) || 0)} />
                </Campo>
              ) : (
                <Campo etiqueta="Precio de venta">
                  <Entrada inputMode="numeric" value={f.precio_manual ?? ''} onChange={(e) => set('precio_manual', aPesos(e.target.value))} />
                </Campo>
              )}
            </div>
            <div className="mt-3 flex flex-wrap items-baseline gap-x-4 gap-y-1">
              <span className="text-sm text-tinta-2">Precio de venta:</span>
              <span className="font-titulo text-2xl font-semibold">{pesos(precio)}</span>
              <span className="text-sm text-tinta-2">
                Margen: <b>{pesos(margenPesos)}</b>{precio > 0 ? ` (${porcentaje((margenPesos / precio) * 100)} del precio)` : ''}
              </span>
            </div>
            {bajoCosto && <div className="mt-2"><Aviso tono="mal">Atención: el precio queda por debajo del costo.</Aviso></div>}
          </div>

          {error && <div className="rounded-lg bg-mal-tinte px-3 py-2 text-[13px] text-mal">{error}</div>}
        </form>
      )}
    </Modal>
  )
}
