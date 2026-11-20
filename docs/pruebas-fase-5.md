# Fase 5 · Pasos para probar a mano

Qué se entrega: importación desde Excel (proveedores, productos con stock inicial, clientes con saldo inicial), manual de uso y guía de puesta en marcha en producción.

## Importar datos (solo Lorenzo)

1. Menú **Importar datos** (grupo Administración). Thiago y Patricia no lo ven; escribiendo `/importacion` a mano vuelven al Inicio.
2. **Descargar la plantilla**: baja `plantilla-carga-inicial.xlsx` con las hojas Instrucciones, Productos, Clientes y Proveedores.
3. **Elegir archivo Excel** con la plantilla tal cual: aparece "Las 8 filas están bien" y la vista previa de las tres hojas (proveedores, productos con unidad, stock, costo, precio o % y vencimiento; clientes con saldo y "debe desde").
4. Probar errores: en una copia de la plantilla, borrar el nombre de un producto, poner "bolsa" como unidad, dejar vacíos el % y el precio de otro, y escribir "ayer" como vencimiento. Al elegirla, las filas aparecen marcadas en rojo con el motivo y el botón Importar queda deshabilitado.
5. Un precio menor al costo aparece como "Aviso" pero no bloquea.
6. Con un archivo sin errores, **Importar**: pide confirmación y al final muestra, por hoja, cuántos se crearon, cuántos se actualizaron, cuántos productos recibieron stock inicial y cuántos clientes saldo inicial.
7. Verificar en Productos que los productos nuevos tienen stock, costo, precio y vencimiento; en Movimientos, el tipo "Carga inicial"; en Cuentas corrientes, los saldos con su vencimiento (debe desde + 7 días) y el movimiento "Saldo inicial".
8. Volver a importar el mismo archivo: todo figura como "actualizados", sin duplicados, y el stock y los saldos no se cargan dos veces (lo informa el resultado).

> En la base de desarrollo la importación de la plantilla de ejemplo actualiza Coca-Cola, Quilmes y Brahma (coinciden por nombre o código) y agrega "Almacén Doña Rosa" y "Despensa San Martín". Es seguro, pero cambia el código y el costo de Coca-Cola.

## Manual de uso

9. Abrir `docs/manual-de-uso.html` en el navegador: once secciones, desde el ingreso hasta preguntas frecuentes, con la tabla de permisos de Lorenzo, Thiago y Patricia. Ctrl+P lo imprime en A4.

## Puesta en marcha

10. Leer `docs/puesta-en-marcha.md`: crear el proyecto de producción, aplicar migraciones, crear los tres usuarios reales, apuntar Cloudflare a producción, configuración inicial, carga de datos, logo, entrega y copias de seguridad.

## Pruebas automáticas

```bash
npm test
```

Resultado esperado: 29 pruebas `ui` (7 nuevas de lectura del Excel, incluida la plantilla oficial) y 76 pruebas `db` (5 nuevas de importación) en verde.
