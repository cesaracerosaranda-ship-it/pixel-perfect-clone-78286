CREATE TABLE IF NOT EXISTS public.clientes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre TEXT NOT NULL,
  empresa TEXT NOT NULL DEFAULT '',
  telefono TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  notas TEXT NOT NULL DEFAULT '',
  contacto_nombre TEXT NOT NULL DEFAULT '',
  contacto_telefono TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'clientes' AND policyname = 'Public all clientes'
  ) THEN
    CREATE POLICY "Public all clientes" ON public.clientes FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'clientes_updated_at') THEN
    CREATE TRIGGER clientes_updated_at
      BEFORE UPDATE ON public.clientes
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

ALTER TABLE public.clientes
  ADD COLUMN IF NOT EXISTS contacto_nombre TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS contacto_telefono TEXT NOT NULL DEFAULT '';

ALTER TABLE public.cotizaciones
  ADD COLUMN IF NOT EXISTS cliente_id UUID REFERENCES public.clientes(id) ON DELETE SET NULL;

INSERT INTO public.clientes (nombre, empresa, telefono)
SELECT DISTINCT ON (cliente_nombre)
  cliente_nombre,
  COALESCE(NULLIF(TRIM(cliente_empresa), ''), ''),
  COALESCE(cliente_telefono, '')
FROM public.cotizaciones
WHERE TRIM(cliente_nombre) != ''
ORDER BY cliente_nombre, fecha DESC
ON CONFLICT DO NOTHING;

UPDATE public.cotizaciones c
SET cliente_id = cl.id
FROM public.clientes cl
WHERE c.cliente_nombre = cl.nombre
  AND c.cliente_id IS NULL;