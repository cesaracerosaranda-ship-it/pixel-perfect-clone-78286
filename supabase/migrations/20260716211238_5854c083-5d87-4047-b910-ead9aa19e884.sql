-- 20260716180000_next_folio_definer.sql
DO $$
DECLARE
  fn_ident text;
BEGIN
  SELECT 'public.' || p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')'
    INTO fn_ident
  FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public' AND p.proname = 'next_folio'
  LIMIT 1;

  IF fn_ident IS NOT NULL THEN
    EXECUTE 'ALTER FUNCTION ' || fn_ident || ' SECURITY DEFINER';
    EXECUTE 'GRANT EXECUTE ON FUNCTION ' || fn_ident || ' TO authenticated';
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'next_folio no ajustada: %', SQLERRM;
END $$;

-- 20260714120000_inventario_clavos.sql
ALTER TABLE public.inventario
  ADD COLUMN IF NOT EXISTS clavos_disponibles integer NOT NULL DEFAULT 0;