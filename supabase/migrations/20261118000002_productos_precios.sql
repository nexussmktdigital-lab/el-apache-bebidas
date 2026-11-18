-- =====================================================================
-- Migración 0002 · Productos y precios
-- Categorías, marcas, proveedores, productos, costos y márgenes,
-- historial de precios, aumento masivo y permisos.
-- Los costos van en una tabla aparte (producto_costos) para que RLS se
-- los niegue por completo a quien no debe verlos.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Columnas de auditoría comunes (creado/actualizado por quién y cuándo)
-- ---------------------------------------------------------------------
create or replace function public.tg_sello()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    new.creado_en := coalesce(new.creado_en, now());
    new.creado_por := coalesce(new.creado_por, auth.uid());
  else
    new.creado_en := old.creado_en;
    new.creado_por := old.creado_por;
  end if;
  new.actualizado_en := now();
  new.actualizado_por := coalesce(auth.uid(), new.actualizado_por);
  return new;
end
$$;

-- ---------------------------------------------------------------------
-- Listas: categorías, marcas y proveedores
-- ---------------------------------------------------------------------
create table public.categorias (
  id              uuid primary key default gen_random_uuid(),
  nombre          text not null check (length(trim(nombre)) between 1 and 60),
  activo          boolean not null default true,
  creado_en       timestamptz not null default now(),
  creado_por      uuid,
  actualizado_en  timestamptz not null default now(),
  actualizado_por uuid
);
create unique index categorias_nombre_unico on public.categorias (lower(trim(nombre)));

create table public.marcas (
  id              uuid primary key default gen_random_uuid(),
  nombre          text not null check (length(trim(nombre)) between 1 and 60),
  activo          boolean not null default true,
  creado_en       timestamptz not null default now(),
  creado_por      uuid,
  actualizado_en  timestamptz not null default now(),
  actualizado_por uuid
);
create unique index marcas_nombre_unico on public.marcas (lower(trim(nombre)));

create table public.proveedores (
  id              uuid primary key default gen_random_uuid(),
  nombre          text not null check (length(trim(nombre)) between 1 and 80),
  telefono        text not null default '',
  contacto        text not null default '',
  notas           text not null default '',
  activo          boolean not null default true,
  creado_en       timestamptz not null default now(),
  creado_por      uuid,
  actualizado_en  timestamptz not null default now(),
  actualizado_por uuid
);
create unique index proveedores_nombre_unico on public.proveedores (lower(trim(nombre)));

-- ---------------------------------------------------------------------
-- Productos
-- ---------------------------------------------------------------------
create type public.unidad_venta as enum ('unidad', 'pack', 'caja');

create table public.productos (
  id                  uuid primary key default gen_random_uuid(),
  nombre              text not null check (length(trim(nombre)) between 1 and 120),
  categoria_id        uuid references public.categorias (id),
  marca_id            uuid references public.marcas (id),
  proveedor_id        uuid references public.proveedores (id),
  unidad_venta        public.unidad_venta not null default 'unidad',
  unidades_por_bulto  integer not null default 1 check (unidades_por_bulto between 1 and 1000),
  codigo              text,
  -- Derivado de los movimientos de stock (fase 2). No se edita directo.
  stock_actual        integer not null default 0 check (stock_actual >= 0),
  stock_minimo        integer not null default 0 check (stock_minimo >= 0),
  -- Derivado de producto_costos. No se edita directo.
  precio_venta        bigint not null default 0 check (precio_venta >= 0),
  activo              boolean not null default true,
  creado_en           timestamptz not null default now(),
  creado_por          uuid,
  actualizado_en      timestamptz not null default now(),
  actualizado_por     uuid
);

create unique index productos_codigo_unico on public.productos (lower(trim(codigo))) where nullif(trim(codigo), '') is not null;
create index productos_nombre_idx on public.productos (lower(nombre));
create index productos_categoria_idx on public.productos (categoria_id);
create index productos_proveedor_idx on public.productos (proveedor_id);

comment on column public.productos.stock_actual is 'Lo mantienen los movimientos de stock. Bloqueado para escritura directa.';
comment on column public.productos.precio_venta is 'Lo calcula el trigger de producto_costos. Bloqueado para escritura directa.';

