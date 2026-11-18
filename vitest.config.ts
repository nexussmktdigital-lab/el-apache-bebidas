import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vitest/config'

const alias = { '@': fileURLToPath(new URL('./src', import.meta.url)) }

// Dos grupos de pruebas:
//  - ui: utilidades del navegador (formato de pesos, fechas, permisos). Rápidas.
//  - db: lógica de negocio en Postgres. Levantan un Postgres embebido, aplican
//        las migraciones de supabase/migrations y corren los .sql de supabase/tests.
export default defineConfig({
  test: {
    fileParallelism: false,
    projects: [
      {
        resolve: { alias },
        test: {
          name: 'ui',
          include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
          environment: 'node',
        },
      },
      {
        test: {
          name: 'db',
          include: ['supabase/tests/**/*.test.ts'],
          globalSetup: ['supabase/tests/_global.ts'],
          environment: 'node',
          testTimeout: 180_000,
          hookTimeout: 300_000,
        },
      },
    ],
  },
})
