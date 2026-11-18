# Fase 0 · Pasos para probar a mano

Qué se entrega: repositorio, proyecto base, migración inicial (perfiles, roles, configuración, auditoría), login, layout con menú por rol en computadora y celular, pantallas Usuarios y Configuración, deploy listo para Cloudflare Pages.

## Antes de empezar (una sola vez)

1. Crear el proyecto de Supabase de **desarrollo** (región São Paulo). Anotar la URL y la clave `anon` (Settings > API) y el `project ref` (Settings > General).
2. En Authentication > Providers > Email: dejar activado Email, **desactivar "Confirm email"** y en Authentication > Settings desactivar **"Allow new users to sign up"**.
3. En la carpeta del proyecto:

```bash
npx supabase login
```

```bash
npx supabase link --project-ref <ref>
```

```bash
npm run db:push
```

   Debe aplicar `20261118000001_base.sql` sin errores.

4. Cargar los datos de ejemplo de desarrollo (SQL Editor del panel, pegar el contenido de `supabase/seed.sql` y ejecutar).
5. Crear tres usuarios en Authentication > Users > "Add user" > "Create new user", con email, contraseña y marcando "Auto confirm user". En "User Metadata" pegar según corresponda:

   - `{ "nombre": "Lorenzo", "rol": "superusuario" }`
   - `{ "nombre": "Lorena", "rol": "administracion" }`
   - `{ "nombre": "Thiago", "rol": "reparto" }`

   Verificar en Table Editor > `perfiles` que aparecieron los tres con su rol.

6. Copiar `.env.example` a `.env`, completar URL y clave, y correr `npm run dev`.

## Pruebas

### Ingreso

1. Abrir `http://localhost:5173`. Debe redirigir a `/entrar` con el logo y el formulario.
2. Entrar con un email inexistente: mensaje "El email o la contraseña no son correctos."
3. Entrar como Lorenzo: va al Inicio con el saludo "Hola, Lorenzo" y la fecha de hoy en español.
4. Recargar la página: la sesión se mantiene.
5. Cerrar sesión con el botón de la barra lateral (abajo): vuelve a `/entrar`.

### Menú por rol

6. Como **Lorenzo**: la barra lateral muestra Operación (Inicio, Ventas y repartos, Cuentas corrientes), Mercadería (Productos y stock, Compras) y Administración (Gastos, Informes, Usuarios, Configuración). Inicio muestra 4 indicadores.
7. Como **Lorena**: no aparecen Informes, Usuarios ni Configuración. Escribir a mano `/usuarios` en la dirección: debe volver al Inicio.
8. Como **Thiago**: solo Inicio, Ventas, Cuentas corrientes y Productos. Inicio muestra 2 indicadores (sin ganancia ni valor de stock). Escribir `/compras` a mano: vuelve al Inicio.
9. Las pantallas que todavía no existen muestran "Esta pantalla se habilita en la fase N".

### Celular

10. Achicar la ventana a menos de 768 px o abrir desde el teléfono (misma red, `http://IP-de-la-PC:5173`): la barra lateral desaparece, abajo queda una barra con 4 accesos y "Más". "Más" abre el menú completo con el usuario y el botón de salir.

### Usuarios (solo Lorenzo)

11. Entrar a Usuarios: se ven los tres usuarios con su rol y "Activo".
12. Cambiar el rol de Thiago a Administración. Sale el aviso "Guardado" y en "Últimos movimientos" aparece "Lorenzo cambió el rol de Thiago a Administración".
13. Entrar como Thiago en otra ventana de incógnito: ahora ve Compras y Gastos. Volver a ponerlo en Reparto.
14. Desactivar a Lorena: aparece la confirmación. Con Lorena en otra ventana, recargar: ve "Tu usuario está desactivado". Reactivarla.
15. El selector de rol y el botón Desactivar de Lorenzo están bloqueados (es el único superusuario activo).

### Configuración (solo Lorenzo)

16. Cambiar el teléfono y el plazo de cuenta corriente a 30, Guardar: "Configuración guardada". Recargar y verificar que quedó. Volver a 15.
17. En Usuarios > Últimos movimientos aparece "Lorenzo modificó la configuración".

### Seguridad desde fuera de la pantalla

18. Con Thiago logueado, abrir la consola del navegador (F12) y ejecutar:

```js
(await (await fetch(`${import.meta.env?.VITE_SUPABASE_URL ?? ''}`)).text()).length
```

    Si no sale fácil, alcanza con el paso 19.

19. En el panel de Supabase, SQL Editor, correr como prueba:

```sql
select public.auth_rol();
```

    Debe dar vacío (el editor no tiene usuario). Las políticas están cubiertas por las pruebas automáticas (`npm run test:db`): 13 casos de perfiles, permisos, configuración, auditoría y fechas.

## Pruebas automáticas

```bash
npm test
```

Resultado esperado: 14 pruebas `ui` y 13 pruebas `db` en verde.
