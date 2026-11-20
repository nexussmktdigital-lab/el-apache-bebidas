import { useRef, useState } from 'react'
import { Download, FileUp, CheckCircle2, AlertTriangle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Aviso, Boton, Insignia, Panel, Tabla, Vacio } from '@/componentes/ui'
import { useAvisar } from '@/componentes/Toast'
import { fecha, pesos } from '@/lib/formato'
import { mensajeError } from '@/modulos/productos/api'
import { useQueryClient } from '@tanstack/react-query'
import { leerLibro, tieneErroresBloqueantes, type FilaLeida, type Lectura } from './leerExcel'

interface Resultado {
  creados: number
  actualizados: number
  con_stock?: number
  stock_saltado?: number
  con_saldo?: number
  saldo_saltado?: number
  errores: Array<{ fila: string; nombre: string; mensaje: string }>
}

type Paso = 'archivo' | 'revision' | 'importando' | 'listo'

export function Importacion() {
  const avisar = useAvisar()
  const qc = useQueryClient()
  const inputRef = useRef<HTMLInputElement>(null)
  const [paso, setPaso] = useState<Paso>('archivo')
  const [nombreArchivo, setNombreArchivo] = useState('')
  const [lectura, setLectura] = useState<Lectura | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [resultados, setResultados] = useState<{ proveedores?: Resultado; productos?: Resultado; clientes?: Resultado }>({})

  async function elegirArchivo(archivo: File | undefined) {
    setError(null)
    if (!archivo) return
    try {
      const datos = new Uint8Array(await archivo.arrayBuffer())
      const l = leerLibro(datos)
      if (l.hojasFaltantes.length === 3) {
        setError('El archivo no tiene las hojas Productos, Clientes ni Proveedores. Usá la plantilla.')
        return
      }
      setLectura(l)
      setNombreArchivo(archivo.name)
      setPaso('revision')
    } catch (e) {
      setError(`No pude leer el archivo: ${(e as Error).message}`)
    }
  }

  const bloqueado = lectura ? tieneErroresBloqueantes(lectura.proveedores) || tieneErroresBloqueantes(lectura.productos) || tieneErroresBloqueantes(lectura.clientes) : true
  const totalFilas = lectura ? lectura.proveedores.length + lectura.productos.length + lectura.clientes.length : 0

  async function importar() {
    if (!lectura) return
    const texto = `Se van a cargar ${lectura.proveedores.length} proveedores, ${lectura.productos.length} productos y ${lectura.clientes.length} clientes. Si un producto o cliente ya existe, se actualiza; el stock y el saldo inicial se cargan una sola vez. ¿Confirmás?`
    if (!window.confirm(texto)) return
    setPaso('importando')
    setError(null)
    const res: typeof resultados = {}
    try {
      if (lectura.proveedores.length) {
        const { data, error: e } = await supabase.rpc('importar_proveedores', { p: lectura.proveedores.map((f) => f.datos) as never })
        if (e) throw e
        res.proveedores = data as unknown as Resultado
      }
      if (lectura.productos.length) {
        const { data, error: e } = await supabase.rpc('importar_productos', { p: lectura.productos.map((f) => f.datos) as never })
        if (e) throw e
        res.productos = data as unknown as Resultado
      }
      if (lectura.clientes.length) {
        const { data, error: e } = await supabase.rpc('importar_clientes', { p: lectura.clientes.map((f) => f.datos) as never })
        if (e) throw e
        res.clientes = data as unknown as Resultado
      }
      setResultados(res)
      setPaso('listo')
      avisar('Importación terminada', 'ok')
      void qc.invalidateQueries()
    } catch (e) {
      setResultados(res)
      setError(mensajeError(e))
      setPaso('revision')
    }
  }

  function reiniciar() {
    setPaso('archivo')
    setLectura(null)
    setResultados({})
    setError(null)
    setNombreArchivo('')
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <>
      <p className="mb-4 text-tinta-2">Carga inicial de productos, clientes y proveedores desde la planilla Excel. Se puede repetir: lo que ya existe se actualiza y no se duplica.</p>

      <Panel titulo="1. Planilla">
        <div className="flex flex-wrap items-center gap-3">
          <a href="/plantilla-carga-inicial.xlsx" download>
            <Boton><Download size={16} /> Descargar la plantilla</Boton>
          </a>
          <span className="text-sm text-tinta-2">Tres hojas: Productos, Clientes y Proveedores, con filas de ejemplo que se pueden pisar. No cambies los títulos de las columnas.</span>
        </div>
      </Panel>

      <Panel titulo="2. Archivo completo">
        <div className="flex flex-wrap items-center gap-3">
          <input ref={inputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={(e) => void elegirArchivo(e.target.files?.[0])} />
          <Boton variante="primario" onClick={() => inputRef.current?.click()} disabled={paso === 'importando'}>
            <FileUp size={16} /> Elegir archivo Excel
          </Boton>
          {nombreArchivo && <span className="text-sm">{nombreArchivo}</span>}
          {paso !== 'archivo' && <Boton variante="fantasma" onClick={reiniciar}>Empezar de nuevo</Boton>}
        </div>
        {error && <div className="mt-3 rounded-lg bg-mal-tinte px-3 py-2 text-[13px] text-mal">{error}</div>}
      </Panel>

      {lectura && (paso === 'revision' || paso === 'importando') && (
        <>
          <Panel titulo="3. Revisión">
            {lectura.hojasFaltantes.length > 0 && <Aviso tono="aviso">El archivo no tiene la hoja {lectura.hojasFaltantes.join(' ni ')}; se importa lo demás.</Aviso>}
            {bloqueado ? (
              <Aviso tono="mal">Hay filas con errores. Corregilas en el Excel y volvé a elegir el archivo. Las filas con "Aviso" sí se importan.</Aviso>
            ) : (
              <Aviso tono="ok">Las {totalFilas} filas están bien. Revisá la vista previa y confirmá.</Aviso>
            )}
            <div className="flex flex-wrap items-center gap-3">
              <Boton variante="primario" onClick={() => void importar()} disabled={bloqueado || totalFilas === 0} cargando={paso === 'importando'}>
                Importar {totalFilas} filas
              </Boton>
              <span className="text-sm text-tinta-2">Primero proveedores, después productos y por último clientes.</span>
            </div>
          </Panel>

          <VistaPrevia titulo={`Proveedores (${lectura.proveedores.length})`} filas={lectura.proveedores} columnas={[['Nombre', (d) => d.nombre], ['Teléfono', (d) => d.telefono], ['Contacto', (d) => d.contacto]]} />
          <VistaPrevia
            titulo={`Productos (${lectura.productos.length})`}
            filas={lectura.productos}
            columnas={[
              ['Nombre', (d) => d.nombre],
              ['Categoría', (d) => d.categoria],
              ['Unidad', (d) => (d.unidad_venta === 'unidad' ? 'unidad' : `${d.unidad_venta} x${d.unidades_por_bulto}`)],
              ['Código', (d) => d.codigo],
              ['Stock', (d) => String(d.stock_actual)],
              ['Mínimo', (d) => String(d.stock_minimo)],
              ['Costo', (d) => pesos(d.costo)],
              ['Precio', (d) => (d.precio_venta != null ? `${pesos(d.precio_venta)} (a mano)` : `${d.margen_pct} % de ganancia`)],
              ['Vence', (d) => (d.fecha_vencimiento ? fecha(d.fecha_vencimiento) : '—')],
            ]}
          />
          <VistaPrevia
            titulo={`Clientes (${lectura.clientes.length})`}
            filas={lectura.clientes}
            columnas={[
              ['Nombre', (d) => d.nombre],
              ['Teléfono', (d) => d.telefono],
              ['Zona', (d) => d.zona],
              ['Saldo', (d) => pesos(d.saldo)],
              ['Debe desde', (d) => (d.debe_desde ? fecha(d.debe_desde) : '—')],
            ]}
          />
        </>
      )}

      {paso === 'listo' && (
        <Panel titulo="4. Resultado">
          <ResultadoBloque titulo="Proveedores" r={resultados.proveedores} />
          <ResultadoBloque titulo="Productos" r={resultados.productos} />
          <ResultadoBloque titulo="Clientes" r={resultados.clientes} />
          <div className="mt-3 flex gap-2">
            <Boton onClick={reiniciar}>Importar otro archivo</Boton>
          </div>
        </Panel>
      )}
    </>
  )
}

function VistaPrevia<T>({ titulo, filas, columnas }: { titulo: string; filas: FilaLeida<T>[]; columnas: Array<[string, (d: T) => string]> }) {
  if (filas.length === 0) return null
  const conError = filas.filter((f) => f.errores.length > 0).length
  return (
    <Panel titulo={<>{titulo} {conError > 0 && <Insignia tono="mal">{conError} con observaciones</Insignia>}</>}>
      <Tabla>
        <thead>
          <tr>
            <th>Fila</th>
            {columnas.map(([n]) => (
              <th key={n}>{n}</th>
            ))}
            <th>Observaciones</th>
          </tr>
        </thead>
        <tbody>
          {filas.slice(0, 300).map((f) => (
            <tr key={f.fila} className={f.errores.some((e) => !e.startsWith('Aviso:')) ? 'bg-mal-tinte/40' : ''}>
              <td className="text-mudo">{f.fila}</td>
              {columnas.map(([n, fn]) => (
                <td key={n} className="max-w-[220px] truncate">{fn(f.datos) || <span className="text-mudo">—</span>}</td>
              ))}
              <td className="text-[12.5px] text-mal">{f.errores.join(' ')}</td>
            </tr>
          ))}
        </tbody>
      </Tabla>
      {filas.length > 300 && <div className="pt-2 text-xs text-mudo">Se muestran las primeras 300 filas; se importan todas.</div>}
    </Panel>
  )
}

function ResultadoBloque({ titulo, r }: { titulo: string; r?: Resultado }) {
  if (!r) return null
  const ok = r.errores.length === 0
  return (
    <div className="mb-3 rounded-xl border border-borde p-3">
      <div className="flex items-center gap-2 font-semibold">
        {ok ? <CheckCircle2 size={18} className="text-ok" /> : <AlertTriangle size={18} className="text-aviso" />}
        {titulo}
      </div>
      <div className="mt-1 text-sm text-tinta-2">
        {r.creados} nuevos · {r.actualizados} actualizados
        {r.con_stock != null && <> · {r.con_stock} con stock inicial{r.stock_saltado ? ` (${r.stock_saltado} ya tenían stock, no se tocó)` : ''}</>}
        {r.con_saldo != null && <> · {r.con_saldo} con saldo inicial{r.saldo_saltado ? ` (${r.saldo_saltado} ya tenían movimientos, no se tocó)` : ''}</>}
      </div>
      {r.errores.length > 0 && (
        <div className="mt-2">
          <div className="text-sm font-semibold text-mal">{r.errores.length} filas no se importaron:</div>
          {r.errores.map((e, i) => (
            <div key={i} className="text-[13px] text-mal">Fila {e.fila} ({e.nombre || 'sin nombre'}): {e.mensaje}</div>
          ))}
        </div>
      )}
      {!r.errores.length && <Vacio>Sin errores.</Vacio>}
    </div>
  )
}
