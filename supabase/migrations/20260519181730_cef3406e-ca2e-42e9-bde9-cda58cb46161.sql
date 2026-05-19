CREATE OR REPLACE FUNCTION public.ajustar_inventario_cotizacion()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_disponibles INTEGER;
  v_delta INTEGER := 0;
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.estado = 'cerrado' THEN
      v_delta := -NEW.cantidad;
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.estado <> 'cerrado' AND NEW.estado = 'cerrado' THEN
      v_delta := -NEW.cantidad;
    ELSIF OLD.estado = 'cerrado' AND NEW.estado <> 'cerrado' THEN
      v_delta := OLD.cantidad;
    ELSIF OLD.estado = 'cerrado' AND NEW.estado = 'cerrado' AND OLD.cantidad <> NEW.cantidad THEN
      v_delta := OLD.cantidad - NEW.cantidad;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.estado = 'cerrado' THEN
      v_delta := OLD.cantidad;
    END IF;
  END IF;

  IF v_delta <> 0 THEN
    SELECT boyas_disponibles INTO v_disponibles
      FROM public.inventario
      WHERE id = 1
      FOR UPDATE;

    IF v_disponibles IS NULL THEN
      INSERT INTO public.inventario (id, boyas_disponibles) VALUES (1, 0)
        ON CONFLICT (id) DO NOTHING;
      v_disponibles := 0;
    END IF;

    IF v_disponibles + v_delta < 0 THEN
      RAISE EXCEPTION 'Stock insuficiente: solo hay % boyas disponibles', v_disponibles;
    END IF;

    UPDATE public.inventario
      SET boyas_disponibles = boyas_disponibles + v_delta,
          updated_at = now()
      WHERE id = 1;
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ajustar_inventario_cotizacion ON public.cotizaciones;

CREATE TRIGGER trg_ajustar_inventario_cotizacion
BEFORE INSERT OR UPDATE OR DELETE ON public.cotizaciones
FOR EACH ROW
EXECUTE FUNCTION public.ajustar_inventario_cotizacion();