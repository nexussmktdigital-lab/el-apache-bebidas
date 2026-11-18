import { useMemo, useState, type FormEvent } from 'react'
import { useQuery } from '@tanstack/react-query'
import { MessageCircle, Plus, Search } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { usePerfil } from '@/app/AuthProvider'
import { puede } from '@/lib/permisos'
import { aPesos, fecha, fechaHora, hoyISO, pesos } from '@/lib/formato'
import { NOMBRE_FORMA_PAGO, NOMBRE_TIPO_CC, type ClienteVista, type Configuracion, type EstadoCuenta } from '@/tipos/supabase'
import { Aviso, Boton, Campo, Entrada, Insignia, Panel, Selector, Tabla, Vacio, AreaTexto } from '@/componentes/ui'
import { Modal } from '@/componentes/Modal'
import { useAvisar } from '@/componentes/Toast'
import { mensajeError } from '@/modulos/productos/api'
import { useAjustarCc, useCcMovimientos, useClientes, useGuardarCliente, useRegistrarPago, type DatosCliente } from './api'
import { enlaceWhatsApp, mensajeCuenta } from './whatsapp'

type Filtro = 'deudores' | 'todos' | 'inactivos'

export function useConfiguracion() {
  return useQuery({
    queryKey: ['configuracion'],
    queryFn: async () => {
      const { data, error } = await supabase.from('configuracion').select('*').single()
      if (error) throw error
      return data as Configuracion
    },
  })
}

export function EstadoCuentaInsignia({ c }: { c: Pick<ClienteVista, 'saldo' | 'estado' | 'dias' | 'vence_el'> }) {
  if (c.saldo <= 0) return <Insignia tono="ok">Al día</Insignia>
  if (c.estado === 'vencida') return <Insignia tono="mal">Vencida hace {-(c.dias ?? 0)} {-(c.dias ?? 0) === 1 ? 'día' : 'días'}</Insignia>
  if (c.estado === 'por_vencer') return <Insignia tono="aviso">{c.dias === 0 ? 'Vence hoy' : `Vence en ${c.dias} ${c.dias === 1 ? 'día' : 'días'}`}</Insignia>
  return <Insignia tono="neutro">{c.vence_el ? `Vence el ${fecha(c.vence_el)}` : 'Debe'}</Insignia>
}

export function BotonWhatsApp({ c, chico = true }: { c: ClienteVista; chico?: boolean }) {
  const conf = useConfiguracion()
  const [abierto, setAbierto] = useState(false)
  const mensaje = conf.data ? mensajeCuenta(conf.data.mensaje_whatsapp, c) : ''
  return (
    <>
      <Boton chico={chico} variante="whatsapp" onClick={() => setAbierto(true)} title="Avisar por WhatsApp">
        <MessageCircle size={14} /> WhatsApp
      </Boton>
      {abierto && (
        <Modal
          titulo={`Aviso a ${c.nombre}`}
          onCerrar={() => setAbierto(false)}
          ancho="sm"
          pie={
            <>
              <Boton onClick={() => setAbierto(false)}>Cerrar</Boton>
              <a href={enlaceWhatsApp(c.telefono, mensaje)} target="_blank" rel="noopener" onClick={() => setAbierto(false)}>
                <Boton variante="whatsapp"><MessageCircle size={16} /> Abrir WhatsApp</Boton>
              </a>
            </>
          }
        >
          <div className="text-sm text-tinta-2">El sistema arma el mensaje y abre el WhatsApp del cliente{c.telefono ? ` (${c.telefono})` : ''}:</div>
          <div className="mt-2.5 rounded-[10px] bg-[#E7F8E4] p-3 text-[13.5px] whitespace-pre-wrap">{mensaje}</div>
          {!c.telefono && <div className="mt-2"><Aviso tono="aviso">Este cliente no tiene teléfono cargado: WhatsApp va a pedir que elijas el contacto.</Aviso></div>}
          <div className="mt-2 text-xs text-mudo">El texto se cambia en Configuración.</div>
        </Modal>
      )}
    </>
  )
}

