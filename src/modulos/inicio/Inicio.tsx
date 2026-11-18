import { Link } from 'react-router-dom'
import { Receipt, BarChart3, Package, Wallet } from 'lucide-react'
import { usePerfil } from '@/app/AuthProvider'
import { Insignia, Panel, Tabla, Vacio } from '@/componentes/ui'
import { fecha, fechaLarga, hoyISO, pesos } from '@/lib/formato'
import { useMasVendidos, useVentasPorCategoria } from '@/modulos/informes/api'
import { puede } from '@/lib/permisos'
import { useValorStock } from '@/modulos/productos/api'
import { PanelStockMinimo } from '@/modulos/stock/PanelStockMinimo'
import { PanelPorVencer } from '@/modulos/stock/PanelPorVencer'
import { useVentasPorDia } from '@/modulos/ventas/api'
import { useClientes } from '@/modulos/clientes/api'
import { BotonWhatsApp, EstadoCuentaInsignia } from '@/modulos/clientes/Clientes'

// Tablero de inicio: resumen de hoy y avisos.

export function Inicio() {
  const perfil = usePerfil()
  const veCostos = puede(perfil.rol, 'ver_costos')
  const veGanancias = puede(perfil.rol, 'ver_ganancias')
  const valor = useValorStock()
  const hoy = hoyISO()
  const ventasHoy = useVentasPorDia(hoy, hoy)
  const clientes = useClientes()

  const h = ventasHoy.data?.[0]
  const porCobrar = (clientes.data ?? []).filter((c) => c.saldo > 0)
  const totalPorCobrar = porCobrar.reduce((s, c) => s + c.saldo, 0)
  const porVencer = porCobrar.filter((c) => c.estado !== 'al_dia').sort((a, b) => (a.vence_el ?? '9').localeCompare(b.vence_el ?? '9'))
  const margen = h && h.ventas > 0 && h.ganancia != null ? Math.round((h.ganancia / h.ventas) * 100) : null

  return (
    <>
      <p className="mb-4 text-tinta-2">
        Hola, {perfil.nombre.split(' ')[0]}. Este es el resumen de hoy, {fechaLarga()}.
      </p>

      <div className={`mb-3 grid gap-3 ${veCostos && veGanancias ? 'grid-cols-2 xl:grid-cols-4' : veCostos ? 'grid-cols-2 xl:grid-cols-3' : 'grid-cols-2'}`}>
        <Indicador etiqueta="Ventas de hoy" valor={ventasHoy.data ? pesos(h?.ventas ?? 0) : '—'} detalle={`${h?.cantidad ?? 0} ${h?.cantidad === 1 ? 'venta cargada' : 'ventas cargadas'} hasta ahora`} icono={Receipt} />
        {veGanancias && (
          <Indicador etiqueta="Ganancia de hoy" valor={ventasHoy.data ? pesos(h?.ganancia ?? 0) : '—'} detalle={margen != null ? `${margen} % de margen` : 'sin ventas todavía'} icono={BarChart3} />
        )}
        {veCostos && (
          <Indicador etiqueta="Valor del stock" valor={valor.data ? pesos(valor.data.valor_costo) : '—'} detalle={valor.data ? `${valor.data.productos} productos, a precio de costo` : 'Cargando…'} icono={Package} />
        )}
        <Indicador etiqueta="Por cobrar" valor={clientes.data ? pesos(totalPorCobrar) : '—'} detalle={`${porVencer.length} ${porVencer.length === 1 ? 'cuenta por vencer o vencida' : 'cuentas por vencer o vencidas'}`} icono={Wallet} amarillo />
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        <PanelStockMinimo />
        <Panel
          titulo={
            <>
              Cuentas por vencer {porVencer.length > 0 && <Insignia tono={porVencer.some((c) => c.estado === 'vencida') ? 'mal' : 'aviso'}>{porVencer.length}</Insignia>}
            </>
          }
        >
          {clientes.isLoading && <Vacio>Cargando…</Vacio>}
          {clientes.data && porVencer.length === 0 && <Vacio>Sin cuentas por vencer.</Vacio>}
          {porVencer.slice(0, 8).map((c) => (
            <div key={c.id} className="flex items-center justify-between gap-2.5 border-b border-[#F0F0F3] py-2 last:border-b-0">
              <div className="min-w-0">
                <b className="block truncate">{c.nombre}</b>
                <small className="text-tinta-2">{pesos(c.saldo)} · <EstadoCuentaInsignia c={c} /></small>
              </div>
              <BotonWhatsApp c={c} />
            </div>
          ))}
          {porVencer.length > 8 && (
            <Link to="/clientes" className="block pt-2 text-xs font-medium text-azul">Ver las {porVencer.length} en Cuentas corrientes</Link>
          )}
        </Panel>
        {veCostos && <PanelPorVencer />}
      </div>

      <ResumenTreintaDias veGanancias={veGanancias} />
    </>
  )
}

function restarDias(iso: string, n: number): string {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d - n)).toISOString().slice(0, 10)
}