-- Costos y márgenes: visibles solo para quien ve costos.
create table public.producto_costos (
  producto_id     uuid primary key references public.productos (id) on delete cascade,
  costo_actual    bigint not null default 0 check (costo_actual >= 0),
  margen_pct      numeric(6,2) not null default 0 check (margen_pct between -100 and 1000),
  precio_manual   bigint check (precio_manual is null or precio_manual >= 0),
  actualizado_en  timestamptz not null default now(),
  actualizado_por uuid
);

comment on table public.producto_costos is 'Costo, porcentaje de ganancia y precio a mano. Si precio_manual es nulo, el precio se calcula.';

create table public.precios_historial (
  id            bigint generated always as identity primary key,
  producto_id   uuid not null references public.productos (id) on delete cascade,
  costo         bigint not null,
  margen_pct    numeric(6,2) not null,
  precio_manual bigint,
  precio_venta  bigint not null,
  motivo        text not null,
  usuario_id    uuid,
  fecha         timestamptz not null default now()
);
create index precios_historial_producto_idx on public.precios_historial (producto_id, fecha desc);

-- ---------------------------------------------------------------------
-- Cálculo del precio
-- ---------------------------------------------------------------------
create or replace function public.redondear_precio(valor numeric, redondeo integer)
returns bigint
language sql
immutable
as $$
  select case
    when coalesce(redondeo, 1) <= 1 then round(valor)::bigint
    else (round(valor / redondeo) * redondeo)::bigint
  end
$$;

create or replace function public.calcular_precio(costo bigint, margen_pct numeric, precio_manual bigint, redondeo integer)
returns bigint
language sql
immutable
as $$
  select coalesce(
    precio_manual,
    greatest(0, public.redondear_precio(costo * (1 + coalesce(margen_pct, 0) / 100), redondeo))
  )
$$;

create or replace function public.redondeo_configurado()
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select redondeo_precio from public.configuracion limit 1), 10)
$$;

-- ---------------------------------------------------------------------
-- Protección de columnas derivadas en productos
-- ---------------------------------------------------------------------
create or replace function public.tg_productos_proteger()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'UPDATE' then
    if new.stock_actual is distinct from old.stock_actual
       and coalesce(current_setting('app.permitir_stock', true), '') <> '1' then
      raise exception 'El stock no se edita directo: registrá una compra, una venta o un ajuste.'
        using errcode = 'check_violation';
    end if;
    if new.precio_venta is distinct from old.precio_venta
       and coalesce(current_setting('app.permitir_precio', true), '') <> '1' then
      raise exception 'El precio se calcula desde el costo y el porcentaje de ganancia, o se pone a mano en precio_manual.'
        using errcode = 'check_violation';
    end if;
  else
    if new.stock_actual <> 0 and coalesce(current_setting('app.permitir_stock', true), '') <> '1' then
      raise exception 'Un producto nuevo arranca con stock 0; el stock inicial se carga como movimiento.'
        using errcode = 'check_violation';
    end if;
    if new.precio_venta <> 0 and coalesce(current_setting('app.permitir_precio', true), '') <> '1' then
      raise exception 'El precio se define en producto_costos.'
        using errcode = 'check_violation';
    end if;
  end if;
  new.codigo := nullif(trim(new.codigo), '');
  new.nombre := trim(new.nombre);
  return new;
end
$$;

create trigger productos_proteger
  before insert or update on public.productos
  for each row execute function public.tg_productos_proteger();

-- Todo producto tiene su fila de costos.
create or replace function public.tg_productos_costos_iniciales()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.producto_costos (producto_id, actualizado_por)
  values (new.id, auth.uid())
  on conflict (producto_id) do nothing;
  return new;
end
$$;

create trigger productos_costos_iniciales
  after insert on public.productos
  for each row execute function public.tg_productos_costos_iniciales();

-- ---------------------------------------------------------------------
-- De costos a precio: recalcula precio_venta y guarda el historial
-- ---------------------------------------------------------------------
create or replace function public.tg_costos_a_precio()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_precio bigint;
  v_cambio boolean;
