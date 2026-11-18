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

Cloudflare Workers (sitio estático) conectado al repositorio de GitHub. En cada push a , Workers Builds corre:

- Comando de build: - Comando de deploy: 
╭─────────────────────────────────╮
│ Did you mean "wrangler deploy"? │
╰─────────────────────────────────╯

wrangler

COMMANDS
  wrangler docs [search..]        📚 Open Wrangler's command documentation in your browser
  wrangler complete [shell]       ⌨️ Generate and handle shell completions

  wrangler email                  Manage Cloudflare Email services [open beta]

ACCOUNT
  wrangler auth                   🔐 Manage authentication
  wrangler login                  🔓 Login to Cloudflare
  wrangler logout                 🚪 Logout from Cloudflare
  wrangler whoami                 🕵️ Retrieve your user information

COMPUTE & AI
  wrangler agent-memory           🧠 Manage Agent Memory namespaces [private beta]
  wrangler ai                     🤖 Manage AI models
  wrangler ai-search              🔍 Manage AI Search instances [open beta]
  wrangler browser                🌐 Manage Browser Run sessions [open beta]
  wrangler containers             📦 Manage Containers
  wrangler delete [name]          🗑️ Delete a Worker from Cloudflare
  wrangler deploy [path]          🆙 Deploy a Worker to Cloudflare
  wrangler deployments            🚢 List and view the current and past deployments for your Worker
  wrangler dev [script]           👂 Start a local server for developing your Worker
  wrangler dispatch-namespace     🏗️ Manage dispatch namespaces
  wrangler flagship               🚩 Manage Flagship apps and feature flags [open beta]
  wrangler init [name]            📥 Initialize a basic Worker
  wrangler pages                  ⚡️ Configure Cloudflare Pages
  wrangler preview [script]       👀 Create a Preview deployment of the current Worker [open beta]
  wrangler queues                 📬 Manage Workers Queues
  wrangler rollback [version-id]  🔙 Rollback a deployment for a Worker
  wrangler secret                 🤫 Generate a secret that can be referenced in a Worker
  wrangler setup                  🪄 Setup a project to work on Cloudflare
  wrangler tail [worker]          🦚 Start a log tailing session for a Worker
  wrangler triggers               🎯 Updates the triggers of your current deployment [experimental]
  wrangler types [path]           📝 Generate types from your Worker configuration
  wrangler versions               🫧 List, view, upload and deploy Versions of your Worker to Cloudflare
  wrangler vpc                    🌐 Manage VPC [open beta]
  wrangler workflows              🔁 Manage Workflows

STORAGE & DATABASES
  wrangler artifacts              🧱 Manage Artifacts namespaces and repos [open beta]
  wrangler basin                  🏞️ Manage Basin products
  wrangler d1                     🗄️ Manage Workers D1 databases
  wrangler hyperdrive             🚀 Manage Hyperdrive databases
  wrangler k2                     ⛰️ Manage K2 streams [open beta]
  wrangler kv                     🗂️ Manage Workers KV Namespaces
  wrangler r2                     📦 Manage R2 buckets & objects
  wrangler secrets-store          🔐 Manage the Secrets Store [open beta]
  wrangler vectorize              🧮 Manage Vectorize indexes

NETWORKING & SECURITY
  wrangler cert                   🪪 Manage client mTLS certificates and CA certificate chains used for secured connections [open beta]
  wrangler mtls-certificate       🪪 Manage certificates used for mTLS connections
  wrangler tunnel                 🚇 Manage Cloudflare Tunnels [experimental]
  wrangler turnstile              🛡️ Manage Turnstile widgets [alpha]

GLOBAL FLAGS
  -c, --config          Path to Wrangler configuration file  [string]
      --cwd             Run as if Wrangler was started in the specified directory instead of the current working directory  [string]
  -e, --env             Environment to use for operations, and for selecting .env and .dev.vars files  [string]
      --env-file        Path to an .env file to load - can be specified multiple times - values from earlier files are overridden by values in later files  [array]
  -h, --help            Show help  [boolean]
      --install-skills  Install Cloudflare skills for detected AI coding agents before running the command  [boolean] [default: false]
      --profile         Use a specific auth profile  [string]
  -v, --version         Show version number  [boolean]

Please report any issues to https://github.com/cloudflare/workers-sdk/issues/new/choose (usa , que sube la carpeta  y manda todas las rutas a )

Variables de entorno del build (Settings > Build > Variables and secrets del Worker):  y . Son de compilación: si cambian, hay que volver a desplegar.

## Usuarios

No hay registro abierto. Los usuarios se crean desde el panel de Supabase (Authentication > Users > Add user) con estos metadatos para que el perfil se cree con el rol correcto:

```json
{ "nombre": "Lorenzo Ferrero", "rol": "superusuario" }
```

Roles: `superusuario`, `administracion`, `reparto`. Desde la pantalla Usuarios el superusuario puede cambiar roles y desactivar accesos.
