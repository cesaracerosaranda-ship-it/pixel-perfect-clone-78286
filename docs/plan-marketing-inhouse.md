# VIALUX — Plan de marketing in-house

Fecha: 2/ago/2026 · Fuentes: export de Meta Ads (campañas y anuncios,
ago 2025 – ago 2026) + Business Manager + VIALUX Control.

---

## 1 · Resumen ejecutivo

| Dato | Valor |
|---|---|
| Pauta pagada a Meta (12 meses) | $32,826 MXN (~$2,735/mes) |
| Honorarios S4 (12 meses) | $60,000 MXN — **65% del gasto total** |
| Conversaciones iniciadas | 1,252 ($26.22 c/u por pauta; **$74.14 real** con honorario) |
| Concepto ganador | **"Boyas 3 precios"** — 2 anuncios = 84% de las conversaciones |
| Mejor segmentación | Abierta 25-55 ($22.21/conv) > intereses ($27-31) |
| Peor canal | Campaña IG dedicada: $45.81/conv (2x del ganador) |
| Estado del creativo | Original AGOTADO ($51/conv en jul); versión 2 sana ($19.91) |

**Decisión tomada:** migrar in-house. El fee de $5,000 fue justo para la etapa de
arranque (probar mercado sin contratar); esa etapa ya se cumplió. La separación es
en buenos términos y sin urgencia por activos: cuenta publicitaria, píxel y página
son propiedad de César (verificado 2/ago en Business Manager).

**Contexto estratégico:** el cuello de botella del negocio es PRODUCCIÓN, no
demanda (2 meses sin pauta → inventario agotado solo con recompra). El marketing
in-house no es para "vender más hoy": es para (a) sostener el flujo de demanda al
costo real más bajo, (b) generar la evidencia dura del caso de crecimiento ante
Aceros Aranda.

---

## 2 · Hallazgos de la auditoría

### Campañas (12 meses)

- 14 campañas creadas con ~$2,700/mes repartidos → **ninguna salió jamás de la
  fase de aprendizaje de Meta** (se requieren ~50 conv/semana por conjunto; el
  total de la cuenta es ~100/mes). Fragmentar fue el error estructural.
- Eficiencia MEJORÓ con el tiempo: $28.48/conv (ago-dic 25) → $24.10 (ene-ago 26).
  La intermitencia percibida fue de ENTREGA (abr $732, may $0), no de calidad.
- Buen Fin fracasó ($87/conv): evento de retail ≠ B2B industrial. No repetir.

### Anuncios

| Anuncio | Gasto | Conv | $/conv | Lectura |
|---|---|---|---|---|
| AD Boyas 3 precios (sep 25) | $18,802 | 697 | $26.98 | Fue el motor; HOY agotado ($51 en jul) |
| AD Boyas 3 precios 2 (dic 25) | $7,775 | 350 | $22.21 | El caballo actual, sano |
| AD Boyas 1 (intereses) | $4,246 | 139 | $30.54 | Intereses caros, descartar |
| Resto (6 anuncios) | $1,993 | 66 | — | Ruido |

- El concepto "3 precios" (transparencia de precio) produce el 84% del resultado.
- Ciclo de vida observado del creativo: **~6-9 meses útiles**; el costo se degrada
  ~2x al agotarse. Regla operativa: misma idea, imagen nueva cada ~3 meses.
- Rankings de Meta: calidad/engagement above average — el creativo era bueno;
  faltó rotación, no talento.

---

## 3 · Transición con S4 (checklist)

Mensaje central: "la etapa se cumplió, lo hacemos interno; gracias". Nada que
reclamar — los números recientes fueron los mejores.

- [ ] Avisar la salida con un mes de cortesía (último mes de honorario = mes de
      transición acompañada).
- [ ] Documentar los 2 anuncios ganadores ANTES del corte: imagen final, texto
      primario, título, descripción, CTA. (Se ven en Ads Manager → preview del
      anuncio, o en la Ad Library pública de la página.)
- [ ] **Verificar el método de pago** de Vialux ADS (Billing): si la tarjeta
      cargada es de S4, cambiarla a una propia antes del corte.
- [ ] Convertir los accesos individuales de S4 (Carlos, Diego, Pato — hoy con
      full access) en relación de Partner, o retirarlos al corte. Identificar a
      "Alan Hernández" (acceso parcial).
- [ ] Confirmar que no existan reglas automatizadas ni facturación pendiente.

---

## 4 · Operación in-house v1

Estructura mínima que corrige el error de fragmentación:

