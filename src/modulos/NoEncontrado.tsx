import { Link } from 'react-router-dom'
import { Panel } from '@/componentes/ui'

export function NoEncontrado() {
  return (
    <Panel titulo="Esa página no existe">
      <p className="text-tinta-2">
        Revisá la dirección o volvé al{' '}
        <Link to="/" className="font-medium text-azul underline">
          inicio
        </Link>
        .
      </p>
    </Panel>
  )
}
