import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Search, TrendingUp, ListTree, Pencil, History, PackagePlus } from 'lucide-react'
import { AjusteStock } from '@/modulos/stock/AjusteStock'
import { diasHasta, fecha } from '@/lib/formato'
import { usePerfil } from '@/app/AuthProvider'
import { puede } from '@/lib/permisos'
import { pesos, porcentaje, numero } from '@/lib/formato'
import { etiquetaUnidad, type ProductoVista } from '@/tipos/supabase'
import { Boton, Campo, Entrada, Insignia, Panel, Selector, Tabla, Vacio } from '@/componentes/ui'
import { useAvisar } from '@/componentes/Toast'
import { useCategorias, useEditarCostos, useEditarProducto, useProductos, useProveedores, useValorStock, mensajeError } from './api'
import { FormularioProducto } from './FormularioProducto'
import { AumentoMasivo } from './AumentoMasivo'

type Estado = 'activos' | 'inactivos' | 'todos'

export function Productos() {
  const perfil = usePerfil()
  const veCostos = puede(perfil.rol, 'ver_costos')
  const edita = puede(perfil.rol, 'editar_productos')
  const veGanancias = puede(perfil.rol, 'ver_ganancias')
  const avisar = useAvisar()

  const productos = useProductos()
  const categorias = useCategorias()
  const proveedores = useProveedores()
  const valor = useValorStock()

  const [busqueda, setBusqueda] = useState('')
  const [categoria, setCategoria] = useState('')
  const [proveedor, setProveedor] = useState('')
  const [estado, setEstado] = useState<Estado>('activos')
  const [soloAvisos, setSoloAvisos] = useState(false)
  const [editando, setEditando] = useState<ProductoVista | 'nuevo' | null>(null)
  const [ajustando, setAjustando] = useState<ProductoVista | null>(null)
  const [aumento, setAumento] = useState(false)
  const ajusta = puede(perfil.rol, 'ajustar_stock')

  const filtrados = useMemo(() => {
    const q = normalizar(busqueda)
    return (productos.data ?? []).filter((p) => {
      if (estado === 'activos' && !p.activo) return false
      if (estado === 'inactivos' && p.activo) return false
      if (categoria && p.categoria_id !== categoria) return false
      if (proveedor && p.proveedor_id !== proveedor) return false
      if (soloAvisos && !(p.stock_bajo || p.bajo_costo)) return false
      if (q) {
        const texto = normalizar(`${p.nombre} ${p.codigo ?? ''} ${p.marca ?? ''} ${p.categoria ?? ''}`)
        if (!texto.includes(q)) return false
      }
      return true
    })
  }, [productos.data, busqueda, categoria, proveedor, estado, soloAvisos])

  const avisos = (productos.data ?? []).filter((p) => p.activo && (p.stock_bajo || p.bajo_costo)).length

  return (
    <>
      <p className="mb-4 text-tinta-2">
        {veCostos
          ? 'El mínimo de cada producto se elige a mano. El precio sale del porcentaje de ganancia o se escribe directo.'
          : 'Lista de productos con su precio de venta y el stock disponible.'}
      </p>

      {veCostos && valor.data && (
        <div className="mb-3 grid grid-cols-2 gap-3 md:grid-cols-3">
          <Indicador etiqueta="Valor del stock a costo" valor={pesos(valor.data.valor_costo)} />
          <Indicador etiqueta="Productos activos" valor={numero(valor.data.productos)} />
          <Indicador etiqueta="Con avisos" valor={numero(avisos)} tono={avisos ? 'mal' : 'ok'} detalle="stock bajo o precio bajo costo" />
        </div>
      )}

      <Panel>
        <div className="flex flex-col gap-2.5 md:flex-row md:flex-wrap md:items-end">
          <Campo etiqueta="Buscar" className="flex-1 md:min-w-[220px]">
            <div className="relative">
              <Search size={16} className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-mudo" />
              <Entrada
                className="w-full pl-8"
                placeholder="Nombre, código, marca…"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                inputMode="search"
              />
            </div>
          </Campo>
          <div className="grid grid-cols-2 gap-2.5 md:flex">
            <Campo etiqueta="Categoría">
              <Selector value={categoria} onChange={(e) => setCategoria(e.target.value)}>
                <option value="">Todas</option>
                {categorias.data?.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre}
                  </option>
                ))}
              </Selector>
            </Campo>
            <Campo etiqueta="Proveedor">
              <Selector value={proveedor} onChange={(e) => setProveedor(e.target.value)}>
                <option value="">Todos</option>
                {proveedores.data?.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre}
                  </option>
                ))}
              </Selector>
            </Campo>
            <Campo etiqueta="Estado">
              <Selector value={estado} onChange={(e) => setEstado(e.target.value as Estado)}>
                <option value="activos">Activos</option>
                <option value="inactivos">Desactivados</option>
                <option value="todos">Todos</option>
              </Selector>
            </Campo>
            <label className="flex items-center gap-2 self-end pb-2 text-sm text-tinta-2">
              <input type="checkbox" checked={soloAvisos} onChange={(e) => setSoloAvisos(e.target.checked)} className="h-4 w-4 accent-azul" />
              Solo con avisos
            </label>
          </div>
          {edita && (
            <div className="flex flex-wrap gap-2 md:ml-auto">
              {ajusta && (
                <Link to="/productos/movimientos">
                  <Boton>
                    <History size={16} /> Movimientos
                  </Boton>
                </Link>
              )}
              <Link to="/productos/listas">
                <Boton>
                  <ListTree size={16} /> Categorías, marcas y proveedores
                </Boton>
              </Link>
              <Boton onClick={() => setAumento(true)}>
                <TrendingUp size={16} /> Aumentar precios
              </Boton>
              <Boton variante="primario" onClick={() => setEditando('nuevo')}>
                <Plus size={16} /> Nuevo producto
              </Boton>
            </div>
          )}
        </div>
      </Panel>

      <Panel
        titulo={
          <>
            {filtrados.length} {filtrados.length === 1 ? 'producto' : 'productos'}
            {productos.data && filtrados.length !== productos.data.length && (
              <span className="text-[13px] font-normal text-mudo">de {productos.data.length}</span>
            )}
          </>
        }
      >
        {productos.isLoading && <Vacio>Cargando…</Vacio>}
        {productos.error && <Vacio>No pudimos cargar los productos. {mensajeError(productos.error)}</Vacio>}
        {productos.data && filtrados.length === 0 && (
          <Vacio>{productos.data.length === 0 ? 'Todavía no hay productos cargados.' : 'Ningún producto coincide con la búsqueda.'}</Vacio>
        )}
        {filtrados.length > 0 && (
          <>
            {/* Tabla (PC) */}
            <div className="hidden md:block">
              <Tabla>
                <thead>
                  <tr>
                    <th>Producto</th>
                    <th>Unidad</th>
                    <th className="text-right!">Stock</th>
                    {edita && <th className="text-right!">Mínimo</th>}
                    {veCostos && <th className="text-right!">Costo</th>}
                    {veCostos && <th className="text-right!">% ganancia</th>}
                    <th className="text-right!">Precio</th>
                    {veGanancias && <th className="text-right!">Margen</th>}
                    <th>Estado</th>
                    {edita && <th></th>}
                  </tr>
                </thead>
                <tbody>
                  {filtrados.map((p) => (
                    <Fila key={p.id} p={p} veCostos={veCostos} veGanancias={veGanancias} edita={edita} onEditar={() => setEditando(p)} onAjustar={ajusta ? () => setAjustando(p) : undefined} avisar={avisar} />
                  ))}
                </tbody>
              </Tabla>
            </div>
            {/* Tarjetas (celular) */}
            <div className="flex flex-col gap-2 md:hidden">
              {filtrados.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => edita && setEditando(p)}
                  className="flex items-center gap-3 rounded-xl border border-borde px-3 py-2.5 text-left"
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-semibold">{p.nombre}</div>
                    <div className="text-xs text-tinta-3">
                      {p.categoria ?? 'Sin categoría'} · {etiquetaUnidad(p.unidad_venta, p.unidades_por_bulto)} · stock {p.stock_actual}
                    </div>
                    <div className="mt-1 flex flex-wrap gap-1">
                      <Estados p={p} />
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-titulo text-[17px] font-semibold">{pesos(p.precio_venta)}</div>
                    {veCostos && p.costo_actual != null && <div className="text-xs text-tinta-3">costo {pesos(p.costo_actual)}</div>}
                  </div>
                </button>
              ))}
            </div>
          </>
        )}
      </Panel>

      {editando && <FormularioProducto producto={editando === 'nuevo' ? null : editando} onCerrar={() => setEditando(null)} onAjustar={ajusta ? (p) => { setEditando(null); setAjustando(p) } : undefined} />}
      {ajustando && <AjusteStock producto={ajustando} onCerrar={() => setAjustando(null)} />}
      {aumento && <AumentoMasivo onCerrar={() => setAumento(false)} />}
    </>
  )
}

