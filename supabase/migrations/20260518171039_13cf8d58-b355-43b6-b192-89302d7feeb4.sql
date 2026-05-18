
CREATE OR REPLACE FUNCTION public.next_folio(p_year INTEGER)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY INVOKER
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
