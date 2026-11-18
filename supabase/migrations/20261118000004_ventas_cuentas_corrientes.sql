-- =====================================================================
-- Migración 0004 · Ventas y cuentas corrientes
-- Confirmar una venta es una sola transacción: valida, descuenta stock
-- (FEFO), guarda precio y costo del momento y, si es cuenta corriente,
-- debita al cliente. Anular devuelve el stock a los mismos lotes y
-- revierte el débito. La cuenta corriente es un libro de movimientos
-- inmutable: el saldo se calcula, nunca se escribe.
-- =====================================================================

create type public.forma_pago as enum ('efectivo', 'transferencia', 'cuenta_corriente');
create type public.estado_venta as enum ('confirmada', 'anulada');
create type public.tipo_cc as enum ('saldo_inicial', 'venta', 'pago', 'anulacion_venta', 'ajuste');

-- ---------------------------------------------------------------------
-- Clientes
-- ---------------------------------------------------------------------
create table public.clientes (
  id              uuid primary key default gen_random_uuid(),
  nombre          text not null check (length(trim(nombre)) between 1 and 120),
  telefono        text not null default '',
  direccion       text not null default '',
  zona            text not null default '',
  cuit            text not null default '',
  notas           text not null default '',
  activo          boolean not null default true,
  creado_en       timestamptz not null default now(),
  creado_por      uuid,
  actualizado_en  timestamptz not null default now(),
  actualizado_por uuid
);
create unique index clientes_nombre_unico on public.clientes (lower(trim(nombre)));
create index clientes_zona_idx on public.clientes (zona);

create trigger clientes_sello before insert or update on public.clientes for each row execute function public.tg_sello();
create trigger clientes_auditoria after insert or update or delete on public.clientes for each row execute function public.tg_auditar();

-- ---------------------------------------------------------------------
-- Ventas
-- ---------------------------------------------------------------------
create table public.ventas (
  id               uuid primary key default gen_random_uuid(),
  numero           integer generated always as identity,
  fecha            timestamptz not null default now(),
  cliente_id       uuid references public.clientes (id),
  forma_pago       public.forma_pago not null,
  estado           public.estado_venta not null default 'confirmada',
  total            bigint not null default 0 check (total >= 0),
  vence_el         date,
  nota             text not null default '',
  anulada_en       timestamptz,
  anulada_por      uuid,
  motivo_anulacion text,
  creado_en        timestamptz not null default now(),
  creado_por       uuid,
  actualizado_en   timestamptz not null default now(),
  actualizado_por  uuid,
  constraint ventas_cc_con_cliente check (forma_pago <> 'cuenta_corriente' or cliente_id is not null)
);
create index ventas_fecha_idx on public.ventas (fecha desc);
create index ventas_cliente_idx on public.ventas (cliente_id, fecha desc);

create table public.venta_items (
  id              uuid primary key default gen_random_uuid(),
  venta_id        uuid not null references public.ventas (id) on delete cascade,
  producto_id     uuid not null references public.productos (id),
  descripcion     text not null,
  unidad          text not null default '',
  cantidad        integer not null check (cantidad > 0),
  precio_unitario bigint not null check (precio_unitario >= 0),
  subtotal        bigint generated always as (cantidad * precio_unitario) stored
);
create index venta_items_venta_idx on public.venta_items (venta_id);
create index venta_items_producto_idx on public.venta_items (producto_id);

-- Costo del momento, aparte para que RLS se lo niegue a quien no ve costos.
create table public.venta_item_costos (
  venta_item_id  uuid primary key references public.venta_items (id) on delete cascade,
  costo_unitario bigint not null check (costo_unitario >= 0)
);

-- Las ventas solo cambian por las funciones (confirmar / anular).
create or replace function public.tg_ventas_proteger()
returns trigger
language plpgsql
as $$
begin
  if coalesce(current_setting('app.permitir_venta', true), '') <> '1' then
    raise exception 'Las ventas se registran con confirmar_venta y se anulan con anular_venta.' using errcode = 'check_violation';
  end if;
  return new;
end
$$;

create trigger ventas_proteger before insert or update or delete on public.ventas for each row execute function public.tg_ventas_proteger();
create trigger venta_items_proteger before insert or update or delete on public.venta_items for each row execute function public.tg_ventas_proteger();
create trigger venta_item_costos_proteger before insert or update or delete on public.venta_item_costos for each row execute function public.tg_ventas_proteger();
create trigger ventas_sello before insert or update on public.ventas for each row execute function public.tg_sello();
create trigger ventas_auditoria after insert or update on public.ventas for each row execute function public.tg_auditar();

