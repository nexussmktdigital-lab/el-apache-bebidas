import { describe, it, expect } from 'vitest'
import { calcularPrecio, margenSobreCosto, redondearPrecio } from './precios'

describe('precios en el navegador (igual que en la base)', () => {
  it('redondea como la base, siempre para arriba', () => {
    expect(redondearPrecio(17321, 10)).toBe(17330)
    expect(redondearPrecio(17330, 10)).toBe(17330)
    expect(redondearPrecio(17324, 1)).toBe(17324)
    expect(redondearPrecio(17324, 10)).toBe(17330)
    expect(redondearPrecio(17325, 10)).toBe(17330)
    expect(redondearPrecio(17324, 50)).toBe(17350)
    expect(redondearPrecio(17351, 100)).toBe(17400)
  })
  it('calcula el precio con margen o devuelve el manual', () => {
    expect(calcularPrecio(14200, 22, null, 10)).toBe(17330)
    expect(calcularPrecio(14200, 22, 17999, 10)).toBe(17999)
    expect(calcularPrecio(0, 30, null, 10)).toBe(0)
  })
  it('deduce el margen desde un precio', () => {
    expect(margenSobreCosto(10000, 12500)).toBe(25)
    expect(margenSobreCosto(0, 100)).toBeNull()
  })
})
