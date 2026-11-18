import { fecha, pesos, telefonoWhatsApp } from '@/lib/formato'
import type { ClienteVista } from '@/tipos/supabase'

/**
 * Arma el mensaje de aviso de cuenta corriente a partir de la plantilla de
 * Configuración. Reemplaza {cliente}, {saldo} y {vencimiento}.
 */
export function mensajeCuenta(plantilla: string, c: Pick<ClienteVista, 'nombre' | 'saldo' | 'vence_el' | 'dias'>): string {
  let vencimiento: string
  if (!c.vence_el || c.dias == null) vencimiento = 'está pendiente de pago'
  else if (c.dias < 0) vencimiento = `venció el ${fecha(c.vence_el)}`
  else if (c.dias === 0) vencimiento = 'vence hoy'
  else vencimiento = `vence el ${fecha(c.vence_el)}`
  return plantilla.replace(/\{cliente\}/g, c.nombre).replace(/\{saldo\}/g, pesos(c.saldo)).replace(/\{vencimiento\}/g, vencimiento)
}

/** Enlace a WhatsApp con el mensaje armado. Si el teléfono no sirve, abre el selector de contacto. */
export function enlaceWhatsApp(telefono: string, mensaje: string): string {
  const numero = telefonoWhatsApp(telefono)
  const texto = encodeURIComponent(mensaje)
  return numero ? `https://wa.me/${numero}?text=${texto}` : `https://wa.me/?text=${texto}`
}
