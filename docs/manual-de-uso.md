# Manual de uso · Sistema de gestión El Apache Bebidas

Sucursal Alta Córdoba · Reparto. Versión 1, noviembre de 2026. Desarrollado por NEXUSS Agencia Digital.

Este manual explica cómo usar el sistema en el trabajo de todos los días. Está pensado para leerse en diez minutos y tenerlo a mano. Si algo no funciona como dice acá, escribile a NEXUSS.

---

## 1. Entrar al sistema

- Dirección: **https://el-apache-bebidas.nexuss-mktdigital.workers.dev** (se puede agregar a la pantalla de inicio del celular como si fuera una aplicación).
- Cada persona entra con su **email y contraseña**. No se comparten usuarios: el sistema registra quién hizo cada cosa.
- Si te olvidás la contraseña, pedile a Lorenzo que te la cambie.
- Para salir, tocá el ícono de salida abajo a la izquierda (en el celular, dentro del menú "Más").

### Quién puede hacer qué

| | Lorenzo | Thiago | Patricia |
|---|:---:|:---:|:---:|
| Vender y emitir comprobantes | Sí | Sí | Sí |
| Cobrar cuentas corrientes y avisar por WhatsApp | Sí | Sí | Sí |
| Ver precios de venta y stock | Sí | Sí | Sí |
| Cargar y editar productos, cambiar precios | Sí | Sí | No |
| Ver costos | Sí | Sí | No |
| Compras y ajustes de stock | Sí | Sí | No |
| Gastos | Sí | Sí | No |
| Anular ventas | Cualquiera | Solo las del día | No |
| Ver ganancias e informes | Sí | No | No |
| Usuarios, configuración e importación | Sí | No | No |

---

## 2. Inicio (el tablero)

Lo primero que se ve al entrar. Muestra el resumen de hoy:

- **Ventas de hoy**, **Ganancia de hoy** (solo Lorenzo), **Valor del stock** a costo y **Por cobrar**.
- **Stock en el mínimo**: productos que llegaron al mínimo que vos elegiste. Hay que reponer.
- **Cuentas por vencer**: clientes con deuda próxima a vencer o vencida, con el botón de WhatsApp.
- **Productos por vencer**: mercadería que vence dentro del plazo de aviso (15 días).
- Más abajo: ventas de los últimos 30 días, ventas por categoría y productos más vendidos.

---

## 3. Vender

Menú **Ventas y repartos**.

1. En el buscador escribí parte del nombre o el código del producto. Si hay un solo resultado, **Enter** lo agrega; si hay varios, tocá el que corresponda.
2. Ajustá la cantidad con **+** y **−** o escribiéndola. El sistema no deja vender más de lo que hay en stock.
3. Elegí el **cliente** (o dejá "Sin cliente" para una venta de mostrador). Si el cliente no existe, botón **Nuevo**.
4. Elegí la **forma de pago**: efectivo, transferencia o cuenta corriente. La cuenta corriente siempre necesita un cliente.
5. **Confirmar venta**. El stock baja en ese momento y se abre el **comprobante** para imprimir o guardar como PDF.

En "Ventas de hoy" se ven las ventas del día (o de los últimos 7 o 30 días), con el botón de comprobante y, para quien puede, el de anular.

### Anular una venta

Solo si hubo un error o el cliente devolvió todo. Pide un motivo. El stock vuelve al depósito y, si era cuenta corriente, el importe se descuenta de la deuda del cliente. La venta no se borra: queda tachada con el motivo. Thiago solo puede anular ventas del mismo día; Lorenzo, cualquiera.

---

## 4. Cuentas corrientes

Menú **Cuentas corrientes**. Arriba: total por cobrar, cuentas vencidas y por vencer. La lista muestra primero las vencidas, después las que están por vencer y por último las al día.

- Una venta en cuenta corriente **vence a los 7 días**. El sistema avisa **1 día antes** y mientras siga vencida.
- **Registrar pago**: importe (viene cargado el saldo total; botones "Todo el saldo" y "La mitad"), efectivo o transferencia y una nota. Los pagos se descuentan de la deuda más vieja.
- **WhatsApp**: arma el mensaje con el nombre, el saldo y el vencimiento y abre el chat del cliente. El texto se cambia en Configuración.
- Tocando el nombre se abre la **ficha**: datos, saldo, estado y todos los movimientos con el saldo acumulado.
- **Nuevo cliente** y **Editar datos**: nombre, teléfono (con código de área, para WhatsApp), dirección, zona, CUIT y notas. Un cliente se desactiva, nunca se borra.
- **Ajuste de saldo** (Lorenzo y Thiago): para corregir un error o cargar una deuda vieja, siempre con motivo.

---

## 5. Productos y stock

Menú **Productos y stock**. Buscador por nombre, código o marca; filtros por categoría, proveedor y estado; "Solo con avisos" muestra los que están en el mínimo o con precio bajo costo.

En la tabla se puede editar directo (Lorenzo y Thiago):

- **Mínimo**: cuando el stock llega a ese número, el sistema avisa.
- **Costo** por bulto; debajo se ve el costo por unidad.
- **% ganancia**: el precio se calcula solo sobre el costo y se redondea a $10 **para arriba**.
- **Precio**: si escribís un precio, queda "a mano" y deja de calcularse. Si queda por debajo del costo, aparece el aviso "Bajo costo".

