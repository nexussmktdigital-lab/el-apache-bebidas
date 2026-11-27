// Carga stock de ejemplo en la base de DESARROLLO a través de la API, como lo
// haría un usuario (no toca la base por atrás). Solo para probar.
// Uso: node scripts/cargar-stock-ejemplo.mjs <email-superusuario>
// La contraseña se lee de supabase/usuarios.local.txt (archivo local, fuera de git).

import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const email = process.argv[2]
if (!email) {
  console.error('Uso: node scripts/cargar-stock-ejemplo.mjs <email-superusuario>')
  process.exit(1)
}

const env = Object.fromEntries(
  readFileSync('.env', 'utf8')
    .split('\n')
    .filter((l) => l.includes('='))
    .map((l) => l.split('=').map((s) => s.trim())),
)
// El proyecto pkkasaypdkjwmsaylido pasó a ser PRODUCCIÓN el 27/11/2026: nunca cargar datos de ejemplo ahí.
const PRODUCCION = ['pkkasaypdkjwmsaylido']
if (PRODUCCION.some((ref) => (env.VITE_SUPABASE_URL ?? '').includes(ref))) {
  console.error('El .env apunta a PRODUCCIÓN. Este script es solo para un proyecto de pruebas.')
  process.exit(1)
}

const credenciales = readFileSync('supabase/usuarios.local.txt', 'utf8')
const bloque = credenciales.split(/\n(?=\S)/).find((b) => b.includes(`email: ${email}`))
const clave = bloque?.match(/clave: (\S+)/)?.[1]
if (!clave) {
  console.error(`No encontré la clave de ${email} en supabase/usuarios.local.txt`)
  process.exit(1)
}

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY, { auth: { persistSession: false } })
const { error: errorLogin } = await supabase.auth.signInWithPassword({ email, password: clave })
if (errorLogin) {
  console.error(`No pude entrar como ${email}: ${errorLogin.message}`)
  process.exit(1)
}

// Cantidades y vencimientos parecidos a la demo: algunos en el mínimo y otros por vencer.
const STOCK = [
  ['COCA225', 18, 64],
  ['SPR225', 34, 80],
  ['FER750', 20, 400],
  ['QUI1000', 9, 21],
  ['BRA473', 42, 95],
  ['AGUA2000', 60, 210],
  ['TORO1000', 14, 500],
  ['SPEED250', 6, 12],
  ['BAG1000', 27, 45],
  ['GAN950', 11, 380],
]

const { data: productos, error } = await supabase.from('v_productos').select('id, codigo, nombre, stock_actual')
if (error) throw error

const hoy = new Date()
let cargados = 0
for (const [codigo, cantidad, dias] of STOCK) {
  const p = productos.find((x) => x.codigo === codigo)
  if (!p) {
    console.log(`- ${codigo}: no existe, se saltea`)
    continue
  }
  if (p.stock_actual > 0) {
    console.log(`- ${p.nombre}: ya tiene stock (${p.stock_actual}), se saltea`)
    continue
  }
  const vence = new Date(hoy.getTime() + dias * 86_400_000).toISOString().slice(0, 10)
  const { error: e } = await supabase.rpc('cargar_stock_inicial', { p_producto_id: p.id, p_cantidad: cantidad, p_fecha_vencimiento: vence })
  if (e) {
    console.error(`✗ ${p.nombre}: ${e.message}`)
    continue
  }
  console.log(`✓ ${p.nombre}: ${cantidad}, vence ${vence}`)
  cargados++
}
console.log(`${cargados} productos con stock de ejemplo.`)
await supabase.auth.signOut()
