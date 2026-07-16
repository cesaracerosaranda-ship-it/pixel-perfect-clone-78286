-- Agrega el inventario de clavos junto al de boyas.
-- Se edita manualmente desde Historial (mismo flujo que las boyas); el descuento
-- automático al cerrar ventas sigue aplicando solo a boyas por ahora.
ALTER TABLE public.inventario
  ADD COLUMN IF NOT EXISTS clavos_disponibles integer NOT NULL DEFAULT 0;
