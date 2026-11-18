# Sistema de gestión · El Apache Bebidas (Alta Córdoba)

Plan de trabajo, esquema de base de datos y permisos. Versión para aprobar antes de escribir código.

- Cliente: El Apache Bebidas, sucursal Alta Córdoba (reparto). Desarrolla NEXUSS Agencia Digital.
- Referencia: `referencia/Demo-Sistema-El-Apache.html` (demo aprobada), `referencia/logo.webp`, `referencia/anexo-I-alcance.txt`.
- Primera entrega: en uso el 1 de diciembre de 2026. Segunda entrega: 15 de diciembre de 2026.
- Hoy: 18 de noviembre de 2026. Quedan 13 días corridos.

---

## 1. Qué aprendí de la referencia

**De la demo (diseño y comportamiento)**

- Barra lateral blanca con el logo, buscador, tres grupos de menú (Operación, Mercadería, Administración) y selector de usuario abajo. Colores de marca: azul `#1F5AC8`, azul oscuro `#103A8B`, amarillo `#F5B301`, fondo `#F5F7FB`, borde `#E7EAF0`. Tipografías Outfit (títulos) y DM Sans (texto).
- Inicio: 4 tarjetas (Ventas de hoy, Ganancia de hoy, Valor del stock, Por cobrar), gráfico de barras de 30 días, tres paneles de avisos (Stock en el mínimo, Cuentas por vencer con botón WhatsApp, Productos por vencer), más "Productos más vendidos", "Ventas por categoría" y "Objetivos del mes".
- Productos y stock: una sola tabla con unidad, stock, mínimo editable, costo, % de ganancia editable, precio editable, margen en pesos y %, estados "Stock bajo", "Precio a mano".
- Compras: formulario proveedor, producto, cantidad, costo por unidad, vencimiento. Lista de últimos ingresos.
- Ventas: armado de la venta (producto, cantidad, +/−, quitar), cierre con cliente opcional y forma de pago, control de stock al agregar, tabla de ventas del día. Thiago no ve la columna Ganancia.
- Cuentas corrientes: total por cobrar, tabla ordenada por vencimiento, estados "Al día", "Vence en N días", "Vencida hace N días", botones Registrar pago y WhatsApp con mensaje armado.
- Gastos: categoría, detalle, monto, medio de pago; lista del día.
- Informes: Hoy / 7 días / 30 días / rango libre; tabla Ventas, Costo de lo vendido, Ganancia bruta, Gastos, Resultado, comparación con el período anterior; botón Exportar a Excel.
- Usuarios: tabla de roles y últimos movimientos (quién hizo qué).
- Permisos de ejemplo: Lorenzo todo; Lorena (Administración) productos, compras, ventas, cuentas corrientes y gastos, ve costos; Thiago (Reparto) ventas y cuentas corrientes, no ve costos.

**Del Anexo I (lo contratado)**

Coincide con el brief. Agrega: ficha de cliente con teléfono, dirección y zona; "registro de pagos y entregas a cuenta"; aviso a los 7 días del vencimiento; categorías de gastos a elección; y cuatro puntos "a definir antes de empezar": permisos de Thiago y Lorena, venta de unidades sueltas además de packs, datos del comprobante interno y categorías de gastos.

---

## 2. Preguntas y decisiones a confirmar

Cada punto trae una propuesta. Si estás de acuerdo con todas, alcanza con un "OK" y arranco con las propuestas.

