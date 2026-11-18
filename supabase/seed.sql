-- Datos de ejemplo para la base de DESARROLLO. No se corre en producción.
-- Los usuarios de Auth se crean con la CLI o el panel de Supabase; ver docs/pruebas-fase-0.md.

update public.configuracion set
  direccion = 'Av. Ejemplo 1234, Alta Córdoba, Córdoba',
  telefono  = '351 000-0000',
  cuit      = '20-00000000-0',
  pie_comprobante = 'Transferencias: alias ejemplo.apache'
where id;
