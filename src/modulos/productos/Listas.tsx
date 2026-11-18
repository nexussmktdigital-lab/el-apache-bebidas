import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Plus } from 'lucide-react'
import { Boton, Campo, Entrada, Insignia, Panel, Tabla, Vacio } from '@/componentes/ui'
import { Modal } from '@/componentes/Modal'
import { useAvisar } from '@/componentes/Toast'
import type { Categoria, Marca, Proveedor } from '@/tipos/supabase'
import { useCategorias, useGuardarItemLista, useMarcas, useProveedores, mensajeError } from './api'

// Categorías, marcas y proveedores. Alta, edición y activar/desactivar.

type Tipo = 'categorias' | 'marcas' | 'proveedores'
type Item = Categoria | Marca | Proveedor

const TITULOS: Record<Tipo, { plural: string; singular: string; articulo: string }> = {
  categorias: { plural: 'Categorías', singular: 'categoría', articulo: 'una' },
  marcas: { plural: 'Marcas', singular: 'marca', articulo: 'una' },
  proveedores: { plural: 'Proveedores', singular: 'proveedor', articulo: 'un' },
}

export function Listas() {
  const [tipo, setTipo] = useState<Tipo>('categorias')
  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Link to="/productos" className="inline-flex items-center gap-1 text-sm font-medium text-azul">
          <ArrowLeft size={16} /> Volver a productos
        </Link>
      </div>
      <div className="mb-3 flex gap-1 rounded-lg bg-white p-1 text-sm border border-borde w-fit">
        {(Object.keys(TITULOS) as Tipo[]).map((t) => (
          <button key={t} type="button" onClick={() => setTipo(t)} className={`rounded-md px-3 py-1.5 font-medium ${tipo === t ? 'bg-azul-tinte text-azul' : 'text-tinta-2'}`}>
            {TITULOS[t].plural}
          </button>
        ))}
      </div>
      {tipo === 'categorias' && <Lista tipo="categorias" datos={useCategorias} />}
      {tipo === 'marcas' && <Lista tipo="marcas" datos={useMarcas} />}
      {tipo === 'proveedores' && <Lista tipo="proveedores" datos={useProveedores} />}
    </>
  )
}

function Lista<T extends Item>({ tipo, datos }: { tipo: Tipo; datos: () => { data?: T[]; isLoading: boolean } }) {
  const lista = datos()
  const guardar = useGuardarItemLista(tipo)
  const avisar = useAvisar()
  const [editando, setEditando] = useState<T | 'nuevo' | null>(null)
  const t = TITULOS[tipo]
  const esProveedor = tipo === 'proveedores'

  function alternar(item: T) {
    guardar.mutate({ id: item.id, nombre: item.nombre, activo: !item.activo }, { onSuccess: () => avisar('Guardado', 'ok'), onError: (e) => avisar(mensajeError(e), 'mal') })
  }

  return (
    <Panel
      titulo={t.plural}
      extra={
        <Boton variante="primario" chico onClick={() => setEditando('nuevo')}>
          <Plus size={14} /> {esProveedor ? 'Nuevo proveedor' : `Nueva ${t.singular}`}
        </Boton>
      }
    >
      {lista.isLoading && <Vacio>Cargando…</Vacio>}
      {lista.data?.length === 0 && <Vacio>Todavía no hay {t.plural.toLowerCase()}.</Vacio>}
      {lista.data && lista.data.length > 0 && (
        <Tabla>
          <thead>
            <tr>
              <th>Nombre</th>
              {esProveedor && <th>Teléfono</th>}
              {esProveedor && <th>Contacto</th>}
              <th>Estado</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {lista.data.map((item) => (
              <tr key={item.id} className={item.activo ? '' : 'opacity-60'}>
                <td className="font-semibold">{item.nombre}</td>
                {esProveedor && <td>{(item as Proveedor).telefono || '—'}</td>}
                {esProveedor && <td>{(item as Proveedor).contacto || '—'}</td>}
                <td>{item.activo ? <Insignia tono="ok">Activo</Insignia> : <Insignia tono="neutro">Desactivado</Insignia>}</td>
                <td className="text-right whitespace-nowrap">
                  <Boton chico onClick={() => setEditando(item)}>Editar</Boton>{' '}
                  <Boton chico variante="fantasma" onClick={() => alternar(item)}>{item.activo ? 'Desactivar' : 'Reactivar'}</Boton>
                </td>
              </tr>
            ))}
          </tbody>
        </Tabla>
      )}
      {editando && <FormularioItem tipo={tipo} item={editando === 'nuevo' ? null : editando} onCerrar={() => setEditando(null)} />}
    </Panel>
  )
}

function FormularioItem({ tipo, item, onCerrar }: { tipo: Tipo; item: Item | null; onCerrar: () => void }) {
  const guardar = useGuardarItemLista(tipo)
  const avisar = useAvisar()
  const t = TITULOS[tipo]
  const esProveedor = tipo === 'proveedores'
  const prov = item as Proveedor | null
  const [nombre, setNombre] = useState(item?.nombre ?? '')
  const [telefono, setTelefono] = useState(prov?.telefono ?? '')
  const [contacto, setContacto] = useState(prov?.contacto ?? '')
  const [notas, setNotas] = useState(prov?.notas ?? '')
  const [error, setError] = useState<string | null>(null)

  function enviar(e: FormEvent) {
    e.preventDefault()
    if (!nombre.trim()) return setError('Escribí el nombre.')
    const datos = esProveedor ? { id: item?.id, nombre: nombre.trim(), telefono, contacto, notas } : { id: item?.id, nombre: nombre.trim() }
    guardar.mutate(datos, {
      onSuccess: () => {
        avisar('Guardado', 'ok')
        onCerrar()
      },
      onError: (err) => setError(mensajeError(err)),
    })
  }

  return (
    <Modal
      titulo={item ? `Editar ${t.singular}` : esProveedor ? 'Nuevo proveedor' : `Nueva ${t.singular}`}
      onCerrar={onCerrar}
      ancho="sm"
      pie={
        <>
          <Boton onClick={onCerrar}>Cancelar</Boton>
          <Boton variante="primario" type="submit" form="form-item" cargando={guardar.isPending}>Guardar</Boton>
        </>
      }
    >
      <form id="form-item" onSubmit={enviar} className="flex flex-col gap-3">
        <Campo etiqueta="Nombre">
          <Entrada value={nombre} onChange={(e) => setNombre(e.target.value)} autoFocus required />
        </Campo>
        {esProveedor && (
          <>
            <Campo etiqueta="Teléfono">
              <Entrada value={telefono} onChange={(e) => setTelefono(e.target.value)} inputMode="tel" />
            </Campo>
            <Campo etiqueta="Contacto" ayuda="Con quién hablan cuando piden.">
              <Entrada value={contacto} onChange={(e) => setContacto(e.target.value)} />
            </Campo>
            <Campo etiqueta="Notas">
              <Entrada value={notas} onChange={(e) => setNotas(e.target.value)} />
            </Campo>
          </>
        )}
        {error && <div className="rounded-lg bg-mal-tinte px-3 py-2 text-[13px] text-mal">{error}</div>}
      </form>
    </Modal>
  )
}
