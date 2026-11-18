// Genera la plantilla Excel de carga inicial (productos, clientes y proveedores).
// Uso: node scripts/generar-plantilla.mjs  → docs/plantilla-carga-inicial.xlsx
// La misma estructura la lee la pantalla de importación (fase 5).

import { writeFileSync } from 'node:fs'
import * as XLSX from 'xlsx'

const libro = XLSX.utils.book_new()

function hoja(nombre, encabezados, filas, anchos) {
  const ws = XLSX.utils.aoa_to_sheet([encabezados, ...filas])
  ws['!cols'] = anchos.map((w) => ({ wch: w }))
  ws['!freeze'] = { xSplit: 0, ySplit: 1 }
  XLSX.utils.book_append_sheet(libro, ws, nombre)
}

hoja(
  'Instrucciones',
  ['Cómo completar esta planilla'],
  [
    [''],
    ['1. Completá una fila por producto en la hoja "Productos", una por cliente en "Clientes" y una por proveedor en "Proveedores".'],
    ['2. No cambies los títulos de las columnas ni el orden de las hojas.'],
    ['3. Los precios y costos van en pesos enteros, sin puntos ni símbolos (ejemplo: 14200).'],
    ['4. "Unidad de venta" acepta: unidad, pack, caja o cajon. "Unidades por bulto" es cuántas botellas o latas trae el pack, la caja o el cajón (si es unidad, poné 1).'],
    ['5. Si cargás "Precio de venta", ese precio queda puesto a mano. Si lo dejás vacío, el sistema lo calcula con "% de ganancia" sobre el costo.'],
    ['6. "Stock actual" es lo que hay hoy en el depósito, contado en la unidad de venta (packs, cajas o unidades).'],
    ['7. En "Clientes", "Saldo que debe" es lo que debe hoy en cuenta corriente, y "Debe desde" la fecha de la deuda más vieja (día/mes/año).'],
    ['8. Las filas de ejemplo (en gris) se pueden borrar o pisar.'],
    [''],
    ['Cualquier duda, consultá a NEXUSS antes de cargar.'],
  ],
  [120],
)

hoja(
  'Productos',
  [
    'Nombre',
    'Categoría',
    'Marca',
    'Proveedor',
    'Unidad de venta',
    'Unidades por bulto',
    'Código',
    'Stock actual',
    'Stock mínimo',
    'Costo',
    '% de ganancia',
    'Precio de venta',
    'Vencimiento del stock actual',
  ],
  [
    ['Coca-Cola 2,25 L', 'Gaseosas', 'Coca-Cola', 'Distribuidora Centro', 'pack', 6, '7790895000997', 18, 20, 14200, 22, '', '15/03/2027'],
    ['Cerveza Quilmes 1 L', 'Cervezas', 'Quilmes', 'Mayorista del Norte', 'caja', 12, 'QUI1000', 9, 25, 21500, 25, '', ''],
    ['Cerveza Brahma lata 473 ml', 'Cervezas', 'Brahma', 'Mayorista del Norte', 'pack', 24, 'BRA473', 42, 20, 26800, '', 35000, ''],
  ],
  [30, 14, 14, 22, 14, 16, 16, 12, 12, 10, 13, 14, 24],
)

hoja(
  'Clientes',
  ['Nombre', 'Teléfono', 'Dirección', 'Zona', 'CUIT', 'Saldo que debe', 'Debe desde', 'Notas'],
  [
    ['Kiosco El Trébol', '351 555-1234', 'Av. Juan B. Justo 2500', 'Alta Córdoba', '', 186000, '10/11/2026', ''],
    ['Almacén Doña Rosa', '351 555-5678', 'Fragueiro 1800', 'General Bustos', '27-12345678-9', 92500, '02/11/2026', 'Paga los viernes'],
    ['Despensa San Martín', '351 555-9012', 'Castro Barros 950', 'San Martín', '', 0, '', ''],
  ],
  [26, 16, 28, 16, 16, 14, 12, 24],
)

hoja(
  'Proveedores',
  ['Nombre', 'Teléfono', 'Contacto', 'Notas'],
  [
    ['Distribuidora Centro', '351 400-0001', 'Marcos', 'Entrega martes y jueves'],
    ['Mayorista del Norte', '351 400-0002', 'Claudia', ''],
  ],
  [26, 16, 16, 30],
)

const salida = 'docs/plantilla-carga-inicial.xlsx'
writeFileSync(salida, XLSX.write(libro, { type: 'buffer', bookType: 'xlsx' }))
console.log(`Plantilla generada en ${salida}`)