export function Clientes() {
  const perfil = usePerfil()
  const edita = puede(perfil.rol, 'editar_clientes')
  const cobra = puede(perfil.rol, 'registrar_pagos')
  const clientes = useClientes()

  const [busqueda, setBusqueda] = useState('')
  const [filtro, setFiltro] = useState<Filtro>('deudores')
  const [zona, setZona] = useState('')
  const [ficha, setFicha] = useState<ClienteVista | null>(null)
  const [editando, setEditando] = useState<ClienteVista | 'nuevo' | null>(null)
  const [pagando, setPagando] = useState<ClienteVista | null>(null)

  const zonas = useMemo(() => [...new Set((clientes.data ?? []).map((c) => c.zona).filter(Boolean))].sort(), [clientes.data])

  const lista = useMemo(() => {
    const q = busqueda.trim().toLowerCase()
    const orden: Record<EstadoCuenta, number> = { vencida: 0, por_vencer: 1, al_dia: 2 }
    return (clientes.data ?? [])
      .filter((c) => (filtro === 'inactivos' ? !c.activo : c.activo))
      .filter((c) => filtro !== 'deudores' || c.saldo > 0)
      .filter((c) => !zona || c.zona === zona)
      .filter((c) => !q || `${c.nombre} ${c.zona} ${c.direccion} ${c.telefono}`.toLowerCase().includes(q))
      .sort((a, b) => {
        if (a.saldo > 0 && b.saldo > 0) {
          if (orden[a.estado] !== orden[b.estado]) return orden[a.estado] - orden[b.estado]
          return (a.vence_el ?? '9').localeCompare(b.vence_el ?? '9')
        }
        if (a.saldo > 0) return -1
        if (b.saldo > 0) return 1
        return a.nombre.localeCompare(b.nombre)
      })
  }, [clientes.data, busqueda, filtro, zona])

  const totalPorCobrar = (clientes.data ?? []).filter((c) => c.saldo > 0).reduce((s, c) => s + c.saldo, 0)
  const vencidas = (clientes.data ?? []).filter((c) => c.saldo > 0 && c.estado === 'vencida').length
  const porVencer = (clientes.data ?? []).filter((c) => c.saldo > 0 && c.estado === 'por_vencer').length

  return (
    <>
      <p className="mb-4 text-tinta-2">El sistema avisa antes del vencimiento y deja listo el mensaje para el WhatsApp del cliente. Los pagos se registran acá o desde el reparto.</p>

      <div className="mb-3 grid grid-cols-3 gap-3">
        <Indicador etiqueta="Total por cobrar" valor={pesos(totalPorCobrar)} />
        <Indicador etiqueta="Cuentas vencidas" valor={String(vencidas)} tono={vencidas ? 'mal' : 'ok'} />
        <Indicador etiqueta="Por vencer" valor={String(porVencer)} tono={porVencer ? 'aviso' : 'ok'} />
      </div>

      <Panel>
        <div className="flex flex-col gap-2.5 md:flex-row md:flex-wrap md:items-end">
          <Campo etiqueta="Buscar" className="flex-1 md:min-w-[220px]">
            <div className="relative">
              <Search size={16} className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-mudo" />
              <Entrada className="w-full pl-8" placeholder="Nombre, zona, dirección, teléfono" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
            </div>
          </Campo>
          <Campo etiqueta="Mostrar">
            <Selector value={filtro} onChange={(e) => setFiltro(e.target.value as Filtro)}>
              <option value="deudores">Solo con saldo</option>
              <option value="todos">Todos los activos</option>
              <option value="inactivos">Desactivados</option>
            </Selector>
          </Campo>
          <Campo etiqueta="Zona">
            <Selector value={zona} onChange={(e) => setZona(e.target.value)}>
              <option value="">Todas</option>
              {zonas.map((z) => (
                <option key={z} value={z}>{z}</option>
              ))}
            </Selector>
          </Campo>
          {edita && (
            <Boton variante="primario" className="md:ml-auto" onClick={() => setEditando('nuevo')}>
              <Plus size={16} /> Nuevo cliente
            </Boton>
          )}
        </div>
      </Panel>

      <Panel titulo={`${lista.length} ${lista.length === 1 ? 'cliente' : 'clientes'}`}>
        {clientes.isLoading && <Vacio>Cargando…</Vacio>}
        {clientes.data && lista.length === 0 && <Vacio>{filtro === 'deudores' ? 'Nadie debe nada. ' : 'No hay clientes con esa búsqueda.'}</Vacio>}
        {lista.length > 0 && (
          <>
            <div className="hidden md:block">
              <Tabla>
                <thead>
                  <tr>
                    <th>Cliente</th>
                    <th>Zona</th>
                    <th>Teléfono</th>
                    <th className="text-right!">Saldo</th>
                    <th>Estado</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {lista.map((c) => (
                    <tr key={c.id} className={c.activo ? '' : 'opacity-60'}>
                      <td>
                        <button type="button" className="text-left font-semibold text-azul hover:underline" onClick={() => setFicha(c)}>{c.nombre}</button>
                        {c.direccion && <small className="block text-mudo">{c.direccion}</small>}
                      </td>
                      <td>{c.zona || '—'}</td>
                      <td className="whitespace-nowrap">{c.telefono || '—'}</td>
                      <td className="text-right font-semibold">{pesos(c.saldo)}</td>
                      <td><EstadoCuentaInsignia c={c} /></td>
                      <td className="text-right whitespace-nowrap">
                        {c.saldo > 0 && cobra && <Boton chico onClick={() => setPagando(c)}>Registrar pago</Boton>}{' '}
                        {c.saldo > 0 && <BotonWhatsApp c={c} />}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Tabla>
            </div>
            <div className="flex flex-col gap-2 md:hidden">
              {lista.map((c) => (
                <div key={c.id} className="rounded-xl border border-borde px-3 py-2.5">
                  <button type="button" className="flex w-full items-start justify-between gap-2 text-left" onClick={() => setFicha(c)}>
                    <div className="min-w-0">
                      <div className="truncate font-semibold">{c.nombre}</div>
                      <div className="text-xs text-tinta-3">{[c.zona, c.telefono].filter(Boolean).join(' · ') || '—'}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-titulo text-[17px] font-semibold">{pesos(c.saldo)}</div>
                      <EstadoCuentaInsignia c={c} />
                    </div>
                  </button>
                  {c.saldo > 0 && (
                    <div className="mt-2 flex gap-2">
                      {cobra && <Boton chico onClick={() => setPagando(c)}>Registrar pago</Boton>}
                      <BotonWhatsApp c={c} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </Panel>

      {ficha && <FichaCliente cliente={clientes.data?.find((c) => c.id === ficha.id) ?? ficha} onCerrar={() => setFicha(null)} onEditar={edita ? () => { setEditando(ficha); setFicha(null) } : undefined} onPagar={cobra ? () => setPagando(ficha) : undefined} />}
      {editando && <FormularioCliente cliente={editando === 'nuevo' ? null : editando} onCerrar={() => setEditando(null)} />}
      {pagando && <RegistrarPago cliente={clientes.data?.find((c) => c.id === pagando.id) ?? pagando} onCerrar={() => setPagando(null)} />}
    </>
  )
}

function Indicador({ etiqueta, valor, tono }: { etiqueta: string; valor: string; tono?: 'ok' | 'mal' | 'aviso' }) {
  const color = tono === 'mal' ? 'text-mal' : tono === 'aviso' ? 'text-aviso' : tono === 'ok' ? 'text-ok' : ''
  return (
    <div className="rounded-tarjeta border border-borde bg-white px-4 py-3 shadow-tarjeta">
      <div className="text-[13px] text-tinta-3">{etiqueta}</div>
      <div className={`font-titulo text-[22px] font-semibold tracking-tight ${color}`}>{valor}</div>
    </div>
  )
}

function FichaCliente({ cliente, onCerrar, onEditar, onPagar }: { cliente: ClienteVista; onCerrar: () => void; onEditar?: () => void; onPagar?: () => void }) {
  const movimientos = useCcMovimientos(cliente.id)
  const perfil = usePerfil()
  const ajusta = puede(perfil.rol, 'editar_clientes')
  const [ajustando, setAjustando] = useState(false)
  return (
    <Modal
      titulo={cliente.nombre}
      onCerrar={onCerrar}
      ancho="lg"
      pie={
        <>
          {ajusta && <Boton variante="fantasma" onClick={() => setAjustando(true)}>Ajuste de saldo</Boton>}
          {onEditar && <Boton onClick={onEditar}>Editar datos</Boton>}
          {cliente.saldo > 0 && <BotonWhatsApp c={cliente} chico={false} />}
          {onPagar && cliente.saldo > 0 && <Boton variante="primario" onClick={onPagar}>Registrar pago</Boton>}
        </>
      }
    >
      <div className="grid gap-3 md:grid-cols-[1fr_auto]">
        <div className="text-sm text-tinta-2">
          {cliente.direccion && <div>{cliente.direccion}{cliente.zona ? ` · ${cliente.zona}` : ''}</div>}
          {!cliente.direccion && cliente.zona && <div>{cliente.zona}</div>}
          {cliente.telefono && <div>Tel. {cliente.telefono}</div>}
          {cliente.cuit && <div>CUIT {cliente.cuit}</div>}
          {cliente.notas && <div className="mt-1 italic">{cliente.notas}</div>}
          {!cliente.activo && <div className="mt-1"><Insignia tono="neutro">Desactivado</Insignia></div>}
        </div>
        <div className="text-right">
          <div className="text-[13px] text-tinta-3">Saldo</div>
          <div className="font-titulo text-[26px] font-semibold tracking-tight">{pesos(cliente.saldo)}</div>
          <EstadoCuentaInsignia c={cliente} />
          {cliente.ultimo_pago && <div className="mt-1 text-xs text-mudo">Último pago: {fecha(cliente.ultimo_pago)}</div>}
        </div>
      </div>

      <div className="mt-4 mb-1.5 text-sm font-semibold">Movimientos</div>
      {movimientos.isLoading && <Vacio>Cargando…</Vacio>}
      {movimientos.data?.length === 0 && <Vacio>Sin movimientos todavía.</Vacio>}
      {movimientos.data && movimientos.data.length > 0 && (
        <Tabla>
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Movimiento</th>
              <th>Detalle</th>
              <th className="text-right!">Debe</th>
              <th className="text-right!">Pagó</th>
              <th className="text-right!">Saldo</th>
              <th>Quién</th>
            </tr>
          </thead>
          <tbody>
            {movimientos.data.map((m) => (
              <tr key={m.id}>
                <td className="whitespace-nowrap text-tinta-2">{fechaHora(m.fecha)}</td>
                <td>
                  <Insignia tono={m.tipo === 'pago' ? 'ok' : m.tipo === 'anulacion_venta' ? 'aviso' : 'neutro'}>
                    {NOMBRE_TIPO_CC[m.tipo]}{m.medio_pago ? ` · ${NOMBRE_FORMA_PAGO[m.medio_pago]}` : ''}
                  </Insignia>
                </td>
                <td className="max-w-[240px] text-tinta-2">
                  {m.nota || '—'}
                  {m.vence_el && m.importe > 0 && <small className="block text-mudo">vence {fecha(m.vence_el)}</small>}
                </td>
                <td className="text-right">{m.importe > 0 ? pesos(m.importe) : ''}</td>
                <td className="text-right text-ok">{m.importe < 0 ? pesos(-m.importe) : ''}</td>
                <td className="text-right font-semibold">{pesos(m.saldo_acumulado)}</td>
                <td className="whitespace-nowrap text-tinta-2">{m.usuario ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </Tabla>
      )}
      {ajustando && <AjusteSaldo cliente={cliente} onCerrar={() => setAjustando(false)} />}
    </Modal>
  )
}

export function FormularioCliente({ cliente, onCerrar, onGuardado }: { cliente: ClienteVista | null; onCerrar: () => void; onGuardado?: (id: string) => void }) {
  const guardar = useGuardarCliente()
  const avisar = useAvisar()
  const [f, setF] = useState<DatosCliente>({
    id: cliente?.id,
    nombre: cliente?.nombre ?? '',
    telefono: cliente?.telefono ?? '',
    direccion: cliente?.direccion ?? '',
    zona: cliente?.zona ?? '',
    cuit: cliente?.cuit ?? '',
    notas: cliente?.notas ?? '',
    activo: cliente?.activo ?? true,
  })
  const [error, setError] = useState<string | null>(null)
  const set = <K extends keyof DatosCliente>(k: K, v: DatosCliente[K]) => setF((p) => ({ ...p, [k]: v }))

  function enviar(e: FormEvent) {
    e.preventDefault()
    if (!f.nombre.trim()) return setError('Escribí el nombre del cliente.')
    guardar.mutate({ ...f, nombre: f.nombre.trim() }, {
      onSuccess: (id) => {
        avisar(cliente ? 'Cliente guardado' : 'Cliente cargado', 'ok')
        onGuardado?.(id)
        onCerrar()
      },
      onError: (err) => setError(mensajeError(err)),
    })
  }

  return (
    <Modal
      titulo={cliente ? `Editar ${cliente.nombre}` : 'Nuevo cliente'}
      onCerrar={onCerrar}
      pie={
        <>
          <Boton onClick={onCerrar}>Cancelar</Boton>
          <Boton variante="primario" type="submit" form="form-cliente" cargando={guardar.isPending}>{cliente ? 'Guardar cambios' : 'Cargar cliente'}</Boton>
        </>
      }
    >
      <form id="form-cliente" onSubmit={enviar} className="grid gap-3 md:grid-cols-2">
        <Campo etiqueta="Nombre" className="md:col-span-2">
          <Entrada value={f.nombre} onChange={(e) => set('nombre', e.target.value)} placeholder="Kiosco El Trébol" autoFocus required />
        </Campo>
        <Campo etiqueta="Teléfono" ayuda="Con código de área, para WhatsApp. Ej.: 351 555-1234">
          <Entrada value={f.telefono} onChange={(e) => set('telefono', e.target.value)} inputMode="tel" />
        </Campo>
        <Campo etiqueta="Zona" ayuda="Barrio o zona de reparto.">
          <Entrada value={f.zona} onChange={(e) => set('zona', e.target.value)} placeholder="Alta Córdoba" />
        </Campo>
        <Campo etiqueta="Dirección" className="md:col-span-2">
          <Entrada value={f.direccion} onChange={(e) => set('direccion', e.target.value)} />
        </Campo>
        <Campo etiqueta="CUIT" ayuda="Opcional.">
          <Entrada value={f.cuit} onChange={(e) => set('cuit', e.target.value)} />
        </Campo>
        {cliente && (
          <label className="flex items-center gap-2 self-end pb-2 text-sm">
            <input type="checkbox" checked={f.activo} onChange={(e) => set('activo', e.target.checked)} className="h-4 w-4 accent-azul" />
            Cliente activo
          </label>
        )}
        <Campo etiqueta="Notas" className="md:col-span-2">
          <AreaTexto rows={2} value={f.notas} onChange={(e) => set('notas', e.target.value)} placeholder="Horario de entrega, cómo paga, etc." />
        </Campo>
        {error && <div className="rounded-lg bg-mal-tinte px-3 py-2 text-[13px] text-mal md:col-span-2">{error}</div>}
      </form>
    </Modal>
  )
}

function RegistrarPago({ cliente, onCerrar }: { cliente: ClienteVista; onCerrar: () => void }) {
  const pagar = useRegistrarPago()
  const avisar = useAvisar()
  const [importe, setImporte] = useState(String(cliente.saldo > 0 ? cliente.saldo : ''))
  const [medio, setMedio] = useState<'efectivo' | 'transferencia'>('efectivo')
  const [nota, setNota] = useState('')
  const [error, setError] = useState<string | null>(null)
  const n = aPesos(importe) ?? 0
  const queda = cliente.saldo - n

  function confirmar() {
    setError(null)
    if (n <= 0) return setError('Escribí el importe que pagó.')
    if (n > cliente.saldo && !window.confirm(`El pago (${pesos(n)}) es mayor al saldo (${pesos(cliente.saldo)}). El cliente queda con ${pesos(n - cliente.saldo)} a favor. ¿Confirmás?`)) return
    pagar.mutate(
      { cliente_id: cliente.id, importe: n, medio, nota: nota.trim() },
      {
        onSuccess: () => {
          avisar(`Pago de ${pesos(n)} registrado para ${cliente.nombre}`, 'ok')
          onCerrar()
        },
        onError: (e) => setError(mensajeError(e)),
      },
    )
  }

  return (
    <Modal
      titulo={`Registrar pago · ${cliente.nombre}`}
      onCerrar={onCerrar}
      ancho="sm"
      pie={
        <>
          <Boton onClick={onCerrar}>Cancelar</Boton>
          <Boton variante="primario" onClick={confirmar} cargando={pagar.isPending}>Registrar pago</Boton>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <div className="text-sm text-tinta-2">
          Debe <b className="text-tinta">{pesos(cliente.saldo)}</b>
          {n > 0 && <> → queda en <b className={queda < 0 ? 'text-ok' : 'text-tinta'}>{queda < 0 ? `${pesos(-queda)} a favor` : pesos(queda)}</b></>}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Campo etiqueta="Importe">
            <Entrada inputMode="numeric" value={importe} onChange={(e) => setImporte(e.target.value)} autoFocus />
          </Campo>
          <Campo etiqueta="Medio de pago">
            <Selector value={medio} onChange={(e) => setMedio(e.target.value as 'efectivo' | 'transferencia')}>
              <option value="efectivo">Efectivo</option>
              <option value="transferencia">Transferencia</option>
            </Selector>
          </Campo>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {cliente.saldo > 0 && <Boton chico onClick={() => setImporte(String(cliente.saldo))}>Todo el saldo</Boton>}
          {cliente.saldo > 0 && <Boton chico onClick={() => setImporte(String(Math.round(cliente.saldo / 2)))}>La mitad</Boton>}
        </div>
        <Campo etiqueta="Nota" ayuda="Opcional. Ej.: cobrado en el reparto.">
          <Entrada value={nota} onChange={(e) => setNota(e.target.value)} />
        </Campo>
        {error && <div className="rounded-lg bg-mal-tinte px-3 py-2 text-[13px] text-mal">{error}</div>}
      </div>
    </Modal>
  )
}

function AjusteSaldo({ cliente, onCerrar }: { cliente: ClienteVista; onCerrar: () => void }) {
  const ajustar = useAjustarCc()
  const avisar = useAvisar()
  const [sentido, setSentido] = useState<'debe' | 'favor'>('debe')
  const [importe, setImporte] = useState('')
  const [nota, setNota] = useState('')
  const [vence, setVence] = useState('')
  const [error, setError] = useState<string | null>(null)
  const n = aPesos(importe) ?? 0

  function confirmar() {
    setError(null)
    if (n <= 0) return setError('Escribí el importe.')
    if (!nota.trim()) return setError('Escribí el motivo: queda en el historial.')
    ajustar.mutate(
      { cliente_id: cliente.id, importe: sentido === 'debe' ? n : -n, nota: nota.trim(), vence_el: sentido === 'debe' && vence ? vence : null },
      {
        onSuccess: () => {
          avisar('Ajuste registrado', 'ok')
          onCerrar()
        },
        onError: (e) => setError(mensajeError(e)),
      },
    )
  }

  return (
    <Modal
      titulo={`Ajuste de saldo · ${cliente.nombre}`}
      onCerrar={onCerrar}
      ancho="sm"
      pie={
        <>
          <Boton onClick={onCerrar}>Cancelar</Boton>
          <Boton variante="primario" onClick={confirmar} cargando={ajustar.isPending}>Registrar ajuste</Boton>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <Aviso tono="aviso">Para corregir un error o cargar una deuda vieja. Las ventas y los pagos normales no van por acá.</Aviso>
        <div className="flex gap-1 rounded-lg bg-fondo p-1 text-sm">
          {(['debe', 'favor'] as const).map((s) => (
            <button key={s} type="button" onClick={() => setSentido(s)} className={`flex-1 rounded-md px-3 py-1.5 font-medium ${sentido === s ? 'bg-white text-azul shadow-tarjeta' : 'text-tinta-2'}`}>
              {s === 'debe' ? 'Suma deuda' : 'Resta deuda'}
            </button>
          ))}
        </div>
        <Campo etiqueta="Importe">
          <Entrada inputMode="numeric" value={importe} onChange={(e) => setImporte(e.target.value)} autoFocus />
        </Campo>
        {sentido === 'debe' && (
          <Campo etiqueta="Vencimiento" ayuda="Si lo dejás vacío, usa el plazo de la configuración.">
            <Entrada type="date" value={vence} min={hoyISO()} onChange={(e) => setVence(e.target.value)} />
          </Campo>
        )}
        <Campo etiqueta="Motivo">
          <Entrada value={nota} onChange={(e) => setNota(e.target.value)} placeholder="Ej.: saldo del sistema anterior" />
        </Campo>
        {error && <div className="rounded-lg bg-mal-tinte px-3 py-2 text-[13px] text-mal">{error}</div>}
      </div>
    </Modal>
  )
}
