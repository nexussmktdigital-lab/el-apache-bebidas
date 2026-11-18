import { useMemo, useState, type FormEvent } from 'react'
import { Plus, XCircle } from 'lucide-react'
import { Aviso, Boton, Campo, Entrada, Insignia, Panel, Selector, Tabla, Vacio } from '@/componentes/ui'
import { Modal } from '@/componentes/Modal'
import { useAvisar } from '@/componentes/Toast'
import { aPesos, fecha, hoyISO, pesos } from '@/lib/formato'
import { NOMBRE_FORMA_PAGO, type GastoVista } from '@/tipos/supabase'
import { mensajeError } from '@/modulos/productos/api'
import { useAnularGasto, useCargarGasto, useGastoCategorias, useGastos, useGuardarGastoCategoria } from './api'

type Rango = 'hoy' | '7' | 'mes' | '30'

function primerDiaMes(iso: string): string {
  return `${iso.slice(0, 7)}-01`
}
function restarDias(iso: string, n: number): string {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d - n)).toISOString().slice(0, 10)
}

export function Gastos() {
  const avisar = useAvisar()
  const categorias = useGastoCategorias()
  const cargar = useCargarGasto()
  const nuevaCategoria = useGuardarGastoCategoria()

  const hoy = hoyISO()
  const [rango, setRango] = useState<Rango>('mes')
  const desde = rango === 'hoy' ? hoy : rango === '7' ? restarDias(hoy, 6) : rango === 'mes' ? primerDiaMes(hoy) : restarDias(hoy, 29)
  const gastos = useGastos(desde, hoy)

  const [f, setF] = useState({ fecha: hoy, monto: '', categoria_id: '', medio_pago: 'efectivo' as 'efectivo' | 'transferencia', pagado_a: '', detalle: '' })
  const [error, setError] = useState<string | null>(null)
  const [anulando, setAnulando] = useState<GastoVista | null>(null)
  const [categoriasAbiertas, setCategoriasAbiertas] = useState(false)
  const [filtroCat, setFiltroCat] = useState('')

  const activas = useMemo(() => (categorias.data ?? []).filter((c) => c.activo), [categorias.data])
  const lista = useMemo(() => (gastos.data ?? []).filter((g) => !filtroCat || g.categoria_id === filtroCat), [gastos.data, filtroCat])
  const total = lista.filter((g) => !g.anulado).reduce((s, g) => s + g.monto, 0)
  const porCategoria = useMemo(() => {
    const m = new Map<string, number>()
    for (const g of lista) if (!g.anulado) m.set(g.categoria ?? 'Sin categoría', (m.get(g.categoria ?? 'Sin categoría') ?? 0) + g.monto)
    return [...m.entries()].sort((a, b) => b[1] - a[1])
  }, [lista])

  async function agregarCategoria() {
    const nombre = window.prompt('Nombre de la nueva categoría de gasto:')?.trim()
    if (!nombre) return
    try {
      const id = await nuevaCategoria.mutateAsync({ nombre })
      setF((p) => ({ ...p, categoria_id: id }))
      avisar(`Se agregó ${nombre}`, 'ok')
    } catch (e) {
      avisar(mensajeError(e), 'mal')
    }
  }

  function enviar(e: FormEvent) {
    e.preventDefault()
    setError(null)
    const monto = aPesos(f.monto)
    if (!monto || monto <= 0) return setError('Escribí el monto.')
    if (!f.categoria_id) return setError('Elegí la categoría.')
    cargar.mutate(
      { fecha: f.fecha, monto, categoria_id: f.categoria_id, medio_pago: f.medio_pago, pagado_a: f.pagado_a.trim(), detalle: f.detalle.trim() },
      {
        onSuccess: () => {
          avisar(`Gasto de ${pesos(monto)} cargado`, 'ok')
          setF({ fecha: hoy, monto: '', categoria_id: '', medio_pago: 'efectivo', pagado_a: '', detalle: '' })
        },
        onError: (err) => setError(mensajeError(err)),
      },
    )
  }

  return (
    <>
      <p className="mb-4 text-tinta-2">Todo gasto cargado entra en el balance del día y del mes. Un gasto no se edita: se anula con motivo y se carga de nuevo.</p>

      <Panel titulo="Nuevo gasto" extra={<Boton chico onClick={() => setCategoriasAbiertas(true)}>Categorías</Boton>}>
        <form onSubmit={enviar} className="grid gap-3 md:grid-cols-6">
          <Campo etiqueta="Fecha">
            <Entrada type="date" value={f.fecha} max={hoy} onChange={(e) => setF((p) => ({ ...p, fecha: e.target.value }))} />
          </Campo>
          <Campo etiqueta="Monto">
            <Entrada inputMode="numeric" value={f.monto} onChange={(e) => setF((p) => ({ ...p, monto: e.target.value }))} placeholder="25000" autoFocus />
          </Campo>
          <Campo etiqueta="Categoría">
            <div className="flex gap-1.5">
              <Selector className="min-w-0 flex-1" value={f.categoria_id} onChange={(e) => setF((p) => ({ ...p, categoria_id: e.target.value }))}>
                <option value="">Elegí</option>
                {activas.map((c) => (
                  <option key={c.id} value={c.id}>{c.nombre}</option>
                ))}
              </Selector>
              <Boton type="button" onClick={() => void agregarCategoria()} title="Nueva categoría"><Plus size={16} /></Boton>
            </div>
          </Campo>
          <Campo etiqueta="Medio de pago">
            <Selector value={f.medio_pago} onChange={(e) => setF((p) => ({ ...p, medio_pago: e.target.value as 'efectivo' | 'transferencia' }))}>
              <option value="efectivo">Efectivo</option>
              <option value="transferencia">Transferencia</option>
            </Selector>
          </Campo>
          <Campo etiqueta="A quién se le pagó">
            <Entrada value={f.pagado_a} onChange={(e) => setF((p) => ({ ...p, pagado_a: e.target.value }))} placeholder="YPF, EPEC, Juan…" />
          </Campo>
          <Campo etiqueta="Detalle">
            <Entrada value={f.detalle} onChange={(e) => setF((p) => ({ ...p, detalle: e.target.value }))} placeholder="Por qué" />
          </Campo>
          <div className="md:col-span-6 flex items-center justify-end gap-3">
            {error && <div className="rounded-lg bg-mal-tinte px-3 py-2 text-[13px] text-mal">{error}</div>}
            <Boton type="submit" variante="primario" cargando={cargar.isPending}>Cargar gasto</Boton>
          </div>
        </form>
      </Panel>

      <div className="grid gap-3 lg:grid-cols-[2fr_1fr]">
        <Panel
          titulo={
            <>
              Gastos <span className="text-[13px] font-normal text-mudo">{pesos(total)}</span>
            </>
          }
          extra={
            <div className="flex flex-wrap items-center gap-1">
              {(['hoy', '7', 'mes', '30'] as const).map((r) => (
                <Boton key={r} chico variante={rango === r ? 'primario' : 'secundario'} onClick={() => setRango(r)}>
                  {r === 'hoy' ? 'Hoy' : r === '7' ? '7 días' : r === 'mes' ? 'Este mes' : '30 días'}
                </Boton>
              ))}
              <Selector value={filtroCat} onChange={(e) => setFiltroCat(e.target.value)} className="ml-1 py-1 text-[12.5px]">
                <option value="">Todas las categorías</option>
                {(categorias.data ?? []).map((c) => (
                  <option key={c.id} value={c.id}>{c.nombre}</option>
                ))}
              </Selector>
            </div>
          }
        >
          {gastos.isLoading && <Vacio>Cargando…</Vacio>}
          {gastos.data && lista.length === 0 && <Vacio>No hay gastos en este período.</Vacio>}
          {lista.length > 0 && (
            <Tabla>
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Categoría</th>
                  <th>A quién / detalle</th>
                  <th>Pago</th>
                  <th className="text-right!">Monto</th>
                  <th>Cargó</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {lista.map((g) => (
                  <tr key={g.id} className={g.anulado ? 'opacity-60' : ''}>
                    <td className="whitespace-nowrap">{fecha(g.fecha)}</td>
                    <td>{g.categoria ?? '—'}</td>
                    <td className="max-w-[280px]">
                      {g.pagado_a && <b>{g.pagado_a}</b>}
                      {g.pagado_a && g.detalle && ' · '}
                      <span className="text-tinta-2">{g.detalle}</span>
                      {g.anulado && <small className="block text-mal">Anulado: {g.anulado_motivo}</small>}
                    </td>
                    <td><Insignia tono="neutro">{NOMBRE_FORMA_PAGO[g.medio_pago]}</Insignia></td>
                    <td className="text-right font-semibold">{g.anulado ? <s>{pesos(g.monto)}</s> : pesos(g.monto)}</td>
                    <td className="whitespace-nowrap text-tinta-2">{g.usuario ?? '—'}</td>
                    <td className="text-right">
                      {!g.anulado && (
                        <Boton chico variante="fantasma" onClick={() => setAnulando(g)} title="Anular gasto"><XCircle size={14} /></Boton>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </Tabla>
          )}
        </Panel>

        <Panel titulo="Por categoría">
          {porCategoria.length === 0 && <Vacio>Sin gastos en el período.</Vacio>}
          {porCategoria.map(([nombre, monto]) => (
            <div key={nombre} className="grid grid-cols-[110px_1fr_auto] items-center gap-2.5 py-1.5 text-[13px]">
              <span className="truncate">{nombre}</span>
              <div className="h-2.5 overflow-hidden rounded-lg bg-[#EEF1F6]">
                <i className="block h-full rounded-lg bg-azul" style={{ width: `${total ? (monto / total) * 100 : 0}%` }} />
              </div>
              <b className="text-right">{pesos(monto)}</b>
            </div>
          ))}
        </Panel>
      </div>

      {anulando && <AnularGasto gasto={anulando} onCerrar={() => setAnulando(null)} />}
      {categoriasAbiertas && <CategoriasGasto onCerrar={() => setCategoriasAbiertas(false)} />}
    </>
  )
}

function AnularGasto({ gasto, onCerrar }: { gasto: GastoVista; onCerrar: () => void }) {
  const anular = useAnularGasto()
  const avisar = useAvisar()
  const [motivo, setMotivo] = useState('')
  const [error, setError] = useState<string | null>(null)
  return (
    <Modal
      titulo="Anular gasto"
      onCerrar={onCerrar}
      ancho="sm"
      pie={
        <>
          <Boton onClick={onCerrar}>Cancelar</Boton>
          <Boton
            variante="peligro"
            cargando={anular.isPending}
            onClick={() => {
              if (!motivo.trim()) return setError('Escribí el motivo.')
              anular.mutate({ id: gasto.id, motivo: motivo.trim() }, { onSuccess: () => { avisar('Gasto anulado', 'ok'); onCerrar() }, onError: (e) => setError(mensajeError(e)) })
            }}
          >
            Anular
          </Boton>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <div className="text-sm text-tinta-2">{fecha(gasto.fecha)} · {gasto.categoria} · <b className="text-tinta">{pesos(gasto.monto)}</b>{gasto.pagado_a ? ` · ${gasto.pagado_a}` : ''}</div>
        <Aviso tono="aviso">El gasto queda marcado como anulado y sale del balance. No se borra.</Aviso>
        <Campo etiqueta="Motivo">
          <Entrada value={motivo} onChange={(e) => setMotivo(e.target.value)} autoFocus placeholder="Ej.: cargado dos veces" />
        </Campo>
        {error && <div className="rounded-lg bg-mal-tinte px-3 py-2 text-[13px] text-mal">{error}</div>}
      </div>
    </Modal>
  )
}

function CategoriasGasto({ onCerrar }: { onCerrar: () => void }) {
  const categorias = useGastoCategorias()
  const guardar = useGuardarGastoCategoria()
  const avisar = useAvisar()
  const [nuevo, setNuevo] = useState('')
  return (
    <Modal titulo="Categorías de gastos" onCerrar={onCerrar} ancho="sm" pie={<Boton onClick={onCerrar}>Cerrar</Boton>}>
      <form
        className="mb-3 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          if (!nuevo.trim()) return
          guardar.mutate({ nombre: nuevo.trim() }, { onSuccess: () => { setNuevo(''); avisar('Categoría agregada', 'ok') }, onError: (err) => avisar(mensajeError(err), 'mal') })
        }}
      >
        <Entrada className="flex-1" value={nuevo} onChange={(e) => setNuevo(e.target.value)} placeholder="Nueva categoría" />
        <Boton type="submit" variante="primario" cargando={guardar.isPending}><Plus size={16} /> Agregar</Boton>
      </form>
      {(categorias.data ?? []).map((c) => (
        <div key={c.id} className="flex items-center justify-between border-b border-[#F0F0F3] py-2 last:border-b-0">
          <span className={c.activo ? '' : 'text-mudo line-through'}>{c.nombre}</span>
          <Boton chico variante="fantasma" onClick={() => guardar.mutate({ id: c.id, nombre: c.nombre, activo: !c.activo }, { onError: (err) => avisar(mensajeError(err), 'mal') })}>
            {c.activo ? 'Desactivar' : 'Reactivar'}
          </Boton>
        </div>
      ))}
      <div className="mt-2 text-xs text-mudo">Una categoría desactivada no se ofrece para gastos nuevos, pero los gastos viejos la conservan.</div>
    </Modal>
  )
}
