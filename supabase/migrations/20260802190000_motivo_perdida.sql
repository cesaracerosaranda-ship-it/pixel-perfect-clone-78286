-- Motivo de pérdida: al marcar una cotización como PERDIDA se exige capturar
-- por qué. Sin esto la información más valiosa del embudo se evapora (por qué
-- NO compraron), que es justo lo que alimenta el análisis de objeciones.
--
-- Se guarda como texto libre pero la UI ofrece motivos canónicos para que sea
-- agregable: precio · tiempo de entrega · sin inventario · competencia ·
-- no responde · otro.
alter table public.cotizaciones
  add column if not exists motivo_perdida text;

comment on column public.cotizaciones.motivo_perdida is
  'Por qué se perdió la cotización. Se captura al pasar estado a perdido.';
