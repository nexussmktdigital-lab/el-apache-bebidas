// Crea usuarios en Supabase Auth con su nombre y rol.
// Uso:  node scripts/crear-usuarios.mjs <project-ref> <archivo.json> [salida.txt]
//
// El archivo JSON es una lista: [{ "email": "...", "nombre": "...", "rol": "superusuario|administracion|reparto", "clave": "opcional" }]
// Si no se indica clave, se genera una al azar. Las claves se escriben en el archivo de salida
// (por defecto supabase/usuarios.local.txt, ignorado por git) y NUNCA en la consola.
//
// La clave service_role se obtiene de la CLI de Supabase (hay que estar logueado) y se usa
// solo en memoria durante la ejecución.

import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync, appendFileSync, existsSync } from 'node:fs'
import { randomBytes } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'

const [ref, archivo, salida = 'supabase/usuarios.local.txt'] = process.argv.slice(2)
if (!ref || !archivo) {
  console.error('Uso: node scripts/crear-usuarios.mjs <project-ref> <archivo.json> [salida.txt]')
  process.exit(1)
}

const usuarios = JSON.parse(readFileSync(archivo, 'utf8'))
const ROLES = ['superusuario', 'administracion', 'reparto']
for (const u of usuarios) {
  if (!u.email || !u.nombre || !ROLES.includes(u.rol)) {
    console.error(`Usuario inválido: ${JSON.stringify(u)}`)
    process.exit(1)
  }
}

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

function claveAzar() {
  // 14 caracteres legibles, sin ambiguos (0/O, 1/l).
  const alfabeto = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
  const bytes = randomBytes(14)
  return Array.from(bytes, (b) => alfabeto[b % alfabeto.length]).join('')
}

if (!existsSync(salida)) writeFileSync(salida, `# Usuarios creados en ${ref} · ${new Date().toISOString()}\n# Este archivo no se sube al repositorio.\n`)

let creados = 0
for (const u of usuarios) {
  const clave = u.clave ?? claveAzar()
  const { data, error } = await admin.auth.admin.createUser({
    email: u.email,
    password: clave,
    email_confirm: true,
    user_metadata: { nombre: u.nombre, rol: u.rol },
  })
  if (error) {
    console.error(`✗ ${u.email}: ${error.message}`)
    continue
  }
  appendFileSync(salida, `${u.nombre} (${u.rol})\n  email: ${u.email}\n  clave: ${clave}\n  id: ${data.user.id}\n`)
  console.log(`✓ ${u.email} (${u.rol})`)
  creados++
}

console.log(`${creados} de ${usuarios.length} usuarios creados. Credenciales en ${salida}`)
