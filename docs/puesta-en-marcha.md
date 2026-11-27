# Puesta en marcha en producción

Pasos para dejar el sistema en producción antes del 1 de diciembre de 2026. Los hace NEXUSS; los marcados con **(Lorenzo)** necesitan datos del cliente.

## 1 a 3. Base, usuarios y dirección pública · HECHO el 27/11/2026

Por decisión de NEXUSS se usó el proyecto que ya existía (`pkkasaypdkjwmsaylido`) como producción, en lugar de crear uno nuevo:

1. Copia de los datos de prueba en `respaldos/` (por las dudas).
2. `npx supabase db reset --linked --no-seed`: la base quedó vacía, con las migraciones aplicadas, la configuración por defecto (7 días, aviso 1 día, vencimientos 15 días, redondeo $10) y las seis categorías de gastos. La numeración de comprobantes arranca en 000001.
3. Se borraron los usuarios de prueba y se crearon los reales con `scripts/crear-usuarios.mjs` y `scripts/usuarios-produccion.local.json`: Lorenzo superusuario, Thiago administración, Patricia ventas y cobros. Las claves están en `supabase/usuarios-produccion.local.txt` (fuera del repo). Entregarlas por un canal privado, no por el grupo.
4. Migración `alta_solo_por_admin`: el rol de un usuario nuevo solo lo puede poner el servidor. Una cuenta creada por otro camino queda desactivada.
5. La dirección pública no cambió: ya apuntaba a este proyecto.

**Registro público desactivado** el 27/11/2026 en Authentication > Sign In / Providers ("Allow new users to sign up" apagado y guardado). Además, la base deja desactivada cualquier cuenta que no haya creado el servidor.

**Desde ahora no hay base de desarrollo en línea.** Los cambios se prueban con las pruebas automáticas (Postgres embebido), se hace una copia antes y se aplican con `npm run db:push`. Si más adelante hace falta probar contra Supabase, crear un proyecto de pruebas aparte y cargarle `supabase/seed.sql`.

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

Supabase hace copias diarias automáticas en el plan Pro. En el plan gratuito no hay copias automáticas: hasta que se contrate, correr una vez por semana desde esta máquina (no necesita Docker):

```bash
node scripts/respaldar.mjs pkkasaypdkjwmsaylido
```

Guarda todas las tablas y la lista de usuarios (sin contraseñas) en `respaldos/apache-AAAAMMDD-HHMM.json`. La carpeta `respaldos/` queda fuera del repo; conviene copiarla también a un disco o a la nube.
