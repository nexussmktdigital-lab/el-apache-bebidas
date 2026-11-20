import * as XLSX from 'xlsx'

// Lee la plantilla de carga inicial (docs/plantilla-carga-inicial.xlsx) y
// convierte cada hoja en filas listas para mandar a la base. Toda la
// validación "barata" se hace acá para mostrar los errores antes de importar.

export type Hoja = 'proveedores' | 'productos' | 'clientes'

export interface FilaLeida<T> {
  fila: number // número de fila en el Excel (1 = encabezado)
  datos: T
  errores: string[]
}

export interface ProveedorFila {
  fila: number
  nombre: string
  telefono: string
  contacto: string
  notas: string
}

export interface ProductoFila {
  fila: number
  nombre: string
  categoria: string
  marca: string
  proveedor: string
  unidad_venta: string
  unidades_por_bulto: number
  codigo: string
  stock_actual: number
  stock_minimo: number
  costo: number
  margen_pct: number | null
  precio_venta: number | null
  fecha_vencimiento: string | null
}

export interface ClienteFila {
  fila: number
  nombre: string
  telefono: string
  direccion: string
  zona: string
  cuit: string
  saldo: number
  debe_desde: string | null
  notas: string
}

export interface Lectura {
  proveedores: FilaLeida<ProveedorFila>[]
  productos: FilaLeida<ProductoFila>[]
  clientes: FilaLeida<ClienteFila>[]
  hojasFaltantes: string[]
}

const UNIDADES = ['unidad', 'pack', 'caja', 'cajon']

// Nombres de columna aceptados (normalizados: minúsculas, sin acentos).
const COLUMNAS = {
  productos: {
    nombre: ['nombre', 'producto'],
    categoria: ['categoria'],
    marca: ['marca'],
    proveedor: ['proveedor'],
    unidad_venta: ['unidad de venta', 'unidad'],
    unidades_por_bulto: ['unidades por bulto', 'unidades por pack', 'por bulto'],
    codigo: ['codigo', 'codigo de barras', 'codigo interno'],
    stock_actual: ['stock actual', 'stock'],
    stock_minimo: ['stock minimo', 'minimo'],
    costo: ['costo'],
    margen_pct: ['% de ganancia', 'porcentaje de ganancia', 'ganancia', 'margen'],
    precio_venta: ['precio de venta', 'precio'],
    fecha_vencimiento: ['vencimiento del stock actual', 'vencimiento', 'vence'],
  },
  clientes: {
    nombre: ['nombre', 'cliente'],
    telefono: ['telefono', 'celular', 'whatsapp'],
    direccion: ['direccion'],
    zona: ['zona', 'barrio'],
    cuit: ['cuit'],
    saldo: ['saldo que debe', 'saldo', 'deuda'],
    debe_desde: ['debe desde', 'desde', 'fecha'],
    notas: ['notas', 'observaciones'],
  },
  proveedores: {
    nombre: ['nombre', 'proveedor'],
    telefono: ['telefono', 'celular'],
    contacto: ['contacto'],
    notas: ['notas', 'observaciones'],
  },
} as const

export function normalizar(s: unknown): string {
  return String(s ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function texto(v: unknown): string {
  if (v == null) return ''
  return String(v).trim()
}

/** "14.200", "$ 14200", 14200 → 14200. Vacío → null. Texto inválido → NaN. */
export function entero(v: unknown): number | null {
  if (v == null || v === '') return null
  if (typeof v === 'number') return Number.isFinite(v) ? Math.round(v) : NaN
  const original = String(v).trim()
  if (!original) return null
  const limpio = original.replace(/[^\d,.-]/g, '')
  if (!limpio) return NaN
  // "14.200" es miles; "22,5" es decimal
  const sinMiles = limpio.replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.')
  const n = Number.parseFloat(sinMiles)
  return Number.isFinite(n) ? Math.round(n) : NaN
}

export function decimal(v: unknown): number | null {
  if (v == null || v === '') return null
  if (typeof v === 'number') return Number.isFinite(v) ? v : NaN
  const limpio = String(v).replace('%', '').replace(',', '.').trim()
  if (!limpio) return null
  const n = Number.parseFloat(limpio)
  return Number.isFinite(n) ? n : NaN
}

/** Fecha de Excel (número de serie), Date, "dd/mm/aaaa" o "aaaa-mm-dd" → "aaaa-mm-dd". Inválida → "invalida". */
export function fechaISO(v: unknown): string | null {
  if (v == null || v === '') return null
  if (v instanceof Date) return Number.isNaN(v.getTime()) ? 'invalida' : v.toISOString().slice(0, 10)
  if (typeof v === 'number') {
    const d = XLSX.SSF.parse_date_code(v)
    if (!d) return 'invalida'
    return `${d.y}-${String(d.m).padStart(2, '0')}-${String(d.d).padStart(2, '0')}`
  }
  const s = String(v).trim()
  let m = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})$/)
  if (m) {
    const y = m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3])
    const mes = Number(m[2])
    const dia = Number(m[1])
    if (mes < 1 || mes > 12 || dia < 1 || dia > 31) return 'invalida'
    return `${y}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`
  }
  m = s.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (m) return `${m[1]}-${m[2]}-${m[3]}`
  return 'invalida'
}