| # | Tema | Propuesta |
|---|------|-----------|
| 1 | Carpeta `referencia` | No existía en el proyecto. La armé con la demo, el logo extraído del HTML (WebP 360×221) y el Anexo I en texto. Si tenés el logo en mejor calidad (SVG o PNG grande), pasámelo. |
| 2 | Permisos de Lorena | Productos, compras, ventas, clientes/CC y gastos. Ve costos y márgenes. Puede cambiar precios, registrar pagos y anular ventas del día. No ve Informes ni Usuarios. |
| 3 | Permisos de Thiago | Ventas y clientes/CC. No ve costos, márgenes, compras ni gastos. Puede registrar pagos de cuenta corriente y ver teléfono y dirección (los necesita para el reparto). No puede anular ventas ni cambiar precios. |
| 4 | Unidades sueltas además de packs | Primera entrega: cada producto se vende en su unidad de venta (unidad, pack o caja), sin fraccionar. Si venden sueltos, se carga el suelto como otro producto (ej. "Coca 2,25 L unidad"). Si querés fraccionar un pack en unidades con stock compartido, lo sumamos en la segunda entrega. |
| 5 | Cuenta corriente | Plazo de vencimiento: 15 días desde la venta (la demo usa 15). Aviso: 7 días antes de vencer y mientras esté vencida. Las dos cosas quedan configurables en Configuración. |
| 6 | Comprobante interno | Encabezado con logo, nombre, dirección, teléfono y CUIT; número correlativo; fecha, usuario, cliente, lista de productos con cantidad, precio y subtotal, total, forma de pago; si es cuenta corriente, saldo anterior y saldo nuevo; leyenda "Comprobante interno, no válido como factura". Los datos del encabezado se cargan en Configuración. Necesito dirección, teléfono y CUIT. |
| 7 | Categorías de gastos iniciales | Combustible, Sueldos, Alquiler, Servicios, Mantenimiento, Otros (las de la demo). Editables desde el sistema. |
| 8 | Redondeo de precios | El precio calculado se redondea a $10 (como la demo). Configurable: 1, 10, 50 o 100. |
| 9 | Costo del producto | Al ingresar una compra, el costo del producto pasa a ser el último costo de compra (no promedio). Cada lote guarda su propio costo. |
| 10 | Aumento masivo de precios | Por categoría o proveedor, en %. En productos con precio calculado sube el % de ganancia para que el precio suba ese %; en productos con precio a mano sube el precio a mano. Queda registro en el historial de precios. |
| 11 | Tablero de inicio | Incluyo todo lo de la demo salvo "Objetivos del mes", que no figura en el Anexo. Si lo querés, es un número configurable (objetivo de ventas mensual) y lo agrego. |
| 12 | Infraestructura | Dos proyectos de Supabase en la nube (desarrollo y producción, región São Paulo), un repositorio en GitHub y un proyecto de Cloudflare Pages conectado al repo. Necesito: cuenta de Supabase (o que me invites), cuenta de Cloudflare, repo. ¿Tenés Docker instalado? Si sí, uso además Supabase local para correr las pruebas rápido; si no, las pruebas corren contra el proyecto de desarrollo. |
| 13 | Dominio | ¿Usa un dominio propio (ej. `sistema.elapachebebidas.com.ar`) o el de Cloudflare Pages (`*.pages.dev`)? |
| 14 | Usuarios | Email de Lorenzo, Lorena y Thiago para crear los accesos. Entran con email y contraseña; no hay registro abierto. |
| 15 | Datos para la carga inicial | ¿Ya llegaron los Excel de productos, clientes y saldos? Si todavía no, en la fase 1 te dejo una plantilla Excel para que Lorenzo la complete. |
| 16 | Avisos automáticos (segunda entrega) | Entiendo "avisos automáticos" como avisos dentro del sistema (y opcionalmente por email) de cuentas por vencer. El envío automático por WhatsApp requiere la API de Meta, que tiene costo y alta aparte; lo dejo fuera salvo que me digas lo contrario. |

---

## 3. Plan por fases

Cada fase termina con: migraciones aplicadas en desarrollo, pruebas automáticas pasando, commit, y una lista de pasos para que la pruebes a mano. Una fase por vez; no arranco la siguiente sin tu visto bueno.

