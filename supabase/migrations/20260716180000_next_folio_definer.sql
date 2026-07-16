-- Blinda la generación de folios en el modelo autenticado.
-- next_folio actualiza folio_counter; al marcarla SECURITY DEFINER corre con los
-- privilegios del dueño y no depende del acceso del usuario que la invoca, y
-- garantizamos EXECUTE para el rol authenticated (la app la llama vía RPC).
-- Idempotente y defensivo: si la función no existe con la firma esperada, no aborta.
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
