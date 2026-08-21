-- Bitácora de inventario: por qué subió o bajó cada contador.
--
-- Hasta hoy `inventario` guardaba un saldo y nada más. Cuando el número no
-- coincidía con la bodega no había forma de saber si faltaba producto, si una
-- venta se descontó dos veces o si el conteo previo estaba mal — y responderlo
-- exigía entrar a Supabase, que no siempre se puede. Un saldo sin historial no
-- se puede auditar.
--
-- Cada cambio deja una fila con el delta, el saldo resultante y su origen.
create table if not exists public.movimientos_inventario (
  id              uuid primary key default gen_random_uuid(),
  fecha           timestamptz not null default now(),
  -- 'venta'  → lo escribió el trigger de cotizaciones al cerrar/reabrir
  -- 'ajuste' → recaptura manual: recepción de material o corrección de conteo
  origen          text not null check (origen in ('venta', 'ajuste')),
  cotizacion_id   uuid references public.cotizaciones(id) on delete set null,
  delta_boyas     integer not null default 0,
  delta_clavos    integer not null default 0,
  boyas_despues   integer not null,
  clavos_despues  integer not null,
  created_at      timestamptz not null default now()
);

create index if not exists movimientos_inventario_fecha_ix
  on public.movimientos_inventario (fecha desc);

-- El corte parte del último ajuste manual, así que ese caso se busca solo.
create index if not exists movimientos_inventario_ajuste_ix
  on public.movimientos_inventario (fecha desc)
  where origen = 'ajuste';

alter table public.movimientos_inventario enable row level security;

-- Solo lectura: la bitácora la escribe el trigger, nunca la app. Si se pudiera
-- editar a mano dejaría de servir como evidencia, que es su única razón de ser.
do $$
begin
  drop policy if exists "movimientos_inventario_read" on public.movimientos_inventario;
  create policy "movimientos_inventario_read" on public.movimientos_inventario
    for select to authenticated using (true);
end $$;

-- ── El registro se dispara desde el propio saldo ─────────────────────────────
-- Enganchado a `inventario` y no a la app: así queda registrado TODO cambio,
-- venga de donde venga —la app, un script, Lovable o la consola de Supabase—.
-- Es security definer justamente para que nadie pueda saltarse la bitácora.
--
-- El origen viaja en un ajuste de sesión local a la transacción que pone el
-- trigger de cotizaciones. Si no viene marcado, fue una recaptura a mano.
create or replace function public.log_movimiento_inventario()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
DECLARE
  v_origen text := coalesce(nullif(current_setting('vialux.origen', true), ''), 'ajuste');
  v_cot    uuid := nullif(current_setting('vialux.cotizacion', true), '')::uuid;
BEGIN
  IF NEW.boyas_disponibles IS DISTINCT FROM OLD.boyas_disponibles
     OR NEW.clavos_disponibles IS DISTINCT FROM OLD.clavos_disponibles THEN
    INSERT INTO public.movimientos_inventario (
      origen, cotizacion_id, delta_boyas, delta_clavos, boyas_despues, clavos_despues
    ) VALUES (
      v_origen,
      CASE WHEN v_origen = 'venta' THEN v_cot ELSE NULL END,
      NEW.boyas_disponibles  - OLD.boyas_disponibles,
      NEW.clavos_disponibles - OLD.clavos_disponibles,
      NEW.boyas_disponibles,
      NEW.clavos_disponibles
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_movimiento_inventario ON public.inventario;
CREATE TRIGGER trg_log_movimiento_inventario
AFTER UPDATE ON public.inventario
FOR EACH ROW EXECUTE FUNCTION public.log_movimiento_inventario();

-- ── El trigger de ventas ahora firma su cambio ───────────────────────────────
-- Mismo cálculo que la migración anterior (4 clavos por boya); lo único nuevo
-- son las dos líneas de set_config que marcan el origen antes de tocar el saldo.
CREATE OR REPLACE FUNCTION public.ajustar_inventario_cotizacion()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  k_clavos_por_boya CONSTANT INTEGER := 4;
  v_disponibles INTEGER;
  v_delta INTEGER := 0;         -- boyas, en piezas
  v_delta_clavos INTEGER := 0;  -- clavos, en PIEZAS (no juegos)
BEGIN
  IF TG_OP IN ('UPDATE', 'DELETE') AND OLD.estado = 'cerrado' THEN
    v_delta := v_delta + OLD.cantidad;
    IF OLD.producto IN ('boya_clavos', 'boya_clavos_refl') THEN
      v_delta_clavos := v_delta_clavos + OLD.cantidad * k_clavos_por_boya;
    END IF;
  END IF;

  IF TG_OP IN ('INSERT', 'UPDATE') AND NEW.estado = 'cerrado' THEN
    v_delta := v_delta - NEW.cantidad;
    IF NEW.producto IN ('boya_clavos', 'boya_clavos_refl') THEN
      v_delta_clavos := v_delta_clavos - NEW.cantidad * k_clavos_por_boya;
    END IF;
  END IF;

  IF v_delta <> 0 OR v_delta_clavos <> 0 THEN
    SELECT boyas_disponibles INTO v_disponibles
      FROM public.inventario
      WHERE id = 1
      FOR UPDATE;

    IF v_disponibles IS NULL THEN
      INSERT INTO public.inventario (id, boyas_disponibles) VALUES (1, 0)
        ON CONFLICT (id) DO NOTHING;
      v_disponibles := 0;
    END IF;

    -- Reglas distintas por material, a propósito:
    --   · BOYAS bloquean la venta si no hay stock.
    --   · CLAVOS pueden quedar en NEGATIVO: vender contra clavos por llegar es
    --     parte de la operación. Negativo = piezas comprometidas.
    IF v_delta < 0 AND v_disponibles + v_delta < 0 THEN
      RAISE EXCEPTION 'Stock insuficiente: solo hay % boyas disponibles', v_disponibles;
    END IF;

    -- Local a la transacción: lo lee el trigger de la bitácora y muere con ella.
    PERFORM set_config('vialux.origen', 'venta', true);
    PERFORM set_config('vialux.cotizacion', coalesce(NEW.id, OLD.id)::text, true);

    UPDATE public.inventario
      SET boyas_disponibles  = boyas_disponibles  + v_delta,
          clavos_disponibles = clavos_disponibles + v_delta_clavos,
          updated_at = now()
      WHERE id = 1;

    -- Se limpia para que un ajuste manual posterior en la MISMA transacción no
    -- herede la firma de venta.
    PERFORM set_config('vialux.origen', '', true);
    PERFORM set_config('vialux.cotizacion', '', true);
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

COMMENT ON TABLE public.movimientos_inventario IS
  'Bitácora de solo lectura de todo cambio de inventario. La escribe un trigger, no la app.';
