import { Client } from 'pg'

// Conexión fija que levanta _global.ts. Sin espacios en la ruta para que initdb
// de Windows no se queje.
export const PG = {
  host: '127.0.0.1',
  port: 54329,
  user: 'postgres',
  password: 'postgres',
  database: 'pruebas',
}

export const USUARIOS = {
  lorenzo: '11111111-1111-4111-8111-111111111111',
  lorena: '22222222-2222-4222-8222-222222222222',
  thiago: '33333333-3333-4333-8333-333333333333',
  inactivo: '44444444-4444-4444-8444-444444444444',
} as const

export type Usuario = keyof typeof USUARIOS

export async function conectar(): Promise<Client> {
  const c = new Client(PG)
  await c.connect()
  return c
}

/**
 * Corre `fn` dentro de una transacción como si la llamada viniera de la API de
 * Supabase con el usuario indicado (rol authenticated + claim sub), y al final
 * hace rollback para que cada prueba arranque limpia.
 */
export async function como<T>(
  usuario: Usuario | 'anon' | 'servidor',
  fn: (c: Client) => Promise<T>,
): Promise<T> {
  const c = await conectar()
  try {
    await c.query('begin')
    if (usuario === 'servidor') {
      // sin cambiar de rol: superusuario de Postgres
    } else if (usuario === 'anon') {
      await c.query(`select set_config('request.jwt.claims', '{"role":"anon"}', true)`)
      await c.query('set local role anon')
    } else {
      const claims = JSON.stringify({ sub: USUARIOS[usuario], role: 'authenticated' })
      await c.query(`select set_config('request.jwt.claims', $1, true)`, [claims])
      await c.query('set local role authenticated')
    }
    return await fn(c)
  } finally {
    await c.query('rollback').catch(() => {})
    await c.end()
  }
}

/** Cambia de usuario dentro de la misma transacción (por ejemplo, Lorena prepara datos y Thiago opera). */
export async function cambiarUsuario(c: Client, usuario: Usuario | 'servidor'): Promise<void> {
  await c.query('reset role')
  if (usuario === 'servidor') {
    await c.query(`select set_config('request.jwt.claims', '', true)`)
    return
  }
  const claims = JSON.stringify({ sub: USUARIOS[usuario], role: 'authenticated' })
  await c.query(`select set_config('request.jwt.claims', $1, true)`, [claims])
  await c.query('set local role authenticated')
}

/** Igual que `como`, pero conserva los cambios (para preparar datos entre pruebas). */
export async function comoYGuardar<T>(usuario: Usuario | 'servidor', fn: (c: Client) => Promise<T>): Promise<T> {
  const c = await conectar()
  try {
    await c.query('begin')
    if (usuario !== 'servidor') {
      const claims = JSON.stringify({ sub: USUARIOS[usuario], role: 'authenticated' })
      await c.query(`select set_config('request.jwt.claims', $1, true)`, [claims])
      await c.query('set local role authenticated')
    }
    const r = await fn(c)
    await c.query('commit')
    return r
  } catch (e) {
    await c.query('rollback').catch(() => {})
    throw e
  } finally {
    await c.end()
  }
}

/**
 * Espera que la consulta falle con un mensaje que contenga `texto`.
 * Usa un savepoint para que la transacción de la prueba siga viva después del error.
 */
export async function debeFallar(c: Client, texto: string, sql: string, params: unknown[] = []): Promise<string> {
  await c.query('savepoint esperado')
  try {
    await c.query(sql, params)
  } catch (e) {
    await c.query('rollback to savepoint esperado')
    const msg = (e as Error).message
    if (!msg.toLowerCase().includes(texto.toLowerCase())) {
      throw new Error(`Falló, pero con otro mensaje: "${msg}" (se esperaba que contenga "${texto}")`)
    }
    return msg
  }
  await c.query('release savepoint esperado')
  throw new Error(`Se esperaba un error ("${texto}") y la consulta salió bien: ${sql}`)
}