/** Ventas de los últimos 30 días, productos más vendidos y ventas por categoría (como en la demo). */
function ResumenTreintaDias({ veGanancias }: { veGanancias: boolean }) {
  const hoy = hoyISO()
  const desde = restarDias(hoy, 29)
  const porDia = useVentasPorDia(desde, hoy)
  const top = useMasVendidos(desde, hoy, 5)
  const categorias = useVentasPorCategoria(desde, hoy)

  const dias: Array<{ dia: string; ventas: number }> = []
  for (let i = 29; i >= 0; i--) {
    const d = restarDias(hoy, i)
    dias.push({ dia: d, ventas: porDia.data?.find((x) => x.dia === d)?.ventas ?? 0 })
  }
  const total30 = dias.reduce((s, d) => s + d.ventas, 0)
  const max = Math.max(1, ...dias.map((d) => d.ventas))
  const maxCat = Math.max(1, ...(categorias.data ?? []).map((c) => Number(c.porcentaje)))

  return (
    <>
      <div className="mt-3 grid gap-3 lg:grid-cols-[2fr_1fr]">
        <Panel>
          <div className="mb-2 flex items-start justify-between gap-2">
            <h3 className="text-[15px] font-semibold">
              Ventas de los últimos 30 días
              <small className="block text-[12.5px] font-normal text-tinta-3">Cada barra es un día. En amarillo, hoy.</small>
            </h3>
            <div className="font-titulo text-[24px] font-semibold tracking-tight">{pesos(total30)}</div>
          </div>
          <div className="flex h-[150px] items-end gap-1">
            {dias.map((d, i) => (
              <div
                key={d.dia}
                className={`min-h-[3px] flex-1 rounded-t-[4px] ${i === dias.length - 1 ? 'bg-amarillo' : new Date(d.dia + 'T12:00:00').getDay() === 0 ? 'bg-[#9DB8F2]' : 'bg-azul'}`}
                style={{ height: `${(d.ventas / max) * 100}%` }}
                title={`${fecha(d.dia)} · ${pesos(d.ventas)}`}
              />
            ))}
          </div>
          <div className="mt-1.5 flex justify-between text-[11px] text-mudo">
            <span>{fecha(dias[0].dia)}</span>
            <span>{fecha(dias[10].dia)}</span>
            <span>{fecha(dias[20].dia)}</span>
            <span>Hoy</span>
          </div>
        </Panel>

        <Panel titulo="Ventas por categoría">
          {categorias.data?.length === 0 && <Vacio>Sin ventas en los últimos 30 días.</Vacio>}
          {categorias.data?.map((c) => (
            <div key={c.categoria} className="grid grid-cols-[110px_1fr_46px] items-center gap-2.5 py-1.5 text-[13px]">
              <span className="truncate">{c.categoria}</span>
              <div className="h-2.5 overflow-hidden rounded-lg bg-[#EEF1F6]">
                <i className="block h-full rounded-lg bg-azul" style={{ width: `${(Number(c.porcentaje) / maxCat) * 100}%` }} />
              </div>
              <b className="text-right">{Math.round(Number(c.porcentaje))} %</b>
            </div>
          ))}
        </Panel>
      </div>

      <Panel titulo={<>Productos más vendidos <span className="text-[13px] font-normal text-mudo">últimos 30 días</span></>} className="mt-3">
        {top.data?.length === 0 && <Vacio>Sin ventas en los últimos 30 días.</Vacio>}
        {top.data && top.data.length > 0 && (
          <Tabla>
            <thead>
              <tr>
                <th>Producto</th>
                <th className="text-right!">Vendidos</th>
                <th className="text-right!">Ventas</th>
                {veGanancias && <th className="text-right!">Ganancia</th>}
                <th>Stock</th>
              </tr>
            </thead>
            <tbody>
              {top.data.map((t) => (
                <tr key={t.producto_id}>
                  <td>
                    <b>{t.producto}</b>
                    <small className="block text-mudo">{t.unidad}</small>
                  </td>
                  <td className="text-right">{t.cantidad}</td>
                  <td className="text-right font-semibold">{pesos(t.ventas)}</td>
                  {veGanancias && <td className="text-right">{pesos(t.ganancia)}</td>}
                  <td>{t.stock_bajo ? <Insignia tono="mal">Stock bajo</Insignia> : <Insignia tono="ok">Bien</Insignia>}</td>
                </tr>
              ))}
            </tbody>
          </Tabla>
        )}
      </Panel>
    </>
  )
}

function Indicador({ etiqueta, valor, detalle, icono: Icono, amarillo }: { etiqueta: string; valor: string; detalle: string; icono: typeof Receipt; amarillo?: boolean }) {
  return (
    <div className="rounded-tarjeta border border-borde bg-white px-4 py-4 shadow-tarjeta md:px-[18px]">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-[13px] text-tinta-3">{etiqueta}</div>
          <div className="my-1.5 font-titulo text-[27px] font-semibold tracking-tight">{valor}</div>
        </div>
        <div className={`flex h-9.5 w-9.5 items-center justify-center rounded-[11px] ${amarillo ? 'bg-amarillo-tinte text-amarillo-texto' : 'bg-azul-tinte text-azul'}`}>
          <Icono size={19} strokeWidth={1.7} />
        </div>
      </div>
      <div className="text-xs text-tinta-2">{detalle}</div>
    </div>
  )
}
