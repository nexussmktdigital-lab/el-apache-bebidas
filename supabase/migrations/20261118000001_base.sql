-- =====================================================================
-- Migración 0001 · Base del sistema
-- Perfiles y roles, configuración, auditoría, funciones de permisos.
-- Zona horaria del negocio: America/Argentina/Cordoba.
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- Roles de la aplicación
-- ---------------------------------------------------------------------
create type public.rol_usuario as enum ('superusuario', 'administracion', 'reparto');

-- ---------------------------------------------------------------------
-- Perfiles: uno por usuario de auth.users
-- ---------------------------------------------------------------------
create table public.perfiles (
  id              uuid primary key references auth.users (id) on delete cascade,
  nombre          text not null check (length(trim(nombre)) between 1 and 80),
  rol             public.rol_usuario not null default 'reparto',
  activo          boolean not null default true,
  creado_en       timestamptz not null default now(),
  actualizado_en  timestamptz not null default now()
);

comment on table public.perfiles is 'Datos de cada usuario del sistema y su rol. El id es el mismo de auth.users.';

-- ---------------------------------------------------------------------
-- Funciones de permisos. Las usan todas las políticas RLS.
-- security definer + search_path fijo para que no dependan de RLS de perfiles.
-- ---------------------------------------------------------------------
create or replace function public.auth_rol()
returns public.rol_usuario
language sql
stable
security definer
set search_path = public
as $$
  select p.rol
  from public.perfiles p
  where p.id = auth.uid()
    and p.activo
$$;

create or replace function public.es_superusuario()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.auth_rol() = 'superusuario', false)
$$;

-- Quién puede ver costos, márgenes y ganancias.
create or replace function public.ve_costos()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.auth_rol() in ('superusuario', 'administracion'), false)
$$;

-- Quién puede operar (cualquier usuario activo con perfil).
create or replace function public.usuario_activo()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.auth_rol() is not null
$$;

revoke all on function public.auth_rol() from public;
revoke all on function public.es_superusuario() from public;
revoke all on function public.ve_costos() from public;
revoke all on function public.usuario_activo() from public;
grant execute on function public.auth_rol() to authenticated;
grant execute on function public.es_superusuario() to authenticated;
grant execute on function public.ve_costos() to authenticated;
grant execute on function public.usuario_activo() to authenticated;

-- ---------------------------------------------------------------------
-- Utilidades comunes
-- ---------------------------------------------------------------------

-- Fecha "de hoy" del negocio (en Córdoba), para cortes diarios.
create or replace function public.hoy_ar()
returns date
language sql
stable
as $$
  select (now() at time zone 'America/Argentina/Cordoba')::date
$$;

-- Convierte un instante a fecha de Córdoba.
create or replace function public.fecha_ar(t timestamptz)
returns date
language sql
immutable
as $$
  select (t at time zone 'America/Argentina/Cordoba')::date
$$;

-- Trigger genérico: mantiene actualizado_en.
create or replace function public.tg_actualizado_en()
returns trigger
language plpgsql
as $$
begin
  new.actualizado_en := now();
  return new;
end
$$;

create trigger perfiles_actualizado
  before update on public.perfiles
  for each row execute function public.tg_actualizado_en();

-- ---------------------------------------------------------------------
-- Configuración del negocio (una sola fila)
-- ---------------------------------------------------------------------
create table public.configuracion (
  id                      boolean primary key default true check (id), -- fuerza una sola fila
  nombre_negocio          text not null default 'El Apache Bebidas',
  sucursal                text not null default 'Sucursal Alta Córdoba · Reparto',
  direccion               text not null default '',
  telefono                text not null default '',
  cuit                    text not null default '',
  leyenda_comprobante     text not null default 'Comprobante interno. No válido como factura.',
  pie_comprobante         text not null default '',
  plazo_cc_dias           integer not null default 15 check (plazo_cc_dias between 0 and 365),
  aviso_cc_dias           integer not null default 7 check (aviso_cc_dias between 0 and 365),
  aviso_vencimiento_dias  integer not null default 30 check (aviso_vencimiento_dias between 0 and 730),
  redondeo_precio         integer not null default 10 check (redondeo_precio in (1, 10, 50, 100)),
  mensaje_whatsapp        text not null default
    'Hola, {cliente}. Te escribimos de El Apache Bebidas. Tu cuenta corriente tiene un saldo de {saldo} que {vencimiento}. Podés abonar por transferencia o en efectivo al repartidor. Gracias.',
  actualizado_en          timestamptz not null default now(),
  actualizado_por         uuid references public.perfiles (id)
);

comment on table public.configuracion is 'Parámetros del negocio que el superusuario puede cambiar sin tocar código.';

insert into public.configuracion (id) values (true);

create trigger configuracion_actualizado
  before update on public.configuracion
  for each row execute function public.tg_actualizado_en();

