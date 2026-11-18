import { describe, it, expect } from 'vitest'
import { pesos, aPesos, porcentaje, fecha, hoyISO, diasHasta, iniciales, telefonoWhatsApp } from './formato'

describe('pesos', () => {
  it('formatea con punto de miles y sin decimales', () => {
    expect(pesos(12345)).toBe('$ 12.345')
    expect(pesos(0)).toBe('$ 0')
    expect(pesos(-2500)).toBe('-$ 2.500')
    expect(pesos(1999.6)).toBe('$ 2.000')
  })
  it('muestra guion si no hay valor', () => {
    expect(pesos(null)).toBe('—')
    expect(pesos(undefined)).toBe('—')
  })
})

describe('aPesos', () => {
  it('entiende lo que escribe el usuario', () => {
    expect(aPesos('12.500')).toBe(12500)
    expect(aPesos('$ 12.500')).toBe(12500)
    expect(aPesos('12500')).toBe(12500)
    expect(aPesos('')).toBeNull()
    expect(aPesos('abc')).toBeNull()
  })
})

describe('porcentaje', () => {
  it('redondea a un decimal', () => {
    expect(porcentaje(25)).toBe('25 %')
    expect(porcentaje(22.456)).toBe('22,5 %')
  })
})

describe('fechas en hora de Córdoba', () => {
  it('formatea AAAA-MM-DD sin correrse un día', () => {
    expect(fecha('2026-12-01')).toBe('01/12/2026')
  })
  it('un instante a las 02:30 UTC todavía es el día anterior en Córdoba', () => {
    expect(fecha('2026-12-01T02:30:00Z')).toBe('30/11/2026')
    expect(hoyISO(new Date('2026-12-01T02:30:00Z'))).toBe('2026-11-30')
    expect(hoyISO(new Date('2026-12-01T03:00:00Z'))).toBe('2026-12-01')
  })
  it('calcula días hasta un vencimiento', () => {
    const ahora = new Date('2026-11-18T15:00:00Z')
    expect(diasHasta('2026-11-25', ahora)).toBe(7)
    expect(diasHasta('2026-11-15', ahora)).toBe(-3)
    expect(diasHasta('2026-11-18', ahora)).toBe(0)
  })
})

describe('iniciales', () => {
  it('toma las dos primeras palabras', () => {
    expect(iniciales('Lorenzo Ferrero')).toBe('LF')
    expect(iniciales('Thiago')).toBe('T')
    expect(iniciales('  kiosco el trébol ')).toBe('KE')
  })
})

describe('telefonoWhatsApp', () => {
  it('normaliza números de Córdoba a formato wa.me', () => {
    expect(telefonoWhatsApp('351 555-1234')).toBe('5493515551234')
    expect(telefonoWhatsApp('0351 15 555 1234')).toBe('5493515551234')
    expect(telefonoWhatsApp('+54 9 351 555 1234')).toBe('5493515551234')
    expect(telefonoWhatsApp('5493515551234')).toBe('5493515551234')
  })
  it('rechaza números incompletos', () => {
    expect(telefonoWhatsApp('1234')).toBeNull()
    expect(telefonoWhatsApp('')).toBeNull()
  })
})
