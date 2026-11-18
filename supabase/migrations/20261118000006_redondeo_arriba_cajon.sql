-- =====================================================================
-- Migración 0006 · Redondeo siempre para arriba y unidad "cajón"
--  - Lorenzo: "precio redondo, siempre en 10 para arriba". El precio
--    calculado se redondea al múltiplo de $10 (o del redondeo elegido)
--    inmediatamente superior.
--  - Venden por pack, caja o cajón; no venden unidades sueltas.
-- =====================================================================

-- "cajón" como unidad de venta (además de unidad, pack y caja).
alter type public.unidad_venta add value if not exists 'cajon';

-- Redondeo hacia arriba.
create or replace function public.redondear_precio(valor numeric, redondeo integer)
returns bigint
language sql
immutable
as $$
  select case
    when coalesce(redondeo, 1) <= 1 then ceil(valor)::bigint
    else (ceil(valor / redondeo) * redondeo)::bigint
  end
$$;

-- Recalcula los precios automáticos ya cargados con la nueva regla.
do $$
begin
  perform set_config('app.permitir_precio', '1', true);
  update public.productos p
     set precio_venta = public.calcular_precio(c.costo_actual, c.margen_pct, c.precio_manual, public.redondeo_configurado())
    from public.producto_costos c
   where c.producto_id = p.id
     and c.precio_manual is null
     and p.precio_venta is distinct from public.calcular_precio(c.costo_actual, c.margen_pct, c.precio_manual, public.redondeo_configurado());
  perform set_config('app.permitir_precio', '0', true);
end
$$;
