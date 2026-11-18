import { describe, it, expect } from 'vitest'
import { porMes, totalizar } from './api'

const fila = (dia: string, ventas: number, costo: number, gastos: number) => ({
  dia,
  ventas_cantidad: ventas ? 1 : 0,
  ventas,
  costo,
  ganancia_bruta: ventas - costo,
  gastos_cantidad: gastos ? 1 : 0,
  gastos,
  resultado: ventas - costo - gastos,
})

describe('informes', () => {
  it('totaliza el balance', () => {
    const t = totalizar([fila('2026-11-01', 1000, 600, 100), fila('2026-11-02', 500, 300, 0)])
    expect(t).toEqual({ ventas_cantidad: 2, ventas: 1500, costo: 900, ganancia_bruta: 600, gastos_cantidad: 1, gastos: 100, resultado: 500 })
  })
  it('agrupa por mes', () => {
    const m = porMes([fila('2026-10-30', 100, 50, 0), fila('2026-11-01', 1000, 600, 100), fila('2026-11-15', 500, 300, 0)])
    expect(m.map((f) => [f.dia, f.ventas, f.resultado])).toEqual([
      ['2026-10', 100, 50],
      ['2026-11', 1500, 500],
    ])
  })
})
