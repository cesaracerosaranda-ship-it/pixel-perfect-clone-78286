# VIALUX Control — Contexto para Claude Code

## ¿Qué es esto?

Aplicación web interna para VIALUX, empresa de señalización vial industrial en Monterrey, México. Vende boyas metálicas con pintura electrostática amarillo tráfico. Opera bajo el alias "Augusto Robles" como ejecutivo de ventas.

## Stack técnico

- **Frontend:** React + TypeScript + Vite + Tailwind CSS + shadcn/ui
- **Backend:** Supabase (PostgreSQL + Realtime + Storage)
- **PDF:** jsPDF o html2pdf.js para generación de cotizaciones
- **Hosting:** Lovable (deploy automático)
- **Arquitectura:** Basada en el patrón de Lattice Works (lattice-control) — AppShell con tabs, hooks para lógica, componentes para UI

## Módulos actuales

### 1. Cotizador (página principal)
- Formulario: cliente, empresa, teléfono, CP, producto, cantidad, factura, precio especial, flete
- 3 configuraciones de producto con precios diferenciados (con/sin factura)
- Folio secuencial automático: VX-{AÑO}-{NNNN} (arranca en 0012)
- Lógica de envío local MTY (CP 64-67) vs consolidado
- Flete como partida adicional en la tabla (no como línea suelta)
- IVA 16% aplica a PRODUCTO + FLETE cuando incluye factura
- Generación de PDF con diseño específico (ver sección PDF)
- Margen por pieza visible solo en la app (costo base: $32/pieza)

### 2. Historial (registro de ventas)
- Tabla de cotizaciones con status: cotizado, cerrado, enviado, perdido
- Búsqueda, filtros, cambio de status, duplicar, eliminar
- Inventario de boyas visible (actualmente 750)

## Precios vigentes (mayo 2026)

| Configuración | Con factura | Sin factura |
|---|---|---|
| Boya sola | $44.00 | $47.00 |
| Boya + clavos | $48.00 | $51.00 |
| Boya + clavos + reflejantes | $53.00 | $56.00 |

Costo base: $32/pieza. Margen objetivo: 27-37%.

## Descripciones de producto (para PDF)

- **Boya sola:** BOYAS METÁLICAS C 1/8 COLOR AMARILLO TRÁFICO
- **Boya + clavos:** BOYAS METÁLICAS C 1/8 COLOR AMARILLO TRÁFICO CON 4 CLAVOS DE ALTA RESISTENCIA
- **Boya + clavos + reflejantes:** BOYAS METÁLICAS C 1/8 COLOR AMARILLO TRÁFICO CON 4 CLAVOS DE ALTA RESISTENCIA Y 2 REFLEJANTES COLOR AMARILLO/PLATA

## Formato del PDF de cotización

Layout exacto (NO modificar sin autorización). Rediseño julio 2026: alineado a la
ficha técnica hecha en Claude Design — tamaño CARTA (816×1056px @ 0.75 escala a
612×792pt), tipografía JetBrains Mono dominante, riel lateral numerado:

1. Header: fondo #2E2B27, logo transparente 58px izquierda; derecha "DOCUMENTO
   COMERCIAL · 2026 · FOLIO ..." + "COTIZACIÓN COMERCIAL" (peso 400, letter-spacing
   4px, COMERCIAL en #F2B90D); barra amarilla #F2B90D 5px
