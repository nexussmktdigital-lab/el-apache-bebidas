import { useQuery } from '@tanstack/react-query'
import { Printer } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Modal } from '@/componentes/Modal'
import { Boton, Vacio } from '@/componentes/ui'
import { fechaHora, fecha, pesos } from '@/lib/formato'
import { NOMBRE_FORMA_PAGO, type Configuracion, type ClienteVista } from '@/tipos/supabase'
import { useVenta, useVentaItems } from './api'
import logo from '@/recursos/logo.webp'

/** Comprobante interno de una venta, para imprimir o guardar como PDF desde el navegador. */
export function Comprobante({ ventaId, onCerrar }: { ventaId: string; onCerrar: () => void }) {
  const venta = useVenta(ventaId)
  const items = useVentaItems(ventaId)
  const conf = useQuery({
    queryKey: ['configuracion'],
    queryFn: async () => {
      const { data, error } = await supabase.from('configuracion').select('*').single()
      if (error) throw error
      return data as Configuracion
    },
  })
  const cliente = useQuery({
    queryKey: ['clientes', 'uno', venta.data?.cliente_id ?? ''],
    enabled: Boolean(venta.data?.cliente_id),
    queryFn: async () => {
      const { data, error } = await supabase.from('v_clientes').select('*').eq('id', venta.data!.cliente_id!).single()
      if (error) throw error
      return data as unknown as ClienteVista
    },
  })

  const v = venta.data
  const c = conf.data

  return (
    <Modal
      titulo={v ? `Comprobante N.º ${String(v.numero).padStart(6, '0')}` : 'Comprobante'}
      onCerrar={onCerrar}
      pie={
        <>
          <Boton onClick={onCerrar}>Cerrar</Boton>
          <Boton variante="primario" onClick={() => window.print()} disabled={!v || !items.data}>
            <Printer size={16} /> Imprimir o guardar PDF
          </Boton>
        </>
      }
    >
      {(venta.isLoading || items.isLoading || conf.isLoading) && <Vacio>Cargando…</Vacio>}
      {v && items.data && c && (
        <div className="imprimible mx-auto max-w-[560px] bg-white p-2 text-[13px] text-black print:p-6">
          <div className="flex items-start justify-between gap-4 border-b border-black/20 pb-3">
            <div className="flex items-center gap-3">
              <img src={logo} alt={c.nombre_negocio} className={c.comprobante_mostrar_datos ? 'w-[88px]' : 'w-[120px]'} />
              {c.comprobante_mostrar_datos && (
                <div>
                  <div className="font-titulo text-lg font-bold leading-tight">{c.nombre_negocio}</div>
                  <div className="text-xs">{c.sucursal}</div>
                  {c.direccion && <div className="text-xs">{c.direccion}</div>}
                  {c.telefono && <div className="text-xs">Tel. {c.telefono}</div>}
                  {c.cuit && <div className="text-xs">CUIT {c.cuit}</div>}
                </div>
              )}
            </div>
            <div className="text-right">
              <div className="text-xs uppercase tracking-wide">Comprobante</div>
              <div className="font-titulo text-xl font-bold">N.º {String(v.numero).padStart(6, '0')}</div>
              <div className="text-xs">{fechaHora(v.fecha)}</div>
              {v.estado === 'anulada' && <div className="mt-1 inline-block rounded border border-black px-2 py-0.5 text-xs font-bold uppercase">Anulado</div>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 py-3 text-xs">
            <div>
              <div className="uppercase tracking-wide text-black/60">Cliente</div>
              <div className="font-semibold">{v.cliente ?? 'Venta de mostrador'}</div>
              {cliente.data?.direccion && <div>{cliente.data.direccion}</div>}
              {cliente.data?.telefono && <div>Tel. {cliente.data.telefono}</div>}
            </div>
            <div className="text-right">
              <div className="uppercase tracking-wide text-black/60">Forma de pago</div>
              <div className="font-semibold">{NOMBRE_FORMA_PAGO[v.forma_pago]}</div>
              {v.vence_el && <div>Vence el {fecha(v.vence_el)}</div>}
              <div className="mt-1 text-black/60">Atendió: {v.usuario ?? '—'}</div>
            </div>
          </div>

          <table className="w-full border-collapse text-[13px]">
            <thead>
              <tr className="border-y border-black/20 text-left text-xs uppercase tracking-wide">
                <th className="py-1.5">Producto</th>
                <th className="py-1.5 text-right">Cant.</th>
                <th className="py-1.5 text-right">Precio</th>
                <th className="py-1.5 text-right">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {items.data.map((i) => (
                <tr key={i.id} className="border-b border-black/10">
                  <td className="py-1.5">
                    {i.descripcion}
                    {i.unidad && <span className="text-black/60"> · {i.unidad}</span>}
                  </td>
                  <td className="py-1.5 text-right">{i.cantidad}</td>
                  <td className="py-1.5 text-right">{pesos(i.precio_unitario)}</td>
                  <td className="py-1.5 text-right">{pesos(i.subtotal ?? i.cantidad * i.precio_unitario)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={3} className="pt-2 text-right font-semibold">Total</td>
                <td className="pt-2 text-right font-titulo text-lg font-bold">{pesos(v.total)}</td>
              </tr>
            </tfoot>
          </table>

          {v.forma_pago === 'cuenta_corriente' && cliente.data && (
            <div className="mt-3 rounded border border-black/20 p-2 text-xs">
              <div className="flex justify-between"><span>Saldo de cuenta corriente al emitir</span><b>{pesos(cliente.data.saldo)}</b></div>
            </div>
          )}

          {v.nota && <div className="mt-3 text-xs">Nota: {v.nota}</div>}

          <div className="mt-4 border-t border-black/20 pt-2 text-center text-[11px] text-black/70">
            <div>{c.leyenda_comprobante}</div>
            {c.pie_comprobante && <div className="mt-1 whitespace-pre-line">{c.pie_comprobante}</div>}
          </div>
        </div>
      )}
    </Modal>
  )
}