| Fase | Días | Qué entrega |
|------|------|-------------|
| **0 · Base** | 18–19 nov | Repo, Vite + React + TS + Tailwind, Supabase (dev y prod), migración inicial (perfiles, roles, configuración, auditoría), login, layout (barra lateral, encabezado, menú por rol, versión celular), deploy automático a Cloudflare Pages. |
| **1 · Productos y precios** | 20–21 nov | Categorías, marcas, proveedores. Alta, edición, activar/desactivar, buscador y filtros, código interno o de barras. Costo, % de ganancia, precio a mano, margen en pesos y %, aviso de precio bajo costo, aumento masivo por categoría o proveedor, historial de precios. Plantilla Excel de carga. Pruebas: cálculo de precios y márgenes, aumento masivo. |
| **2 · Stock y compras** | 22–24 nov | Movimientos de stock, lotes con vencimiento, stock actual derivado, mínimo y aviso, ajuste manual con motivo, historial, valor del stock a costo. Compras por proveedor y fecha con cantidad, costo y vencimiento; actualización del costo; productos por vencer. Pruebas: stock = suma de movimientos, nunca negativo, FEFO (primero vence, primero sale), costo actualizado. |
| **3 · Ventas y cuentas corrientes** | 25–27 nov | Venta con varios productos, con o sin cliente, efectivo / transferencia / cuenta corriente (exige cliente). Función de Postgres `confirmar_venta` en una sola transacción. Comprobante interno imprimible. Anulación con devolución de stock. Clientes: ficha, saldo, movimientos, pagos parciales o totales, vencimientos, deudores, botón WhatsApp. Pruebas: venta atómica, rechazo sin stock, anulación, saldos de CC, vencimientos. |
| **4 · Gastos, informes, inicio y usuarios** | 28–29 nov | Gastos con categorías editables. Informes: balance diario y mensual por rango (ventas, costo, ganancia, gastos, resultado). Tablero de inicio completo. Pantalla Usuarios con roles y registro de movimientos. Pruebas: balance por rango y zona horaria. |
| **5 · Puesta en marcha** | 30 nov – 1 dic | Importación desde Excel (productos, clientes, saldos) y carga real en producción. Repaso de celular. Manual de uso (digital, listo para imprimir). Capacitación. Sistema en uso el 1 de diciembre. |
| **Segunda entrega** | 2–15 dic | Comparación con el período anterior u otra fecha, exportación a Excel de informes y listados, avisos automáticos de cuentas por vencer. |

Riesgo principal: el plazo es corto y depende de que los datos del cliente lleguen a tiempo (el contrato fija el 18 de noviembre). Si se atrasan, la fase 5 se corre los mismos días.

---

## 4. Esquema de la base de datos

Convenciones:

- Dinero en `bigint`, pesos enteros. Porcentajes en `numeric(6,2)`.
- Todas las tablas tienen `id uuid`, `creado_en timestamptz`, `creado_por uuid`, `actualizado_en`, `actualizado_por`. Nada se borra: `activo boolean` o `estado`.
- Fechas y horas en `timestamptz`; los cortes por día usan la zona `America/Argentina/Cordoba`.
- El stock no es una columna que se edita: se deriva de `movimientos_stock`. Hay una columna `stock_actual` en `productos` que mantiene un trigger a partir de los movimientos; está bloqueada para escritura directa.
- Los costos viven en tablas separadas para que la seguridad por filas (RLS) pueda negarlos por completo a quien no debe verlos.

### Usuarios y configuración

| Tabla | Columnas principales |
|-------|----------------------|
| `perfiles` | `id` (= `auth.users.id`), `nombre`, `rol` (`superusuario` / `administracion` / `reparto`), `activo` |
| `configuracion` | una fila: datos del comprobante (nombre, dirección, teléfono, CUIT, leyenda), `plazo_cc_dias` (15), `aviso_cc_dias` (7), `aviso_vencimiento_dias` (30), `redondeo_precio` (10), plantilla del mensaje de WhatsApp |
| `auditoria` | `tabla`, `registro_id`, `accion`, `usuario_id`, `antes jsonb`, `despues jsonb`, `fecha`. La llena un trigger genérico en todas las tablas de negocio. |

### Productos y precios

| Tabla | Columnas principales |
|-------|----------------------|
| `categorias`, `marcas`, `proveedores` | `nombre`, `activo`. Proveedores además `telefono`, `contacto`, `notas`. |
| `productos` | `nombre`, `categoria_id`, `marca_id`, `proveedor_id`, `unidad_venta` (`unidad` / `pack` / `caja`), `unidades_por_bulto` (ej. 6), `codigo` (interno o de barras, único), `stock_actual` (derivado), `stock_minimo`, `precio_venta` (derivado del costo o del precio a mano), `activo` |
| `producto_costos` | `producto_id` (1 a 1), `costo_actual`, `margen_pct`, `precio_manual` (nulo si el precio se calcula). Un trigger recalcula `productos.precio_venta` = `precio_manual` o `redondear(costo × (1 + margen))`. Solo la ven los roles con permiso de costos. |
| `precios_historial` | `producto_id`, `costo`, `margen_pct`, `precio_manual`, `precio_venta`, `motivo` (edición, compra, aumento masivo, importación), `usuario_id`, `fecha` |

