# ARRANQUE — Punto exacto para retomar

Última actualización: **5/ago/2026**. Este documento es el único que hay que leer
para continuar. Los detalles viven en `plan-marketing-inhouse.md`,
`adopcion-corteclaro.md` y `whatsapp-runbook.md`.

---

## 0 · LO PRIMERO al abrir la sesión

**No hay paso bloqueante.** `cobro_pendiente` ya está en producción desde el
5/ago (commit `fe1bb65`, del bot de Lovable). Cobranza e Inicio ya filtran bien.

Cómo confirmarlo en un segundo, sin abrir Supabase:

```bash
grep -c cobro_pendiente src/integrations/supabase/types.ts
```

Debe devolver **2 o más** (hoy da 3: `Row`, `Insert`, `Update`). Si da 0, los
tipos vienen de un checkout viejo — `git pull` antes de concluir nada.

**Ojo con cómo se ve una migración aplicada:** Lovable no ejecuta el archivo del
repo con su nombre. Copia el SQL y lo vuelve a commitear bajo un nombre suyo
(`20260805165937_0eab3897-….sql`, contenido idéntico). Así que el archivo
original puede *parecer* que nunca corrió. La prueba real es siempre `types.ts`,
no el nombre del archivo en `supabase/migrations/`.

---

## A · Lo que César hace SIN Claude

**Con fecha límite — antes del 15/ago (día de pago de S4)**
- [ ] **Montar la campaña consolidada** (~1 h). Guía en
      `plan-marketing-inhouse.md` §7 "Semana 2". Resumen: duplicar
      `Ventas-Mensajes || Boyas 3 precios || Ubis || 1.12.25` → renombrar
      `VIALUX || Consolidada || 08.26` → $200/día → borrar el anuncio duplicado y
      crear uno con **"Usar publicación existente"** (la de AD Boyas 3 precios 2,
      con sus 211 reacciones) → publicar.
- [ ] Al publicar: **apagar** las dos campañas débiles (IG 10.12.25 y Nuevas img
      AI). Dejar viva la ganadora 3-5 días como seguro.
- [ ] Comparar consolidada vs viejas → decisión S4 → avisar la salida.

**Sin fecha**
- [ ] Al recibir clavos del proveedor: capturar el conteo real en el modal de
      inventario.
- [ ] Fotos de obra instalada para la serie orgánica (shot list en
      `plan-marketing-inhouse.md` Apéndice C).
- [ ] Probar en el celular si la respuesta rápida de WhatsApp Business admite
      adjunto: Ajustes → Herramientas para la empresa → Respuestas rápidas → +.
      Si no admite archivo, el flujo bueno es generar la ficha desde la app cada
      vez (ya está construido) — así nunca sale con "reenviado muchas veces".

---

## B · Migraciones

| Migración | Estado |
|---|---|
| `20260802130000_inventario_clavos_trigger.sql` | ✅ aplicada |
| `20260802190000_motivo_perdida.sql` | ✅ aplicada |
| `20260803140000_cobranza.sql` (tabla `pagos`) | ✅ aplicada |
| `20260804120000_bitacora.sql` (tabla `contactos`) | ✅ aplicada 4/ago |
| `20260804180000_cobro_pendiente.sql` | ✅ aplicada 5/ago (como `20260805165937_…`) |

Lovable **no** aplica solo las migraciones del repo: siempre hay que pedírselo,
con este prompt cambiando el nombre del archivo.

```
Ejecuta tal cual, sin modificarla, la migración
supabase/migrations/<ARCHIVO>.sql. Después regenera los tipos de
TypeScript. Confírmame ambas cosas.
```

Y verificar en `types.ts`, no por el nombre del archivo — Lovable recommitea el
SQL bajo un nombre propio (ver §0).

---

## C · Construido 4-5/ago

- ✅ **Panel INICIO** (`/`) — cinco colas de acción, cada una con su botón de
  WhatsApp con texto ya redactado (nunca se envía solo), Recotizar y Perdida:
  `00 Recordatorios` · `01 Sin respuesta` · `02 Vigencia vencida` ·
  `03 Cobro vencido` · `04 Recompra`.
  Un cliente con quien ya se habló en las últimas 48 h **no aparece** — la cola
  refleja lo que falta hacer, no todo lo que existe.
- ✅ **Seguimiento = top 5 por "calor"** — monto ponderado por qué tan fresca
  sigue la cotización. Ordenar solo por monto mandaba a perseguir cotizaciones
  grandes pero casi vencidas antes que otras vivas.
- ✅ **Vigencia de lo recién vencido a lo más viejo** — la que caducó ayer se
  recupera con una llamada; la de hace dos meses es arqueología.
- ✅ **Bitácora + recordatorios por cliente** (tabla `contactos`) — una tarea
  siempre nace de una conversación, por eso es una sola tabla. Atajos de fecha:
  Mañana / En 3 días / En 1 semana / En 15 días.
