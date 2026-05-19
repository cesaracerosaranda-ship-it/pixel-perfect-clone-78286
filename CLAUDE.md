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

Layout exacto (NO modificar sin autorización):
1. Header: fondo #343331, logo VIALUX esquina superior izquierda, barra amarilla 4px
2. Datos del cliente + "ATENDIDO POR: AUGUSTO ROBLES"
3. Badge "SEÑALIZACIÓN VIAL" + folio
4. Tabla de partidas (producto + flete como partidas separadas)
5. Subtotales + IVA + Total
6. Boxes: Tiempo de entrega + Forma de pago
7. Especificaciones del producto (grid 2 columnas)
8. Términos y condiciones
9. Footer: fondo #343331, texto blanco centrado
- TODO el texto del PDF en MAYÚSCULAS
- Nombre archivo: {FOLIO}_{CLIENTE}_{CANTIDAD}PZS.pdf

## Identidad visual — VIALUX (Dirección B: Infraestructura Moderna)

### Colores
- Amarillo tráfico: #EDBA1A (acentos, CTAs, badges)
- Amarillo oscuro: #C99B0E (texto sobre blanco)
- Grafito: #2D3036 (fondo de la app)
- Grafito claro: #3D4148 (cards, surfaces)
- Azul acero: #4A6274 (texto secundario)
- Steel light: #6B8899 (labels)
- Muted: #7A8090 (texto terciario)
- Logo background: #343331 (header/footer)
- Tab activo: bg-[#EDBA1A] text-[#1C1E22]

### Tipografía
- Manrope (Google Fonts) — texto general
- JetBrains Mono — números, precios, folios, datos técnicos

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