/** Mapea los encabezados reales de la hoja a nuestras claves. */
function mapearColumnas(encabezados: unknown[], hoja: Hoja): Record<string, number> {
  const mapa: Record<string, number> = {}
  const normales = encabezados.map(normalizar)
  for (const [clave, alias] of Object.entries(COLUMNAS[hoja]) as Array<[string, readonly string[]]>) {
    for (const a of alias) {
      const idx = normales.indexOf(a)
      if (idx >= 0) {
        mapa[clave] = idx
        break
      }
    }
  }
  return mapa
}

function filasDeHoja(libro: XLSX.WorkBook, nombres: string[]): { encabezados: unknown[]; filas: unknown[][] } | null {
  const nombre = libro.SheetNames.find((n) => nombres.includes(normalizar(n)))
  if (!nombre) return null
  const ws = libro.Sheets[nombre]
  const matriz = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, raw: true, defval: null, blankrows: false })
  if (matriz.length === 0) return { encabezados: [], filas: [] }
  return { encabezados: matriz[0], filas: matriz.slice(1) }
}

function esFilaVacia(f: unknown[]): boolean {
  return f.every((c) => c == null || String(c).trim() === '')
}

export function leerLibro(datos: ArrayBuffer | Uint8Array): Lectura {
  const libro = XLSX.read(datos, { type: 'array', cellDates: false })
  const faltantes: string[] = []

  const prov = filasDeHoja(libro, ['proveedores', 'proveedor'])
  const prod = filasDeHoja(libro, ['productos', 'producto'])
  const cli = filasDeHoja(libro, ['clientes', 'cliente'])
  if (!prov) faltantes.push('Proveedores')
  if (!prod) faltantes.push('Productos')
  if (!cli) faltantes.push('Clientes')

  return {
    proveedores: prov ? leerProveedores(prov.encabezados, prov.filas) : [],
    productos: prod ? leerProductos(prod.encabezados, prod.filas) : [],
    clientes: cli ? leerClientes(cli.encabezados, cli.filas) : [],
    hojasFaltantes: faltantes,
  }
}

export function leerProveedores(encabezados: unknown[], filas: unknown[][]): FilaLeida<ProveedorFila>[] {
  const col = mapearColumnas(encabezados, 'proveedores')
  const g = (f: unknown[], k: string) => (col[k] == null ? null : f[col[k]])
  return filas
    .map((f, i) => ({ f, fila: i + 2 }))
    .filter(({ f }) => !esFilaVacia(f))
    .map(({ f, fila }) => {
      const errores: string[] = []
      const datos: ProveedorFila = { fila, nombre: texto(g(f, 'nombre')), telefono: texto(g(f, 'telefono')), contacto: texto(g(f, 'contacto')), notas: texto(g(f, 'notas')) }
      if (!datos.nombre) errores.push('Falta el nombre.')
      return { fila, datos, errores }
    })
}

