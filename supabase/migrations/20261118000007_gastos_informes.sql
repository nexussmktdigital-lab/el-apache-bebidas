-- =====================================================================
-- Migración 0007 · Gastos e informes
-- Gastos con categorías a elección, balance diario y mensual (ventas,
-- costo, ganancia bruta, gastos, resultado) y resúmenes para el tablero.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Categorías de gastos (las elige el cliente; arrancan con seis)
-- ---------------------------------------------------------------------
create table public.gasto_categorias (
  id              uuid primary key default gen_random_uuid(),
  nombre          text not null check (length(trim(nombre)) between 1 and 60),
  activo          boolean not null default true,
  creado_en       timestamptz not null default now(),
  creado_por      uuid,
  actualizado_en  timestamptz not null default now(),
  actualizado_por uuid
);
create unique index gasto_categorias_nombre_unico on public.gasto_categorias (lower(trim(nombre)));
create trigger gasto_categorias_sello before insert or update on public.gasto_categorias for each row execute function public.tg_sello();
create trigger gasto_categorias_auditoria after insert or update or delete on public.gasto_categorias for each row execute function public.tg_auditar();

insert into public.gasto_categorias (nombre) values
  ('Combustible'), ('Sueldos'), ('Alquiler'), ('Servicios'), ('Mantenimiento'), ('Otros')
on conflict do nothing;

-- ---------------------------------------------------------------------
-- Gastos
-- ---------------------------------------------------------------------
create table public.gastos (
  id              uuid primary key default gen_random_uuid(),
  fecha           date not null default public.hoy_ar(),
  monto           bigint not null check (monto > 0),
  categoria_id    uuid references public.gasto_categorias (id),
  medio_pago      public.forma_pago not null default 'efectivo' check (medio_pago in ('efectivo', 'transferencia')),
  pagado_a        text not null default '',
  detalle         text not null default '',
  anulado         boolean not null default false,
  anulado_motivo  text,
  anulado_en      timestamptz,
  anulado_por     uuid,
  creado_en       timestamptz not null default now(),
  creado_por      uuid,
  actualizado_en  timestamptz not null default now(),
  actualizado_por uuid
);
create index gastos_fecha_idx on public.gastos (fecha desc);
create index gastos_categoria_idx on public.gastos (categoria_id);

comment on table public.gastos is 'Gastos del negocio. No se borran: se anulan con motivo.';

-- Un gasto no se edita: se anula (con motivo) y se carga de nuevo.
create or replace function public.tg_gastos_proteger()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'UPDATE' then
    if new.fecha is distinct from old.fecha or new.monto is distinct from old.monto or new.categoria_id is distinct from old.categoria_id
       or new.medio_pago is distinct from old.medio_pago or new.pagado_a is distinct from old.pagado_a or new.detalle is distinct from old.detalle then
      raise exception 'Un gasto no se modifica: anulalo con un motivo y cargalo de nuevo.' using errcode = 'check_violation';
    end if;
    if old.anulado and not new.anulado then
      raise exception 'Un gasto anulado no se puede volver a activar: cargalo de nuevo.' using errcode = 'check_violation';
    end if;
    if new.anulado and not old.anulado then
      if coalesce(trim(new.anulado_motivo), '') = '' then
        raise exception 'Indicá el motivo de la anulación.' using errcode = 'check_violation';
      end if;
      new.anulado_en := now();
      new.anulado_por := auth.uid();
    end if;
  end if;
  return new;
end
$$;

create trigger gastos_proteger before update on public.gastos for each row execute function public.tg_gastos_proteger();
create trigger gastos_sello before insert or update on public.gastos for each row execute function public.tg_sello();
create trigger gastos_auditoria after insert or update or delete on public.gastos for each row execute function public.tg_auditar();

create or replace view public.v_gastos
with (security_invoker = true)
as
select
  g.id, g.fecha, g.monto, g.categoria_id, c.nombre as categoria, g.medio_pago, g.pagado_a, g.detalle,
  g.anulado, g.anulado_motivo, g.anulado_en, ua.nombre as anulado_por_nombre,
  g.creado_en, g.creado_por, u.nombre as usuario
from public.gastos g
left join public.gasto_categorias c on c.id = g.categoria_id
left join public.perfiles u on u.id = g.creado_por
left join public.perfiles ua on ua.id = g.anulado_por;

grant select on public.v_gastos to authenticated;

