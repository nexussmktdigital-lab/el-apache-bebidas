import { Link } from 'react-router-dom'
import { Receipt, BarChart3, Package, Wallet } from 'lucide-react'
import { usePerfil } from '@/app/AuthProvider'
import { Insignia, Panel, Vacio } from '@/componentes/ui'
import { fechaLarga, hoyISO, pesos } from '@/lib/formato'
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
