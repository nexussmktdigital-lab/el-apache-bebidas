// Cálculo de precios en el navegador, idéntico al de la base (calcular_precio).
// Se usa para mostrar el precio mientras se escribe, antes de guardar.

export function redondearPrecio(valor: number, redondeo: number): number {
  if (!Number.isFinite(valor)) return 0
  if (!redondeo || redondeo <= 1) return Math.round(valor)
  return Math.round(valor / redondeo) * redondeo
}

export function calcularPrecio(costo: number, margenPct: number, precioManual: number | null, redondeo: number): number {
  if (precioManual != null) return precioManual
  return Math.max(0, redondearPrecio(costo * (1 + (margenPct || 0) / 100), redondeo))
}

/** Porcentaje de ganancia que deja un precio sobre un costo (sobre el costo, no sobre el precio). */
export function margenSobreCosto(costo: number, precio: number): number | null {
  if (!costo) return null
  return Math.round(((precio / costo - 1) * 100) * 100) / 100
}
