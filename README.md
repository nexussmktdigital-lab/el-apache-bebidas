# Sistema de gestión · El Apache Bebidas

Sistema web para la distribuidora El Apache Bebidas, sucursal Alta Córdoba (reparto). Desarrollado por NEXUSS Agencia Digital.

- Plan, esquema y permisos: [docs/PLAN.md](docs/PLAN.md)
- Referencia aprobada por el cliente: `referencia/`
- Pasos de prueba por fase: `docs/pruebas-fase-N.md`

## Stack

- Vite + React + TypeScript + Tailwind CSS 4
- Supabase: Postgres, Auth y seguridad por filas (RLS)
- Hosting en Cloudflare Pages
- Migraciones SQL versionadas en `supabase/migrations` (nunca cambios manuales en la base)

## Puesta en marcha local

```bash
npm install
```

Copiá `.env.example` a `.env` y completá la URL y la clave anónima del proyecto de Supabase (Settings > API). El `.env` no se sube al repositorio.

```bash
npm run dev
```

Abre en `http://localhost:5173`.

## Base de datos

Asociar el proyecto de Supabase (una vez por máquina y por entorno):

```bash
npx supabase login
```

```bash
npx supabase link --project-ref <ref-del-proyecto>
```

Aplicar las migraciones pendientes al proyecto asociado:

```bash
npm run db:push
```

Regenerar los tipos TypeScript desde la base:

```bash
npm run db:types
```

Hay dos proyectos: desarrollo (con datos de ejemplo de `supabase/seed.sql`) y producción. Producción solo se toca con autorización expresa.

## Pruebas

```bash
npm test
```

- `ui`: utilidades del navegador (formato de pesos y fechas, permisos).
- `db`: lógica de negocio en Postgres. Levanta un Postgres embebido en una carpeta temporal, aplica un shim mínimo de Supabase (`auth.uid()`, roles `anon`/`authenticated`), corre todas las migraciones y los casos de `supabase/tests/`. No necesita Docker ni cuenta de Supabase. La primera vez descarga los binarios de Postgres.

## Deploy

Cloudflare Pages conectado al repositorio:

- Comando de build: `npm run build`
- Carpeta de salida: `dist`
- Variables de entorno: `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`
- `public/_redirects` manda todas las rutas a `index.html` (aplicación de una sola página).

## Usuarios

No hay registro abierto. Los usuarios se crean desde el panel de Supabase (Authentication > Users > Add user) con estos metadatos para que el perfil se cree con el rol correcto:

```json
{ "nombre": "Lorenzo Ferrero", "rol": "superusuario" }
```

Roles: `superusuario`, `administracion`, `reparto`. Desde la pantalla Usuarios el superusuario puede cambiar roles y desactivar accesos.
