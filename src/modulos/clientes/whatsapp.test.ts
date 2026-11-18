import { describe, it, expect } from 'vitest'
import { enlaceWhatsApp, mensajeCuenta } from './whatsapp'

const plantilla = 'Hola, {cliente}. Tu cuenta tiene un saldo de {saldo} que {vencimiento}. Gracias.'

describe('mensaje de WhatsApp', () => {
  it('reemplaza cliente, saldo y vencimiento futuro', () => {
    expect(mensajeCuenta(plantilla, { nombre: 'Kiosco El Trébol', saldo: 186000, vence_el: '2026-11-25', dias: 7 })).toBe(
      'Hola, Kiosco El Trébol. Tu cuenta tiene un saldo de $ 186.000 que vence el 25/11/2026. Gracias.',
    )
  })
  it('distingue vencida, hoy y sin vencimiento', () => {
    expect(mensajeCuenta(plantilla, { nombre: 'A', saldo: 100, vence_el: '2026-11-10', dias: -8 })).toContain('venció el 10/11/2026')
    expect(mensajeCuenta(plantilla, { nombre: 'A', saldo: 100, vence_el: '2026-11-18', dias: 0 })).toContain('vence hoy')
    expect(mensajeCuenta(plantilla, { nombre: 'A', saldo: 100, vence_el: null, dias: null })).toContain('está pendiente de pago')
  })
  it('arma el enlace con el número normalizado o sin número si no sirve', () => {
    expect(enlaceWhatsApp('351 555-1234', 'Hola')).toBe('https://wa.me/5493515551234?text=Hola')
    expect(enlaceWhatsApp('', 'Hola')).toBe('https://wa.me/?text=Hola')
  })
})
