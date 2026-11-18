import { useMemo, useState } from 'react'
import { Boton, Campo, Entrada, Panel, Tabla, Vacio, Aviso } from '@/componentes/ui'
import { fecha, hoyISO, pesos, porcentaje } from '@/lib/formato'
import { porMes, totalizar, useBalance } from './api'

type Vista = 'dia' | 'mes'

function restarDias(iso: string, n: number): string {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d - n)).toISOString().slice(0, 10)
}
function primerDiaMes(iso: string, mesesAtras = 0): string {
  const [y, m] = iso.split('-').map(Number)
  const d = new Date(Date.UTC(y, m - 1 - mesesAtras, 1))
  return d.toISOString().slice(0, 10)
}
function ultimoDiaMes(iso: string): string {
  const [y, m] = iso.split('-').map(Number)
  return new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10)
}
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
function nombreMes(aaaaMm: string): string {
  const [y, m] = aaaaMm.split('-').map(Number)
  return `${MESES[m - 1]} ${y}`
}

export function Informes() {
  const hoy = hoyISO()
  const [desde, setDesde] = useState(primerDiaMes(hoy))
  const [hasta, setHasta] = useState(hoy)
  const [vista, setVista] = useState<Vista>('dia')
  const balance = useBalance(desde, hasta)

  const filas = useMemo(() => {
    const todas = balance.data ?? []
    const conMovimiento = todas.filter((f) => f.ventas_cantidad > 0 || f.gastos_cantidad > 0)
    return vista === 'mes' ? porMes(todas) : conMovimiento
  }, [balance.data, vista])
  const total = useMemo(() => totalizar(balance.data ?? []), [balance.data])
  const margen = total.ventas > 0 ? (total.ganancia_bruta / total.ventas) * 100 : null
  const dias = balance.data?.length ?? 0

  const presets: Array<[string, () => void]> = [
    ['Hoy', () => { setDesde(hoy); setHasta(hoy); setVista('dia') }],
    ['Últimos 7 días', () => { setDesde(restarDias(hoy, 6)); setHasta(hoy); setVista('dia') }],
    ['Este mes', () => { setDesde(primerDiaMes(hoy)); setHasta(hoy); setVista('dia') }],
    ['Mes anterior', () => { const d = primerDiaMes(hoy, 1); setDesde(d); setHasta(ultimoDiaMes(d)); setVista('dia') }],
    ['Últimos 30 días', () => { setDesde(restarDias(hoy, 29)); setHasta(hoy); setVista('dia') }],
    ['Este año', () => { setDesde(`${hoy.slice(0, 4)}-01-01`); setHasta(hoy); setVista('mes') }],
  ]

  const conceptos: Array<[string, number, 'bueno' | 'malo' | 'neutro']> = [
    ['Ventas', total.ventas, 'neutro'],
    ['Costo de lo vendido', total.costo, 'malo'],
    ['Ganancia bruta', total.ganancia_bruta, 'bueno'],
    ['Gastos', total.gastos, 'malo'],
    ['Resultado', total.resultado, total.resultado >= 0 ? 'bueno' : 'malo'],
  ]

  return (
    <>
      <p className="mb-4 text-tinta-2">Balance diario o mensual, con el rango de fechas que elijas. Las ventas anuladas y los gastos anulados no cuentan.</p>

      <Panel>
        <div className="flex flex-col gap-2.5 md:flex-row md:flex-wrap md:items-end">
          <div className="flex flex-wrap gap-1">
            {presets.map(([n, fn]) => (
              <Boton key={n} chico onClick={fn}>{n}</Boton>
            ))}
          </div>
          <Campo etiqueta="Desde">
            <Entrada type="date" value={desde} max={hasta} onChange={(e) => setDesde(e.target.value)} />
          </Campo>
          <Campo etiqueta="Hasta">
            <Entrada type="date" value={hasta} min={desde} max={hoy} onChange={(e) => setHasta(e.target.value)} />
          </Campo>
          <div className="flex gap-1 rounded-lg bg-fondo p-1 text-sm md:ml-auto">
            {(['dia', 'mes'] as const).map((v) => (
              <button key={v} type="button" onClick={() => setVista(v)} className={`rounded-md px-3 py-1.5 font-medium ${vista === v ? 'bg-white text-azul shadow-tarjeta' : 'text-tinta-2'}`}>
                {v === 'dia' ? 'Por día' : 'Por mes'}
              </button>
            ))}
          </div>
        </div>
      </Panel>

      {desde > hasta && <Aviso tono="mal">La fecha "desde" tiene que ser anterior a "hasta".</Aviso>}

      <div className="grid gap-3 lg:grid-cols-[1fr_2fr]">
        <Panel titulo={`Balance · ${fecha(desde)} al ${fecha(hasta)}`}>
          {balance.isLoading && <Vacio>Cargando…</Vacio>}
          {balance.data && (
            <>
              <Tabla>
                <tbody>
                  {conceptos.map(([nombre, valor, tono], i) => (
                    <tr key={nombre}>
                      <td className={i === 2 || i === 4 ? 'font-semibold' : ''}>{nombre}</td>
                      <td className={`text-right font-semibold ${i === 4 ? (tono === 'bueno' ? 'text-ok' : 'text-mal') : ''}`}>{pesos(valor)}</td>
                    </tr>
                  ))}
                </tbody>
              </Tabla>
              <div className="mt-3 grid grid-cols-2 gap-2 text-[13px] text-tinta-2">
                <div>Ventas: <b className="text-tinta">{total.ventas_cantidad}</b></div>
                <div>Margen bruto: <b className="text-tinta">{margen != null ? porcentaje(margen) : '—'}</b></div>
                <div>Gastos: <b className="text-tinta">{total.gastos_cantidad}</b></div>
                <div>Días: <b className="text-tinta">{dias}</b></div>
              </div>
            </>
          )}
        </Panel>

        <Panel titulo={vista === 'dia' ? 'Detalle por día' : 'Detalle por mes'}>
          {balance.isLoading && <Vacio>Cargando…</Vacio>}
          {balance.data && filas.length === 0 && <Vacio>Sin movimientos en el período.</Vacio>}
          {filas.length > 0 && (
            <>
              <GraficoBarras filas={filas} vista={vista} />
              <Tabla>
                <thead>
                  <tr>
                    <th>{vista === 'dia' ? 'Día' : 'Mes'}</th>
                    <th className="text-right!">Ventas</th>
                    <th className="text-right!">Costo</th>
                    <th className="text-right!">Ganancia</th>
                    <th className="text-right!">Gastos</th>
                    <th className="text-right!">Resultado</th>
                  </tr>
                </thead>
                <tbody>
                  {filas.map((f) => (
                    <tr key={f.dia}>
                      <td className="whitespace-nowrap">
                        {vista === 'dia' ? fecha(f.dia) : nombreMes(f.dia)}
                        <small className="block text-mudo">{f.ventas_cantidad} {f.ventas_cantidad === 1 ? 'venta' : 'ventas'}</small>
                      </td>
                      <td className="text-right font-semibold">{pesos(f.ventas)}</td>
                      <td className="text-right">{pesos(f.costo)}</td>
                      <td className="text-right">{pesos(f.ganancia_bruta)}</td>
                      <td className="text-right">{pesos(f.gastos)}</td>
                      <td className={`text-right font-semibold ${f.resultado < 0 ? 'text-mal' : 'text-ok'}`}>{pesos(f.resultado)}</td>
                    </tr>
                  ))}
                </tbody>
              </Tabla>
            </>
          )}
        </Panel>
      </div>
    </>
  )
}

function GraficoBarras({ filas, vista }: { filas: Array<{ dia: string; ventas: number; resultado: number }>; vista: Vista }) {
  const max = Math.max(1, ...filas.map((f) => f.ventas))
  const visibles = filas.slice(-62)
  return (
    <div className="mb-3">
      <div className="flex h-[120px] items-end gap-[3px]">
        {visibles.map((f) => (
          <div
            key={f.dia}
            className={`min-h-[2px] flex-1 rounded-t-[3px] ${f.resultado < 0 ? 'bg-mal/70' : 'bg-azul'}`}
            style={{ height: `${(f.ventas / max) * 100}%` }}
            title={`${vista === 'dia' ? fecha(f.dia) : nombreMes(f.dia)} · ventas ${pesos(f.ventas)} · resultado ${pesos(f.resultado)}`}
          />
        ))}
      </div>
      <div className="mt-1.5 flex justify-between text-[11px] text-mudo">
        <span>{vista === 'dia' ? fecha(visibles[0].dia) : nombreMes(visibles[0].dia)}</span>
        <span>{vista === 'dia' ? fecha(visibles[visibles.length - 1].dia) : nombreMes(visibles[visibles.length - 1].dia)}</span>
      </div>
    </div>
  )
}