begin
  new.actualizado_en := now();
  new.actualizado_por := coalesce(auth.uid(), new.actualizado_por);
  v_precio := public.calcular_precio(new.costo_actual, new.margen_pct, new.precio_manual, public.redondeo_configurado());

  perform set_config('app.permitir_precio', '1', true);
  update public.productos set precio_venta = v_precio where id = new.producto_id and precio_venta is distinct from v_precio;
  perform set_config('app.permitir_precio', '0', true);

  v_cambio := tg_op = 'INSERT'
    or new.costo_actual is distinct from old.costo_actual
    or new.margen_pct is distinct from old.margen_pct
    or new.precio_manual is distinct from old.precio_manual;

  -- La fila inicial en cero (la crea el alta del producto) no se registra:
  -- el primer registro real llega con el costo y el margen cargados.
  if v_cambio and not (tg_op = 'INSERT' and new.costo_actual = 0 and new.margen_pct = 0 and new.precio_manual is null) then
    insert into public.precios_historial (producto_id, costo, margen_pct, precio_manual, precio_venta, motivo, usuario_id)
    values (
      new.producto_id, new.costo_actual, new.margen_pct, new.precio_manual, v_precio,
      coalesce(nullif(current_setting('app.motivo_precio', true), ''), case when tg_op = 'INSERT' then 'alta' else 'edicion' end),
      auth.uid()
    );
  end if;
  return new;
end
$$;

create trigger producto_costos_a_precio
  before insert or update on public.producto_costos
  for each row execute function public.tg_costos_a_precio();

-- Si cambia el redondeo en la configuración, se recalculan los precios automáticos.
create or replace function public.tg_configuracion_redondeo()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.redondeo_precio is distinct from old.redondeo_precio then
    perform set_config('app.permitir_precio', '1', true);
    update public.productos p
       set precio_venta = public.calcular_precio(c.costo_actual, c.margen_pct, c.precio_manual, new.redondeo_precio)
      from public.producto_costos c
     where c.producto_id = p.id
       and c.precio_manual is null
       and p.precio_venta is distinct from public.calcular_precio(c.costo_actual, c.margen_pct, c.precio_manual, new.redondeo_precio);
    perform set_config('app.permitir_precio', '0', true);
  end if;
  return new;
end
$$;

create trigger configuracion_redondeo
  after update on public.configuracion
  for each row execute function public.tg_configuracion_redondeo();

