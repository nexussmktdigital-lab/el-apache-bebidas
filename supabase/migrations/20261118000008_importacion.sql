-- =====================================================================
-- Migración 0008 · Importación desde Excel (carga inicial)
-- Tres funciones que reciben filas ya leídas en el navegador y las
-- cargan: proveedores, productos (con stock inicial) y clientes (con
-- saldo inicial). Son idempotentes: si se vuelve a importar la misma
-- planilla, actualizan en vez de duplicar, y el stock o el saldo inicial
-- solo se cargan la primera vez. Cada fila se procesa por separado y los
-- errores se devuelven con el número de fila. Solo el superusuario.
-- =====================================================================

-- Busca o crea una categoría, marca o proveedor por nombre (sin distinguir mayúsculas).
create or replace function public.importar_buscar_o_crear(p_tabla text, p_nombre text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_nombre text := nullif(trim(p_nombre), '');
  v_id uuid;
begin
  if v_nombre is null then
    return null;
  end if;
  if p_tabla = 'categorias' then
    select id into v_id from public.categorias where lower(trim(nombre)) = lower(v_nombre);
    if v_id is null then insert into public.categorias (nombre) values (v_nombre) returning id into v_id; end if;
  elsif p_tabla = 'marcas' then
    select id into v_id from public.marcas where lower(trim(nombre)) = lower(v_nombre);
    if v_id is null then insert into public.marcas (nombre) values (v_nombre) returning id into v_id; end if;
  elsif p_tabla = 'proveedores' then
    select id into v_id from public.proveedores where lower(trim(nombre)) = lower(v_nombre);
    if v_id is null then insert into public.proveedores (nombre) values (v_nombre) returning id into v_id; end if;
  else
    raise exception 'Tabla desconocida: %', p_tabla;
  end if;
  return v_id;
end
$$;
revoke all on function public.importar_buscar_o_crear(text, text) from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- Proveedores: [{ fila, nombre, telefono, contacto, notas }]
-- ---------------------------------------------------------------------
create or replace function public.importar_proveedores(p jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  r jsonb;
  v_id uuid;
  v_creados integer := 0;
  v_actualizados integer := 0;
  v_errores jsonb := '[]'::jsonb;
begin
  if not public.es_superusuario() then
    raise exception 'Solo el superusuario puede importar datos.' using errcode = 'insufficient_privilege';
  end if;
  for r in select * from jsonb_array_elements(coalesce(p, '[]'::jsonb)) loop
    begin
      if nullif(trim(r ->> 'nombre'), '') is null then
        raise exception 'Falta el nombre.';
      end if;
      select id into v_id from public.proveedores where lower(trim(nombre)) = lower(trim(r ->> 'nombre'));
      if v_id is null then
        insert into public.proveedores (nombre, telefono, contacto, notas)
        values (trim(r ->> 'nombre'), coalesce(r ->> 'telefono', ''), coalesce(r ->> 'contacto', ''), coalesce(r ->> 'notas', ''));
        v_creados := v_creados + 1;
      else
        update public.proveedores set
          telefono = coalesce(nullif(r ->> 'telefono', ''), telefono),
          contacto = coalesce(nullif(r ->> 'contacto', ''), contacto),
          notas = coalesce(nullif(r ->> 'notas', ''), notas),
          activo = true
        where id = v_id;
        v_actualizados := v_actualizados + 1;
      end if;
    exception when others then
      v_errores := v_errores || jsonb_build_object('fila', r ->> 'fila', 'nombre', r ->> 'nombre', 'mensaje', sqlerrm);
    end;
  end loop;
  return jsonb_build_object('creados', v_creados, 'actualizados', v_actualizados, 'errores', v_errores);
end
$$;

-- ---------------------------------------------------------------------
-- Productos: [{ fila, nombre, categoria, marca, proveedor, unidad_venta,
--   unidades_por_bulto, codigo, stock_actual, stock_minimo, costo,
--   margen_pct, precio_venta, fecha_vencimiento }]
-- Se identifica por código (si tiene) o por nombre. El stock inicial se
-- carga solo si el producto todavía no tiene movimientos.
-- ---------------------------------------------------------------------
create or replace function public.importar_productos(p jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  r jsonb;
  v_id uuid;
  v_nombre text;
  v_codigo text;
  v_unidad public.unidad_venta;
  v_bulto integer;
  v_stock integer;
  v_costo bigint;
  v_margen numeric;
  v_precio bigint;
  v_vence date;
  v_creados integer := 0;
  v_actualizados integer := 0;
  v_con_stock integer := 0;
  v_stock_saltado integer := 0;
  v_errores jsonb := '[]'::jsonb;
begin
  if not public.es_superusuario() then
    raise exception 'Solo el superusuario puede importar datos.' using errcode = 'insufficient_privilege';
  end if;
  perform set_config('app.motivo_precio', 'importación', true);

  for r in select * from jsonb_array_elements(coalesce(p, '[]'::jsonb)) loop
    begin
      v_nombre := nullif(trim(r ->> 'nombre'), '');
      if v_nombre is null then
        raise exception 'Falta el nombre.';
      end if;
      v_codigo := nullif(trim(r ->> 'codigo'), '');
      begin
        v_unidad := coalesce(nullif(lower(trim(r ->> 'unidad_venta')), ''), 'unidad')::public.unidad_venta;
      exception when others then
        raise exception 'Unidad de venta "%" no válida (unidad, pack, caja o cajon).', r ->> 'unidad_venta';
      end;
      v_bulto := greatest(1, coalesce(nullif(r ->> 'unidades_por_bulto', '')::integer, 1));
      if v_unidad = 'unidad' then v_bulto := 1; end if;
      v_stock := coalesce(nullif(r ->> 'stock_actual', '')::integer, 0);
      v_costo := coalesce(nullif(r ->> 'costo', '')::bigint, 0);
      v_margen := nullif(r ->> 'margen_pct', '')::numeric;
      v_precio := nullif(r ->> 'precio_venta', '')::bigint;
      v_vence := nullif(r ->> 'fecha_vencimiento', '')::date;
      if v_stock < 0 then raise exception 'El stock no puede ser negativo.'; end if;
      if v_costo < 0 then raise exception 'El costo no puede ser negativo.'; end if;
      if v_precio is null and v_margen is null then
        raise exception 'Falta el %% de ganancia o el precio de venta.';
      end if;

      -- ¿Ya existe? Por código primero, después por nombre.
      v_id := null;
      if v_codigo is not null then
        select id into v_id from public.productos where lower(trim(codigo)) = lower(v_codigo);
      end if;
      if v_id is null then
        select id into v_id from public.productos where lower(trim(nombre)) = lower(v_nombre);
      end if;

      if v_id is null then
        v_creados := v_creados + 1;
      else
        v_actualizados := v_actualizados + 1;
      end if;

      v_id := public.guardar_producto(jsonb_build_object(
        'id', v_id,
        'nombre', v_nombre,
        'categoria_id', public.importar_buscar_o_crear('categorias', r ->> 'categoria'),
        'marca_id', public.importar_buscar_o_crear('marcas', r ->> 'marca'),
        'proveedor_id', public.importar_buscar_o_crear('proveedores', r ->> 'proveedor'),
        'unidad_venta', v_unidad,
        'unidades_por_bulto', v_bulto,
        'codigo', v_codigo,
        'stock_minimo', coalesce(nullif(r ->> 'stock_minimo', '')::integer, 0),
        'activo', true,
        'costo_actual', v_costo,
        'margen_pct', coalesce(v_margen, 0),
        'precio_manual', v_precio
      ));

      -- Stock inicial, solo si el producto todavía no tiene movimientos.
      if v_stock > 0 then
        if exists (select 1 from public.movimientos_stock where producto_id = v_id) then
          v_stock_saltado := v_stock_saltado + 1;
        else
          perform public.ingresar_stock(v_id, v_stock, v_costo, v_vence, 'carga_inicial', null, null, null, 'Carga inicial desde Excel');
          v_con_stock := v_con_stock + 1;
        end if;
      end if;
    exception when others then
      v_errores := v_errores || jsonb_build_object('fila', r ->> 'fila', 'nombre', r ->> 'nombre', 'mensaje', sqlerrm);
    end;
  end loop;

  perform set_config('app.motivo_precio', '', true);
  return jsonb_build_object('creados', v_creados, 'actualizados', v_actualizados, 'con_stock', v_con_stock, 'stock_saltado', v_stock_saltado, 'errores', v_errores);
end
$$;

-- ---------------------------------------------------------------------
-- Clientes: [{ fila, nombre, telefono, direccion, zona, cuit, saldo, debe_desde, notas }]
-- El saldo inicial se carga solo si el cliente no tiene movimientos.
-- ---------------------------------------------------------------------
create or replace function public.importar_clientes(p jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  r jsonb;
  v_id uuid;
  v_nombre text;
  v_saldo bigint;
  v_desde date;
  v_plazo integer;
  v_creados integer := 0;
  v_actualizados integer := 0;
  v_con_saldo integer := 0;
  v_saldo_saltado integer := 0;
  v_errores jsonb := '[]'::jsonb;
begin
  if not public.es_superusuario() then
    raise exception 'Solo el superusuario puede importar datos.' using errcode = 'insufficient_privilege';
  end if;
  select plazo_cc_dias into v_plazo from public.configuracion limit 1;

  for r in select * from jsonb_array_elements(coalesce(p, '[]'::jsonb)) loop
    begin
      v_nombre := nullif(trim(r ->> 'nombre'), '');
      if v_nombre is null then
        raise exception 'Falta el nombre.';
      end if;
      v_saldo := coalesce(nullif(r ->> 'saldo', '')::bigint, 0);
      v_desde := nullif(r ->> 'debe_desde', '')::date;

      select id into v_id from public.clientes where lower(trim(nombre)) = lower(v_nombre);
      if v_id is null then
        insert into public.clientes (nombre, telefono, direccion, zona, cuit, notas)
        values (v_nombre, coalesce(r ->> 'telefono', ''), coalesce(r ->> 'direccion', ''), coalesce(r ->> 'zona', ''), coalesce(r ->> 'cuit', ''), coalesce(r ->> 'notas', ''))
        returning id into v_id;
        v_creados := v_creados + 1;
      else
        update public.clientes set
          telefono = coalesce(nullif(r ->> 'telefono', ''), telefono),
          direccion = coalesce(nullif(r ->> 'direccion', ''), direccion),
          zona = coalesce(nullif(r ->> 'zona', ''), zona),
          cuit = coalesce(nullif(r ->> 'cuit', ''), cuit),
          notas = coalesce(nullif(r ->> 'notas', ''), notas),
          activo = true
        where id = v_id;
        v_actualizados := v_actualizados + 1;
      end if;

      if v_saldo <> 0 then
        if exists (select 1 from public.cc_movimientos where cliente_id = v_id) then
          v_saldo_saltado := v_saldo_saltado + 1;
        else
          perform public.mover_cc(
            v_id, 'saldo_inicial', v_saldo, null, null,
            case when v_saldo > 0 then coalesce(v_desde, public.hoy_ar()) + coalesce(v_plazo, 7) else null end,
            'Saldo inicial del sistema anterior'
          );
          v_con_saldo := v_con_saldo + 1;
        end if;
      end if;
    exception when others then
      v_errores := v_errores || jsonb_build_object('fila', r ->> 'fila', 'nombre', r ->> 'nombre', 'mensaje', sqlerrm);
    end;
  end loop;

  return jsonb_build_object('creados', v_creados, 'actualizados', v_actualizados, 'con_saldo', v_con_saldo, 'saldo_saltado', v_saldo_saltado, 'errores', v_errores);
end
$$;

revoke all on function public.importar_proveedores(jsonb) from public;
revoke all on function public.importar_productos(jsonb) from public;
revoke all on function public.importar_clientes(jsonb) from public;
grant execute on function public.importar_proveedores(jsonb) to authenticated;
grant execute on function public.importar_productos(jsonb) to authenticated;
grant execute on function public.importar_clientes(jsonb) to authenticated;
