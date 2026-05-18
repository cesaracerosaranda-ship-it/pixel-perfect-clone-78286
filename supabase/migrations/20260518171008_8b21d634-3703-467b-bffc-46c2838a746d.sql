
CREATE TABLE public.cotizaciones (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  folio TEXT NOT NULL UNIQUE,
  fecha TIMESTAMPTZ NOT NULL DEFAULT now(),
  cliente_nombre TEXT NOT NULL DEFAULT '',
  cliente_empresa TEXT NOT NULL DEFAULT '',
  cliente_telefono TEXT DEFAULT '',
  cp_destino TEXT DEFAULT '',
  municipio TEXT DEFAULT '',
  estado_destino TEXT DEFAULT '',
  producto TEXT NOT NULL DEFAULT 'boya_clavos',
  descripcion_producto TEXT NOT NULL DEFAULT '',
  cantidad INTEGER NOT NULL DEFAULT 0,
  precio_unitario NUMERIC NOT NULL DEFAULT 0,
  requiere_factura BOOLEAN NOT NULL DEFAULT true,
  precio_especial BOOLEAN NOT NULL DEFAULT false,
  subtotal_producto NUMERIC NOT NULL DEFAULT 0,
  incluye_flete BOOLEAN NOT NULL DEFAULT false,
  flete_paqueteria TEXT DEFAULT '',
  flete_modalidad TEXT DEFAULT '',
  flete_costo NUMERIC DEFAULT 0,
  subtotal_general NUMERIC NOT NULL DEFAULT 0,
  iva NUMERIC DEFAULT 0,
  total NUMERIC NOT NULL DEFAULT 0,
  margen_porcentaje NUMERIC DEFAULT 0,
  estado TEXT NOT NULL DEFAULT 'cotizado' CHECK (estado IN ('cotizado', 'cerrado', 'enviado', 'perdido')),
  revision INTEGER NOT NULL DEFAULT 0,
  folio_padre TEXT DEFAULT NULL,
  notas_internas TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.folio_counter (
  id INTEGER PRIMARY KEY DEFAULT 1,
  last_number INTEGER NOT NULL DEFAULT 0
);
INSERT INTO public.folio_counter (id, last_number) VALUES (1, 11);

CREATE TABLE public.inventario (
  id INTEGER PRIMARY KEY DEFAULT 1,
  boyas_disponibles INTEGER NOT NULL DEFAULT 750,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
INSERT INTO public.inventario (id, boyas_disponibles) VALUES (1, 750);

ALTER TABLE public.cotizaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.folio_counter ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventario ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public all cotizaciones" ON public.cotizaciones FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public all folio_counter" ON public.folio_counter FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public all inventario" ON public.inventario FOR ALL USING (true) WITH CHECK (true);

ALTER PUBLICATION supabase_realtime ADD TABLE public.cotizaciones;
ALTER PUBLICATION supabase_realtime ADD TABLE public.inventario;

CREATE OR REPLACE FUNCTION public.next_folio(p_year INTEGER)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_number INTEGER;
BEGIN
  UPDATE public.folio_counter
    SET last_number = last_number + 1
    WHERE id = 1
    RETURNING last_number INTO new_number;
  RETURN 'VX-' || p_year::TEXT || '-' || LPAD(new_number::TEXT, 4, '0');
END;
$$;

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER cotizaciones_updated_at
  BEFORE UPDATE ON public.cotizaciones
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
