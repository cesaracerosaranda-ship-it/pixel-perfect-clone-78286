
# VIALUX Control — Plan de implementación

App web para VIALUX (señalización vial, Monterrey) con dos módulos: **Cotizador** e **Historial de Ventas**, usando Lovable Cloud como backend.

## 1. Backend (Lovable Cloud)

Habilitar Lovable Cloud y crear migración con:

- `cotizaciones` — tabla principal (folio único, datos cliente, producto, cálculos, flete, estado, revisión, folio_padre, notas).
- `folio_counter` — fila única (id=1, last_number=11) para folios secuenciales.
- `inventario` — fila única (id=1, boyas_disponibles=750).
- RPC `next_folio(year int)` que incrementa `last_number` atómicamente y devuelve `VX-{year}-{0000}`.
- RLS: políticas públicas (sin auth, como pide el spec).
- Realtime habilitado en `cotizaciones` e `inventario`.

## 2. Diseño y tokens

Editar `src/styles.css` con la paleta VIALUX en oklch + tokens semánticos:
- `--background` grafito `#2D3036`, `--card` `#3D4148`, `--primary` amarillo `#EDBA1A`, `--primary-foreground` grafito, acentos `#C99B0E`, steel `#4A6274/#6B8899`, header/footer `#343331`, borde `#4A4A4A`.
- Fuentes: **Manrope** (UI) y **JetBrains Mono** (números/folios) cargadas vía Google Fonts en `__root.tsx` head links + `font-family` aplicado en `body` / utility `.font-mono`.
- Tema oscuro por defecto (clase `dark` en `<html>`).

## 3. Estructura de rutas (TanStack Start)

```
src/routes/
  __root.tsx        → shell + AppShell con header (logo + tabs) y footer
  index.tsx         → Cotizador
  historial.tsx     → Registro de ventas
```

AppShell vive en `src/components/AppShell.tsx` y se monta dentro de `RootComponent`; las tabs usan `<Link>` con `activeProps` (amarillo activo, gris inactivo).

## 4. Módulo Cotizador (`/`)

Componentes en `src/components/cotizador/`:
- `QuoteForm.tsx` — formulario completo (cliente, CP, producto radio, cantidad, factura toggle, precio especial, notas, revisión, flete con subcampos).
- `PriceSummary.tsx` — subtotales, IVA, total, margen con semáforo (verde ≥27%, amarillo 20–26%, rojo <20%).
- `DeliveryNotice.tsx` — mensaje según CP (NL 64–67 con bandas por cantidad, resto = consolidado).
- `QuoteActions.tsx` — botones: Descargar PDF, WhatsApp, Correo, Guardar, Nueva.

Hooks en `src/hooks/`:
- `useQuoteState.ts` — estado del formulario y cálculos (precio según producto+factura, subtotales, IVA solo si factura, total, margen vs costo base $32).
- `useFolio.ts` — llama RPC `next_folio` al guardar; añade `-R{n}` para revisiones.
- `useSaveQuote.ts` — inserta en `cotizaciones`.

Tabla de precios hardcoded:
```
boya:                 { conFactura: 44, sinFactura: 47 }
boya_clavos:          { conFactura: 48, sinFactura: 51 }
boya_clavos_refl:     { conFactura: 53, sinFactura: 56 }
```

## 5. Generación de PDF

- Dependencias: `bun add html2pdf.js` (corre en el cliente, sin SSR).
- `src/lib/pdf/QuotePdfTemplate.tsx` — JSX exacto del layout (header grafito + barra amarilla, datos cliente, tabla partidas con fila opcional de flete, subtotales, dos boxes Tiempo/Forma de pago, grid 8 specs, términos, footer).
- `src/lib/pdf/generateQuotePdf.ts` — renderiza el template a un nodo oculto y llama `html2pdf` con nombre `{FOLIO}_{CLIENTE}_{N}PZS.pdf` (todo en MAYÚSCULAS, espacios→`_`).
- Import dinámico para evitar romper SSR.

## 6. Módulo Historial (`/historial`)

`src/components/historial/`:
- `InventoryBadge.tsx` — banner superior con `boyas_disponibles` (suscripción realtime).
- `QuotesTable.tsx` — tabla con folio, fecha, cliente, empresa, cantidad, total, pill de estado, notas.
- `StatusPill.tsx` — colores: cotizado=amarillo, cerrado=verde, enviado=azul, perdido=rojo; click abre dropdown para cambiar.
- `QuoteFilters.tsx` — buscador (cliente/folio) + filtro por estado.
- `QuoteDetailDialog.tsx` — ver detalle.
- Acciones: duplicar (prefilla cotizador vía query param o store), eliminar (AlertDialog).

Hook `useQuotes.ts` con React Query + canal realtime.

## 7. WhatsApp / Correo

- WhatsApp: `https://wa.me/{tel}?text=...` con mensaje corto (folio, total, vigencia 7 días).
- Correo: `mailto:` con asunto `Cotización {FOLIO} — VIALUX` y cuerpo resumen.

## 8. Constantes y reglas

`src/lib/vialux/constants.ts`:
- `EJECUTIVO = "AUGUSTO ROBLES"`, `COSTO_BASE = 32`, `VIGENCIA_DIAS = 7`.
- Descripciones de producto, specs técnicas, mensajes de entrega, prefijos CP NL.

## Detalles técnicos

- Stack: TanStack Start + React 19 + Tailwind v4 + shadcn/ui + Lovable Cloud (Supabase).
- Validación: Zod en el form.
- Estado server: `@tanstack/react-query` (ya disponible).
- Realtime: cliente browser de Supabase (`@/integrations/supabase/client`).
- Migración SQL: archivo nuevo bajo `supabase/migrations/` con tablas, RLS, función `next_folio`, seeds (folio=11, inventario=750), y `ALTER PUBLICATION supabase_realtime`.
- Logo: necesito que subas el SVG/PNG del logo VIALUX (o confirmes que genere un placeholder).

## Pregunta antes de implementar

¿Subes el **logo de VIALUX** (PNG/SVG) para usarlo en header y PDF, o prefieres que genere un placeholder amarillo/grafito temporal?
