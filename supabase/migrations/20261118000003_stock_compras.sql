-- =====================================================================
-- Migración 0003 · Stock y compras
-- Regla de oro: el stock nunca se edita directo. Todo cambio es un
-- movimiento (compra, venta, ajuste, anulación, carga inicial) y el
-- stock del producto y de cada lote salen de ahí. Nunca negativo.
-- Los vencimientos se guardan por lote; al descontar sale primero lo
-- que vence antes (FEFO).
-- =====================================================================

create type public.tipo_movimiento as enum ('carga_inicial', 'compra', 'venta', 'anulacion_venta', 'ajuste');
create type public.motivo_ajuste as enum ('rotura', 'vencido', 'conteo', 'otro');

-- ---------------------------------------------------------------------
-- Compras
-- ---------------------------------------------------------------------
create table public.compras (
  id              uuid primary key default gen_random_uuid(),
  numero          integer generated always as identity,
  proveedor_id    uuid references public.proveedores (id),
  fecha           date not null default public.hoy_ar(),
  total           bigint not null default 0 check (total >= 0),
  observaciones   text not null default '',
  creado_en       timestamptz not null default now(),
  creado_por      uuid,
  actualizado_en  timestamptz not null default now(),
  actualizado_por uuid
);
create index compras_fecha_idx on public.compras (fecha desc);
create index compras_proveedor_idx on public.compras (proveedor_id);

create table public.compra_items (
  id                uuid primary key default gen_random_uuid(),
  compra_id         uuid not null references public.compras (id) on delete cascade,
  producto_id       uuid not null references public.productos (id),
  cantidad          integer not null check (cantidad > 0),
  costo_unitario    bigint not null check (costo_unitario >= 0),
  fecha_vencimiento date,
  subtotal          bigint generated always as (cantidad * costo_unitario) stored
);
create index compra_items_compra_idx on public.compra_items (compra_id);
create index compra_items_producto_idx on public.compra_items (producto_id);

-- ---------------------------------------------------------------------
-- Lotes: cada ingreso con su vencimiento y su costo
-- ---------------------------------------------------------------------
create table public.lotes (
  id                   uuid primary key default gen_random_uuid(),
  producto_id          uuid not null references public.productos (id),
  compra_item_id       uuid references public.compra_items (id),
  fecha_vencimiento    date,
  cantidad_inicial     integer not null check (cantidad_inicial > 0),
  cantidad_disponible  integer not null check (cantidad_disponible >= 0),
  costo_unitario       bigint not null check (costo_unitario >= 0),
  creado_en            timestamptz not null default now(),
  creado_por           uuid
);
create index lotes_producto_fefo_idx on public.lotes (producto_id, fecha_vencimiento nulls last, creado_en) where cantidad_disponible > 0;
create index lotes_vencimiento_idx on public.lotes (fecha_vencimiento) where cantidad_disponible > 0;

comment on table public.lotes is 'Un lote por ingreso. cantidad_disponible la mantienen los movimientos; no se edita directo.';

-- ---------------------------------------------------------------------
-- Movimientos de stock: la única fuente del stock
-- ---------------------------------------------------------------------
create table public.movimientos_stock (
  id             bigint generated always as identity primary key,
  producto_id    uuid not null references public.productos (id),
  lote_id        uuid references public.lotes (id),
  tipo           public.tipo_movimiento not null,
  cantidad       integer not null check (cantidad <> 0),
  motivo_ajuste  public.motivo_ajuste,
  referencia_id  uuid,
  nota           text not null default '',
  usuario_id     uuid,
  fecha          timestamptz not null default now(),
  constraint movimientos_ajuste_con_motivo check (tipo <> 'ajuste' or motivo_ajuste is not null)
);
create index movimientos_producto_idx on public.movimientos_stock (producto_id, fecha desc);
create index movimientos_fecha_idx on public.movimientos_stock (fecha desc);
create index movimientos_referencia_idx on public.movimientos_stock (referencia_id);

