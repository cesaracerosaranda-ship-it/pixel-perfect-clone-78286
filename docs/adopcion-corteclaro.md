# Qué adoptar de CorteClaro (ERP Lattice) en VIALUX Control

Fecha: 2/ago/2026 · Fuente analizada: `~/Downloads/corteclaro-main-3` (27/jul,
la copia más reciente; ERP con fases F0-F5 vivas: contrato de datos, sync,
Clientes, Pipeline, Producción, Finanzas).

**Criterio:** VIALUX Control nació del patrón de lattice-control, así que lo que
CorteClaro maduró es injertable con poca fricción. Se adopta lo que sirve a la
operación de VIALUX (venta B2B por WhatsApp, inventario físico, envíos), no lo
que es propio del giro láser.

---

## Adoptar (en este orden)

### 1 · Motivo de pérdida — 30 min, el primer golpe

CorteClaro no deja marcar PERDIDA sin capturar el motivo. VIALUX hoy marca
"perdido" y la información se evapora.

- Migración: columna `motivo_perdida text` en `cotizaciones`.
- UI: al cambiar estado a PERDIDO en Historial → modal con motivos rápidos
  (precio, tiempos de entrega, sin inventario, eligió competencia, no responde,
  otro) + texto libre.
- **Por qué primero:** alimenta directo el análisis de objeciones con Claude
  (fase D de WhatsApp) y el win-rate por fuente cuando llegue la atribución
  `referral`. Es la pieza de datos más barata con mayor retorno analítico.

### 2 · Pipeline kanban de ventas — media jornada

CorteClaro F3: kanban borrador→enviada→aceptada|perdida con drag & drop nativo,
**$ totales por columna** y **win-rate** arriba (158 líneas de JS; el patrón es
chico). VIALUX tiene los mismos estados (cotizado→enviado→cerrado|perdido) pero
solo como tabla.

- Nueva pestaña "Pipeline" (o vista alterna de Historial): columnas por estado,
  tarjetas con folio/cliente/monto/días en columna, arrastrar = cambiar estado
  (pasa por el mismo flujo que hoy, incluido el descuento de inventario y el
  motivo de pérdida del punto 1).
- **Por qué:** convierte el historial en herramienta de manejo diario — se VE el
  dinero en juego y qué se está enfriando.

### 3 · Cobranza — 1 día; el hueco más caro hoy

CorteClaro F5: `ventas.estado_pago` (`pendiente_anticipo → anticipo_pagado →
liquidada`) + tabla `pagos` + antigüedad de cuentas por cobrar. En VIALUX,
"cerrado" no dice **si ya te pagaron** — en B2B con anticipos eso es un agujero
de dinero real.

- Migración: tabla `pagos` (cotizacion_id, monto, fecha, método, nota) +
  `estado_pago` en cotizaciones cerradas.
- UI: en la tarjeta/fila de venta cerrada: anticipo %, pagado, saldo; vista
  "Por cobrar" con aging (0-7, 8-30, +30 días).
- Habilita después el Smart Cashflow (fecha crítica, escenarios) que CorteClaro
  ya resolvió — pero ese va en fase 2, cuando haya datos de pagos.

### 4 · Rastreo público por token — 1-2 días; el diferenciador

CorteClaro F4 v2 + `rastreo.html`: página pública SIN login donde el cliente ve
el avance de su orden — token aleatorio → RPC `get_rastreo_ot` SECURITY DEFINER
(valida formato del token, expone solo etapas y fechas, **cero precios**).

Versión VIALUX = el "Portal de cliente (tracking de pedidos)" que ya está en el
roadmap desde el inicio:

- Al cerrar venta (patrón "derrame" §5 del schema de CorteClaro, mismo estilo
  del trigger de inventario que ya usamos): se crea `pedidos` con etapas
  `preparación → pintura → embarcado → entregado`, `fecha_compromiso`, carrier y
  nº de guía (la guía YA se sube al expediente de documentos — se liga, no se
  duplica).
- Link `vialuxmty.com/rastreo?t=TOKEN` en el WhatsApp de confirmación.
- **Por qué:** nadie en el mercado de boyas da tracking. Para municipios y
  constructoras (compras foráneas, las más grandes) es percepción de proveedor
  serio — y reduce los "¿ya salió mi pedido?" en el chat.

### 5 · Normalización de captura — 1 h, pulido

CorteClaro normaliza texto en blur (`normTitulo`/`normDesc`: Title Case con
respeto de siglas, acentos del oficio) para que dos personas capturen igual.
Portarlo a cliente/empresa del cotizador mejora el directorio y el matching por
teléfono que ya usa WhatsApp.

---

## Para después (no ahora)

- **Smart Cashflow completo** (gastos fijos/variables, metas, escenarios, venta
  diaria necesaria): esperar a que Cobranza (#3) genere datos ~1 mes.
- **Feedback del equipo** (botón 💬 → tabla `feedback`): útil cuando haya más
  usuarios que César en la app.
- **Real vs estimado** ("precisión del costeo"): el análogo VIALUX es **flete
  real vs flete cotizado**. Anotado como métrica futura del dashboard.
- **KPIs/dashboard**: ya está en el roadmap propio; se nutre de #1-#3.

## NO copiar (y por qué)

- **Motor de costeo / DXF / nesting / foto→contorno**: dominio 100% láser.
- **Sync 2 máquinas / fusión / lápidas**: resuelve localStorage↔nube; VIALUX es
  Supabase-nativo desde el día uno — ese problema no existe aquí.
- **Aceptación parcial de partidas**: las cotizaciones VIALUX son mono-producto
  en la práctica (boya + flete).
- **Agente de chat local (window.claude)**: VIALUX ya tiene ruta superior — MCP
  + módulo WhatsApp + análisis Claude planificado sobre datos reales.
- **F2 Clientes**: VIALUX ya lo tiene igual o mejor (directorio + expediente
  documental + cotizaciones por cliente + ligado a WhatsApp).

## Encaje con los compromisos actuales

Nada de esto compite con la campaña del lunes ni con WhatsApp post-corte. Ritmo
propuesto: **#1 esta semana** (es una migración chica — puede ir en el mismo
mensaje a Lovable que la de clavos si aún no se aplica), **#2-#3 en la semana
del 11** (mientras la campaña consolidada corre sola), **#4 después del corte
S4**, cuando el rastreo pueda anunciarse con calma.