- ✅ **Motivos de pérdida desde las etiquetas reales de WhatsApp Business** —
  agrupados en Select. Clave del diseño: "no responde" son DOS problemas
  distintos — *post-campaña* es calidad de lead (se arregla en la segmentación
  del anuncio) y *post-contacto* es proceso de venta (se arregla en el
  seguimiento). Juntarlos escondía cuál de los dos está sangrando.
- ✅ **Teléfono visible en toda la app** (`TelefonoCliente`) — muchos clientes se
  guardan como "A QUIEN CORRESPONDA" y el teléfono es lo único que los distingue
  y la llave para hallar la conversación en WhatsApp.
- ✅ **Ficha técnica generada desde la app** — se regenera cada vez, así nunca
  lleva la marca "reenviado muchas veces". Corrige dos cosas del PDF viejo que se
  reenviaba: el correo del dominio en vez del de Gmail, y la tercera
  configuración (boya + clavos + reflejantes) que faltaba.
- ✅ **Cobranza reorientada** — ver §D, es el cambio con más contexto detrás.
- ✅ **Encabezado de sección con riel numerado** en todas las pantallas
  (`RailSection`), para que no se pierdan los límites entre secciones.

---

## D · Cobranza — el supuesto que estaba mal (leer antes de tocarla)

El módulo se diseñó asumiendo que **cerrar una venta y cobrarla son momentos
distintos**, y que una venta cerrada sin pagos registrados era dinero por cobrar.
En VIALUX **el pago ocurre ANTES de cerrar**: todo el histórico aparecía como
deuda vencida cuando ya estaba pagado.

Se invirtió el default con `cobro_pendiente`: **una venta está saldada salvo que
se marque lo contrario**, a mano, desde el menú de estado en Ventas, para el caso
excepcional del crédito o el anticipo. Inicio respeta el mismo filtro.

El módulo ahora sirve para **historial de ingresos** (cobrado en el mes, total
registrado, desglose de los últimos 6 meses), no para cobrar.

Pendiente de decidir con César qué más entra ahí: pidió "historial de
transferencias, cotizaciones enviadas y aprobadas, guías". Las guías ya viven en
`documentos`; falta ver si conviene una vista consolidada o solo enlazar.

---

## E · Lo que sigue en construir

1. **Rastreo público por token** (1-2 días) — lo único grande que queda de
   `adopcion-corteclaro.md`. Después del corte S4.
2. **Cola de contacto post-entrega** — se descartó hacer encuestas de servicio al
   volumen actual: con ~5 ventas/semana la muestra no dice nada y quema contacto.
   Un mensaje a los pocos días de entregado sí.
3. **WhatsApp fase pesada** — coexistencia del número real + captura de
   `referral`/`ctwa_clid` + backfill del historial. **Después del 15/ago**, en
   sesión dedicada, con `whatsapp-runbook.md` a la mano. El token de prueba caduca
   cada 24 h: dar por hecho que hay que renovarlo antes de probar nada.
4. **Migrar los ~431 hex hardcodeados a variables CSS** — deuda técnica, no urge.

---

## F · Pendientes de César en Meta (no bloquean nada de la app)

- Actualizar la URL del aviso de privacidad a
  `https://control.vialuxmty.com/privacidad`.
- Estructura de portafolios: renombrar "Celosias" a la razón social de la CSF,
  sacar Lattice Works a su propio portafolio, despublicar CRG Safety. Requisito
  previo a la Business Verification.
- **Conector MCP de Meta Ads** (`mcp.facebook.com/ads`) — **sin verificar**, ~40%
  de las cuentas no tienen el permiso. Si existe, sustituye los exports manuales.
  Es mejora de flujo, no requisito.

---

## G · Números de referencia (baseline real, 4/ago)

De las listas de WhatsApp Business: **307 conversaciones fugadas** (206
post-campaña + 101 post-contacto) contra **60 ventas** ≈ **5% de conversación a
venta**. Es la primera línea base real que existe. Toda mejora de seguimiento se
mide contra ese 5%.

Costo por conversación propio: **$20** (vs $35 del creativo generado con IA — por
eso se descartó esa vía). La app vive en **https://control.vialuxmty.com**.

---

## H · Estado del repo (5/ago)

Al 5/ago: árbol limpio, `npx tsc --noEmit` sin errores y `npm run build` en
verde. La migración de `cobro_pendiente` y sus tipos entraron en `fe1bb65` (bot
de Lovable).

⚠️ **Hay dos commits locales SIN pushear** (docs + limpieza de casts). Antes de
subirlos: `git fetch && git rebase origin/main`. No fijar aquí el hash del
último commit — se pudre en cuanto Lovable o tú commitean, y eso ya costó una
sesión. Para saber el estado real: `git log --oneline -5` y
`git rev-list --left-right --count HEAD...origin/main`.

**Ojo con el repo:** Lovable es co-editor. Siempre `git fetch && git rebase
origin/main` antes de hacer push, o se pierde trabajo suyo. Y si aparecen errores
de TypeScript raros después de un `git checkout --`, casi siempre es
`routeTree.gen.ts` viejo: se arregla con `npm run build`.
