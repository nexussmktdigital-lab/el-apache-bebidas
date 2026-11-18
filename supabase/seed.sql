-- Datos de ejemplo para la base de DESARROLLO. No se corre en producción.
-- Es idempotente: se puede correr varias veces (npx supabase db push --include-seed).
-- Los usuarios de Auth se crean con scripts/crear-usuarios.mjs.

update public.configuracion set
  direccion = 'Av. Ejemplo 1234, Alta Córdoba, Córdoba',
  telefono  = '351 000-0000',
  cuit      = '20-00000000-0',
  pie_comprobante = 'Transferencias: alias ejemplo.apache'
where id and direccion = '';

insert into public.categorias (nombre) values
  ('Gaseosas'), ('Cervezas'), ('Aperitivos'), ('Aguas'), ('Vinos'), ('Energizantes'), ('Jugos')
on conflict do nothing;

insert into public.marcas (nombre) values
  ('Coca-Cola'), ('Quilmes'), ('Brahma'), ('Branca'), ('Toro'), ('Speed'), ('Baggio'), ('Gancia'), ('Villavicencio')
on conflict do nothing;

insert into public.proveedores (nombre, telefono, contacto) values
  ('Distribuidora Centro', '351 400-0001', 'Marcos'),
  ('Mayorista del Norte', '351 400-0002', 'Claudia'),
  ('Bodegas Unidas', '351 400-0003', '')
on conflict do nothing;

-- Productos de la demo (solo si todavía no hay productos cargados).
do $$
declare
  v_cat uuid; v_marca uuid; v_prov uuid; v_id uuid;
  fila record;
begin
  if exists (select 1 from public.productos) then
    return;
  end if;
  perform set_config('app.motivo_precio', 'carga inicial', true);
  for fila in
    select * from (values
      ('Coca-Cola 2,25 L',         'Gaseosas',     'Coca-Cola',     'Distribuidora Centro', 'pack', 6,  'COCA225',  20, 14200, 22,   null::bigint),
      ('Sprite 2,25 L',            'Gaseosas',     'Coca-Cola',     'Distribuidora Centro', 'pack', 6,  'SPR225',   15, 13600, 22,   null),
      ('Fernet Branca 750 ml',     'Aperitivos',   'Branca',        'Mayorista del Norte',  'caja', 6,  'FER750',   8,  78000, 18,   null),
      ('Cerveza Quilmes 1 L',      'Cervezas',     'Quilmes',       'Mayorista del Norte',  'caja', 12, 'QUI1000',  25, 21500, 25,   null),
      ('Cerveza Brahma lata 473 ml','Cervezas',    'Brahma',        'Mayorista del Norte',  'pack', 24, 'BRA473',   20, 26800, 24,   35000),
      ('Agua mineral 2 L',         'Aguas',        'Villavicencio', 'Distribuidora Centro', 'pack', 6,  'AGUA2000', 30, 5400,  30,   null),
      ('Vino Toro tinto 1 L',      'Vinos',        'Toro',          'Bodegas Unidas',       'caja', 12, 'TORO1000', 10, 28800, 26,   null),
      ('Energizante Speed 250 ml', 'Energizantes', 'Speed',         'Distribuidora Centro', 'pack', 24, 'SPEED250', 10, 31200, 28,   null),
      ('Jugo Baggio 1 L',          'Jugos',        'Baggio',        'Distribuidora Centro', 'pack', 8,  'BAG1000',  12, 9800,  27,   null),
      ('Gancia 950 ml',            'Aperitivos',   'Gancia',        'Bodegas Unidas',       'caja', 6,  'GAN950',   6,  36500, 20,   null)
    ) as t(nombre, categoria, marca, proveedor, unidad, bulto, codigo, minimo, costo, margen, manual)
  loop
    select id into v_cat from public.categorias where nombre = fila.categoria;
    select id into v_marca from public.marcas where nombre = fila.marca;
    select id into v_prov from public.proveedores where nombre = fila.proveedor;
    insert into public.productos (nombre, categoria_id, marca_id, proveedor_id, unidad_venta, unidades_por_bulto, codigo, stock_minimo)
    values (fila.nombre, v_cat, v_marca, v_prov, fila.unidad::public.unidad_venta, fila.bulto, fila.codigo, fila.minimo)
    returning id into v_id;
    update public.producto_costos set costo_actual = fila.costo, margen_pct = fila.margen, precio_manual = fila.manual
    where producto_id = v_id;
  end loop;
end
$$;