### Stock y compras

| Tabla | Columnas principales |
|-------|----------------------|
| `compras` | `proveedor_id`, `fecha`, `total`, `observaciones` |
| `compra_items` | `compra_id`, `producto_id`, `cantidad`, `costo_unitario`, `fecha_vencimiento` |
| `lotes` | `producto_id`, `compra_item_id` (nulo en carga inicial o ajuste positivo), `fecha_vencimiento` (puede ser nula), `cantidad_inicial`, `cantidad_disponible` (≥ 0), `costo_unitario` |
| `movimientos_stock` | `producto_id`, `lote_id`, `tipo` (`carga_inicial` / `compra` / `venta` / `anulacion_venta` / `ajuste`), `cantidad` (con signo), `motivo_ajuste` (`rotura` / `vencido` / `conteo` / `otro`), `referencia_id` (compra, venta o ajuste), `nota`, `usuario_id`, `fecha` |

Reglas: `cantidad_disponible` de lote y `stock_actual` de producto tienen `CHECK >= 0`; una venta o ajuste negativo descuenta de los lotes en orden de vencimiento (primero el que vence antes, después los sin vencimiento). Una compra crea un lote, un movimiento positivo y actualiza `producto_costos.costo_actual` (último costo).

### Ventas

| Tabla | Columnas principales |
|-------|----------------------|
| `ventas` | `numero` (correlativo), `fecha`, `cliente_id` (nulo = mostrador), `forma_pago` (`efectivo` / `transferencia` / `cuenta_corriente`), `estado` (`confirmada` / `anulada`), `total`, `vence_el` (solo CC), `anulada_en`, `anulada_por`, `motivo_anulacion` |
| `venta_items` | `venta_id`, `producto_id`, `descripcion` (nombre al momento), `cantidad`, `precio_unitario`, `subtotal` |
| `venta_item_costos` | `venta_item_id`, `costo_unitario` al momento de la venta. Separada para que Reparto no reciba costos. |

Funciones de Postgres (una transacción cada una):

- `confirmar_venta(items jsonb, cliente_id, forma_pago)` → valida que CC tenga cliente, bloquea los lotes, verifica stock, descuenta FEFO, inserta venta, ítems, costos, movimientos y, si es CC, el débito en cuenta corriente. Si algo falla, no queda nada.
- `anular_venta(venta_id, motivo)` → marca anulada, devuelve el stock a los mismos lotes con movimientos `anulacion_venta`, y revierte el débito de CC con un movimiento contrario. La venta original no se toca.

### Clientes y cuentas corrientes

| Tabla | Columnas principales |
|-------|----------------------|
| `clientes` | `nombre`, `telefono` (para WhatsApp), `direccion`, `zona`, `cuit` (opcional), `notas`, `activo` |
| `cc_movimientos` | `cliente_id`, `tipo` (`saldo_inicial` / `venta` / `pago` / `anulacion_venta` / `ajuste`), `importe` (débito positivo, crédito negativo), `venta_id`, `medio_pago` (en pagos: efectivo / transferencia), `vence_el` (en débitos), `nota`, `usuario_id`, `fecha` |

Saldo = suma de `importe`. Los pagos se imputan a las deudas más viejas; la vista `v_clientes_saldo` da saldo, vencimiento más próximo y estado (al día / por vencer / vencida). El botón WhatsApp arma `https://wa.me/549<telefono>?text=<mensaje>` con la plantilla de Configuración.

### Gastos e informes

| Tabla | Columnas principales |
|-------|----------------------|
| `gasto_categorias` | `nombre`, `activo` |
| `gastos` | `fecha`, `monto`, `categoria_id`, `medio_pago`, `pagado_a`, `detalle`, `anulado` |

Informes: función `balance(desde, hasta)` → ventas, costo de lo vendido, ganancia bruta, gastos, resultado, y serie por día. Excluye ventas anuladas y gastos anulados. Corta los días en hora de Córdoba.

### Carga inicial

Función `importar_productos(jsonb)` e `importar_clientes(jsonb)`: reciben las filas ya validadas desde el navegador (plantilla Excel leída con SheetJS), crean productos con lote y movimiento `carga_inicial`, y clientes con movimiento `saldo_inicial`. Se corren una vez por archivo y quedan auditadas.

