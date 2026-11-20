import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { entero, decimal, fechaISO, leerLibro, leerProductos, leerClientes, tieneErroresBloqueantes } from './leerExcel'

describe('conversiones', () => {
  it('entiende pesos escritos de varias formas', () => {
    expect(entero(14200)).toBe(14200)
    expect(entero('14.200')).toBe(14200)
    expect(entero('$ 14.200')).toBe(14200)
    expect(entero('14200,6')).toBe(14201)
    expect(entero('')).toBeNull()
    expect(entero(null)).toBeNull()
    expect(entero('abc')).toBeNaN()
  })
  it('porcentajes con coma o símbolo', () => {
    expect(decimal('22,5')).toBe(22.5)
    expect(decimal('22 %')).toBe(22)
    expect(decimal(22)).toBe(22)
    expect(decimal('')).toBeNull()
  })
  it('fechas de Excel, dd/mm/aaaa e ISO', () => {
    expect(fechaISO('15/03/2027')).toBe('2027-03-15')
    expect(fechaISO('1/3/27')).toBe('2027-03-01')
    expect(fechaISO('2027-03-15')).toBe('2027-03-15')
    expect(fechaISO(46461)).toBe('2027-03-15') // número de serie de Excel
    expect(fechaISO('35/13/2027')).toBe('invalida')
    expect(fechaISO('mañana')).toBe('invalida')
    expect(fechaISO('')).toBeNull()
  })
})

describe('productos', () => {
  const enc = ['Nombre', 'Categoría', 'Marca', 'Proveedor', 'Unidad de venta', 'Unidades por bulto', 'Código', 'Stock actual', 'Stock mínimo', 'Costo', '% de ganancia', 'Precio de venta', 'Vencimiento del stock actual']
  it('lee filas válidas y marca errores por fila', () => {
    const filas = leerProductos(enc, [
      ['Coca-Cola 2,25 L', 'Gaseosas', 'Coca-Cola', 'Distri', 'pack', 6, '779', 18, 20, '14.200', 22, null, '15/03/2027'],
      ['Brahma', 'Cervezas', null, null, 'Pack', 24, null, 42, 20, 26800, null, 35000, null],
      [null, null, null, null, null, null, null, null, null, null, null, null, null],
      ['Sin precio', 'Cervezas', null, null, 'caja', 12, null, 0, 0, 100, null, null, null],
      ['Unidad rara', 'Cervezas', null, null, 'bolsa', 6, null, 0, 0, 100, 10, null, null],
      ['coca-cola 2,25 l', 'Gaseosas', null, null, 'pack', 6, null, 1, 0, 100, 10, null, 'ayer'],
      ['Pack sin bulto', 'Gaseosas', null, null, 'pack', null, null, 1, 0, 100, 10, null, null],
      ['Barato', 'Gaseosas', null, null, 'unidad', null, null, 1, 0, 1000, null, 900, null],
    ])
    expect(filas).toHaveLength(7) // la fila vacía se saltea
    expect(filas[0].errores).toEqual([])
    expect(filas[0].datos).toMatchObject({ fila: 2, nombre: 'Coca-Cola 2,25 L', unidad_venta: 'pack', unidades_por_bulto: 6, codigo: '779', stock_actual: 18, stock_minimo: 20, costo: 14200, margen_pct: 22, precio_venta: null, fecha_vencimiento: '2027-03-15' })
    expect(filas[1].datos).toMatchObject({ unidad_venta: 'pack', unidades_por_bulto: 24, costo: 26800, margen_pct: null, precio_venta: 35000 })
    expect(filas[2].errores).toEqual(['Falta el % de ganancia o el precio de venta.'])
    expect(filas[3].errores[0]).toContain('no válida')
    expect(filas[4].errores).toEqual(['Fecha de vencimiento inválida (usá día/mes/año).', 'Repetido con la fila 2.'])
    expect(filas[5].errores).toEqual(['Falta "Unidades por bulto".'])
    expect(filas[6].errores).toEqual(['Aviso: el precio queda por debajo del costo.'])
    expect(tieneErroresBloqueantes([filas[0], filas[6]])).toBe(false)
    expect(tieneErroresBloqueantes(filas)).toBe(true)
  })
  it('acepta encabezados con otros nombres y sin acentos', () => {
    const filas = leerProductos(['PRODUCTO', 'categoria', 'unidad', 'por bulto', 'stock', 'costo', 'ganancia'], [['Agua', 'Aguas', 'Caja', 6, 10, 5400, '30']])
    expect(filas[0].errores).toEqual([])
    expect(filas[0].datos).toMatchObject({ nombre: 'Agua', categoria: 'Aguas', unidad_venta: 'caja', unidades_por_bulto: 6, stock_actual: 10, costo: 5400, margen_pct: 30 })
  })
})

describe('clientes', () => {
  it('lee saldo y fecha, detecta repetidos y nombres vacíos', () => {
    const filas = leerClientes(['Nombre', 'Teléfono', 'Dirección', 'Zona', 'CUIT', 'Saldo que debe', 'Debe desde', 'Notas'], [
      ['Kiosco El Trébol', '351 555-1234', 'Av. 1', 'Alta Córdoba', null, '186.000', '10/11/2026', null],
      ['Despensa', null, null, null, null, 0, null, 'paga viernes'],
      ['  ', null, null, null, null, 5, null, null],
      ['kiosco el trebol', null, null, null, null, 1, null, null],
    ])
    expect(filas[0].errores).toEqual([])
    expect(filas[0].datos).toMatchObject({ saldo: 186000, debe_desde: '2026-11-10', zona: 'Alta Córdoba' })
    expect(filas[1].datos.saldo).toBe(0)
    expect(filas[2].errores).toEqual(['Falta el nombre.'])
    expect(filas[3].errores).toEqual(['Repetido con la fila 2.'])
  })
})

describe('plantilla oficial', () => {
  it('se lee entera con sus filas de ejemplo', () => {
    const buffer = readFileSync('docs/plantilla-carga-inicial.xlsx')
    const l = leerLibro(new Uint8Array(buffer))
    expect(l.hojasFaltantes).toEqual([])
    expect(l.productos).toHaveLength(3)
    expect(l.clientes).toHaveLength(3)
    expect(l.proveedores).toHaveLength(2)
    expect(l.productos.every((f) => f.errores.length === 0)).toBe(true)
    expect(l.productos[0].datos).toMatchObject({ nombre: 'Coca-Cola 2,25 L', codigo: '7790895000997', fecha_vencimiento: '2027-03-15' })
    expect(l.clientes[0].datos).toMatchObject({ saldo: 186000, debe_desde: '2026-11-10' })
  })
})
