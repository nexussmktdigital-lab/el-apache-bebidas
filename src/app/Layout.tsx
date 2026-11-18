import { useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { LogOut, Menu, X } from 'lucide-react'
import { useSesion } from './AuthProvider'
import { GRUPOS, tituloDeRuta, type ItemNav } from './navegacion'
import { puedeVer } from '@/lib/permisos'
import { NOMBRE_ROL } from '@/lib/permisos'
import { iniciales } from '@/lib/formato'
import logo from '@/recursos/logo.webp'

export function Layout() {
  const { perfil, salir } = useSesion()
  const [menuAbierto, setMenuAbierto] = useState(false)
  const ubicacion = useLocation()
  const rol = perfil!.rol

  const grupos = GRUPOS.map((g) => ({ ...g, items: g.items.filter((i) => puedeVer(rol, i.pantalla)) })).filter(
    (g) => g.items.length > 0,
  )
  // En el celular, los 4 primeros van en la barra de abajo; el resto en el menú.
  const planos = grupos.flatMap((g) => g.items)
  const barraInferior = planos.slice(0, 4)
  const hayMas = planos.length > 4

  return (
    <div className="flex h-full min-h-dvh">
      {/* Barra lateral (PC) */}
      <aside className="hidden w-[252px] shrink-0 flex-col border-r border-borde bg-white px-3.5 pt-4 pb-3.5 md:flex">
        <Marca />
        <nav className="mt-1 flex flex-1 flex-col gap-0.5 overflow-y-auto">
          {grupos.map((g) => (
            <div key={g.titulo}>
              <div className="px-2.5 pt-3.5 pb-1.5 text-[10.5px] font-medium tracking-[0.14em] text-mudo uppercase">{g.titulo}</div>
              {g.items.map((i) => (
                <ItemLateral key={i.ruta} item={i} />
              ))}
            </div>
          ))}
        </nav>
        <PieUsuario nombre={perfil!.nombre} rol={rol} onSalir={salir} />
      </aside>

      {/* Contenido */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-10 flex h-14 items-center gap-2.5 border-b border-borde bg-white px-4 md:h-16 md:px-7">
          <button
            type="button"
            className="-ml-1 rounded-lg p-2 text-tinta-2 hover:bg-fondo md:hidden"
            onClick={() => setMenuAbierto(true)}
            aria-label="Abrir menú"
          >
            <Menu size={22} />
          </button>
          <h2 className="flex-1 truncate text-[17px] font-semibold md:text-[19px]">{tituloDeRuta(ubicacion.pathname)}</h2>
          <div
            className="flex h-9 w-9 items-center justify-center rounded-full bg-azul font-titulo text-[13px] font-semibold text-white"
            title={`${perfil!.nombre} · ${NOMBRE_ROL[rol]}`}
          >
            {iniciales(perfil!.nombre)}
          </div>
        </header>
        <main className="flex-1 px-4 pt-4 pb-24 md:px-7 md:pt-5.5 md:pb-10">
          <Outlet />
        </main>
      </div>

      {/* Barra inferior (celular) */}
      <nav className="fixed inset-x-0 bottom-0 z-10 flex border-t border-borde bg-white pb-[env(safe-area-inset-bottom)] md:hidden">
        {barraInferior.map((i) => (
          <NavLink
            key={i.ruta}
            to={i.ruta}
            end={i.ruta === '/'}
            className={({ isActive }) =>
              `flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-medium ${isActive ? 'text-azul' : 'text-tinta-3'}`
            }
          >
            <i.icono size={21} />
            {i.corto}
          </NavLink>
        ))}
        {hayMas && (
          <button
            type="button"
            onClick={() => setMenuAbierto(true)}
            className="flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-medium text-tinta-3"
          >
            <Menu size={21} />
            Más
          </button>
        )}
      </nav>

      {/* Menú completo (celular) */}
      {menuAbierto && (
        <div className="fixed inset-0 z-20 md:hidden" role="dialog" aria-modal="true">
          <button type="button" className="absolute inset-0 bg-black/40" onClick={() => setMenuAbierto(false)} aria-label="Cerrar menú" />
          <div className="absolute inset-y-0 left-0 flex w-[280px] max-w-[85vw] flex-col bg-white px-3.5 pt-4 pb-3.5 shadow-xl">
            <div className="flex items-start justify-between">
              <Marca />
              <button type="button" className="rounded-lg p-2 text-tinta-2 hover:bg-fondo" onClick={() => setMenuAbierto(false)} aria-label="Cerrar">
                <X size={20} />
              </button>
            </div>
            <nav className="mt-1 flex flex-1 flex-col gap-0.5 overflow-y-auto">
              {grupos.map((g) => (
                <div key={g.titulo}>
                  <div className="px-2.5 pt-3.5 pb-1.5 text-[10.5px] font-medium tracking-[0.14em] text-mudo uppercase">{g.titulo}</div>
                  {g.items.map((i) => (
                    <ItemLateral key={i.ruta} item={i} onClick={() => setMenuAbierto(false)} />
                  ))}
                </div>
              ))}
            </nav>
            <PieUsuario nombre={perfil!.nombre} rol={rol} onSalir={salir} />
          </div>
        </div>
      )}
    </div>
  )
}

function Marca() {
  return (
    <div className="px-2 pt-0.5 pb-3">
      <img src={logo} alt="El Apache Bebidas" className="block w-[132px]" />
      <small className="mt-1.5 block text-[11.5px] text-mudo">Sucursal Alta Córdoba · Reparto</small>
    </div>
  )
}

function ItemLateral({ item, onClick }: { item: ItemNav; onClick?: () => void }) {
  return (
    <NavLink
      to={item.ruta}
      end={item.ruta === '/'}
      onClick={onClick}
      className={({ isActive }) =>
        `flex w-full items-center gap-2.5 rounded-[10px] px-2.5 py-2.25 text-left font-medium ${
          isActive ? 'bg-azul-tinte text-azul' : 'text-tinta-2 hover:bg-fondo'
        }`
      }
    >
      <item.icono size={18} strokeWidth={1.7} />
      <span className="flex-1">{item.titulo}</span>
    </NavLink>
  )
}

function PieUsuario({ nombre, rol, onSalir }: { nombre: string; rol: keyof typeof NOMBRE_ROL; onSalir: () => void }) {
  return (
    <div className="mt-auto border-t border-borde pt-3">
      <div className="flex items-center gap-2.5 px-1">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-azul font-titulo text-[12px] font-semibold text-white">
          {iniciales(nombre)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[13px] font-semibold text-tinta">{nombre}</div>
          <div className="text-[11.5px] text-mudo">{NOMBRE_ROL[rol]}</div>
        </div>
        <button
          type="button"
          onClick={onSalir}
          className="rounded-lg p-2 text-tinta-3 hover:bg-fondo hover:text-mal"
          title="Cerrar sesión"
          aria-label="Cerrar sesión"
        >
          <LogOut size={18} />
        </button>
      </div>
    </div>
  )
}
