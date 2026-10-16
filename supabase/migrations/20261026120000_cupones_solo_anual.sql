-- Cupones "solo para un plan" y descuento al terminar la prueba
-- (pedido por Jonah el 16 de octubre, junto con el anual a S/149,90).
--
-- Dos columnas nuevas en cupones (no tocan ningún cupón que ya existe):
--   - solo_meses: si tiene valor (1, 3 o 12), el descuento vale solo para
--     ese plan (12 = solo el anual). Vacío = todos los planes, como hasta hoy.
--   - solo_fin_prueba: si es true, el cupón vale solo para quien terminó su
--     prueba gratis sin pagar, durante las 48 horas siguientes (las mismas
--     48 horas de "última oportunidad" del bono de +7 días). La app lo
--     aplica sola. Solo en la web: en Play Store y iPhone cobra la tienda.
--
-- Y un cupón nuevo, ANUAL-PRUEBA: 20 % en el plan anual en las 48 horas
-- después de terminar la prueba. Jonah lo puede apagar o cambiar desde el panel (🎟️ CUPONES).

alter table public.cupones add column if not exists solo_meses integer check (solo_meses is null or solo_meses in (1, 3, 12));
alter table public.cupones add column if not exists solo_fin_prueba boolean not null default false;

create or replace function public.cupon_para(p_codigo text, p_username text)
 returns json
 language plpgsql
 stable
 security definer
 set search_path to 'public'
as $function$
declare
  c cupones%rowtype;
  v_codigo text := upper(trim(coalesce(p_codigo, '')));
  v_plan text;
  v_vence date;
  v_fin timestamptz;
begin
  if v_codigo = '' then return json_build_object('estado', 'invalido'); end if;
  select * into c from cupones where codigo = v_codigo;
  if not found or not c.activo then return json_build_object('estado', 'invalido'); end if;
  if c.vence is not null and (now() at time zone 'America/Lima')::date > c.vence then
    return json_build_object('estado', 'vencido');
  end if;
  if c.para_username is not null and lower(c.para_username) <> lower(coalesce(p_username, '')) then
    return json_build_object('estado', 'no_es_para_ti');
  end if;
  if exists (select 1 from cupones_usos u where u.codigo = c.codigo and lower(u.username) = lower(coalesce(p_username, ''))) then
    return json_build_object('estado', 'ya_usado');
  end if;
  if c.usos_maximos is not null and c.usos >= c.usos_maximos then
    return json_build_object('estado', 'agotado');
  end if;
  -- Solo al terminar la prueba: las 48 horas después del fin (fase
  -- 'gracia' de ventanaBono en src/App.jsx).
  if c.solo_fin_prueba then
    select plan, fecha_vencimiento into v_plan, v_vence from alumnos where lower(username) = lower(coalesce(p_username, ''));
    if v_plan is null or v_plan not in ('trial', 'prueba') or v_vence is null then
      return json_build_object('estado', 'fuera_de_plazo');
    end if;
    v_fin := (v_vence::text || ' 23:59:59')::timestamp at time zone 'America/Lima';
    if now() <= v_fin or now() > v_fin + interval '48 hours' then
      return json_build_object('estado', 'fuera_de_plazo');
    end if;
  end if;
  return json_build_object('estado', 'ok', 'codigo', c.codigo, 'tipo', c.tipo, 'valor', c.valor, 'vence', c.vence,
    'solo_meses', c.solo_meses, 'solo_fin_prueba', c.solo_fin_prueba);
end;
$function$;

-- El pago con un cupón "solo para un plan" tiene que ser de ese plan.
create or replace function private.revisar_cupon_pago()
 returns trigger
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare v_res json;
begin
  if new.cupon is null or trim(new.cupon) = '' then new.cupon := null; return new; end if;
  new.cupon := upper(trim(new.cupon));
  if auth.uid() is null or private.is_admin() then return new; end if;
  v_res := cupon_para(new.cupon, new.username);
  if v_res->>'estado' <> 'ok' or v_res->>'tipo' <> 'descuento' then
    raise exception 'Cupón no válido: %', coalesce(v_res->>'estado', 'invalido');
  end if;
  if v_res->>'solo_meses' is not null and (v_res->>'solo_meses')::int <> new.plan_meses then
    raise exception 'Cupón no válido: otro_plan';
  end if;
  return new;
end;
$function$;

insert into public.cupones (codigo, tipo, valor, usos_maximos, solo_meses, solo_fin_prueba, nota)
values ('ANUAL-PRUEBA', 'descuento', 20, null, 12, true, 'Automático: 20 % en el anual en las 48 h después de terminar la prueba (la app lo aplica sola, solo en la web)')
on conflict (codigo) do nothing;