-- ---------------------------------------------------------------------
-- Cuenta corriente: libro de movimientos
-- ---------------------------------------------------------------------
create table public.cc_movimientos (
  id          bigint generated always as identity primary key,
  cliente_id  uuid not null references public.clientes (id),
  tipo        public.tipo_cc not null,
  importe     bigint not null check (importe <> 0),  -- positivo: debe más; negativo: pagó o se le acreditó
  venta_id    uuid references public.ventas (id),
  medio_pago  public.forma_pago,
  vence_el    date,
  nota        text not null default '',
  usuario_id  uuid,
  fecha       timestamptz not null default now(),
  constraint cc_pago_con_medio check (tipo <> 'pago' or medio_pago in ('efectivo', 'transferencia')),
  constraint cc_debito_con_vencimiento check (importe < 0 or tipo = 'ajuste' or vence_el is not null)
);
create index cc_movimientos_cliente_idx on public.cc_movimientos (cliente_id, fecha desc);
create index cc_movimientos_venta_idx on public.cc_movimientos (venta_id);

create or replace function public.tg_cc_sello()
returns trigger
language plpgsql
as $$
begin
  if coalesce(current_setting('app.permitir_cc', true), '') <> '1' then
    raise exception 'La cuenta corriente se mueve con ventas, pagos y ajustes del sistema.' using errcode = 'check_violation';
  end if;
  new.usuario_id := coalesce(new.usuario_id, auth.uid());
  return new;
end
$$;

create trigger cc_movimientos_sello before insert on public.cc_movimientos for each row execute function public.tg_cc_sello();
create trigger cc_movimientos_inmutables before update or delete on public.cc_movimientos for each row execute function public.tg_inmutable();

-- Inserta un movimiento de cuenta corriente (uso interno).
create or replace function public.mover_cc(
  p_cliente_id uuid,
  p_tipo public.tipo_cc,
  p_importe bigint,
  p_venta_id uuid default null,
  p_medio_pago public.forma_pago default null,
  p_vence_el date default null,
  p_nota text default ''
)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id bigint;
begin
  perform set_config('app.permitir_cc', '1', true);
  insert into public.cc_movimientos (cliente_id, tipo, importe, venta_id, medio_pago, vence_el, nota)
  values (p_cliente_id, p_tipo, p_importe, p_venta_id, p_medio_pago, p_vence_el, coalesce(p_nota, ''))
  returning id into v_id;
  perform set_config('app.permitir_cc', '0', true);
  return v_id;
