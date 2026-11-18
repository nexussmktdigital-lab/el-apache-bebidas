-- =====================================================================
-- Migración 0005 · Definiciones del cliente (18/11/2026)
-- Respuestas de Lorenzo al listado de preguntas:
--  - Cuenta corriente vence a los 7 días; aviso 1 día antes.
--  - Aviso de productos por vencer: 15 días.
--  - Mensaje de WhatsApp corto, sin la frase de cómo pagar.
--  - Comprobante solo con el logo (sin dirección, teléfono ni CUIT).
--  - Permisos: Administración (Thiago) ve costos pero NO ganancias;
--    las ganancias las ve solo el superusuario (Lorenzo).
-- =====================================================================

-- ---------------------------------------------------------------------
-- Configuración: nuevos valores por defecto y actualización de la fila
-- actual si todavía tiene los valores anteriores.
-- ---------------------------------------------------------------------
alter table public.configuracion
  alter column plazo_cc_dias set default 7,
  alter column aviso_cc_dias set default 1,
  alter column aviso_vencimiento_dias set default 15,
  alter column mensaje_whatsapp set default
    'Hola, {cliente}. Te escribimos de El Apache Bebidas. Tu cuenta corriente tiene un saldo de {saldo} que {vencimiento}.';

update public.configuracion set
  plazo_cc_dias = case when plazo_cc_dias = 15 then 7 else plazo_cc_dias end,
  aviso_cc_dias = case when aviso_cc_dias = 7 then 1 else aviso_cc_dias end,
  aviso_vencimiento_dias = case when aviso_vencimiento_dias = 30 then 15 else aviso_vencimiento_dias end,
  mensaje_whatsapp = case
    when mensaje_whatsapp like 'Hola, {cliente}. Te escribimos de El Apache Bebidas. Tu cuenta corriente tiene un saldo de {saldo} que {vencimiento}. Podés abonar%'
    then 'Hola, {cliente}. Te escribimos de El Apache Bebidas. Tu cuenta corriente tiene un saldo de {saldo} que {vencimiento}.'
    else mensaje_whatsapp end
where id;

-- Qué muestra el encabezado del comprobante además del logo.
alter table public.configuracion
  add column if not exists comprobante_mostrar_datos boolean not null default false;

comment on column public.configuracion.comprobante_mostrar_datos is 'Si está apagado, el comprobante lleva solo el logo arriba (pedido del cliente).';

-- ---------------------------------------------------------------------
-- Ganancias: solo el superusuario.
-- Los costos de cada venta (venta_item_costos) dejan de ser visibles para
-- administración; con eso, v_ventas y v_ventas_por_dia devuelven ganancia
-- nula para ese rol. Los costos de los productos (producto_costos) siguen
-- visibles para administración, que los necesita para comprar y poner precios.
-- ---------------------------------------------------------------------
create or replace function public.ve_ganancias()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.es_superusuario()
$$;
revoke all on function public.ve_ganancias() from public;
grant execute on function public.ve_ganancias() to authenticated;

drop policy if exists venta_item_costos_select on public.venta_item_costos;
create policy venta_item_costos_select on public.venta_item_costos for select to authenticated using (public.ve_ganancias());