-- ---------------------------------------------------------------------
-- Alta y edición de producto en una sola transacción (datos + costos)
-- ---------------------------------------------------------------------
create or replace function public.guardar_producto(p jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid := nullif(p ->> 'id', '')::uuid;
  v_manual bigint := nullif(p ->> 'precio_manual', '')::bigint;
begin
  if not public.ve_costos() then
    raise exception 'No tenés permiso para cargar o editar productos.' using errcode = 'insufficient_privilege';
  end if;

  if v_id is null then
    insert into public.productos (nombre, categoria_id, marca_id, proveedor_id, unidad_venta, unidades_por_bulto, codigo, stock_minimo, activo)
    values (
      p ->> 'nombre',
      nullif(p ->> 'categoria_id', '')::uuid,
      nullif(p ->> 'marca_id', '')::uuid,
      nullif(p ->> 'proveedor_id', '')::uuid,
      coalesce(nullif(p ->> 'unidad_venta', ''), 'unidad')::public.unidad_venta,
      coalesce((p ->> 'unidades_por_bulto')::integer, 1),
      p ->> 'codigo',
      coalesce((p ->> 'stock_minimo')::integer, 0),
      coalesce((p ->> 'activo')::boolean, true)
    )
    returning id into v_id;
  else
    update public.productos set
      nombre = p ->> 'nombre',
      categoria_id = nullif(p ->> 'categoria_id', '')::uuid,
      marca_id = nullif(p ->> 'marca_id', '')::uuid,
      proveedor_id = nullif(p ->> 'proveedor_id', '')::uuid,
      unidad_venta = coalesce(nullif(p ->> 'unidad_venta', ''), 'unidad')::public.unidad_venta,
      unidades_por_bulto = coalesce((p ->> 'unidades_por_bulto')::integer, 1),
      codigo = p ->> 'codigo',
      stock_minimo = coalesce((p ->> 'stock_minimo')::integer, 0),
      activo = coalesce((p ->> 'activo')::boolean, true)
    where id = v_id;
    if not found then
      raise exception 'El producto no existe.' using errcode = 'no_data_found';
    end if;
  end if;

  perform set_config('app.motivo_precio', case when p ->> 'id' is null or p ->> 'id' = '' then 'alta' else '' end, true);
  update public.producto_costos set
    costo_actual = coalesce((p ->> 'costo_actual')::bigint, costo_actual),
    margen_pct = coalesce((p ->> 'margen_pct')::numeric, margen_pct),
    precio_manual = case when p ? 'precio_manual' then v_manual else precio_manual end
  where producto_id = v_id;
  perform set_config('app.motivo_precio', '', true);

  return v_id;
end
$$;

revoke all on function public.guardar_producto(jsonb) from public;
grant execute on function public.guardar_producto(jsonb) to authenticated;

-- ---------------------------------------------------------------------
-- Aumento (o rebaja) masiva de precios por categoría o proveedor
-- ---------------------------------------------------------------------
create or replace function public.aumentar_precios(p_pct numeric, p_categoria_id uuid default null, p_proveedor_id uuid default null)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_n integer;
  v_factor numeric := 1 + p_pct / 100;
begin
  if not public.ve_costos() then
    raise exception 'No tenés permiso para cambiar precios.' using errcode = 'insufficient_privilege';
  end if;
  if p_pct is null or p_pct <= -100 or p_pct > 1000 then
    raise exception 'El porcentaje tiene que estar entre -99 y 1000.' using errcode = 'check_violation';
  end if;

  perform set_config('app.motivo_precio', 'aumento masivo', true);

  update public.producto_costos c set
    -- Precio a mano: sube el precio. Precio calculado: sube el porcentaje de
    -- ganancia para que el precio suba lo mismo.
    precio_manual = case when c.precio_manual is not null
                         then public.redondear_precio(c.precio_manual * v_factor, public.redondeo_configurado())
                         else null end,
    margen_pct = case when c.precio_manual is null
                      then round(((1 + c.margen_pct / 100) * v_factor - 1) * 100, 2)
                      else c.margen_pct end
  from public.productos p
  where p.id = c.producto_id
    and p.activo
    and (p_categoria_id is null or p.categoria_id = p_categoria_id)
    and (p_proveedor_id is null or p.proveedor_id = p_proveedor_id);

  get diagnostics v_n = row_count;
  perform set_config('app.motivo_precio', '', true);
  return v_n;
end
$$;

revoke all on function public.aumentar_precios(numeric, uuid, uuid) from public;
grant execute on function public.aumentar_precios(numeric, uuid, uuid) to authenticated;

-- ---------------------------------------------------------------------
-- Vista para la pantalla de productos. Con security_invoker, los costos
-- salen nulos para quien no puede verlos (RLS de producto_costos).
-- ---------------------------------------------------------------------
create or replace view public.v_productos
with (security_invoker = true)
as
select
  p.id, p.nombre, p.codigo, p.unidad_venta, p.unidades_por_bulto,
  p.categoria_id, cat.nombre as categoria,
  p.marca_id, m.nombre as marca,
  p.proveedor_id, pr.nombre as proveedor,
  p.stock_actual, p.stock_minimo, p.precio_venta, p.activo,
  (p.stock_actual <= p.stock_minimo and p.stock_minimo > 0) as stock_bajo,
  c.costo_actual, c.margen_pct, c.precio_manual,
  case when c.producto_id is null then null else p.precio_venta - c.costo_actual end as margen_pesos,
  case when c.producto_id is null or p.precio_venta = 0 then null
       else round((p.precio_venta - c.costo_actual)::numeric * 100 / p.precio_venta, 1) end as margen_real_pct,
  case when c.producto_id is null then null else (p.precio_venta < c.costo_actual) end as bajo_costo,
  p.actualizado_en
from public.productos p
left join public.categorias cat on cat.id = p.categoria_id
left join public.marcas m on m.id = p.marca_id
left join public.proveedores pr on pr.id = p.proveedor_id
left join public.producto_costos c on c.producto_id = p.id;

grant select on public.v_productos to authenticated;

-- Valor total del stock a costo (solo quien ve costos obtiene filas).
create or replace view public.v_valor_stock
with (security_invoker = true)
as
select
  count(*)::integer as productos,
  coalesce(sum(p.stock_actual * c.costo_actual), 0)::bigint as valor_costo,
  count(*) filter (where p.stock_actual <= p.stock_minimo and p.stock_minimo > 0)::integer as en_minimo
from public.productos p
join public.producto_costos c on c.producto_id = p.id
where p.activo;

grant select on public.v_valor_stock to authenticated;

-- ---------------------------------------------------------------------
-- Sellos y auditoría
-- ---------------------------------------------------------------------
create trigger categorias_sello before insert or update on public.categorias for each row execute function public.tg_sello();
create trigger marcas_sello before insert or update on public.marcas for each row execute function public.tg_sello();
create trigger proveedores_sello before insert or update on public.proveedores for each row execute function public.tg_sello();
create trigger productos_sello before insert or update on public.productos for each row execute function public.tg_sello();

create trigger categorias_auditoria after insert or update or delete on public.categorias for each row execute function public.tg_auditar();
create trigger marcas_auditoria after insert or update or delete on public.marcas for each row execute function public.tg_auditar();
create trigger proveedores_auditoria after insert or update or delete on public.proveedores for each row execute function public.tg_auditar();
create trigger productos_auditoria after insert or update or delete on public.productos for each row execute function public.tg_auditar();

-- ---------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------
alter table public.categorias enable row level security;
alter table public.marcas enable row level security;
alter table public.proveedores enable row level security;
alter table public.productos enable row level security;
alter table public.producto_costos enable row level security;
alter table public.precios_historial enable row level security;

-- Listas: las lee todo usuario activo; las editan quienes administran productos.
create policy categorias_select on public.categorias for select to authenticated using (public.usuario_activo());
create policy categorias_escribir on public.categorias for insert to authenticated with check (public.ve_costos());
create policy categorias_editar on public.categorias for update to authenticated using (public.ve_costos()) with check (public.ve_costos());

create policy marcas_select on public.marcas for select to authenticated using (public.usuario_activo());
create policy marcas_escribir on public.marcas for insert to authenticated with check (public.ve_costos());
create policy marcas_editar on public.marcas for update to authenticated using (public.ve_costos()) with check (public.ve_costos());

create policy proveedores_select on public.proveedores for select to authenticated using (public.usuario_activo());
create policy proveedores_escribir on public.proveedores for insert to authenticated with check (public.ve_costos());
create policy proveedores_editar on public.proveedores for update to authenticated using (public.ve_costos()) with check (public.ve_costos());

-- Productos: todos los activos ven la lista y el precio de venta (lo necesitan para vender).
create policy productos_select on public.productos for select to authenticated using (public.usuario_activo());
create policy productos_insert on public.productos for insert to authenticated with check (public.ve_costos());
create policy productos_update on public.productos for update to authenticated using (public.ve_costos()) with check (public.ve_costos());

-- Costos e historial: solo quien ve costos. Nadie borra.
create policy costos_select on public.producto_costos for select to authenticated using (public.ve_costos());
create policy costos_insert on public.producto_costos for insert to authenticated with check (public.ve_costos());
create policy costos_update on public.producto_costos for update to authenticated using (public.ve_costos()) with check (public.ve_costos());

create policy historial_select on public.precios_historial for select to authenticated using (public.ve_costos());

revoke delete on public.categorias, public.marcas, public.proveedores, public.productos, public.producto_costos from anon, authenticated;
revoke all on public.precios_historial from anon, authenticated;
grant select on public.precios_historial to authenticated;
revoke all on public.categorias, public.marcas, public.proveedores, public.productos, public.producto_costos from anon;
