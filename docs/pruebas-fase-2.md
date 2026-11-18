# Fase 2 · Pasos para probar a mano

Qué se entrega: compras (ingreso por proveedor y fecha, con cantidad, costo y vencimiento), lotes con vencimiento, stock derivado de los movimientos, ajuste manual con motivo, historial de movimientos, aviso de stock mínimo, aviso de productos por vencer, valor del stock a costo.

La base de desarrollo ya tiene stock de ejemplo cargado (parecido a la demo) y una compra registrada de prueba.

## Reglas que se cumplen siempre

- El stock de un producto es la suma de sus movimientos. Nadie lo escribe a mano, ni siquiera desde la base.
- Nunca queda negativo: si no alcanza, la operación entera se rechaza.
- Cada ingreso es un lote con su vencimiento y su costo. Al descontar sale primero el que vence antes; los sin vencimiento, al final.
- Los movimientos no se editan ni se borran. Un error se corrige con un movimiento contrario (ajuste).

## Inicio (Lorenzo o Lorena)

1. El indicador **Valor del stock** ya tiene un número (stock × costo actual).
2. **Stock en el mínimo** lista Cerveza Quilmes (9, mínimo 25) y Energizante Speed (6, mínimo 10), con "Quedan N".
3. **Productos por vencer** lista Speed (vence en 12 días) y Quilmes (21 días). El plazo de aviso es el de Configuración (30 días).
4. Como Thiago, el Inicio muestra "Stock en el mínimo" pero no "Productos por vencer" ni el valor del stock.

## Compras

5. Entrar a **Compras**. Elegir proveedor "Mayorista del Norte", producto "Cerveza Quilmes 1 L": el costo se completa solo con el costo actual ($ 21.500). Poner cantidad 20, costo 23000 y vencimiento dentro de 60 días. **Agregar**: aparece el renglón con la leyenda "El costo pasa de $ 21.500 a $ 23.000".
6. Agregar también 10 de "Fernet Branca 750 ml" al costo actual, sin vencimiento. El total suma los dos renglones.
7. **Ingresar stock**: aviso verde y el ingreso aparece en "Últimos ingresos" con número, proveedor, detalle, total y quién lo cargó.
8. Ir a Productos: Quilmes tiene 29 de stock, costo $ 23.000 y el precio recalculado ($ 28.750 con 25 %); deja de estar en "Stock bajo". En la columna Stock aparece la fecha del vencimiento más próximo.
9. Volver a Compras y hacer clic en el ingreso: se abre el detalle con los renglones.
10. Intentar agregar un renglón con cantidad 0 o sin producto: mensaje de error y no se agrega.

## Ajustes de stock

11. En Productos, botón **Stock** en la fila de Speed. "Sale stock", cantidad 2, motivo Rotura, nota "se rompieron en el reparto". El texto muestra "6 → queda en 4". Registrar: el stock pasa a 4.
12. Intentar sacar 10 de Speed: el formulario avisa "No alcanza el stock: hay 4" y no deja.
13. "Entra stock", cantidad 5, motivo Conteo, vencimiento en 3 meses. Speed queda en 9 y aparece un lote nuevo.
14. Abrir Editar en Speed, pestaña **Stock y lotes**: se ven los dos lotes (el viejo con 4 y el nuevo con 5) y los movimientos con tipo, cantidad, lote, nota y usuario.
15. Hacer un ajuste de salida de 6 sin elegir lote: salen 4 del lote que vence antes y 2 del nuevo (se ve en los movimientos, cada uno con su lote).
16. Hacer otro ajuste eligiendo "De qué lote sale" explícitamente y motivo Vencido.

## Historial de movimientos

17. Botón **Movimientos** arriba de la tabla de productos: lista completa, con filtro por tipo (Compra, Ajuste, Carga inicial…) y búsqueda por producto, nota o usuario. Las salidas en rojo, las entradas en verde.
18. Como Thiago, escribir `/productos/movimientos` o `/compras` a mano: vuelve al Inicio. En Productos no aparece el botón Stock ni Movimientos.

## Configuración

19. Cambiar "Aviso de producto por vencer" a 90 días: en Inicio y en Compras, "Productos por vencer" ahora incluye los que vencen en enero y febrero. Volver a 30.

## Pruebas automáticas

```bash
npm test
```

Resultado esperado: 17 pruebas `ui` y 44 pruebas `db` en verde (14 nuevas: compras atómicas, stock nunca negativo, FEFO, ajuste por lote, movimientos inmutables, consistencia stock = suma de movimientos, avisos por vencer y permisos).
