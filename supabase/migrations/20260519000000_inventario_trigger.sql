-- Esta migración fue superada por 20260519181730_cef3406e-*.sql
-- (trigger ajustar_inventario_cotizacion de Lovable, más completo).
-- Solo limpia artefactos propios si por alguna razón quedaron en DB.
DROP TRIGGER IF EXISTS trg_inventario_por_estado ON public.cotizaciones;
DROP FUNCTION IF EXISTS public.fn_inventario_por_estado();
