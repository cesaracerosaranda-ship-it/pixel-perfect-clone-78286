-- El contador de clavos se drenaba 4 veces más lento de lo que se consume.
--
-- El trigger descontaba UNA unidad por boya, tratando el juego de 4 clavos como
-- la unidad del contador. Pero los clavos se compran, se cuentan y se capturan
-- por PIEZA: cuando César carga "6,100" son 6,100 clavos, no 6,100 juegos. Cada
-- boya con clavos consume 4 piezas, así que vender 1,200 boyas debe bajar el
-- contador en 4,800 — no en 1,200.
--
-- Las dos configuraciones con clavos llevan 4 piezas cada una (ver PRODUCTOS en
-- src/lib/vialux/constants.ts); los reflejantes no cambian esa cuenta.
--
-- OJO: esto NO corrige el valor histórico del contador. El número que hay hoy se
-- calculó con la regla vieja y no corresponde a ningún conteo físico real. Hay
-- que recapturar el inventario a mano después de aplicar esta migración.
CREATE OR REPLACE FUNCTION public.ajustar_inventario_cotizacion()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  -- Piezas de clavo que consume una boya. Nombrado en vez de un 4 suelto:
  -- el error anterior fue justamente que la unidad vivía en un comentario.
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
    --   · CLAVOS pueden quedar en NEGATIVO: vender contra clavos que están por
    --     llegar es parte de la operación. Negativo = piezas comprometidas.
    IF v_delta < 0 AND v_disponibles + v_delta < 0 THEN
      RAISE EXCEPTION 'Stock insuficiente: solo hay % boyas disponibles', v_disponibles;
    END IF;

    UPDATE public.inventario
      SET boyas_disponibles  = boyas_disponibles  + v_delta,
          clavos_disponibles = clavos_disponibles + v_delta_clavos,
          updated_at = now()
      WHERE id = 1;
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

COMMENT ON COLUMN public.inventario.clavos_disponibles IS
  'Clavos en PIEZAS sueltas, no en juegos. Cada boya con clavos consume 4.';