end
$$;
revoke all on function public.mover_cc(uuid, public.tipo_cc, bigint, uuid, public.forma_pago, date, text) from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- Confirmar venta
-- p = { cliente_id?, forma_pago, nota?, items: [{ producto_id, cantidad }] }
-- ---------------------------------------------------------------------
create or replace function public.confirmar_venta(p jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_venta uuid;
  v_cliente uuid := nullif(p ->> 'cliente_id', '')::uuid;
  v_forma public.forma_pago;
  v_item jsonb;
  v_prod record;
  v_cantidad integer;
  v_item_id uuid;
  v_total bigint := 0;
  v_plazo integer;
  v_vence date;
  v_cliente_activo boolean;
begin
  if not public.usuario_activo() then
    raise exception 'No tenés permiso para registrar ventas.' using errcode = 'insufficient_privilege';
  end if;
  begin
    v_forma := (p ->> 'forma_pago')::public.forma_pago;
  exception when others then
    raise exception 'Elegí la forma de pago: efectivo, transferencia o cuenta corriente.' using errcode = 'check_violation';
  end;
  if jsonb_typeof(p -> 'items') is distinct from 'array' or jsonb_array_length(p -> 'items') = 0 then
    raise exception 'La venta tiene que tener al menos un producto.' using errcode = 'check_violation';
  end if;
  if v_forma = 'cuenta_corriente' and v_cliente is null then
    raise exception 'Para vender en cuenta corriente hay que elegir un cliente.' using errcode = 'check_violation';
  end if;
  if v_cliente is not null then
    select activo into v_cliente_activo from public.clientes where id = v_cliente;
    if v_cliente_activo is null then
      raise exception 'El cliente no existe.' using errcode = 'no_data_found';
    end if;
    if not v_cliente_activo then
      raise exception 'El cliente está desactivado.' using errcode = 'check_violation';
    end if;
  end if;

  if v_forma = 'cuenta_corriente' then
    select plazo_cc_dias into v_plazo from public.configuracion limit 1;
    v_vence := public.hoy_ar() + coalesce(v_plazo, 15);
  end if;

  perform set_config('app.permitir_venta', '1', true);

  insert into public.ventas (cliente_id, forma_pago, nota, vence_el)
  values (v_cliente, v_forma, coalesce(p ->> 'nota', ''), v_vence)
  returning id into v_venta;

  for v_item in select * from jsonb_array_elements(p -> 'items') loop
    v_cantidad := (v_item ->> 'cantidad')::integer;
    if v_cantidad is null or v_cantidad <= 0 then
      raise exception 'La cantidad tiene que ser mayor a cero.' using errcode = 'check_violation';
    end if;

    select pr.id, pr.nombre, pr.activo, pr.precio_venta, pr.unidad_venta, pr.unidades_por_bulto, c.costo_actual
      into v_prod
      from public.productos pr
      join public.producto_costos c on c.producto_id = pr.id
     where pr.id = (v_item ->> 'producto_id')::uuid;
    if v_prod.id is null then
      raise exception 'Uno de los productos no existe.' using errcode = 'no_data_found';
    end if;
    if not v_prod.activo then
      raise exception 'El producto % está desactivado.', v_prod.nombre using errcode = 'check_violation';
    end if;

    -- Precio y costo del momento quedan guardados en la venta.
    insert into public.venta_items (venta_id, producto_id, descripcion, unidad, cantidad, precio_unitario)
    values (
      v_venta, v_prod.id, v_prod.nombre,
      case when v_prod.unidad_venta = 'unidad' or v_prod.unidades_por_bulto <= 1 then v_prod.unidad_venta::text
           else v_prod.unidad_venta::text || ' x' || v_prod.unidades_por_bulto end,
      v_cantidad, v_prod.precio_venta
    )
    returning id into v_item_id;
    insert into public.venta_item_costos (venta_item_id, costo_unitario) values (v_item_id, v_prod.costo_actual);

    -- Descuenta stock: primero lo que vence antes. Si no alcanza, falla toda la venta.
    perform public.consumir_stock(v_prod.id, v_cantidad, 'venta', v_venta);

    v_total := v_total + v_cantidad * v_prod.precio_venta;
  end loop;

  update public.ventas set total = v_total where id = v_venta;

  if v_forma = 'cuenta_corriente' then
    perform public.mover_cc(v_cliente, 'venta', v_total, v_venta, null, v_vence, 'Venta N.º ' || (select numero from public.ventas where id = v_venta));
  end if;

  perform set_config('app.permitir_venta', '0', true);
  return v_venta;
end
$$;

-- ---------------------------------------------------------------------
-- Anular venta: devuelve el stock a los mismos lotes y revierte la CC.
-- Superusuario: cualquier venta. Administración: solo las del día.
-- ---------------------------------------------------------------------
create or replace function public.anular_venta(p_venta_id uuid, p_motivo text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v public.ventas%rowtype;
  v_mov record;
begin
  if not public.ve_costos() then
    raise exception 'No tenés permiso para anular ventas.' using errcode = 'insufficient_privilege';
  end if;
  if coalesce(trim(p_motivo), '') = '' then
    raise exception 'Indicá el motivo de la anulación.' using errcode = 'check_violation';
  end if;

  select * into v from public.ventas where id = p_venta_id for update;
  if v.id is null then
    raise exception 'La venta no existe.' using errcode = 'no_data_found';
  end if;
  if v.estado = 'anulada' then
    raise exception 'Esa venta ya está anulada.' using errcode = 'check_violation';
  end if;
  if public.auth_rol() = 'administracion' and public.fecha_ar(v.fecha) <> public.hoy_ar() then
    raise exception 'Solo el superusuario puede anular ventas de días anteriores.' using errcode = 'insufficient_privilege';
  end if;

  perform set_config('app.permitir_venta', '1', true);
  update public.ventas
     set estado = 'anulada', anulada_en = now(), anulada_por = auth.uid(), motivo_anulacion = trim(p_motivo)
   where id = p_venta_id;
  perform set_config('app.permitir_venta', '0', true);

  -- El stock vuelve a los mismos lotes de los que salió.
  for v_mov in
    select producto_id, lote_id, -cantidad as cantidad
      from public.movimientos_stock
     where referencia_id = p_venta_id and tipo = 'venta'
  loop
    insert into public.movimientos_stock (producto_id, lote_id, tipo, cantidad, referencia_id, nota)
    values (v_mov.producto_id, v_mov.lote_id, 'anulacion_venta', v_mov.cantidad, p_venta_id, 'Anulación: ' || trim(p_motivo));
  end loop;

  if v.forma_pago = 'cuenta_corriente' then
    perform public.mover_cc(v.cliente_id, 'anulacion_venta', -v.total, p_venta_id, null, null, 'Anulación venta N.º ' || v.numero || ': ' || trim(p_motivo));
  end if;
end
$$;

-- ---------------------------------------------------------------------
-- Pagos y ajustes de cuenta corriente
-- ---------------------------------------------------------------------
create or replace function public.registrar_pago(p_cliente_id uuid, p_importe bigint, p_medio public.forma_pago, p_nota text default '')
returns bigint
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.usuario_activo() then
    raise exception 'No tenés permiso para registrar pagos.' using errcode = 'insufficient_privilege';
  end if;
  if p_importe is null or p_importe <= 0 then
    raise exception 'El importe del pago tiene que ser mayor a cero.' using errcode = 'check_violation';
  end if;
  if p_medio not in ('efectivo', 'transferencia') then
    raise exception 'El pago es en efectivo o por transferencia.' using errcode = 'check_violation';
  end if;
  if not exists (select 1 from public.clientes where id = p_cliente_id) then
    raise exception 'El cliente no existe.' using errcode = 'no_data_found';
  end if;
  return public.mover_cc(p_cliente_id, 'pago', -p_importe, null, p_medio, null, p_nota);
end
$$;

-- Ajuste manual (corrección) o saldo inicial. Solo quien administra.
create or replace function public.ajustar_cc(p_cliente_id uuid, p_importe bigint, p_nota text, p_vence_el date default null, p_saldo_inicial boolean default false)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_plazo integer;
begin
  if not public.ve_costos() then
    raise exception 'No tenés permiso para ajustar cuentas corrientes.' using errcode = 'insufficient_privilege';
  end if;
  if p_importe is null or p_importe = 0 then
    raise exception 'Indicá el importe del ajuste.' using errcode = 'check_violation';
  end if;
  if coalesce(trim(p_nota), '') = '' and not p_saldo_inicial then
    raise exception 'Indicá el motivo del ajuste.' using errcode = 'check_violation';
  end if;
  select plazo_cc_dias into v_plazo from public.configuracion limit 1;
  return public.mover_cc(
    p_cliente_id,
    (case when p_saldo_inicial then 'saldo_inicial' else 'ajuste' end)::public.tipo_cc,
    p_importe, null, null,
    case when p_importe > 0 then coalesce(p_vence_el, public.hoy_ar() + coalesce(v_plazo, 15)) else null end,
    case when p_saldo_inicial then coalesce(nullif(trim(p_nota), ''), 'Saldo inicial') else trim(p_nota) end
  );
end
$$;

revoke all on function public.confirmar_venta(jsonb) from public;
revoke all on function public.anular_venta(uuid, text) from public;
revoke all on function public.registrar_pago(uuid, bigint, public.forma_pago, text) from public;
revoke all on function public.ajustar_cc(uuid, bigint, text, date, boolean) from public;
grant execute on function public.confirmar_venta(jsonb) to authenticated;
grant execute on function public.anular_venta(uuid, text) to authenticated;
grant execute on function public.registrar_pago(uuid, bigint, public.forma_pago, text) to authenticated;
grant execute on function public.ajustar_cc(uuid, bigint, text, date, boolean) to authenticated;

-- ---------------------------------------------------------------------
-- Vistas
-- ---------------------------------------------------------------------

-- Saldo y vencimiento de cada cliente. El vencimiento es el de la deuda más
-- vieja que todavía no quedó cubierta por los pagos (imputación por orden).
create or replace view public.v_clientes
with (security_invoker = true)
as
with saldos as (
  select cliente_id,
         sum(importe) as saldo,
         sum(case when importe < 0 then -importe else 0 end) as pagado,
         max(case when tipo = 'pago' then fecha end) as ultimo_pago
    from public.cc_movimientos
   group by cliente_id
),
debitos as (
  select cliente_id, vence_el, importe,
         sum(importe) over (partition by cliente_id order by vence_el, id) as acumulado
    from public.cc_movimientos
   where importe > 0
),
pendientes as (
  select d.cliente_id, min(d.vence_el) as vence_el
    from debitos d
    join saldos s on s.cliente_id = d.cliente_id
   where d.acumulado > s.pagado
   group by d.cliente_id
)
select
  c.id, c.nombre, c.telefono, c.direccion, c.zona, c.cuit, c.notas, c.activo,
  coalesce(s.saldo, 0)::bigint as saldo,
  case when coalesce(s.saldo, 0) > 0 then p.vence_el end as vence_el,
  case when coalesce(s.saldo, 0) > 0 and p.vence_el is not null then (p.vence_el - public.hoy_ar()) end as dias,
  case
    when coalesce(s.saldo, 0) <= 0 then 'al_dia'
    when p.vence_el is null then 'al_dia'
    when p.vence_el < public.hoy_ar() then 'vencida'
    when p.vence_el <= public.hoy_ar() + (select aviso_cc_dias from public.configuracion limit 1) then 'por_vencer'
    else 'al_dia'
  end as estado,
  s.ultimo_pago,
  c.creado_en, c.actualizado_en
from public.clientes c
left join saldos s on s.cliente_id = c.id
left join pendientes p on p.cliente_id = c.id;

-- Ventas con cliente, usuario, detalle y (para quien ve costos) costo y ganancia.
create or replace view public.v_ventas
with (security_invoker = true)
as
select
  v.id, v.numero, v.fecha, public.fecha_ar(v.fecha) as dia,
  v.cliente_id, cl.nombre as cliente,
  v.forma_pago, v.estado, v.total, v.vence_el, v.nota,
  v.anulada_en, v.anulada_por, v.motivo_anulacion,
  v.creado_por, u.nombre as usuario, ua.nombre as anulada_por_nombre,
  (select count(*) from public.venta_items i where i.venta_id = v.id)::integer as items,
  (select string_agg(i.cantidad || ' x ' || i.descripcion, ' · ' order by i.descripcion) from public.venta_items i where i.venta_id = v.id) as detalle,
  co.costo_total,
  case when co.costo_total is null then null else v.total - co.costo_total end as ganancia
from public.ventas v
left join public.clientes cl on cl.id = v.cliente_id
left join public.perfiles u on u.id = v.creado_por
left join public.perfiles ua on ua.id = v.anulada_por
left join lateral (
  select sum(i.cantidad * c.costo_unitario)::bigint as costo_total
    from public.venta_items i
    join public.venta_item_costos c on c.venta_item_id = i.id
   where i.venta_id = v.id
) co on true;

-- Movimientos de cuenta corriente legibles.
create or replace view public.v_cc_movimientos
with (security_invoker = true)
as
select
  m.id, m.fecha, m.cliente_id, m.tipo, m.importe, m.venta_id, ve.numero as venta_numero,
  m.medio_pago, m.vence_el, m.nota, m.usuario_id, u.nombre as usuario,
  sum(m.importe) over (partition by m.cliente_id order by m.fecha, m.id) as saldo_acumulado
from public.cc_movimientos m
left join public.ventas ve on ve.id = m.venta_id
left join public.perfiles u on u.id = m.usuario_id;

-- Resumen del día y por rango para el tablero (ventas, costo, ganancia).
create or replace view public.v_ventas_por_dia
with (security_invoker = true)
as
select
  dia,
  count(*)::integer as cantidad,
  sum(total)::bigint as ventas,
  sum(costo_total)::bigint as costo,
  sum(ganancia)::bigint as ganancia
from public.v_ventas
where estado = 'confirmada'
group by dia;

grant select on public.v_clientes, public.v_ventas, public.v_cc_movimientos, public.v_ventas_por_dia to authenticated;

-- ---------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------
alter table public.clientes enable row level security;
alter table public.ventas enable row level security;
alter table public.venta_items enable row level security;
alter table public.venta_item_costos enable row level security;
alter table public.cc_movimientos enable row level security;

-- Clientes: todos los activos los ven (reparto necesita teléfono y dirección); editan quienes administran.
create policy clientes_select on public.clientes for select to authenticated using (public.usuario_activo());
create policy clientes_insert on public.clientes for insert to authenticated with check (public.ve_costos());
create policy clientes_update on public.clientes for update to authenticated using (public.ve_costos()) with check (public.ve_costos());

-- Ventas e ítems: las ven todos los usuarios activos. Costos, solo quien ve costos.
create policy ventas_select on public.ventas for select to authenticated using (public.usuario_activo());
create policy venta_items_select on public.venta_items for select to authenticated using (public.usuario_activo());
create policy venta_item_costos_select on public.venta_item_costos for select to authenticated using (public.ve_costos());

-- Cuenta corriente: la ven todos los activos (reparto cobra); se escribe solo por funciones.
create policy cc_select on public.cc_movimientos for select to authenticated using (public.usuario_activo());

revoke all on public.ventas, public.venta_items, public.venta_item_costos, public.cc_movimientos from anon, authenticated;
grant select on public.ventas, public.venta_items, public.venta_item_costos, public.cc_movimientos to authenticated;
revoke all on public.clientes from anon;
revoke delete on public.clientes from authenticated;
