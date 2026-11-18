import { useMemo, useState } from 'react'
import { Modal } from '@/componentes/Modal'
import { Aviso, Boton, Campo, Entrada, Selector } from '@/componentes/ui'
import { useAvisar } from '@/componentes/Toast'
import { pesos } from '@/lib/formato'
import { useAumentarPrecios, useCategorias, useProductos, useProveedores, mensajeError } from './api'

type Alcance = 'categoria' | 'proveedor' | 'todos'

export function AumentoMasivo({ onCerrar }: { onCerrar: () => void }) {
  const avisar = useAvisar()
  const categorias = useCategorias()
  const proveedores = useProveedores()
  const productos = useProductos()
  const aumentar = useAumentarPrecios()

  const [alcance, setAlcance] = useState<Alcance>('categoria')
  const [categoria, setCategoria] = useState('')
  const [proveedor, setProveedor] = useState('')
  const [pct, setPct] = useState('10')
  const [error, setError] = useState<string | null>(null)

  const n = Number.parseFloat(pct.replace(',', '.'))
  const pctValido = Number.isFinite(n) && n > -100 && n <= 1000 && n !== 0

  const afectados = useMemo(() => {
    return (productos.data ?? []).filter((p) => {
      if (!p.activo) return false
      if (alcance === 'categoria') return categoria !== '' && p.categoria_id === categoria
      if (alcance === 'proveedor') return proveedor !== '' && p.proveedor_id === proveedor
      return true
    })
  }, [productos.data, alcance, categoria, proveedor])

  const ejemplo = afectados[0]

  function confirmar() {
    setError(null)
    if (!pctValido) return setError('Escribí un porcentaje distinto de cero, entre -99 y 1000.')
    if (afectados.length === 0) return setError('Elegí una categoría o un proveedor con productos.')
    const texto = `${n > 0 ? 'Aumentar' : 'Bajar'} ${Math.abs(n)} % el precio de ${afectados.length} ${afectados.length === 1 ? 'producto' : 'productos'}. ¿Confirmás?`
    if (!window.confirm(texto)) return
    aumentar.mutate(
      { pct: n, categoria_id: alcance === 'categoria' ? categoria : null, proveedor_id: alcance === 'proveedor' ? proveedor : null },
      {
        onSuccess: (cant) => {
          avisar(`Se actualizaron ${cant} precios`, 'ok')
          onCerrar()
        },
        onError: (e) => setError(mensajeError(e)),
      },
    )
  }

  return (
    <Modal
      titulo="Aumentar precios"
      onCerrar={onCerrar}
      ancho="sm"
      pie={
        <>
          <Boton onClick={onCerrar}>Cancelar</Boton>
          <Boton variante="primario" onClick={confirmar} cargando={aumentar.isPending} disabled={!pctValido || afectados.length === 0}>
            Aplicar a {afectados.length} {afectados.length === 1 ? 'producto' : 'productos'}
          </Boton>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <Campo etiqueta="Aplicar a">
          <Selector value={alcance} onChange={(e) => setAlcance(e.target.value as Alcance)}>
            <option value="categoria">Una categoría</option>
            <option value="proveedor">Un proveedor</option>
            <option value="todos">Todos los productos</option>
          </Selector>
        </Campo>
        {alcance === 'categoria' && (
          <Campo etiqueta="Categoría">
            <Selector value={categoria} onChange={(e) => setCategoria(e.target.value)}>
              <option value="">Elegí una categoría</option>
              {categorias.data?.filter((c) => c.activo).map((c) => (
                <option key={c.id} value={c.id}>{c.nombre}</option>
              ))}
            </Selector>
          </Campo>
        )}
        {alcance === 'proveedor' && (
          <Campo etiqueta="Proveedor">
            <Selector value={proveedor} onChange={(e) => setProveedor(e.target.value)}>
              <option value="">Elegí un proveedor</option>
              {proveedores.data?.filter((c) => c.activo).map((c) => (
                <option key={c.id} value={c.id}>{c.nombre}</option>
              ))}
            </Selector>
          </Campo>
        )}
        <Campo etiqueta="Porcentaje" ayuda="Positivo aumenta, negativo baja. Ejemplo: 10 o -5.">
          <Entrada inputMode="decimal" value={pct} onChange={(e) => setPct(e.target.value)} />
        </Campo>

        <Aviso>
          En los productos con precio calculado sube el porcentaje de ganancia; en los que tienen precio a mano sube el precio. El costo no cambia.
          {ejemplo && pctValido && (
            <>
              {' '}Ejemplo: {ejemplo.nombre} pasa de <b>{pesos(ejemplo.precio_venta)}</b> a aproximadamente <b>{pesos(ejemplo.precio_venta * (1 + n / 100))}</b>.
            </>
          )}
        </Aviso>

        {error && <div className="rounded-lg bg-mal-tinte px-3 py-2 text-[13px] text-mal">{error}</div>}
      </div>
    </Modal>
  )
}
