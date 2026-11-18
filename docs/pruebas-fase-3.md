# Fase 3 · Pasos para probar a mano

Qué se entrega: ventas con varios productos, con o sin cliente, en efectivo, transferencia o cuenta corriente; descuento de stock al confirmar (todo o nada); comprobante interno imprimible; anulación con devolución de stock; clientes con ficha, saldo, movimientos, pagos, vencimiento, lista de deudores y botón de WhatsApp con el mensaje armado; Inicio con ventas y ganancia de hoy, por cobrar y cuentas por vencer.

En la base de desarrollo ya hay un cliente ("Kiosco El Trébol") con una venta en cuenta corriente de prueba.

## Reglas que se cumplen siempre

- Confirmar una venta es una sola operación en la base: si falta stock de un producto, no se guarda nada.
- Cada venta guarda el precio y el costo del momento. Cambiar precios después no cambia las ventas ni los informes.
- Anular no borra: la venta queda marcada, el stock vuelve a los mismos lotes y, si era cuenta corriente, se descuenta del cliente.
- La cuenta corriente es un libro de movimientos: el saldo se calcula, nadie lo escribe. Los pagos se imputan a la deuda más vieja.

## Ventas (cualquier usuario)

1. Entrar a **Ventas y repartos**. Escribir "coca" en el buscador y Enter: se agrega Coca-Cola. Si hay varios resultados, se elige con un clic.
2. Agregar Quilmes. Con **+** y **−** cambiar cantidades; el total se actualiza. No deja superar el stock disponible (aviso rojo).
3. Elegir forma de pago **Cuenta corriente** sin cliente y Confirmar: error "Para cuenta corriente elegí un cliente."
4. Elegir el cliente y Confirmar: aviso verde con el total y, si algún producto quedó en el mínimo, lo nombra. Se abre el **comprobante** con logo, datos del negocio, cliente, forma de pago, vencimiento, renglones, total, saldo de cuenta corriente y leyenda. "Imprimir o guardar PDF" abre el diálogo del navegador e imprime solo el comprobante.
5. En "Ventas de hoy" aparece la venta con N.º, cliente, detalle, pago, total, ganancia (solo Lorenzo y Lorena) y quién la hizo. Botones "7 días" y "30 días" cambian el rango.
6. Ir a Productos: el stock de los productos vendidos bajó. En Movimientos aparecen con tipo "Venta".
7. Hacer una venta de mostrador en efectivo sin cliente: el comprobante dice "Venta de mostrador".
8. Como **Thiago**: puede vender y ver el comprobante, pero la tabla no muestra la columna Ganancia ni el botón de anular.

## Anulación

9. Como Lorena, botón ⊗ en una venta de hoy. Pide motivo. Confirmar: la fila queda tachada con "Anulada", el stock vuelve (verlo en Productos) y en el historial de movimientos aparece "Anulación de venta" con el motivo.
10. Si la venta era en cuenta corriente, el saldo del cliente baja.
11. Lorena no puede anular ventas de días anteriores (mensaje "Solo el superusuario puede anular ventas de días anteriores"). Lorenzo sí.

## Cuentas corrientes

12. **Cuentas corrientes** muestra total por cobrar, cuentas vencidas y por vencer. La lista arranca en "Solo con saldo", ordenada por urgencia (vencidas, por vencer, al día).
13. Hacer clic en el nombre: se abre la **ficha** con datos, saldo, estado, último pago y todos los movimientos con saldo acumulado.
14. **Registrar pago**: el importe viene cargado con el saldo total; botones "Todo el saldo" y "La mitad". Pagar la mitad en efectivo: el saldo baja y el estado se mantiene hasta cubrir la deuda más vieja. Pagar el resto: queda "Al día".
15. Si se paga más que el saldo, pide confirmación y el cliente queda con saldo a favor.
16. **WhatsApp**: abre una ventana con el mensaje armado (nombre, saldo y vencimiento). "Abrir WhatsApp" abre el chat del cliente con el texto listo. El texto se edita en Configuración > Mensaje de WhatsApp.
17. **Nuevo cliente** (Lorenzo y Lorena): nombre, teléfono, zona, dirección, CUIT, notas. Un nombre repetido da error. Desactivar un cliente lo saca de la venta pero conserva su historial.
18. En la ficha, **Ajuste de saldo** (solo Lorenzo y Lorena): sirve para cargar una deuda vieja o corregir un error, siempre con motivo.
19. Como **Thiago**: ve clientes con teléfono y dirección, registra pagos y manda WhatsApp, pero no puede crear ni editar clientes ni ajustar saldos.

## Vencimientos

20. Una venta en cuenta corriente vence a los días de Configuración (15). El aviso aparece desde los días configurados antes (7). Para probar sin esperar: en Configuración poner "Aviso de cuenta por vencer" en 20 días; la venta de hoy pasa a "Vence en 15 días" en amarillo en Cuentas corrientes y en el Inicio. Volver a 7.

## Inicio

21. "Ventas de hoy" con el total y la cantidad de ventas; "Ganancia de hoy" con el margen (Lorenzo y Lorena); "Por cobrar" con el total adeudado y cuántas cuentas están por vencer o vencidas.
22. Panel "Cuentas por vencer" con botón de WhatsApp en cada una.
23. Como Thiago: ve "Ventas de hoy" y "Por cobrar", sin ganancia ni valor de stock.

## Celular

24. Ventas: el buscador y el carrito funcionan en pantalla angosta; el panel "Cerrar la venta" queda debajo. Cuentas corrientes se ve como tarjetas con los botones de pago y WhatsApp.

## Pruebas automáticas

```bash
npm test
```

Resultado esperado: 20 pruebas `ui` y 60 pruebas `db` en verde (16 nuevas de ventas y cuentas corrientes).
