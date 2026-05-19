CREATE TABLE IF NOT EXISTS public.codigos_postales (
    cp TEXT PRIMARY KEY,
    municipio TEXT NOT NULL,
    estado TEXT NOT NULL,
    estado_clave TEXT NOT NULL,
    lat NUMERIC,
    lng NUMERIC
);

CREATE INDEX IF NOT EXISTS idx_cp_estado_clave ON public.codigos_postales(estado_clave);

ALTER TABLE public.codigos_postales ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='codigos_postales' AND policyname='public read codigos_postales'
  ) THEN
    CREATE POLICY "public read codigos_postales" ON public.codigos_postales FOR SELECT USING (true);
  END IF;
END $$;