- **UNA campaña** (Ventas-Mensajes → WhatsApp) · **UN conjunto** de anuncios.
- Segmentación: **abierta 25-55 + ubicaciones** (la que ya ganó). Sin intereses.
- Ubicaciones automáticas (no campaña IG dedicada).
- Presupuesto: arrancar en **$150-250/día** ($4.5-7.5k/mes) — el desembolso
  actual total, pero 100% a pauta. Escalar solo con inventario disponible;
  **pausar pauta cuando el inventario baje del punto de reorden** (la demanda
  recurrente ya cubre la base).
- **3-4 anuncios del concepto "3 precios"** con visual renovado (identidad de la
  ficha técnica: amarillo tráfico, riel numerado, JetBrains Mono). El texto casi
  no cambia: precios visibles, CTA a WhatsApp.
- Cadencia semanal (15 min): gasto, conversaciones, $/conv. Regla: anuncio con
  $/conv > $40 sostenido 2 semanas → se reemplaza la imagen.
- Refresh creativo cada ~3 meses aunque "siga funcionando".
- Contenido orgánico del feed: 2-3 publicaciones/semana (obra instalada, proceso
  de pintura, ficha técnica, testimonios) — alimenta la página y da contexto a
  quien llega del anuncio.

KPI que importa (cuando WhatsApp esté integrado): no $/conversación sino
**$/cotización y $/venta cerrada** — Meta reporta 1,252 conversaciones vs ~121
chats reales: la métrica de Meta infla; la verdad vive en VIALUX Control.

---

## 5 · Historial de WhatsApp → VIALUX Control

Objetivo de César: todo el historial en digital, mapeado y automatizado, como
sustento del incremento de producción.

- **Fase A — Backfill (herramienta ya construida):** el VIALUX WhatsApp Analyzer
  (Green API + análisis por chat con Claude + Excel de pipeline) se vuelve a
  correr sobre el número real → historial COMPLETO del teléfono, no solo 6 meses.
  Nota: Green API se usa una sola vez como archivo histórico, no como
  infraestructura permanente (empareja como WhatsApp Web; zona gris de ToS).
- **Fase B — Importar:** cargar ese JSON a `wa_conversaciones`/`wa_mensajes`
  (marcado `origen: historico`), ligado a `clientes` por teléfono con
  `normalizarTelefono` (ya probado 10/10).
- **Fase C — Coexistencia:** conectar el número real a la Cloud API (runbook §4):
  sincroniza 6 meses y de ahí en adelante todo entra en automático a la bandeja.
- **Fase D — Análisis y proyecciones:** sobre la base unificada, Claude analiza
  por conversación (estado de pipeline, objeciones, tiempos de respuesta, motivo
  de pérdida) y el dashboard cruza: conversación → cotización → venta →
  inventario. De ahí salen las proyecciones.

---

## 6 · Caso Aceros Aranda (el pitch de producción)

Argumento con los datos ya disponibles:

1. **1,252 conversaciones de compra en 12 meses** con solo ~$2,700/mes de pauta.
2. **2 meses con pauta en CERO → inventario agotado igual** (recompra orgánica).
3. La demanda foránea (donde más piden) ya tiene logística resuelta.
4. ∴ **La restricción es producción: cada boya no fabricada es venta que ya
   tocó la puerta.**

Cuando las fases A-D estén listas, el pitch se vuelve dashboard vivo: demanda
mensual real (conversaciones + cotizaciones), tasa de cierre, venta perdida por
falta de inventario, y proyección a N meses bajo escenarios de producción.

---

## 7 · Calendario de arranque

**Semana 1**
- Conversación con S4 (aviso + mes de transición) · verificar tarjeta de Billing
- Documentar los 2 creativos ganadores (capturas + textos)
- Lunes: cargar inventario real al recibir clavos y boyas (runbook §2)

**Semana 2**
- Producir 3-4 visuales nuevos del concepto "3 precios" (identidad VIALUX)
- Montar la campaña única consolidada; correr en paralelo con la actual

**Semana 3**
- Corte S4: apagar campañas viejas cuando la nueva salga de aprendizaje
- Retirar/convertir accesos en Business Manager
- Fase A del historial (correr el Analyzer)

**Semana 4**
- Fases B (importar historial) y C (coexistencia, sesión dedicada con el runbook)
- Primer reporte mensual in-house: gasto, $/conv, cotizaciones, cierres

Pendientes de estructura (sin fecha, antes de la Business Verification):
renombrar el portafolio "Celosias" a la razón social de la CSF · sacar Lattice
Works a su propio portafolio · quitar y despublicar CRG Safety.