comment on table public.movimientos_stock is 'Historial completo. Solo se insertan filas desde las funciones del sistema; nunca se modifican ni se borran.';

-- Cada movimiento actualiza el stock del producto y del lote.
create or replace function public.tg_movimiento_aplicar()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.usuario_id := coalesce(new.usuario_id, auth.uid());
  perform set_config('app.permitir_stock', '1', true);
  update public.productos set stock_actual = stock_actual + new.cantidad where id = new.producto_id;
  if not found then
    raise exception 'El producto no existe.' using errcode = 'no_data_found';
  end if;
  if new.lote_id is not null then
    update public.lotes set cantidad_disponible = cantidad_disponible + new.cantidad where id = new.lote_id;
  end if;
  perform set_config('app.permitir_stock', '0', true);
  return new;
exception
  when check_violation then
    perform set_config('app.permitir_stock', '0', true);
    raise exception 'No alcanza el stock para ese movimiento.' using errcode = 'check_violation';
end
$$;

create trigger movimientos_aplicar
  before insert on public.movimientos_stock
  for each row execute function public.tg_movimiento_aplicar();

create or replace function public.tg_inmutable()
returns trigger
language plpgsql
as $$
begin
  raise exception 'Los movimientos de stock no se modifican ni se borran: registrá un movimiento contrario.' using errcode = 'check_violation';
end
$$;

create trigger movimientos_inmutables
  before update or delete on public.movimientos_stock
  for each row execute function public.tg_inmutable();

-- Los lotes solo cambian a través de movimientos.
create or replace function public.tg_lotes_proteger()
returns trigger
language plpgsql
as $$
begin
  if new.cantidad_disponible is distinct from old.cantidad_disponible
     and coalesce(current_setting('app.permitir_stock', true), '') <> '1' then
    raise exception 'La cantidad de un lote no se edita directo: usá un ajuste.' using errcode = 'check_violation';
  end if;
  return new;
end
$$;

create trigger lotes_proteger
  before update on public.lotes
  for each row execute function public.tg_lotes_proteger();

-- ---------------------------------------------------------------------
-- Funciones internas (no expuestas a la API)
-- ---------------------------------------------------------------------

