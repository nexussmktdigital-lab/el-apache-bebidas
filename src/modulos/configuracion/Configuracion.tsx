import { useEffect, useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { Panel, Campo, Entrada, AreaTexto, Selector, Boton, Vacio } from '@/componentes/ui'
import { useAvisar } from '@/componentes/Toast'
import type { Configuracion as Conf } from '@/tipos/supabase'

type Editable = Omit<Conf, 'id' | 'actualizado_en' | 'actualizado_por'>

export function Configuracion() {
  const qc = useQueryClient()
  const avisar = useAvisar()
  const conf = useQuery({
    queryKey: ['configuracion'],
    queryFn: async () => {
      const { data, error } = await supabase.from('configuracion').select('*').single()
      if (error) throw error
      return data as Conf
    },
  })

  const [f, setF] = useState<Editable | null>(null)
  useEffect(() => {
    if (conf.data && !f) {
      const { id: _id, actualizado_en: _a, actualizado_por: _b, ...resto } = conf.data
      setF(resto)
    }
  }, [conf.data, f])

  const guardar = useMutation({
    mutationFn: async (valores: Editable) => {
      const { error } = await supabase.from('configuracion').update(valores).eq('id', true)
      if (error) throw error
    },
    onSuccess: () => {
      avisar('Configuración guardada', 'ok')
      void qc.invalidateQueries({ queryKey: ['configuracion'] })
    },
    onError: () => avisar('No se pudo guardar. Revisá los valores.', 'mal'),
  })

  if (conf.isLoading || !f) return <Vacio>Cargando…</Vacio>
  if (conf.error) return <Vacio>No pudimos cargar la configuración.</Vacio>

  const set = <K extends keyof Editable>(k: K, v: Editable[K]) => setF((prev) => (prev ? { ...prev, [k]: v } : prev))
  const num = (s: string, min: number, max: number) => Math.min(max, Math.max(min, Number.parseInt(s || '0', 10) || 0))

  function enviar(e: FormEvent) {
    e.preventDefault()
    if (f) guardar.mutate(f)
  }

  return (
    <form onSubmit={enviar}>
      <p className="mb-4 text-tinta-2">Datos del negocio y reglas que el sistema usa en comprobantes, avisos y precios.</p>

      <Panel titulo="Datos del comprobante">
        <div className="grid gap-3 md:grid-cols-2">
          <Campo etiqueta="Nombre del negocio">
            <Entrada value={f.nombre_negocio} onChange={(e) => set('nombre_negocio', e.target.value)} required />
          </Campo>
          <Campo etiqueta="Sucursal">
            <Entrada value={f.sucursal} onChange={(e) => set('sucursal', e.target.value)} />
          </Campo>
          <Campo etiqueta="Dirección">
            <Entrada value={f.direccion} onChange={(e) => set('direccion', e.target.value)} />
          </Campo>
          <Campo etiqueta="Teléfono">
            <Entrada value={f.telefono} onChange={(e) => set('telefono', e.target.value)} />
          </Campo>
          <Campo etiqueta="CUIT" ayuda="Dejalo vacío si no querés que figure.">
            <Entrada value={f.cuit} onChange={(e) => set('cuit', e.target.value)} />
          </Campo>
          <Campo etiqueta="Leyenda del comprobante">
            <Entrada value={f.leyenda_comprobante} onChange={(e) => set('leyenda_comprobante', e.target.value)} />
          </Campo>
          <Campo etiqueta="Pie del comprobante" ayuda="Por ejemplo, alias o CBU para transferencias." className="md:col-span-2">
            <AreaTexto rows={2} value={f.pie_comprobante} onChange={(e) => set('pie_comprobante', e.target.value)} />
          </Campo>
        </div>
      </Panel>

      <Panel titulo="Cuentas corrientes y avisos">
        <div className="grid gap-3 md:grid-cols-3">
          <Campo etiqueta="Vencimiento de la cuenta corriente (días)" ayuda="Desde la fecha de la venta.">
            <Entrada type="number" min={0} max={365} value={f.plazo_cc_dias} onChange={(e) => set('plazo_cc_dias', num(e.target.value, 0, 365))} />
          </Campo>
          <Campo etiqueta="Aviso de cuenta por vencer (días antes)">
            <Entrada type="number" min={0} max={365} value={f.aviso_cc_dias} onChange={(e) => set('aviso_cc_dias', num(e.target.value, 0, 365))} />
          </Campo>
          <Campo etiqueta="Aviso de producto por vencer (días antes)">
            <Entrada
              type="number"
              min={0}
              max={730}
              value={f.aviso_vencimiento_dias}
              onChange={(e) => set('aviso_vencimiento_dias', num(e.target.value, 0, 730))}
            />
          </Campo>
          <Campo
            etiqueta="Mensaje de WhatsApp"
            ayuda="Podés usar {cliente}, {saldo} y {vencimiento}; el sistema los reemplaza por los datos reales."
            className="md:col-span-3"
          >
            <AreaTexto rows={3} value={f.mensaje_whatsapp} onChange={(e) => set('mensaje_whatsapp', e.target.value)} />
          </Campo>
        </div>
      </Panel>

      <Panel titulo="Precios">
        <div className="grid gap-3 md:grid-cols-3">
          <Campo etiqueta="Redondeo del precio calculado" ayuda="Se aplica cuando el precio sale del porcentaje de ganancia.">
            <Selector value={f.redondeo_precio} onChange={(e) => set('redondeo_precio', Number(e.target.value) as Conf['redondeo_precio'])}>
              <option value={1}>Sin redondeo</option>
              <option value={10}>A $10</option>
              <option value={50}>A $50</option>
              <option value={100}>A $100</option>
            </Selector>
          </Campo>
        </div>
      </Panel>

      <div className="flex justify-end">
        <Boton type="submit" variante="primario" cargando={guardar.isPending}>
          Guardar cambios
        </Boton>
      </div>
    </form>
  )
}