-- ---------------------------------------------------------------------
-- Auditoría: quién hizo qué. La llena un trigger genérico.
-- ---------------------------------------------------------------------
create table public.auditoria (
  id          bigint generated always as identity primary key,
  fecha       timestamptz not null default now(),
  usuario_id  uuid,
  tabla       text not null,
  registro_id text not null,
  accion      text not null check (accion in ('insert', 'update', 'delete')),
  antes       jsonb,
  despues     jsonb
);

create index auditoria_fecha_idx on public.auditoria (fecha desc);
create index auditoria_tabla_registro_idx on public.auditoria (tabla, registro_id);
create index auditoria_usuario_idx on public.auditoria (usuario_id, fecha desc);

comment on table public.auditoria is 'Registro de cambios en las tablas del negocio. Nunca se borra.';

create or replace function public.tg_auditar()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id text;
begin
  if tg_op = 'DELETE' then
    v_id := coalesce(to_jsonb(old) ->> 'id', '');
    insert into public.auditoria (usuario_id, tabla, registro_id, accion, antes)
    values (auth.uid(), tg_table_name, v_id, 'delete', to_jsonb(old));
    return old;
  elsif tg_op = 'UPDATE' then
    v_id := coalesce(to_jsonb(new) ->> 'id', '');
    -- Si no cambió nada relevante (solo actualizado_en), no auditar.
    if to_jsonb(old) - 'actualizado_en' - 'actualizado_por' = to_jsonb(new) - 'actualizado_en' - 'actualizado_por' then
      return new;
    end if;
    insert into public.auditoria (usuario_id, tabla, registro_id, accion, antes, despues)
    values (auth.uid(), tg_table_name, v_id, 'update', to_jsonb(old), to_jsonb(new));
    return new;
  else
    v_id := coalesce(to_jsonb(new) ->> 'id', '');
    insert into public.auditoria (usuario_id, tabla, registro_id, accion, despues)
    values (auth.uid(), tg_table_name, v_id, 'insert', to_jsonb(new));
    return new;
  end if;
end
$$;

create trigger perfiles_auditoria
  after insert or update or delete on public.perfiles
  for each row execute function public.tg_auditar();

create trigger configuracion_auditoria
  after update on public.configuracion
  for each row execute function public.tg_auditar();

-- Vista legible de la auditoría, con el nombre del usuario.
create or replace view public.v_auditoria
with (security_invoker = true)
as
select a.id, a.fecha, a.usuario_id, p.nombre as usuario, a.tabla, a.registro_id, a.accion, a.antes, a.despues
from public.auditoria a
left join public.perfiles p on p.id = a.usuario_id;

-- ---------------------------------------------------------------------
-- Alta automática del perfil al crear un usuario en Auth.
-- El nombre y el rol se pueden mandar en raw_user_meta_data al crearlo.
-- ---------------------------------------------------------------------
create or replace function public.tg_nuevo_usuario()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rol public.rol_usuario;
begin
  begin
    v_rol := coalesce(new.raw_user_meta_data ->> 'rol', 'reparto')::public.rol_usuario;
  exception when others then
    v_rol := 'reparto';
  end;
  insert into public.perfiles (id, nombre, rol)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'nombre'), ''), split_part(new.email, '@', 1)),
    v_rol
  )
  on conflict (id) do nothing;
  return new;
end
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.tg_nuevo_usuario();

-- ---------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------
alter table public.perfiles enable row level security;
alter table public.configuracion enable row level security;
alter table public.auditoria enable row level security;

-- Perfiles: todo usuario activo ve la lista (para mostrar "quién hizo qué");
-- solo el superusuario cambia rol o estado; cada uno puede cambiar su nombre.
create policy perfiles_select on public.perfiles
  for select to authenticated
  using (public.usuario_activo() or id = auth.uid());

create policy perfiles_update_super on public.perfiles
  for update to authenticated
  using (public.es_superusuario())
  with check (public.es_superusuario());

create policy perfiles_update_propio on public.perfiles
  for update to authenticated
  using (id = auth.uid())
  with check (
    id = auth.uid()
    and rol = (select p.rol from public.perfiles p where p.id = auth.uid())
    and activo = (select p.activo from public.perfiles p where p.id = auth.uid())
  );

-- Configuración: la leen todos los usuarios activos (datos del comprobante,
-- plazos); la cambia el superusuario.
create policy configuracion_select on public.configuracion
  for select to authenticated
  using (public.usuario_activo());

create policy configuracion_update on public.configuracion
  for update to authenticated
  using (public.es_superusuario())
  with check (public.es_superusuario());

-- Auditoría: solo lectura y solo superusuario. Nadie inserta ni borra desde la API.
create policy auditoria_select on public.auditoria
  for select to authenticated
  using (public.es_superusuario());

-- Permisos de esquema: la API solo llega a lo que tiene política.
revoke all on public.auditoria from anon, authenticated;
grant select on public.auditoria to authenticated;
grant select on public.v_auditoria to authenticated;
revoke all on public.perfiles from anon;
revoke all on public.configuracion from anon;
grant select, update on public.perfiles to authenticated;
grant select, update on public.configuracion to authenticated;
