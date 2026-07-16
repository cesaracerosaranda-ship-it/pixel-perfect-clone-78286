
-- VIALUX: cerrar la app al equipo autenticado
DROP POLICY IF EXISTS "Public all carrier_coverage" ON public.carrier_coverage;
DROP POLICY IF EXISTS "Public all clientes" ON public.clientes;
DROP POLICY IF EXISTS "public read codigos_postales" ON public.codigos_postales;
DROP POLICY IF EXISTS "Public all cotizaciones" ON public.cotizaciones;
DROP POLICY IF EXISTS "documentos_delete" ON public.documentos;
DROP POLICY IF EXISTS "documentos_insert" ON public.documentos;
DROP POLICY IF EXISTS "documentos_select" ON public.documentos;
DROP POLICY IF EXISTS "documentos_update" ON public.documentos;
DROP POLICY IF EXISTS "Public all folio_counter" ON public.folio_counter;
DROP POLICY IF EXISTS "Public all inventario" ON public.inventario;

REVOKE ALL ON public.carrier_coverage FROM anon;
REVOKE ALL ON public.clientes FROM anon;
REVOKE ALL ON public.codigos_postales FROM anon;
REVOKE ALL ON public.cotizaciones FROM anon;
REVOKE ALL ON public.documentos FROM anon;
REVOKE ALL ON public.folio_counter FROM anon;
REVOKE ALL ON public.inventario FROM anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.carrier_coverage TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clientes TO authenticated;
GRANT SELECT ON public.codigos_postales TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cotizaciones TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.documentos TO authenticated;
GRANT SELECT, UPDATE ON public.folio_counter TO authenticated;
GRANT SELECT, UPDATE ON public.inventario TO authenticated;

CREATE POLICY "team_all_carrier_coverage" ON public.carrier_coverage FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "team_all_clientes" ON public.clientes FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "team_read_codigos_postales" ON public.codigos_postales FOR SELECT TO authenticated USING (true);
CREATE POLICY "team_all_cotizaciones" ON public.cotizaciones FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "team_all_documentos" ON public.documentos FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "team_all_folio_counter" ON public.folio_counter FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "team_all_inventario" ON public.inventario FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Storage bucket documentos: restringir a autenticados
DROP POLICY IF EXISTS "documentos_bucket_delete" ON storage.objects;
DROP POLICY IF EXISTS "documentos_bucket_insert" ON storage.objects;
DROP POLICY IF EXISTS "documentos_bucket_select" ON storage.objects;
DROP POLICY IF EXISTS "documentos_bucket_update" ON storage.objects;

CREATE POLICY "documentos_bucket_select_auth" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'documentos');
CREATE POLICY "documentos_bucket_insert_auth" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'documentos');
CREATE POLICY "documentos_bucket_update_auth" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'documentos') WITH CHECK (bucket_id = 'documentos');
CREATE POLICY "documentos_bucket_delete_auth" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'documentos');