function Fila({
  p,
  veCostos,
  veGanancias,
  edita,
  onEditar,
  onAjustar,
  avisar,
}: {
  p: ProductoVista
  veCostos: boolean
  veGanancias: boolean
  edita: boolean
  onEditar: () => void
  onAjustar?: () => void
  avisar: ReturnType<typeof useAvisar>
}) {
  const editarProducto = useEditarProducto()
  const editarCostos = useEditarCostos()

  const guardarMinimo = (v: string) => {
    const n = Number.parseInt(v, 10)
    if (!Number.isFinite(n) || n < 0 || n === p.stock_minimo) return
    editarProducto.mutate({ id: p.id, cambios: { stock_minimo: n } }, { onSuccess: () => avisar(`Mínimo de ${p.nombre}: ${n}`), onError: (e) => avisar(mensajeError(e), 'mal') })
  }
  const guardarMargen = (v: string) => {
    const n = Number.parseFloat(v.replace(',', '.'))
    if (!Number.isFinite(n) || n < -100) return
    editarCostos.mutate(
      { id: p.id, cambios: { margen_pct: n, precio_manual: null } },
      { onSuccess: () => avisar(`Precio calculado con ${n} % de ganancia`), onError: (e) => avisar(mensajeError(e), 'mal') },
    )
  }
  const guardarPrecio = (v: string) => {
    const n = Number.parseInt(v.replace(/\D/g, ''), 10)
    if (!Number.isFinite(n) || n < 0 || n === p.precio_venta) return
    editarCostos.mutate(
      { id: p.id, cambios: { precio_manual: n } },
      {
        onSuccess: () => avisar(p.costo_actual != null && n < p.costo_actual ? 'Atención: el precio queda por debajo del costo' : `Precio puesto a mano: ${pesos(n)}`, p.costo_actual != null && n < p.costo_actual ? 'mal' : 'ok'),
        onError: (e) => avisar(mensajeError(e), 'mal'),
      },
    )
  }
  const guardarCosto = (v: string) => {
    const n = Number.parseInt(v.replace(/\D/g, ''), 10)
    if (!Number.isFinite(n) || n < 0 || n === p.costo_actual) return
    editarCostos.mutate({ id: p.id, cambios: { costo_actual: n } }, { onSuccess: () => avisar(`Costo de ${p.nombre}: ${pesos(n)}`), onError: (e) => avisar(mensajeError(e), 'mal') })
  }

  const claseNum = 'w-[84px] rounded-md border border-borde px-1.5 py-1 text-right text-sm focus:border-azul focus:outline-none focus:ring-2 focus:ring-azul-tinte'

  return (
    <tr className={p.activo ? '' : 'opacity-60'}>
      <td>
        <div className="font-semibold">{p.nombre}</div>
        <div className="text-xs text-mudo">
          {p.categoria ?? 'Sin categoría'}
          {p.marca ? ` · ${p.marca}` : ''}
          {p.codigo ? ` · ${p.codigo}` : ''}
        </div>
      </td>
      <td className="whitespace-nowrap">{etiquetaUnidad(p.unidad_venta, p.unidades_por_bulto)}</td>
      <td className="text-right font-semibold whitespace-nowrap">
        {p.stock_actual}
        {p.vence_proximo && (
          <small className={`block font-normal ${diasHasta(p.vence_proximo) <= 7 ? 'text-mal' : 'text-mudo'}`}>vence {fecha(p.vence_proximo)}</small>
        )}
      </td>
      {edita && (
        <td className="text-right">
          <input key={p.stock_minimo} type="number" min={0} defaultValue={p.stock_minimo} className={`${claseNum} w-[64px]`} onBlur={(e) => guardarMinimo(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()} aria-label="Stock mínimo" />
        </td>
      )}
      {veCostos && (
        <td className="text-right">
          {edita ? (
            <input key={p.costo_actual} type="text" inputMode="numeric" defaultValue={p.costo_actual ?? 0} className={claseNum} onBlur={(e) => guardarCosto(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()} aria-label="Costo" />
          ) : (
            pesos(p.costo_actual)
          )}
        </td>
      )}
      {veCostos && (
        <td className="text-right">
          {edita ? (
            <input key={`${p.margen_pct}-${p.precio_manual}`} type="text" inputMode="decimal" defaultValue={p.precio_manual != null && p.costo_actual ? Math.round((p.precio_manual / p.costo_actual - 1) * 100) : (p.margen_pct ?? 0)} className={`${claseNum} w-[64px]`} onBlur={(e) => guardarMargen(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()} aria-label="Porcentaje de ganancia" />
          ) : (
            porcentaje(p.margen_pct)
          )}
        </td>
      )}
      <td className="text-right">
        {edita ? (
          <input key={p.precio_venta} type="text" inputMode="numeric" defaultValue={p.precio_venta} className={claseNum} onBlur={(e) => guardarPrecio(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()} aria-label="Precio de venta" />
        ) : (
          <b>{pesos(p.precio_venta)}</b>
        )}
      </td>
      {veGanancias && (
        <td className="text-right whitespace-nowrap">
          {pesos(p.margen_pesos)}
          <br />
          <small className="text-mudo">{p.margen_real_pct != null ? porcentaje(p.margen_real_pct) : '—'}</small>
        </td>
      )}
      <td>
        <div className="flex flex-wrap gap-1">
          <Estados p={p} />
        </div>
      </td>
      {edita && (
        <td className="text-right whitespace-nowrap">
          {onAjustar && (
            <Boton chico variante="fantasma" onClick={onAjustar} aria-label={`Ajustar stock de ${p.nombre}`} title="Ajustar stock">
              <PackagePlus size={14} /> Stock
            </Boton>
          )}{' '}
          <Boton chico onClick={onEditar} aria-label={`Editar ${p.nombre}`}>
            <Pencil size={14} /> Editar
          </Boton>
        </td>
      )}
    </tr>
  )
}

function Estados({ p }: { p: ProductoVista }) {
  return (
    <>
      {!p.activo && <Insignia tono="neutro">Desactivado</Insignia>}
      {p.activo && p.stock_bajo && <Insignia tono="mal">Stock bajo</Insignia>}
      {p.activo && p.bajo_costo && <Insignia tono="mal">Bajo costo</Insignia>}
      {p.activo && !p.stock_bajo && !p.bajo_costo && <Insignia tono="ok">Bien</Insignia>}
      {p.precio_manual != null && <Insignia tono="neutro">Precio a mano</Insignia>}
    </>
  )
}

function Indicador({ etiqueta, valor, detalle, tono }: { etiqueta: string; valor: string; detalle?: string; tono?: 'ok' | 'mal' }) {
  return (
    <div className="rounded-tarjeta border border-borde bg-white px-4 py-3 shadow-tarjeta">
      <div className="text-[13px] text-tinta-3">{etiqueta}</div>
      <div className={`font-titulo text-[22px] font-semibold tracking-tight ${tono === 'mal' ? 'text-mal' : tono === 'ok' ? 'text-ok' : ''}`}>{valor}</div>
      {detalle && <div className="text-xs text-tinta-2">{detalle}</div>}
    </div>
  )
}

function normalizar(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
}