-- Ingreso de stock: crea un lote y su movimiento positivo.
create or replace function public.ingresar_stock(
  p_producto_id uuid,
  p_cantidad integer,
  p_costo_unitario bigint,
  p_fecha_vencimiento date,
  p_tipo public.tipo_movimiento,
  p_referencia_id uuid default null,
  p_compra_item_id uuid default null,
  p_motivo public.motivo_ajuste default null,
  p_nota text default ''
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_lote uuid;
begin
  if p_cantidad is null or p_cantidad <= 0 then
    raise exception 'La cantidad tiene que ser mayor a cero.' using errcode = 'check_violation';
  end if;
  insert into public.lotes (producto_id, compra_item_id, fecha_vencimiento, cantidad_inicial, cantidad_disponible, costo_unitario, creado_por)
  values (p_producto_id, p_compra_item_id, p_fecha_vencimiento, p_cantidad, 0, coalesce(p_costo_unitario, 0), auth.uid())
  returning id into v_lote;
  insert into public.movimientos_stock (producto_id, lote_id, tipo, cantidad, motivo_ajuste, referencia_id, nota)
  values (p_producto_id, v_lote, p_tipo, p_cantidad, p_motivo, p_referencia_id, coalesce(p_nota, ''));
  return v_lote;
end
$$;

-- Descuento de stock: consume lotes en orden de vencimiento (primero el que
-- vence antes; los sin vencimiento al final). Falla si no alcanza.
create or replace function public.consumir_stock(
  p_producto_id uuid,
  p_cantidad integer,
  p_tipo public.tipo_movimiento,
  p_referencia_id uuid default null,
  p_motivo public.motivo_ajuste default null,
  p_nota text default '',
  p_lote_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_restante integer := p_cantidad;
  v_lote record;
  v_tomar integer;
  v_nombre text;
begin
  if p_cantidad is null or p_cantidad <= 0 then
    raise exception 'La cantidad tiene que ser mayor a cero.' using errcode = 'check_violation';
  end if;

  -- Bloquea el producto para que dos descuentos a la vez no se pisen.
  select nombre into v_nombre from public.productos where id = p_producto_id for update;
  if v_nombre is null then
    raise exception 'El producto no existe.' using errcode = 'no_data_found';
  end if;

  for v_lote in
    select id, cantidad_disponible
    from public.lotes
    where producto_id = p_producto_id
      and cantidad_disponible > 0
      and (p_lote_id is null or id = p_lote_id)
    order by fecha_vencimiento asc nulls last, creado_en asc
    for update
  loop
    exit when v_restante <= 0;
    v_tomar := least(v_lote.cantidad_disponible, v_restante);
    insert into public.movimientos_stock (producto_id, lote_id, tipo, cantidad, motivo_ajuste, referencia_id, nota)
    values (p_producto_id, v_lote.id, p_tipo, -v_tomar, p_motivo, p_referencia_id, coalesce(p_nota, ''));
    v_restante := v_restante - v_tomar;
  end loop;

  if v_restante > 0 then
    raise exception 'No alcanza el stock de %: faltan % (pediste %).', v_nombre, v_restante, p_cantidad
      using errcode = 'check_violation';
  end if;
end
$$;

revoke all on function public.ingresar_stock(uuid, integer, bigint, date, public.tipo_movimiento, uuid, uuid, public.motivo_ajuste, text) from public, anon, authenticated;
revoke all on function public.consumir_stock(uuid, integer, public.tipo_movimiento, uuid, public.motivo_ajuste, text, uuid) from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- Funciones expuestas
-- ---------------------------------------------------------------------

-- Registra una compra completa: cabecera, ítems, lotes, movimientos y
-- actualización del costo de cada producto (último costo de compra).
-- p = { proveedor_id, fecha, observaciones, items: [{ producto_id, cantidad, costo_unitario, fecha_vencimiento }] }
create or replace function public.registrar_compra(p jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_compra uuid;
  v_item jsonb;
  v_item_id uuid;
  v_producto uuid;
  v_cantidad integer;
  v_costo bigint;
  v_vence date;
  v_total bigint := 0;
  v_n integer := 0;
begin
  if not public.ve_costos() then
    raise exception 'No tenés permiso para cargar compras.' using errcode = 'insufficient_privilege';
  end if;
  if jsonb_typeof(p -> 'items') is distinct from 'array' or jsonb_array_length(p -> 'items') = 0 then
    raise exception 'La compra tiene que tener al menos un producto.' using errcode = 'check_violation';
  end if;

  insert into public.compras (proveedor_id, fecha, observaciones)
  values (nullif(p ->> 'proveedor_id', '')::uuid, coalesce(nullif(p ->> 'fecha', '')::date, public.hoy_ar()), coalesce(p ->> 'observaciones', ''))
  returning id into v_compra;

  perform set_config('app.motivo_precio', 'compra', true);

  for v_item in select * from jsonb_array_elements(p -> 'items') loop
    v_producto := (v_item ->> 'producto_id')::uuid;
    v_cantidad := (v_item ->> 'cantidad')::integer;
    v_costo := (v_item ->> 'costo_unitario')::bigint;
    v_vence := nullif(v_item ->> 'fecha_vencimiento', '')::date;
    if v_cantidad is null or v_cantidad <= 0 then
      raise exception 'La cantidad tiene que ser mayor a cero.' using errcode = 'check_violation';
    end if;
    if v_costo is null or v_costo < 0 then
      raise exception 'El costo no puede ser negativo.' using errcode = 'check_violation';
    end if;

    insert into public.compra_items (compra_id, producto_id, cantidad, costo_unitario, fecha_vencimiento)
    values (v_compra, v_producto, v_cantidad, v_costo, v_vence)
    returning id into v_item_id;

    perform public.ingresar_stock(v_producto, v_cantidad, v_costo, v_vence, 'compra', v_compra, v_item_id);

    -- Último costo de compra pasa a ser el costo del producto (recalcula el precio si es automático).
    update public.producto_costos set costo_actual = v_costo where producto_id = v_producto and costo_actual is distinct from v_costo;

    v_total := v_total + v_cantidad * v_costo;
    v_n := v_n + 1;
  end loop;

  perform set_config('app.motivo_precio', '', true);
  update public.compras set total = v_total where id = v_compra;
  return v_compra;
end
$$;

-- Ajuste manual con motivo. Cantidad positiva ingresa (crea un lote con el
-- costo actual y el vencimiento indicado); negativa descuenta (FEFO, o de un
-- lote puntual si se indica, por ejemplo para marcar vencidos).
create or replace function public.ajustar_stock(
  p_producto_id uuid,
  p_cantidad integer,
  p_motivo public.motivo_ajuste,
  p_nota text default '',
  p_fecha_vencimiento date default null,
  p_lote_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_costo bigint;
begin
  if not public.ve_costos() then
    raise exception 'No tenés permiso para ajustar el stock.' using errcode = 'insufficient_privilege';
  end if;
  if p_cantidad is null or p_cantidad = 0 then
    raise exception 'Indicá cuánto entra o cuánto sale.' using errcode = 'check_violation';
  end if;
  if p_motivo is null then
    raise exception 'Elegí el motivo del ajuste.' using errcode = 'check_violation';
  end if;
  if p_cantidad > 0 then
    select costo_actual into v_costo from public.producto_costos where producto_id = p_producto_id;
    perform public.ingresar_stock(p_producto_id, p_cantidad, coalesce(v_costo, 0), p_fecha_vencimiento, 'ajuste', null, null, p_motivo, p_nota);
  else
    perform public.consumir_stock(p_producto_id, -p_cantidad, 'ajuste', null, p_motivo, p_nota, p_lote_id);
  end if;
end
$$;

-- Carga inicial de stock (importación y puesta en marcha): como un ajuste
-- positivo pero con su propio tipo y costo explícito.
create or replace function public.cargar_stock_inicial(
  p_producto_id uuid,
  p_cantidad integer,
  p_costo_unitario bigint default null,
  p_fecha_vencimiento date default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_costo bigint;
begin
  if not public.ve_costos() then
    raise exception 'No tenés permiso para cargar stock.' using errcode = 'insufficient_privilege';
  end if;
  select costo_actual into v_costo from public.producto_costos where producto_id = p_producto_id;
  perform public.ingresar_stock(p_producto_id, p_cantidad, coalesce(p_costo_unitario, v_costo, 0), p_fecha_vencimiento, 'carga_inicial', null, null, null, 'Carga inicial');
end
$$;

revoke all on function public.registrar_compra(jsonb) from public;
revoke all on function public.ajustar_stock(uuid, integer, public.motivo_ajuste, text, date, uuid) from public;
revoke all on function public.cargar_stock_inicial(uuid, integer, bigint, date) from public;
grant execute on function public.registrar_compra(jsonb) to authenticated;
grant execute on function public.ajustar_stock(uuid, integer, public.motivo_ajuste, text, date, uuid) to authenticated;
grant execute on function public.cargar_stock_inicial(uuid, integer, bigint, date) to authenticated;

-- ---------------------------------------------------------------------
-- Vistas
-- ---------------------------------------------------------------------

-- v_productos: se agrega el vencimiento más próximo del stock disponible.
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
  p.actualizado_en,
  v.vence_proximo
from public.productos p
left join public.categorias cat on cat.id = p.categoria_id
left join public.marcas m on m.id = p.marca_id
left join public.proveedores pr on pr.id = p.proveedor_id
left join public.producto_costos c on c.producto_id = p.id
left join lateral (
  select min(l.fecha_vencimiento) as vence_proximo
  from public.lotes l
  where l.producto_id = p.id and l.cantidad_disponible > 0 and l.fecha_vencimiento is not null
) v on true;

-- Lotes con stock que vencen dentro del plazo de aviso (o ya vencidos).
create or replace view public.v_lotes_por_vencer
with (security_invoker = true)
as
select
  l.id as lote_id, l.producto_id, p.nombre as producto, p.unidad_venta, p.unidades_por_bulto,
  l.fecha_vencimiento, l.cantidad_disponible, l.costo_unitario,
  (l.fecha_vencimiento - public.hoy_ar()) as dias
from public.lotes l
join public.productos p on p.id = l.producto_id
where l.cantidad_disponible > 0
  and l.fecha_vencimiento is not null
  and l.fecha_vencimiento <= public.hoy_ar() + (select aviso_vencimiento_dias from public.configuracion limit 1)
order by l.fecha_vencimiento asc;

-- Historial legible de movimientos.
create or replace view public.v_movimientos_stock
with (security_invoker = true)
as
select
  mv.id, mv.fecha, mv.producto_id, p.nombre as producto, p.unidad_venta, p.unidades_por_bulto,
  mv.tipo, mv.cantidad, mv.motivo_ajuste, mv.nota, mv.referencia_id,
  mv.lote_id, l.fecha_vencimiento as lote_vence,
  mv.usuario_id, u.nombre as usuario
from public.movimientos_stock mv
join public.productos p on p.id = mv.producto_id
left join public.lotes l on l.id = mv.lote_id
left join public.perfiles u on u.id = mv.usuario_id;

-- Compras con proveedor y cantidad de ítems.
create or replace view public.v_compras
with (security_invoker = true)
as
select
  c.id, c.numero, c.fecha, c.proveedor_id, pr.nombre as proveedor, c.total, c.observaciones,
  c.creado_en, c.creado_por, u.nombre as usuario,
  (select count(*) from public.compra_items i where i.compra_id = c.id)::integer as items,
  (select string_agg(i.cantidad || ' x ' || p.nombre, ' · ' order by p.nombre)
     from public.compra_items i join public.productos p on p.id = i.producto_id
    where i.compra_id = c.id) as detalle
from public.compras c
left join public.proveedores pr on pr.id = c.proveedor_id
left join public.perfiles u on u.id = c.creado_por;

grant select on public.v_lotes_por_vencer, public.v_movimientos_stock, public.v_compras to authenticated;

-- ---------------------------------------------------------------------
-- Sellos, auditoría y RLS
-- ---------------------------------------------------------------------
create trigger compras_sello before insert or update on public.compras for each row execute function public.tg_sello();
create trigger compras_auditoria after insert or update on public.compras for each row execute function public.tg_auditar();

alter table public.compras enable row level security;
alter table public.compra_items enable row level security;
alter table public.lotes enable row level security;
alter table public.movimientos_stock enable row level security;

-- Solo lectura para quien ve costos; toda escritura pasa por las funciones.
create policy compras_select on public.compras for select to authenticated using (public.ve_costos());
create policy compra_items_select on public.compra_items for select to authenticated using (public.ve_costos());
create policy lotes_select on public.lotes for select to authenticated using (public.ve_costos());
create policy movimientos_select on public.movimientos_stock for select to authenticated using (public.ve_costos());

revoke all on public.compras, public.compra_items, public.lotes, public.movimientos_stock from anon, authenticated;
grant select on public.compras, public.compra_items, public.lotes, public.movimientos_stock to authenticated;
