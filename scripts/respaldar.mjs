// Copia de seguridad de todos los datos del sistema en un archivo JSON.
// Uso:  node scripts/respaldar.mjs <project-ref> [carpeta]
//
// No necesita Docker: lee cada tabla por la API con la clave service_role, que se obtiene
// de la CLI de Supabase (hay que estar logueado) y se usa solo en memoria.
// El archivo queda en respaldos/ (fuera del repositorio) con la fecha y hora en el nombre.
// Incluye también la lista de usuarios (email, nombre y rol; nunca contraseñas).

import { execFileSync } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const [ref, carpeta = 'respaldos'] = process.argv.slice(2)
if (!ref) {
  console.error('Uso: node scripts/respaldar.mjs <project-ref> [carpeta]')
  process.exit(1)
}

// Orden de dependencias: sirve también para restaurar en el mismo orden.
const TABLAS = [
  'configuracion', 'perfiles', 'categorias', 'marcas', 'proveedores', 'productos', 'producto_costos',
  'precios_historial', 'compras', 'compra_items', 'lotes', 'movimientos_stock', 'clientes', 'ventas',
  'venta_items', 'venta_item_costos', 'cc_movimientos', 'gasto_categorias', 'gastos', 'auditoria',
]

const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx'
const claves = JSON.parse(
  execFileSync(npx, ['supabase', 'projects', 'api-keys', '--project-ref', ref, '-o', 'json'], { encoding: 'utf8', shell: process.platform === 'win32' }),
)
const servicio = claves.find((k) => k.name === 'service_role')?.api_key
if (!servicio) {
  console.error('No se pudo obtener la clave service_role. ¿Hiciste `npx supabase login`?')
  process.exit(1)
}
const admin = createClient(`https://${ref}.supabase.co`, servicio, { auth: { persistSession: false, autoRefreshToken: false } })

const respaldo = { proyecto: ref, fecha: new Date().toISOString(), tablas: {}, usuarios: [] }
let total = 0
for (const tabla of TABLAS) {
  const filas = []
  for (let desde = 0; ; desde += 1000) {
    const { data, error } = await admin.from(tabla).select('*').range(desde, desde + 999)
    if (error) {
      console.error(`Error leyendo ${tabla}: ${error.message}`)
      process.exit(1)
    }
    filas.push(...data)
    if (data.length < 1000) break
  }
  respaldo.tablas[tabla] = filas
  total += filas.length
  console.log(`${tabla.padEnd(20)} ${filas.length}`)
}

const { data: lista, error } = await admin.auth.admin.listUsers({ perPage: 1000 })
if (error) {
  console.error(`Error leyendo usuarios: ${error.message}`)
  process.exit(1)
}
respaldo.usuarios = lista.users.map((u) => ({ id: u.id, email: u.email, nombre: u.user_metadata?.nombre, rol: u.user_metadata?.rol, creado: u.created_at }))

mkdirSync(carpeta, { recursive: true })
const sello = new Date().toISOString().slice(0, 16).replace(/[-:]/g, '').replace('T', '-')
const archivo = `${carpeta}/apache-${sello}.json`
writeFileSync(archivo, JSON.stringify(respaldo))
console.log(`\n${total} filas y ${respaldo.usuarios.length} usuarios guardados en ${archivo}`)
