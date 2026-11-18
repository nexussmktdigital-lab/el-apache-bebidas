import { describe, it, expect } from 'vitest'
import { puede, puedeVer } from './permisos'

describe('permisos por rol', () => {
  it('Ventas y cobros (Patricia) vende y cobra, pero no ve costos ni informes', () => {
    expect(puede('reparto', 'vender')).toBe(true)
    expect(puede('reparto', 'registrar_pagos')).toBe(true)
    expect(puede('reparto', 'ver_costos')).toBe(false)
    expect(puede('reparto', 'anular_ventas')).toBe(false)
    expect(puedeVer('reparto', 'informes')).toBe(false)
    expect(puedeVer('reparto', 'compras')).toBe(false)
    expect(puedeVer('reparto', 'gastos')).toBe(false)
  })

  it('Administración (Thiago) ve costos pero no ganancias, informes ni usuarios', () => {
    expect(puede('administracion', 'ver_costos')).toBe(true)
    expect(puede('administracion', 'ver_ganancias')).toBe(false)
    expect(puede('administracion', 'anular_ventas')).toBe(true)
    expect(puede('administracion', 'anular_ventas_antiguas')).toBe(false)
    expect(puedeVer('administracion', 'informes')).toBe(false)
    expect(puedeVer('administracion', 'usuarios')).toBe(false)
  })

  it('Lorenzo (superusuario) puede todo', () => {
    expect(puedeVer('superusuario', 'usuarios')).toBe(true)
    expect(puede('superusuario', 'ver_ganancias')).toBe(true)
    expect(puede('superusuario', 'importar_datos')).toBe(true)
  })

  it('sin rol no se puede nada', () => {
    expect(puedeVer(null, 'inicio')).toBe(false)
    expect(puede(undefined, 'vender')).toBe(false)
  })
})
