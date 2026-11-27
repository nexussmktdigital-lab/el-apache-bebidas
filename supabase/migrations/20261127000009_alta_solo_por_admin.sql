-- =====================================================================
-- Alta de usuarios solo por administración
-- =====================================================================
-- Antes, el rol de un usuario nuevo salía de raw_user_meta_data, que lo
-- elige quien se registra. Con el registro público habilitado, cualquiera
-- con la clave publicable podía crearse una cuenta como superusuario.
--
-- Ahora el rol sale de raw_app_meta_data, que solo puede escribir el
-- servidor (clave service_role, script crear-usuarios.mjs). Una cuenta
-- creada de cualquier otra forma queda con el perfil DESACTIVADO: no ve
-- ni toca nada hasta que Lorenzo la active desde Usuarios.
-- =====================================================================

create or replace function public.tg_nuevo_usuario()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rol    public.rol_usuario;
  v_activo boolean := true;
begin
  begin
    v_rol := (new.raw_app_meta_data ->> 'rol')::public.rol_usuario;
  exception when others then
    v_rol := null;
  end;

  if v_rol is null then
    v_rol := 'reparto';
    v_activo := false;
  end if;

  insert into public.perfiles (id, nombre, rol, activo)
  values (
    new.id,
    coalesce(
      nullif(trim(new.raw_app_meta_data ->> 'nombre'), ''),
      nullif(trim(new.raw_user_meta_data ->> 'nombre'), ''),
      split_part(new.email, '@', 1)
    ),
    v_rol,
    v_activo
  )
  on conflict (id) do nothing;
  return new;
end
$$;

comment on function public.tg_nuevo_usuario() is
  'Crea el perfil de cada usuario nuevo. El rol se toma de raw_app_meta_data (solo lo escribe el servidor); sin rol válido el perfil queda desactivado.';
