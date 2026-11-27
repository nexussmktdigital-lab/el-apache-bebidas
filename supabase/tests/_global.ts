import EmbeddedPostgres from 'embedded-postgres'
import { Client } from 'pg'
import { readFileSync, readdirSync, mkdirSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { PG, USUARIOS } from './_db'

// Levanta un Postgres embebido, aplica el shim de Supabase, todas las
// migraciones en orden y los usuarios de prueba. Lo usa vitest como globalSetup
// del proyecto "db".

const RAIZ = join(import.meta.dirname, '..', '..')
const DIR_MIGRACIONES = join(RAIZ, 'supabase', 'migrations')
const DIR_DATOS = join(tmpdir(), 'el-apache-pg-pruebas')

let pg: EmbeddedPostgres | undefined

export async function setup() {
  rmSync(DIR_DATOS, { recursive: true, force: true })
  mkdirSync(DIR_DATOS, { recursive: true })

  pg = new EmbeddedPostgres({
    databaseDir: DIR_DATOS,
    user: PG.user,
    password: PG.password,
    port: PG.port,
    persistent: false,
    onLog: () => {},
    onError: () => {},
  })
  await pg.initialise()
  await pg.start()
  await pg.createDatabase(PG.database)

  const c = new Client(PG)
  await c.connect()
  try {
    await c.query(readFileSync(join(import.meta.dirname, '_shim_supabase.sql'), 'utf8'))

    const migraciones = readdirSync(DIR_MIGRACIONES)
      .filter((f) => f.endsWith('.sql'))
      .sort()
    for (const f of migraciones) {
      try {
        await c.query(readFileSync(join(DIR_MIGRACIONES, f), 'utf8'))
      } catch (e) {
        throw new Error(`Error aplicando la migración ${f}: ${(e as Error).message}`)
      }
    }

    // Usuarios de prueba. El trigger on_auth_user_created crea los perfiles.
    await c.query(
      `insert into auth.users (id, email, raw_app_meta_data) values
        ($1, 'lorenzo@pruebas.local', '{"nombre":"Lorenzo","rol":"superusuario"}'),
        ($2, 'lorena@pruebas.local',  '{"nombre":"Lorena","rol":"administracion"}'),
        ($3, 'thiago@pruebas.local',  '{"nombre":"Thiago","rol":"reparto"}'),
        ($4, 'inactivo@pruebas.local','{"nombre":"Ex empleado","rol":"administracion"}')`,
      [USUARIOS.lorenzo, USUARIOS.lorena, USUARIOS.thiago, USUARIOS.inactivo],
    )
    await c.query(`update public.perfiles set activo = false where id = $1`, [USUARIOS.inactivo])
  } finally {
    await c.end()
  }
}

export async function teardown() {
  await pg?.stop().catch(() => {})
  rmSync(DIR_DATOS, { recursive: true, force: true })
}
