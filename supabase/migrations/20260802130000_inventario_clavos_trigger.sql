-- Al cerrar una venta cuya configuración lleva clavos (boya_clavos o
-- boya_clavos_refl), el inventario de clavos baja UN JUEGO POR BOYA (el juego
-- de 4 clavos se cuenta como 1 unidad del contador, igual que César lo captura).
--
-- Reglas distintas por material, a propósito:
--   · BOYAS bloquean la venta si no hay stock (no se puede surtir lo que no existe).
--   · CLAVOS pueden quedar en NEGATIVO: registrar una venta con juegos que están
--     por llegar es parte de la operación ("ganarle al tiempo" comprando clavos
--     por adelantado). Un contador negativo = juegos comprometidos que se deben.
--
-- El UPDATE se replantea como "revertir el efecto de la fila vieja + aplicar el
-- de la nueva": cubre también el caso de cambiar la CONFIGURACIÓN o la cantidad
-- de una cotización ya cerrada, que la versión anterior no contemplaba.
CREATE OR REPLACE FUNCTION public.ajustar_inventario_cotizacion()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_disponibles INTEGER;
  v_delta INTEGER := 0;         -- boyas
  v_delta_clavos INTEGER := 0;  -- juegos de clavos (1 juego = los 4 clavos de una boya)
BEGIN
  IF TG_OP IN ('UPDATE', 'DELETE') AND OLD.estado = 'cerrado' THEN
    v_delta := v_delta + OLD.cantidad;
    IF OLD.producto IN ('boya_clavos', 'boya_clavos_refl') THEN
      v_delta_clavos := v_delta_clavos + OLD.cantidad;
    END IF;
  END IF;

  IF TG_OP IN ('INSERT', 'UPDATE') AND NEW.estado = 'cerrado' THEN
    v_delta := v_delta - NEW.cantidad;
    IF NEW.producto IN ('boya_clavos', 'boya_clavos_refl') THEN
      v_delta_clavos := v_delta_clavos - NEW.cantidad;
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
