# Sistema de gestión · El Apache Bebidas

Sistema web para la distribuidora El Apache Bebidas, sucursal Alta Córdoba (reparto). Desarrollado por NEXUSS Agencia Digital.

- Plan, esquema y permisos: [docs/PLAN.md](docs/PLAN.md)
- Referencia aprobada por el cliente: `referencia/`
- Pasos de prueba por fase: `docs/pruebas-fase-N.md`

## Stack

- Vite + React + TypeScript + Tailwind CSS 4
- Supabase: Postgres, Auth y seguridad por filas (RLS)
- Hosting en Cloudflare Workers (sitio estático con assets)
- Migraciones SQL versionadas en `supabase/migrations` (nunca cambios manuales en la base)

## Puesta en marcha local

```bash
npm install
```

Copiá `.env.example` a `.env` y completá la URL y la clave publicable del proyecto de Supabase (Settings > API Keys). El `.env` no se sube al repositorio.

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

Regenerar los tipos TypeScript desde la base (`src/tipos/supabase.gen.ts`, no se edita a mano):

```bash
npm run db:types
```

**El proyecto asociado (`pkkasaypdkjwmsaylido`) es PRODUCCIÓN desde el 27/11/2026**: tiene los datos reales de El Apache. Se vació y quedó sin datos de ejemplo. Cualquier cambio en la base se aplica solo con autorización expresa, después de pasar las pruebas automáticas y con una copia de seguridad previa. No hay proyecto de desarrollo en línea: las pruebas de base corren en el Postgres embebido. `supabase/seed.sql` y `scripts/cargar-stock-ejemplo.mjs` son solo para un proyecto de pruebas nuevo; el script se niega a correr contra producción.

### Copias de seguridad

```bash
node scripts/respaldar.mjs pkkasaypdkjwmsaylido
```

Guarda todas las tablas y la lista de usuarios (sin contraseñas) en `respaldos/apache-AAAAMMDD-HHMM.json`, fuera del repositorio. No necesita Docker.

## Pruebas

```bash
npm test
```

- `ui`: utilidades del navegador (formato de pesos y fechas, permisos, cálculo de precios).
- `db`: lógica de negocio en Postgres. Levanta un Postgres embebido en una carpeta temporal, aplica un shim mínimo de Supabase (`auth.uid()`, roles `anon`/`authenticated`), corre todas las migraciones y los casos de `supabase/tests/`. No necesita Docker ni cuenta de Supabase. La primera vez descarga los binarios de Postgres.

## Deploy

Cloudflare Workers conectado al repositorio de GitHub. En cada push a `main`, Workers Builds corre:

- Comando de build: `npm run build`
- Comando de deploy: `npx wrangler deploy`, que lee `wrangler.jsonc`, sube la carpeta `dist` y manda todas las rutas a `index.html`.

Variables de entorno del build (en el Worker: Settings > Build > Variables and secrets): `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`. Son de compilación: si cambian, hay que volver a desplegar.

## Usuarios

No hay registro abierto. Los usuarios se crean con el script (necesita `npx supabase login`):

```bash
node scripts/crear-usuarios.mjs <project-ref> scripts/usuarios-pruebas.json
```

El archivo JSON lleva email, nombre y rol de cada usuario; las contraseñas generadas quedan en `supabase/usuarios.local.txt`, que no se sube al repositorio. También se pueden crear desde el panel de Supabase (Authentication > Users > Add user) con estos metadatos:

```json
{ "nombre": "Lorenzo Ferrero", "rol": "superusuario" }
```

Roles: `superusuario`, `administracion`, `reparto`. Desde la pantalla Usuarios el superusuario puede cambiar roles y desactivar accesos.

## Plantilla de carga inicial

`docs/plantilla-carga-inicial.xlsx` es la planilla que completa el cliente con productos, clientes y proveedores. Se regenera con:

```bash
node scripts/generar-plantilla.mjs
```
