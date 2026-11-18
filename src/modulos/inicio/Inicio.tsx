import { usePerfil } from '@/app/AuthProvider'
import { Panel, Vacio } from '@/componentes/ui'
import { fechaLarga, pesos } from '@/lib/formato'
import { puede } from '@/lib/permisos'
import { useValorStock } from '@/modulos/productos/api'

// Tablero de inicio. En la fase 0 muestra el saludo y los paneles vacíos;
// cada fase siguiente los va llenando con datos reales.

export function Inicio() {
  const perfil = usePerfil()
  const veCostos = puede(perfil.rol, 'ver_costos')
  const valor = useValorStock()

  return (
    <>
      <p className="mb-4 text-tinta-2">
        Hola, {perfil.nombre.split(' ')[0]}. Este es el resumen de hoy, {fechaLarga()}.
      </p>

      <div className={`mb-3 grid gap-3 ${veCostos ? 'grid-cols-2 xl:grid-cols-4' : 'grid-cols-2'}`}>
        <Indicador etiqueta="Ventas de hoy" valor="—" detalle="Disponible en la fase 3" />
        {veCostos && <Indicador etiqueta="Ganancia de hoy" valor="—" detalle="Disponible en la fase 3" />}
        {veCostos && (
          <Indicador
            etiqueta="Valor del stock"
            valor={valor.data ? pesos(valor.data.valor_costo) : '—'}
            detalle={valor.data ? `${valor.data.productos} productos, a precio de costo` : 'Cargando…'}
          />
        )}
        <Indicador etiqueta="Por cobrar" valor="—" detalle="Disponible en la fase 3" amarillo />
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        <Panel titulo="Stock en el mínimo">
          <Vacio>Se completa en la fase 2.</Vacio>
        </Panel>
        <Panel titulo="Cuentas por vencer">
          <Vacio>Se completa en la fase 3.</Vacio>
        </Panel>
        <Panel titulo="Productos por vencer">
          <Vacio>Se completa en la fase 2.</Vacio>
        </Panel>
      </div>
    </>
  )
}

function Indicador({ etiqueta, valor, detalle, amarillo }: { etiqueta: string; valor: string; detalle: string; amarillo?: boolean }) {
  return (
    <div className="rounded-tarjeta border border-borde bg-white px-4 py-4 shadow-tarjeta md:px-[18px]">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-[13px] text-tinta-3">{etiqueta}</div>
          <div className="my-1.5 font-titulo text-[27px] font-semibold tracking-tight">{valor}</div>
        </div>
        <div className={`h-9.5 w-9.5 rounded-[11px] ${amarillo ? 'bg-amarillo-tinte' : 'bg-azul-tinte'}`} />
      </div>
      <div className="text-xs text-tinta-2">{detalle}</div>
    </div>
  )
}
