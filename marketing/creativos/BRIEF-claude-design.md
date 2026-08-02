# BRIEF — Serie de anuncios VIALUX (pegar como primer mensaje en Claude Design)

Eres el equipo de diseño de VIALUX. Tu tarea es explorar **direcciones de arte**
para la serie de anuncios de Meta (1080×1080). La estructura de contenido ya
está validada con datos y NO se modifica; lo que se explora es la ejecución
visual. Al final me quedo con una dirección ganadora para llevar a producción.

## Contexto en 5 líneas

VIALUX vende boyas metálicas viales (acero al carbón C 1/8, pintura
electrostática amarillo tráfico) en Monterrey, con envíos a todo México. La
venta ocurre por WhatsApp: el anuncio es una **ficha de decisión** — el cliente
llega al chat ya sabiendo qué cuesta qué. Somos el ÚNICO anunciante de la
categoría que publica precios (toda la competencia esconde el precio tras
"cotizar"); esa transparencia es nuestro diferenciador y es sagrada.

## Datos que mandan (por qué la estructura no se toca)

- El concepto "3 precios" produjo el 84% de las conversaciones de 12 meses.
- Un anuncio con foto bonita generada con IA convirtió PEOR que la ficha de
  precios ($35 vs ~$20 por conversación): gana la estructura, no la foto.
- Por eso: **fondo SIEMPRE foto real del producto** (van adjuntas). Nada de
  producto generado ni retocado con IA; la capa gráfica va encima de la foto.

## Sistema de marca (obligatorio)

**Paleta** — solo estos colores:
- Amarillo tráfico `#EDBA1A` (acento: CTAs, precios, barras; máx ~20% de la
  superficie; NUNCA como texto sobre blanco — sobre blanco usar `#C99B0E`)
- Grafito `#2D3036` · oscuro `#1C1E22` (fondos; nunca negro puro)
- Azul acero `#4A6274` / claro `#6B8899` (subtexto, iconografía secundaria)
- Blanco `#FFFFFF` · Superficie clara `#F0EFEB` · Muted `#7A8090`

**Tipografía:**
- Manrope (headlines; contraste de pesos 300 vs 800; tracking apretado -0.02/-0.03em)
- JetBrains Mono (TODOS los números, precios, SKUs, labels técnicos, kickers)

**Lenguaje visual:** solidez industrial, alto contraste (grafito + amarillo =
señalización real), líneas horizontales gruesas amarillas (evocan carretera),
esquinas RECTAS (radius 0), datos como protagonistas (precios grandes en mono).

**Prohibido:** glassmorphism, gradientes decorativos púrpura/azul, cartoon,
estética gubernamental (escudos/serif), look "startup tech", sombras de fantasía,
urgencia artificial ("¡últimas piezas!"), superlativos ("el mejor del mercado").

## Contenido fijo de cada pieza (copiar tal cual)

- Wordmark: **VIALUX** (tipográfico, Manrope 800, amarillo sobre grafito)
- Kicker: `HECHA EN MONTERREY` (mono, tracking amplio)
- Título: `BOYA METÁLICA` (BOYA en 300 amarillo / METÁLICA en 800 blanco)
- Specs (mono): `ACERO C 1/8 · PINTURA ELECTROSTÁTICA · DOBLE REFLEJANTE`
- Los 3 precios, siempre los tres, siempre con +IVA y su SKU:
  - `$44 +IVA` — Sin clavos — `VLX-22-A`
  - `$48 +IVA` — Incluye 4 clavos — `VLX-22-B`
  - `$53 +IVA` — Clavos + 2 reflejantes — `VLX-22-C`
- Contacto: `+52 81 3073 0586 · COTIZACIONES@VIALUXMTY.COM`
- Nota legal: `PRECIOS EN MXN MÁS IVA · ENVÍOS A TODO MÉXICO`
- CTA: banda amarilla `COTIZA POR WHATSAPP` (texto grafito oscuro)

## Lo que ya existe (adjunto como referencia)

- **v4a** — foto héroe cenital full-bleed, chips de precio con sombra, scrims
  grafito, grano de película. Es el nivel actual de producción.
- **v4b** — foto diagonal, columna izquierda de precios sobre scrim lateral.
- (Además existen una versión técnica con ilustración anotada sobre grafito y
  una "ficha técnica" clara con riel numerado 00/01/02 — la misma identidad de
  nuestra cotización PDF.)

## TU TAREA

Genera **3 direcciones de arte distintas** para la MISMA pieza (foto real +
estructura fija de arriba), por ejemplo:

1. **Brutalista industrial** — tipografía enorme, bloques duros, la foto como
   material crudo
2. **Editorial técnico** — retícula visible, cotas y anotaciones tipo plano,
   aire de ficha de ingeniería
3. **Minimal de alto contraste** — menos elementos, más silencio, precio como
   único protagonista

(Si propones una cuarta dirección mejor, adelante.)

Reglas de exploración: la foto real no se altera (solo revelado/scrims), los
textos fijos no cambian, la paleta no crece. Cada dirección en 1080×1080; si
una destaca, muéstrala también en 1080×1920 (stories).

**Entregable:** las direcciones en pantalla para compararlas; de la ganadora,
el código HTML/CSS completo (se portará a un pipeline de producción que ya
renderiza estas piezas a PNG con las fotos reales).
