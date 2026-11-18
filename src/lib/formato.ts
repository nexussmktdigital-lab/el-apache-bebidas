// Formato de pesos, fechas y números en español rioplatense.
// La plata se maneja siempre en pesos enteros (number entero), nunca con decimales.

const ZONA = 'America/Argentina/Cordoba'

const fmtPesos = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 })

/** $ 12.345 */
export function pesos(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return '—'
  const entero = Math.round(n)
  const signo = entero < 0 ? '-' : ''
  return `${signo}$ ${fmtPesos.format(Math.abs(entero))}`
}

/** 12.345 (sin símbolo) */
export function numero(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return '—'
  return fmtPesos.format(n)
}

/** 25 % (entero o con un decimal si hace falta) */
export function porcentaje(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return '—'
  const redondeado = Math.round(n * 10) / 10
  return `${redondeado.toLocaleString('es-AR', { maximumFractionDigits: 1 })} %`
}

/** Convierte lo que escribió el usuario ("12.500", "12500", "$ 12.500") a pesos enteros. */
export function aPesos(texto: string): number | null {
  const limpio = texto.replace(/[^\d-]/g, '')
  if (limpio === '' || limpio === '-') return null
  const n = Number.parseInt(limpio, 10)
  return Number.isFinite(n) ? n : null
}

/** 18/11/2026 */
export function fecha(valor: string | Date | null | undefined): string {
  if (!valor) return '—'
  const d = typeof valor === 'string' ? parsearFecha(valor) : valor
  if (!d || Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: ZONA })
}

/** 18/11/2026 14:35 */
export function fechaHora(valor: string | Date | null | undefined): string {
  if (!valor) return '—'
  const d = typeof valor === 'string' ? new Date(valor) : valor
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: ZONA,
  })
}

/** martes 18 de noviembre */
export function fechaLarga(d: Date = new Date()): string {
  return d.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: ZONA })
}

/** Fecha de hoy en Córdoba como "AAAA-MM-DD" (para inputs type=date y consultas). */
export function hoyISO(ahora: Date = new Date()): string {
  const partes = new Intl.DateTimeFormat('en-CA', { timeZone: ZONA, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(ahora)
  const g = (t: string) => partes.find((p) => p.type === t)!.value
  return `${g('year')}-${g('month')}-${g('day')}`
}

/** Días enteros entre hoy (Córdoba) y una fecha AAAA-MM-DD. Negativo si ya pasó. */
export function diasHasta(fechaISO: string, ahora: Date = new Date()): number {
  const [y1, m1, d1] = hoyISO(ahora).split('-').map(Number)
  const [y2, m2, d2] = fechaISO.split('-').map(Number)
  const a = Date.UTC(y1, m1 - 1, d1)
  const b = Date.UTC(y2, m2 - 1, d2)
  return Math.round((b - a) / 86_400_000)
}

/** "AAAA-MM-DD" o un timestamptz → Date. Una fecha sin hora se interpreta como día local. */
function parsearFecha(s: string): Date | null {
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const [y, m, d] = s.split('-').map(Number)
    // Mediodía UTC para que al formatear en Córdoba (UTC-3) caiga siempre el mismo día.
    return new Date(Date.UTC(y, m - 1, d, 12))
  }
  const d = new Date(s)
  return Number.isNaN(d.getTime()) ? null : d
}

/** Iniciales para avatares: "Lorenzo Ferrero" → "LF" */
export function iniciales(nombre: string): string {
  return nombre
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('')
}

/** Número de teléfono argentino → formato para wa.me (549 + número sin 0 ni 15). */
export function telefonoWhatsApp(tel: string): string | null {
  let d = tel.replace(/\D/g, '')
  if (!d) return null
  if (d.startsWith('549')) return d
  if (d.startsWith('54')) d = d.slice(2)
  if (d.startsWith('0')) d = d.slice(1)
  // quita el 15 después del código de área (2 a 4 dígitos) solo cuando sobra:
  // área + 15 + número suman 12 dígitos. Un número de 10 dígitos se deja como está.
  if (d.length === 12) d = d.replace(/^(\d{2,4})15(\d{6,8})$/, '$1$2')
  if (d.length !== 10) return null
  return `549${d}`
}
