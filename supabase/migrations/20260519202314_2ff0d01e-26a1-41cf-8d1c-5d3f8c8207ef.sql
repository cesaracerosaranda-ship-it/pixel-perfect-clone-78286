CREATE TABLE IF NOT EXISTS public.carrier_coverage (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  paqueteria TEXT NOT NULL,
  ciudad_destino TEXT NOT NULL,
  estado TEXT NOT NULL,
  direccion TEXT NOT NULL DEFAULT '',
  cp TEXT NOT NULL DEFAULT '',
  lat NUMERIC,
  lng NUMERIC,
  fuente_url TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.carrier_coverage ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public all carrier_coverage" ON public.carrier_coverage FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_carrier_coverage_paqueteria ON public.carrier_coverage(paqueteria);
CREATE INDEX IF NOT EXISTS idx_carrier_coverage_estado ON public.carrier_coverage(estado);