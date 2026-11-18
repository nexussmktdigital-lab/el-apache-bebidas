# Fase 4 · Pasos para probar a mano

Qué se entrega: gastos con categorías a elección; informes con balance diario y mensual por rango de fechas (ventas, costo de lo vendido, ganancia bruta, gastos, resultado); tablero de inicio completo (ventas de los últimos 30 días, productos más vendidos, ventas por categoría); costo por unidad en la tabla de productos.

## Gastos (Lorenzo o Thiago; Patricia no ve esta pantalla)

1. Entrar a **Gastos**. Las categorías arrancan con Combustible, Sueldos, Alquiler, Servicios, Mantenimiento y Otros.
2. Cargar un gasto: fecha de hoy, monto 38000, Combustible, efectivo, "YPF", "Carga camioneta". Aparece en la lista con quién lo cargó y en el panel "Por categoría".
3. Botón **+** al lado de la categoría: crea una nueva sin salir (por ejemplo "Impuestos") y queda seleccionada. Botón **Categorías**: lista completa, agregar y desactivar.
4. Cargar un gasto con fecha de ayer y otro del mes pasado. Los botones Hoy / 7 días / Este mes / 30 días filtran; el total de arriba cambia.
5. Anular un gasto (icono ⊗): pide motivo; la fila queda tachada con el motivo y sale del total y del balance. No se puede editar ni borrar un gasto: se anula y se carga de nuevo.
6. Como Patricia, escribir `/gastos` a mano: vuelve al Inicio.

## Informes (solo Lorenzo)

7. Entrar a **Informes**. Arranca en "Este mes". A la izquierda el balance: Ventas, Costo de lo vendido, Ganancia bruta, Gastos y Resultado, con cantidad de ventas, margen bruto y días. A la derecha, gráfico y detalle por día (solo los días con movimiento).
8. Probar los atajos: Hoy, Últimos 7 días, Mes anterior, Últimos 30 días, Este año (pasa a vista por mes).
9. Rango a mano: elegir desde y hasta. Si "desde" es posterior a "hasta", avisa.
10. **Por mes**: agrupa el rango por mes calendario.
11. Verificar contra las pantallas: las ventas del balance de hoy coinciden con "Ventas de hoy" del Inicio y de Ventas; los gastos con la pantalla Gastos. Anular una venta y volver: el balance baja.
12. Como Thiago o Patricia, escribir `/informes` a mano: vuelve al Inicio.

## Inicio

13. Debajo de los avisos: **Ventas de los últimos 30 días** (una barra por día, hoy en amarillo, domingos en celeste), **Ventas por categoría** (porcentaje) y **Productos más vendidos** (vendidos, ventas, ganancia solo para Lorenzo, estado de stock).
14. Thiago ve la ganancia de hoy oculta y la tabla de más vendidos sin la columna Ganancia.

## Productos

15. En la columna **Costo** aparece el costo por bulto y, debajo, el costo por unidad (botella o lata) para los productos que se venden por pack, caja o cajón.

## Pruebas automáticas

```bash
npm test
```

Resultado esperado: 22 pruebas `ui` y 71 pruebas `db` en verde (8 nuevas: categorías, gastos inmutables y anulación, permisos, balance por día con ventas anuladas y gastos anulados excluidos, resúmenes del tablero).