2. Riel lateral izquierdo de 88px: secciones numeradas 00-04 (número 13px #C79100 +
   etiqueta vertical rotada 9px #9B968E): CLIENTE · PARTIDAS · CONDICIONES · TÉCNICO · TÉRMINOS
   (en el PDF la rotación usa transform rotate(-90deg) translateX(-100%) — html2canvas
   NO soporta writing-mode; en la app sí se usa writing-mode)
3. 00 CLIENTE: "COTIZACIÓN PARA:" + nombre + atendido por + badge "SEÑALIZACIÓN VIAL" + folio; fecha/vigencia derecha
4. 01 PARTIDAS: grid (producto + flete como partidas), SKU VLX-22-* en #C79100,
   subtotal/IVA, regla #F2B90D 288×3px, TOTAL 20px 800 #C79100 + "MXN · PESOS MEXICANOS"
5. 02 CONDICIONES: boxes Tiempo de entrega + Forma de pago
6. 03 TÉCNICO: grid 4×2 de especificaciones con celdas bordeadas, labels dorados
7. 04 TÉRMINOS: políticas + strip NOTA fondo #F1EFEA; la sección lleva flex:1 y
   absorbe el espacio sobrante de la hoja (así el footer queda al borde inferior)
8. Footer doble: strip #F1EFEA con email/tel + strip #2E2B27 con tagline
- Wrapper: flex column min-height:1052px (NO height fija + overflow:hidden — eso
  recorta contenido silenciosamente; NO mediciones en runtime — ya falló en producción)
- Logo: src/assets/vialux-logo-t.png (transparente); html2canvas scale:3
- Referencia visual definitiva: ~/Downloads/design_handoff_vialux/Cotización VIALUX.dc.html
- TODO el texto del PDF en MAYÚSCULAS
- Nombre archivo: {FOLIO}_{CLIENTE}_{CANTIDAD}PZS.pdf
- Verificación de altura: `npx vite-node scripts/measure-pdf.ts` + Chrome headless
  (presupuesto 1056px por hoja; el peor caso refl+factura+flete debe caber en una)

## Identidad visual — VIALUX (tema claro "documento técnico", julio 2026)

Rediseño completo desde Claude Design (handoff en ~/Downloads/design_handoff_vialux/).
El shell (header/footer) permanece grafito #343331; el lienzo de contenido es claro.
Lenguaje visual: riel lateral numerado (00/01/02...) con etiquetas verticales mono,
grids bordeados, esquinas rectas (--radius: 0; solo toggles/radios circulares).

### Tokens (app)
- Papel (fondo): #FAF9F7 · Paneles: #FFFFFF · Texto: #2E2B27
- Bordes: #E5E2DC (fuerte) / #EFEDE8 (filas de tabla) · Thead: #F5F3EF
- Labels/secundario: #8A857C · Terciario: #7C766A
- Amarillo superficie: #EDBA1A (tab activa, botón PDF, badges, avatares, pill COTIZADO)
- Dorado texto sobre blanco: #C79100 / #C99B0E — NUNCA #EDBA1A como texto sobre blanco
- Verde: #16A34A (texto) / #10B981 (pill CERRADO) · Rojo: #DC2626
- Panel TOTAL del resumen: fondo #1B1A17 con monto #EDBA1A mono 28px
- Pills cuadradas mono 8px: COTIZADO #EDBA1A/#1B1A17, CERRADO #10B981/blanco,
  ENVIADO #E5E2DC/#1B1A17, PERDIDO #DC2626/blanco
- Semáforo margen sobre blanco: ≥27% #16A34A · 20-26% #C79100 · <20% #DC2626
- Logo: src/assets/vialux-logo-t.png (transparente) — shell 40px, PDF 58px
- Componentes clave: RailSection/PageTitle en src/components/RailSection.tsx

### Tipografía
- Manrope (UI general) — JetBrains Mono (números, folios, labels, datos técnicos,
  y TODO el PDF)

## Lógica de envío por CP

```
CP 64-67 (Nuevo León) = ENVÍO LOCAL:
  >= 500 pzas → "ENTREGA INMEDIATA — ÁREA METROPOLITANA DE MONTERREY"
  250-499 → "SUJETO A DISPONIBILIDAD DE UNIDAD"
  < 250 → "RECOLECCIÓN EN NARDO #705, COL. VICTORIA, MONTERREY, NL"

Cualquier otro CP = CONSOLIDADO — 3 A 5 DÍAS HÁBILES
```

## Supabase schema

Tablas principales: `cotizaciones`, `folio_counter`, `inventario`
RLS: público (sin auth) — app interna

## Reglas de negocio críticas

1. El IVA aplica a PRODUCTO + FLETE (no solo al producto)
2. El ejecutivo siempre es "AUGUSTO ROBLES" (hardcoded)
3. Vigencia de cotización: 7 días
4. El badge "CON/SIN FACTURA" NO aparece en el PDF del cliente
5. El margen NO aparece en el PDF del cliente
6. Las notas internas NO aparecen en el PDF
7. El costo base ($32) NUNCA se muestra al cliente
8. Cuando se cierra una venta, descontar del inventario

## Comandos útiles

```bash
npm run dev          # Dev server
npm run build        # Build production
npx supabase db push # Push migrations
```

## Pendientes / roadmap

- [ ] Dashboard con KPIs (ventas, conversión, ticket promedio)
- [ ] Directorio de clientes con historial
- [ ] Portal de cliente (tracking de pedidos)
- [ ] Integración con WhatsApp Business API
- [ ] Ficha técnica generada desde la app
