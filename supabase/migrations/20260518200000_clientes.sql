-- Tabla de clientes
CREATE TABLE public.clientes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre TEXT NOT NULL,
  empresa TEXT NOT NULL DEFAULT '',
  telefono TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  notas TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public all clientes" ON public.clientes FOR ALL USING (true) WITH CHECK (true);

CREATE TRIGGER clientes_updated_at
  BEFORE UPDATE ON public.clientes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- FK en cotizaciones
ALTER TABLE public.cotizaciones
  ADD COLUMN cliente_id UUID REFERENCES public.clientes(id) ON DELETE SET NULL;

-- Poblar clientes desde cotizaciones existentes (más reciente gana por nombre)
INSERT INTO public.clientes (nombre, empresa, telefono)
SELECT DISTINCT ON (cliente_nombre)
  cliente_nombre,
  COALESCE(NULLIF(TRIM(cliente_empresa), ''), '') AS empresa,
  COALESCE(cliente_telefono, '') AS telefono
FROM public.cotizaciones
WHERE TRIM(cliente_nombre) != ''
ORDER BY cliente_nombre, fecha DESC;

-- Vincular cotizaciones existentes con sus clientes
UPDATE public.cotizaciones c
SET cliente_id = cl.id
FROM public.clientes cl
WHERE c.cliente_nombre = cl.nombre;