---

## 5. Permisos (RLS)

Los permisos se aplican en Postgres con políticas por fila según el rol del usuario (`perfiles.rol`). La interfaz además oculta lo que no corresponde, pero la base es la que manda: si Thiago consulta `producto_costos` directo a la API, recibe cero filas.

| Qué | Lorenzo (superusuario) | Lorena (administración) | Thiago (reparto) |
|-----|:---:|:---:|:---:|
| Inicio (tablero) | Sí | Sí, sin ganancia ni valor de stock si no viera costos (los ve) | Sí, solo ventas de hoy y por cobrar |
| Productos: ver lista y precios de venta | Sí | Sí | Sí (los necesita para vender) |
| Productos: crear, editar, activar/desactivar | Sí | Sí | No |
| Costos, márgenes, historial de precios | Sí | Sí | **No** (RLS niega las tablas) |
| Cambiar precios y aumento masivo | Sí | Sí | No |
| Stock: ajustes con motivo e historial | Sí | Sí | No (ve stock actual en la venta) |
| Compras y proveedores | Sí | Sí | No |
| Ventas: crear y confirmar | Sí | Sí | Sí |
| Ventas: ver ganancia | Sí | Sí | No |
| Ventas: anular | Sí | Solo las del día | No |
| Clientes: ver ficha, saldo y movimientos | Sí | Sí | Sí |
| Clientes: crear y editar | Sí | Sí | No |
| Registrar pagos de cuenta corriente | Sí | Sí | Sí |
| Gastos | Sí | Sí | No |
| Informes | Sí | No | No |
| Usuarios y configuración | Sí | No | No |
| Importación desde Excel | Sí | No | No |

Las filas 2 y 3 de la tabla de preguntas son las que definen esta matriz; si cambia algo, ajusto las políticas antes de la fase 1.

Detalles técnicos:

- Función `auth_rol()` lee el rol del usuario autenticado desde `perfiles`; las políticas la usan.
- Tablas de costos (`producto_costos`, `precios_historial`, `venta_item_costos`, `compras`, `compra_items`, `lotes` con costo, `movimientos_stock`) solo visibles para `superusuario` y `administracion`.
- Las funciones `confirmar_venta` y `anular_venta` corren con permisos del dueño (`security definer`) y verifican el rol adentro, así Thiago puede vender sin tener acceso directo a las tablas de costos.
- Escritura directa en `productos.stock_actual`, `lotes.cantidad_disponible` y `ventas.estado` bloqueada por triggers: solo cambian a través de las funciones.
- Sin registro abierto en Supabase Auth; los tres usuarios los crea NEXUSS. Lorenzo puede desactivar un usuario o cambiarle el rol desde Usuarios.

---

## 6. Pruebas automáticas

- **Lógica de negocio en Postgres**: pruebas con `pgTAP` (si hay Docker, `supabase test db`; si no, se corren con un script de Node contra el proyecto de desarrollo con una base limpia). Casos: stock nunca negativo, FEFO, venta atómica con fallo a mitad de camino, anulación devuelve stock y saldo, pagos parciales, vencimientos, balance por rango, redondeo de precios, aumento masivo, RLS por rol (Thiago no lee costos).
- **Cálculos en el navegador**: Vitest para formateo de pesos, redondeo y validaciones de los formularios.
- Cada fase agrega sus casos; se corren antes de cada commit.

---

## 7. Estructura del proyecto

```
.
├── referencia/            demo, logo, anexo
├── docs/                  este plan, manual de uso, pasos de prueba por fase
├── supabase/
│   ├── migrations/        SQL versionado, una migración por cambio
│   ├── seed.sql           datos de ejemplo para desarrollo
│   └── tests/             pgTAP
├── src/
│   ├── app/               rutas, layout, guardas por rol
│   ├── modulos/           productos, stock, compras, ventas, clientes, gastos, informes, usuarios, importacion
│   ├── componentes/       tabla, formulario, tarjetas, avisos, modal, impresión
│   ├── lib/               cliente de Supabase, formato de pesos y fechas, permisos
│   └── tipos/             tipos generados desde la base
└── .env.example           sin claves
```
