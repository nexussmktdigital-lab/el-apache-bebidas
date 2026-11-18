import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { usePerfil } from '@/app/AuthProvider'
import { Panel, Tabla, Insignia, Selector, Boton, Vacio, Aviso } from '@/componentes/ui'
import { useAvisar } from '@/componentes/Toast'
import { DESCRIPCION_ROL, NOMBRE_ROL } from '@/lib/permisos'
import { fechaHora } from '@/lib/formato'
import type { Auditoria, Perfil, RolUsuario } from '@/tipos/supabase'

const ROLES: RolUsuario[] = ['superusuario', 'administracion', 'reparto']

export function Usuarios() {
  const yo = usePerfil()
  const qc = useQueryClient()
  const avisar = useAvisar()

  const perfiles = useQuery({
    queryKey: ['perfiles'],
    queryFn: async () => {
      const { data, error } = await supabase.from('perfiles').select('*').order('nombre')
      if (error) throw error
      return data as Perfil[]
    },
  })

  const movimientos = useQuery({
    queryKey: ['auditoria', 'ultimos'],
    queryFn: async () => {
      const { data, error } = await supabase.from('v_auditoria').select('*').order('id', { ascending: false }).limit(30)
      if (error) throw error
      return data as Auditoria[]
    },
  })

  const cambiar = useMutation({
    mutationFn: async (p: { id: string; cambios: Partial<Pick<Perfil, 'rol' | 'activo'>> }) => {
      const { error } = await supabase.from('perfiles').update(p.cambios).eq('id', p.id)
      if (error) throw error
    },
    onSuccess: () => {
      avisar('Guardado', 'ok')
      void qc.invalidateQueries({ queryKey: ['perfiles'] })
      void qc.invalidateQueries({ queryKey: ['auditoria'] })
    },
    onError: () => avisar('No se pudo guardar. Probá de nuevo.', 'mal'),
  })

  const superusuariosActivos = (perfiles.data ?? []).filter((p) => p.rol === 'superusuario' && p.activo).length

  return (
    <>
      <p className="mb-4 text-tinta-2">Cada persona entra con su usuario y ve solo lo que le corresponde. Queda registrado quién hizo cada movimiento.</p>

      <Aviso>Los usuarios nuevos los da de alta NEXUSS. Desde acá podés cambiar el rol o desactivar un acceso.</Aviso>

      <Panel titulo="Usuarios">
        {perfiles.isLoading && <Vacio>Cargando…</Vacio>}
        {perfiles.error && <Vacio>No pudimos cargar los usuarios.</Vacio>}
        {perfiles.data && (
          <Tabla>
            <thead>
              <tr>
                <th>Usuario</th>
                <th>Rol</th>
                <th>Qué puede ver</th>
                <th>Estado</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {perfiles.data.map((p) => {
                const soyYo = p.id === yo.id
                const ultimoSuper = p.rol === 'superusuario' && p.activo && superusuariosActivos <= 1
                return (
                  <tr key={p.id}>
                    <td>
                      <b>{p.nombre}</b>
                      {soyYo && <span className="ml-1.5 text-xs text-mudo">(vos)</span>}
                    </td>
                    <td>
                      <Selector
                        value={p.rol}
                        disabled={ultimoSuper || cambiar.isPending}
                        onChange={(e) => cambiar.mutate({ id: p.id, cambios: { rol: e.target.value as RolUsuario } })}
                        title={ultimoSuper ? 'Tiene que quedar al menos un superusuario activo' : undefined}
                      >
                        {ROLES.map((r) => (
                          <option key={r} value={r}>
                            {NOMBRE_ROL[r]}
                          </option>
                        ))}
                      </Selector>
                    </td>
                    <td className="max-w-[320px] text-tinta-2">{DESCRIPCION_ROL[p.rol]}</td>
                    <td>{p.activo ? <Insignia tono="ok">Activo</Insignia> : <Insignia tono="mal">Desactivado</Insignia>}</td>
                    <td className="text-right">
                      <Boton
                        chico
                        disabled={ultimoSuper || cambiar.isPending}
                        variante={p.activo ? 'secundario' : 'primario'}
                        onClick={() => {
                          if (p.activo && !window.confirm(`¿Desactivar el acceso de ${p.nombre}? Va a dejar de poder entrar.`)) return
                          cambiar.mutate({ id: p.id, cambios: { activo: !p.activo } })
                        }}
                      >
                        {p.activo ? 'Desactivar' : 'Reactivar'}
                      </Boton>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </Tabla>
        )}
      </Panel>

      <Panel titulo="Últimos movimientos">
        {movimientos.isLoading && <Vacio>Cargando…</Vacio>}
        {movimientos.data?.length === 0 && <Vacio>Todavía no hay movimientos registrados.</Vacio>}
        {movimientos.data?.map((m) => (
          <div key={m.id} className="flex items-center justify-between gap-2.5 border-b border-[#F0F0F3] py-2 last:border-b-0">
            <div>
              <b>{m.usuario ?? 'Sistema'}</b> {describir(m)}
              <small className="block text-tinta-2">{fechaHora(m.fecha)}</small>
            </div>
          </div>
        ))}
      </Panel>
    </>
  )
}

const NOMBRE_TABLA: Record<string, string> = {
  perfiles: 'un usuario',
  configuracion: 'la configuración',
}

function describir(m: Auditoria): string {
  const que = NOMBRE_TABLA[m.tabla] ?? m.tabla
  if (m.tabla === 'perfiles' && m.accion === 'update' && m.antes && m.despues) {
    const nombre = String(m.despues.nombre ?? '')
    if (m.antes.rol !== m.despues.rol) return `cambió el rol de ${nombre} a ${NOMBRE_ROL[m.despues.rol as RolUsuario] ?? m.despues.rol}`
    if (m.antes.activo !== m.despues.activo) return m.despues.activo ? `reactivó a ${nombre}` : `desactivó a ${nombre}`
    if (m.antes.nombre !== m.despues.nombre) return `cambió el nombre de ${m.antes.nombre} a ${nombre}`
  }
  if (m.tabla === 'perfiles' && m.accion === 'insert') return `dio de alta a ${String(m.despues?.nombre ?? '')}`
  const verbo = m.accion === 'insert' ? 'creó' : m.accion === 'update' ? 'modificó' : 'eliminó'
  return `${verbo} ${que}`
}