Botones:

- **Nuevo producto**: nombre, categoría, marca, proveedor, se vende por (unidad, pack, caja o cajón) y cuántas unidades trae, código, mínimo, costo y precio.
- **Ojo** (en cada fila): desactiva el producto. Deja de aparecer en Ventas y Compras pero no se borra; sirve para lo que se vende por temporada, como el carbón. Se vuelve a activar desde el filtro Estado > Desactivados, con el mismo botón.
- **Stock** (en cada fila): ajuste manual. "Sale stock" por rotura, vencido o conteo; "Entra stock" por un conteo. Siempre con motivo; queda en el historial.
- **Movimientos**: todas las entradas y salidas de mercadería, con quién las hizo.
- **Aumentar precios**: sube o baja un porcentaje a una categoría, un proveedor o todos los productos.
- **Categorías, marcas y proveedores**: altas, ediciones y bajas de esas listas.
- **Editar** abre la ficha completa, con las pestañas Stock y lotes e Historial de precios.

El stock **nunca se escribe a mano**: cambia por compras, ventas, anulaciones y ajustes.

---

## 6. Compras

Menú **Compras**. Para cargar la mercadería que llega.

1. Elegí el proveedor (botón **Nuevo** si no está) y la fecha.
2. Por cada producto: cantidad en packs, cajas o cajones, **costo por unidad** (botella o lata) y vencimiento si lo tiene. El sistema muestra el costo del bulto y el subtotal.
3. **Agregar** cada renglón y al final **Ingresar stock**.

Al ingresar, el stock sube, el costo del producto pasa a ser el último costo de compra y el precio de venta se recalcula solo (si es con porcentaje). Cada ingreso queda como un lote con su vencimiento; al vender sale primero lo que vence antes.

Una compra no se borra. Si hubo un error, se corrige con un ajuste de stock y, si hace falta, el costo del producto.

---

## 7. Gastos

Menú **Gastos** (Lorenzo y Thiago). Fecha, monto, categoría, medio de pago, a quién se le pagó y detalle. Las categorías se agregan o desactivan con el botón **Categorías**. Un gasto no se edita: se anula con motivo y se carga de nuevo. Todo gasto entra en el balance.

---

## 8. Informes

Menú **Informes** (solo Lorenzo). Balance del período elegido: ventas, costo de lo vendido, ganancia bruta, gastos y resultado. Atajos para hoy, 7 días, este mes, mes anterior, 30 días y este año; o rango a mano. Vista por día o por mes. Las ventas anuladas y los gastos anulados no cuentan.

---

## 9. Usuarios y configuración

Menú **Usuarios** (solo Lorenzo): cambiar el rol de una persona o desactivar su acceso, y ver los últimos movimientos (quién hizo qué). Los usuarios nuevos los da de alta NEXUSS.

Menú **Configuración** (solo Lorenzo):

- Datos del comprobante y si se muestran además del logo.
- Vencimiento de la cuenta corriente (7 días) y aviso previo (1 día).
- Aviso de productos por vencer (15 días).
- Texto del mensaje de WhatsApp, con {cliente}, {saldo} y {vencimiento}.
- Redondeo del precio calculado.

Menú **Importar datos** (solo Lorenzo): carga inicial desde la planilla Excel. Ver la sección siguiente.

---

## 10. Carga inicial desde Excel

1. En **Importar datos**, descargá la plantilla. Tiene tres hojas: Productos, Clientes y Proveedores, con filas de ejemplo que se borran o se pisan.
2. Completá los datos sin cambiar los títulos de las columnas. Precios y costos en pesos enteros. "Unidad de venta": unidad, pack, caja o cajon. "Stock actual" en packs, cajas o cajones. En Clientes, "Saldo que debe" y "Debe desde" (día/mes/año).
3. Elegí el archivo. El sistema muestra una vista previa y marca las filas con errores: corregilas en el Excel y volvé a elegirlo.
4. **Importar**. Primero proveedores, después productos y por último clientes. Al final muestra cuántos se crearon, cuántos se actualizaron y si alguno falló.

Se puede volver a importar la misma planilla: lo que ya existe se actualiza; el stock y el saldo inicial se cargan una sola vez.

---

## 11. Preguntas frecuentes

**Vendí mal, ¿qué hago?** Anulá la venta con el motivo y hacela de nuevo.

**Cargué una compra con el costo equivocado.** Corregí el costo en Productos y, si la cantidad estaba mal, hacé un ajuste de stock.

**Un cliente me pagó por transferencia parte de la deuda.** Cuentas corrientes → Registrar pago → importe, "Transferencia", nota.

**El precio me dio raro.** Revisá el costo y el % de ganancia del producto. El precio se redondea a $10 para arriba. Si querés un precio exacto, escribilo en la columna Precio (queda a mano).

**Un producto dejó de venderse o es de temporada.** Tocá el ojo en su fila para desactivarlo. No se borra: conserva su historial y se vuelve a activar cuando haga falta.

**¿Se pierden los datos si se corta la luz o internet?** No. Todo se guarda en el servidor en el momento; nada queda solo en la computadora. Lo que no se llegó a confirmar, no se guardó.

**¿Quién hizo tal cosa?** Usuarios → Últimos movimientos (Lorenzo), o el historial de movimientos de stock y de cuenta corriente, que siempre muestran el usuario.
