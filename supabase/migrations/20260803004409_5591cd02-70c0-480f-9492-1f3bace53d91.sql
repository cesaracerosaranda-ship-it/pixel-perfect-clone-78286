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