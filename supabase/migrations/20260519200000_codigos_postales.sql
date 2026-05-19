-- Catálogo de códigos postales mexicanos (SEPOMEX)
-- Los datos se importan por separado desde supabase/codigos_postales.csv
-- vía el importador CSV del dashboard de Supabase.
CREATE TABLE IF NOT EXISTS public.codigos_postales (
  cp           TEXT PRIMARY KEY,
  municipio    TEXT NOT NULL,
  estado       TEXT NOT NULL,
  estado_clave TEXT NOT NULL,
  lat          NUMERIC,
  lng          NUMERIC
);

CREATE INDEX IF NOT EXISTS idx_cp_estado_clave
  ON public.codigos_postales (estado_clave);

-- Lectura pública sin autenticación (app interna)
ALTER TABLE public.codigos_postales ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read codigos_postales"
  ON public.codigos_postales FOR SELECT USING (true);
