# ARRANQUE — Punto exacto para retomar

Última sesión: 2/ago/2026. Este documento es el único que hay que leer para
continuar. Los detalles viven en `plan-marketing-inhouse.md`,
`adopcion-corteclaro.md` y `whatsapp-runbook.md`.

---

## A · Lo que César hace SIN Claude (no requiere sesión)

**Domingo 3/ago**
- [ ] Historial → Actualizar inventario → capturar **~500 boyas** (conteo real).
      Clavos se quedan en 0 hasta que lleguen (mar-mié).

**Lunes 4/ago — montar la campaña (~1 h)**
- [ ] Seguir la guía de `plan-marketing-inhouse.md` §7 "Semana 2". Resumen:
      duplicar `Ventas-Mensajes || Boyas 3 precios || Ubis || 1.12.25` →
      renombrar `VIALUX || Consolidada || 08.26` → $200/día → borrar el anuncio
      duplicado y crear uno con **"Usar publicación existente"** (la de
      AD Boyas 3 precios 2, con sus 211 reacciones) → publicar.
- [ ] Al publicar: **apagar** las dos campañas débiles (IG 10.12.25 y
      Nuevas img AI). Dejar viva solo la ganadora 3-5 días como seguro.
- [ ] Días siguientes: 5 min/día (gasto, conversaciones, $/conv).

**Martes-miércoles 5-6/ago**
- [ ] Al recibir clavos: capturar el conteo real en el mismo modal.

**Antes del 15/ago**
- [ ] Comparar consolidada vs viejas → decisión S4 → avisar la salida.

---

## B · Pegar en Lovable (cuando haya tokens, o incluso sin sesión)

Los dos son independientes. Se pueden mandar juntos o por separado.

**1. Migración de clavos (YA está en el repo, solo falta aplicarla):**

```
Ejecuta la migración SQL que está en
supabase/migrations/20260802130000_inventario_clavos_trigger.sql tal cual, sin
modificarla. Solo reemplaza la función ajustar_inventario_cotizacion; no toques
tablas ni otras funciones. Confírmame que quedó aplicada.
```

**2. Sincronizar el repo** (por si Lovable no ha jalado los últimos commits):

```
Sincroniza con la última versión de main en GitHub. No modifiques código, solo
dime qué archivos entraron.
```

---

## C · Construido el 3/ago (falta aplicar migraciones)

- ✅ **Motivo de pérdida obligatorio** — modal con 6 motivos canónicos + detalle.
- ✅ **Tasa de cierre + panel "por qué se pierde"** en el resumen de Historial
  (motivos ordenados por DINERO perdido).
- ✅ **Módulo Pipeline** (`/pipeline`, nueva pestaña) — kanban con $ y conteo por
  columna, drag & drop, marca de vencida a los 7 días, mismos candados que
  Historial.

**Pendiente para que funcione:** pegar en Lovable →

```
Ejecuta tal cual, sin modificarlas, estas dos migraciones de
supabase/migrations/: 20260802130000_inventario_clavos_trigger.sql y
20260802190000_motivo_perdida.sql. Confírmame que quedaron aplicadas.
```

Mientras no se apliquen: el descuento de clavos no ocurre y el motivo de pérdida
no se guarda (la UI está escrita a prueba de eso — no truena, solo no persiste).

### Siguiente en construir (orden de `adopcion-corteclaro.md`)
3. Cobranza / estado de pago (1 día)
4. Rastreo público por token (1-2 días) — después del corte S4
5. Normalización de captura (1 h)

## D · Lo que sigue pendiente de decisión o insumo

- **Fotos de obra instalada** (César) — para la serie orgánica del feed. El shot
  list está en `plan-marketing-inhouse.md` Apéndice C.
- **Claude Design** — el brief está listo en
  `marketing/creativos/BRIEF-claude-design.md`; se difirió a los refreshes
  post-corte. Retomar cuando haya holgura.
- **Conector MCP de Meta Ads** (`mcp.facebook.com/ads`) — hallazgo del artículo
  practicaly.ai (2/ago). Si la cuenta lo tiene habilitado, sustituiría la
  integración con la Marketing API del plan: Claude consultaría métricas y Ad
  Library directo, sin exports manuales. Añadir como conector personalizado por
  URL y probar. **Sin verificar** (no aparece en el registro; ~40% de cuentas no
  tienen el permiso). No bloquea nada: es mejora de flujo, no requisito.
  Del mismo artículo se DESCARTA la generación de creativo con IA (contradice
  el dato propio: $35 vs $20) y la cadencia de muchas variantes (con ~90
  conversaciones/mes fragmentar impide salir del aprendizaje).
- **Estructura de portafolios en Meta** — renombrar "Celosias" a la razón social
  de la CSF, sacar Lattice Works a su propio portafolio, quitar/despublicar CRG
  Safety. Requisito previo a la Business Verification.
- **WhatsApp fase pesada** (coexistencia del número real + captura de `referral`
  + backfill del historial): **después del 15/ago**, en sesión dedicada, con
  `whatsapp-runbook.md` a la mano. El token de prueba caduca cada 24 h — dar por
  hecho que habrá que renovarlo antes de probar cualquier cosa.

---

## E · Estado del repo (2/ago)

Todo está commiteado y pusheado a `main`. Últimos trabajos:
- Trigger de clavos + fix del modal de inventario (falta aplicar la migración)
- Plan de marketing in-house completo, con benchmark competitivo y guía de
  montaje de campaña
- Creativos: `marketing/creativos/` (v1 técnico, v2 ficha, v4a/v4b con foto real
  + las fotos originales en `fotos/`)
- Mapa de adopción de CorteClaro