-- ---------------------------------------------------------------------
-- Balance: ventas, costo de lo vendido, ganancia bruta, gastos y resultado
-- por día dentro de un rango. Solo quien ve ganancias (superusuario).
-- ---------------------------------------------------------------------
create or replace function public.balance(p_desde date, p_hasta date)
returns table (
  dia date,
  ventas_cantidad integer,
  ventas bigint,
  costo bigint,
  ganancia_bruta bigint,
  gastos_cantidad integer,
  gastos bigint,
  resultado bigint
)
language sql
stable
security definer
set search_path = public
as $$
  with chequeo as (
    select case when public.ve_ganancias() then true
                else (select null::boolean where false) end as ok
  ),
  dias as (
    select d::date as dia from generate_series(p_desde, p_hasta, interval '1 day') d
  ),
  v as (
    select public.fecha_ar(ve.fecha) as dia,
           count(*)::integer as cantidad,
           sum(ve.total)::bigint as ventas,
           sum((select coalesce(sum(i.cantidad * c.costo_unitario), 0)
                  from public.venta_items i
                  join public.venta_item_costos c on c.venta_item_id = i.id
                 where i.venta_id = ve.id))::bigint as costo
      from public.ventas ve
     where ve.estado = 'confirmada'
       and public.fecha_ar(ve.fecha) between p_desde and p_hasta
     group by 1
  ),
  g as (
    select fecha as dia, count(*)::integer as cantidad, sum(monto)::bigint as gastos
      from public.gastos
     where not anulado and fecha between p_desde and p_hasta
     group by 1
  )
  select
    d.dia,
    coalesce(v.cantidad, 0),
    coalesce(v.ventas, 0),
    coalesce(v.costo, 0),
    coalesce(v.ventas, 0) - coalesce(v.costo, 0),
    coalesce(g.cantidad, 0),
    coalesce(g.gastos, 0),
    coalesce(v.ventas, 0) - coalesce(v.costo, 0) - coalesce(g.gastos, 0)
  from dias d
  cross join chequeo ch
  left join v on v.dia = d.dia
  left join g on g.dia = d.dia
  where ch.ok
    and p_hasta >= p_desde
    and p_hasta - p_desde <= 400
  order by d.dia
$$;

revoke all on function public.balance(date, date) from public;
grant execute on function public.balance(date, date) to authenticated;

-- ---------------------------------------------------------------------
-- Resúmenes para el tablero: productos más vendidos y ventas por categoría.
-- Los ve cualquier usuario activo; el margen solo quien ve ganancias.
-- ---------------------------------------------------------------------
create or replace function public.productos_mas_vendidos(p_desde date, p_hasta date, p_limite integer default 5)
returns table (
  producto_id uuid,
  producto text,
  unidad text,
  cantidad bigint,
  ventas bigint,
  ganancia bigint,
  stock_actual integer,
  stock_bajo boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select
    i.producto_id,
    p.nombre,
    case when p.unidad_venta = 'unidad' or p.unidades_por_bulto <= 1 then p.unidad_venta::text else p.unidad_venta::text || ' x' || p.unidades_por_bulto end,
    sum(i.cantidad)::bigint,
    sum(i.subtotal)::bigint,
    case when public.ve_ganancias() then sum(i.subtotal - i.cantidad * c.costo_unitario)::bigint else null end,
    p.stock_actual,
    (p.stock_actual <= p.stock_minimo and p.stock_minimo > 0)
  from public.venta_items i
  join public.ventas v on v.id = i.venta_id and v.estado = 'confirmada'
  join public.productos p on p.id = i.producto_id
  left join public.venta_item_costos c on c.venta_item_id = i.id
  where public.usuario_activo()
    and public.fecha_ar(v.fecha) between p_desde and p_hasta
  group by i.producto_id, p.nombre, p.unidad_venta, p.unidades_por_bulto, p.stock_actual, p.stock_minimo
  order by sum(i.subtotal) desc
  limit greatest(1, least(coalesce(p_limite, 5), 50))
$$;

create or replace function public.ventas_por_categoria(p_desde date, p_hasta date)
returns table (categoria text, ventas bigint, porcentaje numeric)
language sql
stable
security definer
set search_path = public
as $$
  with t as (
    select coalesce(cat.nombre, 'Sin categoría') as categoria, sum(i.subtotal)::bigint as ventas
      from public.venta_items i
      join public.ventas v on v.id = i.venta_id and v.estado = 'confirmada'
      join public.productos p on p.id = i.producto_id
      left join public.categorias cat on cat.id = p.categoria_id
     where public.usuario_activo()
       and public.fecha_ar(v.fecha) between p_desde and p_hasta
     group by 1
  )
  select categoria, ventas, round(ventas * 100.0 / nullif(sum(ventas) over (), 0), 1)
  from t
  order by ventas desc
$$;

revoke all on function public.productos_mas_vendidos(date, date, integer) from public;
revoke all on function public.ventas_por_categoria(date, date) from public;
grant execute on function public.productos_mas_vendidos(date, date, integer) to authenticated;
grant execute on function public.ventas_por_categoria(date, date) to authenticated;

-- ---------------------------------------------------------------------
-- RLS: gastos y categorías para quien administra (superusuario y
-- administración). Ventas y cobros no los ve.
-- ---------------------------------------------------------------------
alter table public.gasto_categorias enable row level security;
alter table public.gastos enable row level security;

create policy gasto_categorias_select on public.gasto_categorias for select to authenticated using (public.ve_costos());
create policy gasto_categorias_insert on public.gasto_categorias for insert to authenticated with check (public.ve_costos());
create policy gasto_categorias_update on public.gasto_categorias for update to authenticated using (public.ve_costos()) with check (public.ve_costos());

create policy gastos_select on public.gastos for select to authenticated using (public.ve_costos());
create policy gastos_insert on public.gastos for insert to authenticated with check (public.ve_costos());
create policy gastos_update on public.gastos for update to authenticated using (public.ve_costos()) with check (public.ve_costos());

revoke all on public.gasto_categorias, public.gastos from anon;
revoke delete on public.gasto_categorias, public.gastos from authenticated;
