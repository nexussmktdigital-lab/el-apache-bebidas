# Puesta en marcha en producción

Pasos para pasar del proyecto de desarrollo al de producción antes del 1 de diciembre de 2026. Los hace NEXUSS; los marcados con **(Lorenzo)** necesitan datos del cliente.

## 1. Proyecto de producción en Supabase

1. Crear un proyecto nuevo en Supabase, organización "sistemas", nombre **El Apache Bebidas · Producción**, región São Paulo. Guardar la contraseña de la base en un lugar seguro (no en el repo).
2. En Authentication: desactivar "Allow new users to sign up" y "Confirm email". En URL Configuration, Site URL = la dirección pública del sistema.
3. Asociar y aplicar las migraciones (las mismas que en desarrollo, sin seed):

```bash
npx supabase link --project-ref <ref-produccion>
```

```bash
npx supabase db push --linked
```

4. Verificar en Table Editor que existen `perfiles`, `productos`, `ventas`, etc., y que `configuracion` tiene una fila.

> Para volver a trabajar contra desarrollo: `npx supabase link --project-ref pkkasaypdkjwmsaylido`. El `link` es por máquina; conviene dejar asociado desarrollo y asociar producción solo cuando haya que migrar.

## 2. Usuarios reales

Los emails y roles están en `scripts/usuarios-produccion.local.json` (archivo local, fuera del repo):

- Lorenzo · superusuario
- Thiago · administración
- Patricia · ventas y cobros

```bash
node scripts/crear-usuarios.mjs <ref-produccion> scripts/usuarios-produccion.local.json supabase/usuarios-produccion.local.txt
```

Las contraseñas generadas quedan en `supabase/usuarios-produccion.local.txt`. Entregarlas a cada persona por un canal privado (no por el grupo de WhatsApp) y recomendar que las guarden en el celular.

## 3. Cloudflare apuntando a producción

En el Worker `el-apache-bebidas`, Configuración > Compilación > Variables de compilación, reemplazar:

- `VITE_SUPABASE_URL` → la URL del proyecto de producción
- `VITE_SUPABASE_ANON_KEY` → la clave publicable (`sb_publishable_…`) del proyecto de producción

Hacer "Reintentar implementación" (o un push). Desde ese momento la dirección pública trabaja contra producción.

Si se quiere conservar un ambiente de pruebas en línea, crear un segundo Worker (`el-apache-bebidas-pruebas`) con las variables de desarrollo.

## 4. Configuración inicial **(Lorenzo)**

Entrar como Lorenzo a Configuración y revisar:

- Datos del comprobante (quedan ocultos salvo que se active la casilla; igual conviene cargarlos).
- Vencimiento de cuenta corriente 7 días, aviso 1 día, productos por vencer 15 días, redondeo $10. Ya vienen así.
- Texto del WhatsApp.

## 5. Carga inicial **(Lorenzo)**

1. Completar la plantilla `docs/plantilla-carga-inicial.xlsx` con productos, clientes (con saldo y "debe desde") y proveedores. Si el cliente manda sus listas en otro formato, NEXUSS las acomoda a la plantilla.
2. Entrar como Lorenzo a **Importar datos**, elegir el archivo, revisar la vista previa e importar.
3. Verificar: cantidad de productos y valor del stock en Inicio; total por cobrar en Cuentas corrientes.
4. Si algo salió mal, corregir el Excel y volver a importar (actualiza, no duplica; el stock y el saldo inicial no se vuelven a cargar). Para corregir un stock ya cargado, usar un ajuste.

## 6. Logo **(Lorenzo)**

Reemplazar `src/recursos/logo.webp` y `referencia/logo.webp` por el logo original en buena calidad (idealmente PNG con fondo transparente o SVG), ajustar el tamaño si hace falta y hacer push.

## 7. Entrega

- Manual de uso: `docs/manual-de-uso.html` (abrir e imprimir) y `docs/manual-de-uso.md`.
- Capacitación con los tres usuarios sobre la dirección pública, cada uno con su acceso.
- Primera semana: revisar a diario Usuarios > Últimos movimientos y los avisos del Inicio.

## 8. Copias de seguridad

Supabase hace copias diarias automáticas en el plan Pro. En el plan gratuito no hay copias automáticas: hasta que se contrate, correr una vez por semana desde esta máquina:

```bash
npx supabase db dump --linked -f respaldos/apache-$(date +%Y%m%d).sql --data-only
```

(La carpeta `respaldos/` queda fuera del repo.)