export function leerProductos(encabezados: unknown[], filas: unknown[][]): FilaLeida<ProductoFila>[] {
  const col = mapearColumnas(encabezados, 'productos')
  const g = (f: unknown[], k: string) => (col[k] == null ? null : f[col[k]])
  const vistos = new Map<string, number>()
  return filas
    .map((f, i) => ({ f, fila: i + 2 }))
    .filter(({ f }) => !esFilaVacia(f))
    .map(({ f, fila }) => {
      const errores: string[] = []
      const unidad = normalizar(g(f, 'unidad_venta')) || 'unidad'
      const bulto = entero(g(f, 'unidades_por_bulto'))
      const stock = entero(g(f, 'stock_actual'))
      const minimo = entero(g(f, 'stock_minimo'))
      const costo = entero(g(f, 'costo'))
      const margen = decimal(g(f, 'margen_pct'))
      const precio = entero(g(f, 'precio_venta'))
      const vence = fechaISO(g(f, 'fecha_vencimiento'))
      const datos: ProductoFila = {
        fila,
        nombre: texto(g(f, 'nombre')),
        categoria: texto(g(f, 'categoria')),
        marca: texto(g(f, 'marca')),
        proveedor: texto(g(f, 'proveedor')),
        unidad_venta: unidad,
        unidades_por_bulto: unidad === 'unidad' ? 1 : Math.max(1, bulto && !Number.isNaN(bulto) ? bulto : 1),
        codigo: texto(g(f, 'codigo')),
        stock_actual: stock && !Number.isNaN(stock) ? stock : 0,
        stock_minimo: minimo && !Number.isNaN(minimo) ? minimo : 0,
        costo: costo && !Number.isNaN(costo) ? costo : 0,
        margen_pct: margen != null && !Number.isNaN(margen) ? margen : null,
        precio_venta: precio != null && !Number.isNaN(precio) ? precio : null,
        fecha_vencimiento: vence === 'invalida' ? null : vence,
      }
      if (!datos.nombre) errores.push('Falta el nombre.')
      if (!UNIDADES.includes(unidad)) errores.push(`Unidad "${texto(g(f, 'unidad_venta'))}" no válida (unidad, pack, caja o cajon).`)
      if (unidad !== 'unidad' && (!bulto || bulto < 1)) errores.push('Falta "Unidades por bulto".')
      if (stock != null && (Number.isNaN(stock) || stock < 0)) errores.push('Stock actual inválido.')
      if (minimo != null && (Number.isNaN(minimo) || minimo < 0)) errores.push('Stock mínimo inválido.')
      if (costo == null || Number.isNaN(costo) || costo < 0) errores.push('Falta el costo o es inválido.')
      if (margen != null && Number.isNaN(margen)) errores.push('% de ganancia inválido.')
      if (precio != null && (Number.isNaN(precio) || precio < 0)) errores.push('Precio de venta inválido.')
      if (datos.margen_pct == null && datos.precio_venta == null) errores.push('Falta el % de ganancia o el precio de venta.')
      if (vence === 'invalida') errores.push('Fecha de vencimiento inválida (usá día/mes/año).')
      if (datos.precio_venta != null && datos.costo > 0 && datos.precio_venta < datos.costo) errores.push('Aviso: el precio queda por debajo del costo.')
      // Repetidos: por código o por nombre (la base identifica por cualquiera de los dos).
      if (datos.nombre) {
        const claves = [`n:${normalizar(datos.nombre)}`, ...(datos.codigo ? [`c:${normalizar(datos.codigo)}`] : [])]
        const repetida = claves.map((k) => vistos.get(k)).find((x) => x != null)
        if (repetida != null) errores.push(`Repetido con la fila ${repetida}.`)
        else for (const k of claves) vistos.set(k, fila)
      }
      return { fila, datos, errores }
    })
}

export function leerClientes(encabezados: unknown[], filas: unknown[][]): FilaLeida<ClienteFila>[] {
  const col = mapearColumnas(encabezados, 'clientes')
  const g = (f: unknown[], k: string) => (col[k] == null ? null : f[col[k]])
  const vistos = new Map<string, number>()
  return filas
    .map((f, i) => ({ f, fila: i + 2 }))
    .filter(({ f }) => !esFilaVacia(f))
    .map(({ f, fila }) => {
      const errores: string[] = []
      const saldo = entero(g(f, 'saldo'))
      const desde = fechaISO(g(f, 'debe_desde'))
      const datos: ClienteFila = {
        fila,
        nombre: texto(g(f, 'nombre')),
        telefono: texto(g(f, 'telefono')),
        direccion: texto(g(f, 'direccion')),
        zona: texto(g(f, 'zona')),
        cuit: texto(g(f, 'cuit')),
        saldo: saldo && !Number.isNaN(saldo) ? saldo : 0,
        debe_desde: desde === 'invalida' ? null : desde,
        notas: texto(g(f, 'notas')),
      }
      if (!datos.nombre) errores.push('Falta el nombre.')
      if (saldo != null && Number.isNaN(saldo)) errores.push('Saldo inválido.')
      if (desde === 'invalida') errores.push('Fecha "debe desde" inválida (usá día/mes/año).')
      const clave = normalizar(datos.nombre)
      if (datos.nombre) {
        if (vistos.has(clave)) errores.push(`Repetido con la fila ${vistos.get(clave)}.`)
        else vistos.set(clave, fila)
      }
      return { fila, datos, errores }
    })
}

/** Un error "Aviso:" no bloquea la importación; los demás sí. */
export function tieneErroresBloqueantes<T>(filas: FilaLeida<T>[]): boolean {
  return filas.some((f) => f.errores.some((e) => !e.startsWith('Aviso:')))
}
