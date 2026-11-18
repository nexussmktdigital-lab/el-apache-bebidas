# Fase 1 · Pasos para probar a mano

Qué se entrega: categorías, marcas y proveedores; alta, edición y baja lógica de productos; código interno o de barras; buscador y filtros; costo, porcentaje de ganancia, precio a mano, margen en pesos y en porcentaje; aviso de precio bajo costo; aumento masivo por categoría o proveedor; historial de precios; plantilla Excel de carga inicial.

La base de desarrollo ya tiene la migración aplicada y 10 productos de ejemplo (los de la demo). Usuarios de prueba en `supabase/usuarios.local.txt`.

## Productos (como Lorenzo o Lorena)

1. Entrar a **Productos y stock**. Arriba se ven tres indicadores: valor del stock a costo (todavía $ 0, el stock llega en la fase 2), productos activos y productos con avisos.
2. La tabla muestra producto, unidad, stock, mínimo, costo, % de ganancia, precio, margen y estado. Todos dicen "Stock bajo" porque el stock es 0 y el mínimo es mayor; eso cambia cuando se cargue stock.
3. **Buscador**: escribir "coca" o "7790" (código) o "quilmes": filtra al instante, sin importar mayúsculas ni acentos.
4. **Filtros**: categoría "Cervezas" deja 2; proveedor "Bodegas Unidas" deja 2; estado "Desactivados" vacío; "Solo con avisos" muestra los que tienen stock bajo o precio bajo costo.
5. **Editar en línea** (sin abrir nada): en Agua mineral cambiar el % de ganancia de 30 a 35 y salir del campo con Tab. Aparece el aviso y el precio pasa de $ 7.020 a $ 7.290; el margen a $ 1.890 (25,9 %).
6. En Coca-Cola (costo $ 14.200) escribir en la columna Precio 14000 y salir. Aviso rojo "el precio queda por debajo del costo" y aparecen las insignias "Bajo costo" y "Precio a mano". Volver a escribir 22 en % de ganancia: vuelve a calcular ($ 17.320) y desaparece "Precio a mano".
7. Cambiar el **mínimo** de Sprite a 5: el aviso dice "Mínimo de Sprite 2,25 L: 5".
8. Cambiar el **costo** de Fernet a 80000: el precio se recalcula solo ($ 94.400 con 18 %).

## Nuevo producto y edición

9. **Nuevo producto**: nombre "Cerveza Andes lata 473 ml", categoría Cervezas, proveedor Mayorista del Norte, código AND473, pack, 24 unidades, mínimo 15, costo 24500, 22 %. Abajo del formulario se ve el precio ($ 29.890) y el margen antes de guardar. "Cargar producto": aparece en la lista.
10. Intentar cargar otro con código "and473": error "Ya hay otro producto con ese código."
11. En el formulario, el botón **+** al lado de categoría permite crear una nueva sin salir (por ejemplo "Sidras"); queda seleccionada.
12. Cambiar **Precio** a "Puesto a mano" y escribir 20000 con costo 24500: aviso rojo "el precio queda por debajo del costo". Se puede guardar igual (es un aviso, no un bloqueo).
13. **Editar** un producto y entrar a la pestaña **Historial de precios**: se ven los cambios con fecha, motivo (alta, edición, aumento masivo) y quién no (eso está en Usuarios > movimientos).
14. Editar y destildar "Producto activo": desaparece de la lista de activos y aparece en "Desactivados". Nada se borra.

## Aumentar precios

15. **Aumentar precios** > Una categoría > Cervezas > 10 %: el botón dice "Aplicar a 4 productos" y el ejemplo muestra de cuánto a cuánto. Confirmar. Quilmes pasa de $ 26.880 a $ 29.570 (sube el % de ganancia de 25 a 37,5); Brahma, que tenía precio a mano de $ 35.000, pasa a $ 38.500.
16. Repetir con -10 % para el proveedor "Bodegas Unidas": bajan Toro y Gancia, el resto no cambia.
17. En el historial de un producto afectado aparece el motivo "aumento masivo".

## Listas

18. **Categorías, marcas y proveedores** (botón arriba de la tabla): crear una marca, editar el teléfono de un proveedor, desactivar una categoría. Una categoría desactivada no aparece para elegir en productos nuevos, pero los productos que la tenían la conservan.
19. Crear una categoría con un nombre repetido ("gaseosas"): error "Ya existe uno con ese nombre."

## Como Thiago

20. Entrar como Thiago: Productos muestra solo producto, unidad, stock, precio y estado. No hay campos editables, ni botones de nuevo producto, aumentar precios ni listas. Escribir `/productos/listas` a mano vuelve al Inicio.
21. En las herramientas del navegador (F12 > Red), al cargar Productos la respuesta de `v_productos` trae `costo_actual: null` para Thiago: el servidor no le manda los costos.

## Configuración

22. Como Lorenzo, en Configuración cambiar el redondeo a $100 y guardar. Volver a Productos: los precios calculados quedan redondeados a 100 (Coca-Cola $ 17.300); los puestos a mano no cambian. Volver a $10.

## Celular

23. En el teléfono, Productos se ve como tarjetas (nombre, categoría, unidad, stock, precio). Tocar una tarjeta abre el formulario completo, que ocupa la pantalla y se cierra con la X.

## Plantilla Excel

24. Abrir `docs/plantilla-carga-inicial.xlsx`: hojas Instrucciones, Productos, Clientes y Proveedores con filas de ejemplo. Es la que se le manda a Lorenzo para completar.

## Pruebas automáticas

```bash
npm test
```

Resultado esperado: 17 pruebas `ui` y 30 pruebas `db` en verde.
