# Meta Ads explicado — para operarlo tú mismo

Escrito el 5/ago/2026, el día que montamos la campaña consolidada.

Este documento no es un resumen de lo que pasó: es para que en dos semanas
puedas abrir Ads Manager, mirar la tabla y saber qué está diciendo, sin
preguntarle a nadie. Está en orden de "primero entiende la máquina, luego
entiende qué le pasó a la tuya".

---

## 1 · Cómo funciona Meta por dentro

### No compras anuncios, ganas subastas

Cada vez que alguien abre Facebook, Meta hace una subasta instantánea para
decidir qué anuncio le muestra. Tú no compras "1,000 vistas": pones un
presupuesto diario y Meta compite por ti, miles de veces al día.

Quién gana la subasta no es solo quien paga más. Meta calcula:

> **valor = lo que estás dispuesto a pagar × qué tan probable es que esa persona haga lo que quieres × qué tan buena es la experiencia del anuncio**

Por eso un anuncio con 215 reacciones le cuesta **menos** que uno idéntico en
ceros: la gente interactúa más, Meta lo considera mejor experiencia, y te lo
cobra más barato. Es literalmente un descuento por prueba social. Ésa es la
razón de la hora que invertimos hoy en rescatar el post ID en vez de publicar
un anuncio nuevo.

### La fase de aprendizaje — el concepto que explica todo tu histórico

Cuando creas o editas algo, Meta no sabe a quién mostrarlo. Entra en
**fase de aprendizaje**: gasta explorando distintos tipos de persona para
descubrir quién te responde. Durante esa fase el costo por resultado es más
alto — estás pagando la escuela.

Para graduarse, Meta necesita aproximadamente **50 conversiones por semana en
un mismo conjunto de anuncios**. No 50 en la cuenta: 50 en *ese* conjunto.

Guarda ese número. Es la llave de todo lo que sigue.

### La estructura de tres pisos

```
CAMPAÑA          ← el objetivo (aquí: "Ventas → mensajes de WhatsApp")
  └─ CONJUNTO    ← a quién, dónde y con cuánto dinero  ← el piso que importa
       └─ ANUNCIO ← la imagen y el texto
```

**El piso del medio es donde se juega todo.** El presupuesto vive ahí, la
segmentación vive ahí, y sobre todo: **la fase de aprendizaje se cuenta ahí.**

De ahí sale la regla más importante de tu operación:

> Repartir el presupuesto entre muchos conjuntos no reparte el aprendizaje.
> Lo **destruye**. Cinco conjuntos con 10 conversiones cada uno no suman 50:
> son cinco conjuntos que nunca aprenden.

---

## 2 · Qué estaba pasando con tus campañas

Ahora que sabes lo anterior, el diagnóstico se lee solo.

### El dato que lo resume todo

En 12 meses se crearon **14 campañas** repartiendo unos **$2,735 MXN al mes**.
La cuenta entera generaba alrededor de **100 conversaciones al mes** — o sea
unas 25 por semana, repartidas entre todos esos conjuntos.

El umbral para graduarse es 50 por semana **por conjunto**.

**Ninguna campaña salió jamás de la fase de aprendizaje.** En doce meses.
Estuviste pagando precio de escuela todo el tiempo, sin llegar nunca al precio
de graduado.

Y ojo con esto, porque es lo que hay que entender bien: **no fue falta de
talento.** Meta califica la calidad y el engagement de tus anuncios como *above
average*. El creativo era bueno. El error fue **estructural** — repartir en vez
de concentrar. Es un error muy común y bastante contraintuitivo: se siente
prudente diversificar, y en subastas es exactamente lo contrario.

### Lo que sí venía mejorando

| Periodo | Costo por conversación |
|---|---|
| ago–dic 2025 | $28.48 |
| ene–ago 2026 | $24.10 |

Iba en la dirección correcta. Y la sensación de que "a veces no pasaba nada" no
era falta de calidad: era **entrega**. En abril se gastaron $732 y en mayo
$0 — la campaña simplemente no corrió.

### El hallazgo más valioso de los 12 meses

De todos los anuncios, **dos** generaron el **84%** de las conversaciones. Los
dos son del mismo concepto: **"3 precios"** — la imagen que muestra $44 / $48 /
$53 a la vista.

| Anuncio | Gasto | Conv. | $/conv | Estado |
|---|---|---|---|---|
| AD Boyas 3 precios (sep 25) | $18,802 | 697 | $26.98 | **Agotado** — llegó a $51 en julio |
| AD Boyas 3 precios 2 (dic 25) | $7,775 | 350 | $22.21 | **Vivo** — es tu caballo actual |
| AD Boyas 1 (intereses) | $4,246 | 139 | $30.54 | Descartado |
| Los otros 6 | $1,993 | 66 | — | Ruido |

**Por qué funciona el concepto "3 precios":** el prospecto llega al chat
sabiendo ya qué cuesta qué. La conversación arranca en *"lo quiero"* y no en
*"¿cuánto es?"*. Le quitas al chat el trabajo de filtrar curiosos.

Es tu activo comercial más valioso y no es la imagen — **es la idea**. La imagen
se gasta; la idea no.

### Tres cosas más que te van a servir

**El creativo se agota.** Míralo en la tabla: el anuncio de septiembre venía en
$26.98 de promedio y para julio ya iba en **$51**. La gente que te ve seguido
deja de reaccionar. Vida útil observada: **6 a 9 meses**, y al agotarse el costo
se duplica. Regla: misma idea, **imagen nueva cada ~3 meses**, aunque parezca
que sigue funcionando.

**Segmentar por intereses te salió caro.** Público abierto 25-55 dio $22.21 por
conversación; segmentar por intereses, entre $27 y $31. Suena al revés, pero con
presupuestos chicos el algoritmo de Meta encuentra mejor a tu comprador que tú
poniéndole filtros — y cada filtro le achica el espacio donde buscar.

**Instagram dedicado no te sirve.** La campaña solo de IG costó $45.81 por
conversación, el doble del ganador. Y **Buen Fin fue un desastre a $87**: es un
evento de retail, y tú vendes B2B industrial a alguien que compra boyas por
proyecto, no por descuento de temporada.

---

## 3 · Qué hicimos hoy y por qué

### Duplicar en vez de crear desde cero

La campaña nueva es una **copia exacta** de la ganadora (`Ubis || 1.12.25`).
Mismo objetivo, mismo público abierto 25-55, mismas 14 ubicaciones con sus
radios, mismas ubicaciones de FB, misma estrategia de puja.

Todo eso ya está probado. Volver a armarlo a mano habría metido diferencias sin
querer, y después no sabrías si un mal resultado fue por el cambio de operador
o por un ajuste accidental.

**Lo único distinto entre la ganadora y la consolidada es quién la opera.**
Eso convierte la comparación en un experimento limpio: si la nueva iguala a la
vieja, es porque el in-house funciona, no porque cambiaste otra cosa.

### Por qué $200 al día

La ganadora corría a **~$45/día** y daba $20.35 por conversación. Con eso
generaba unas **11 conversaciones por semana** — muy lejos de las 50 que pide la
graduación.

A $200/día, si el costo se mantiene, son alrededor de **70 por semana**. Por
primera vez en doce meses, **arriba del umbral de aprendizaje**.

No es "gastar más". Es gastar **lo mismo que ya gastabas en total**, pero
concentrado en un solo conjunto en vez de repartido en cinco. Ésa es toda la
tesis de la consolidación.

### Por qué peleamos tanto por la publicación existente

Ya lo viste arriba: la prueba social es un descuento real en la subasta. Ese
post trae **215 reacciones, 14 comentarios y 13 compartidos** acumulados desde
diciembre. Un anuncio duplicado normalmente crea una publicación nueva en ceros
y **regalas esa credibilidad**.

Por eso valió la hora de perseguir el ID.

### Por qué rechazamos todo lo que Meta ofrecía

Te ofreció, con insistencia, cinco cosas: Advantage+ audience, Advantage+
placements, subir el presupuesto solo, imágenes generadas con IA y "llegar a más
gente interesada en tus ciudades".

Puede que algunas hasta funcionen. **Pero no hoy.** Cada una cambia una variable
del experimento, y este mes el experimento es *"¿el in-house iguala a S4?"*. Si
aceptas tres cosas a la vez y el resultado cambia, no sabes cuál fue.

Después del 15, con la comparación cerrada, se prueban **de una en una**. Así es
como se aprende de verdad qué mueve la aguja.

---

## 4 · Las métricas: cuáles leer y cuáles ignorar

### La única que decide

**Costo por conversación de mensaje iniciada.** Es lo que te cuesta que alguien
te escriba por WhatsApp. Tu baseline: **$20.35**.

### Las que explican el porqué cuando algo se mueve

| Métrica | Qué es | Cómo leerla |
|---|---|---|
| **Impresiones** | Veces que se mostró | Si es 0, no está entregando: hay un problema, no es aprendizaje |
| **Alcance** | Personas distintas | Impresiones ÷ alcance = frecuencia |
| **Frecuencia** | Veces que la misma persona lo vio | **Arriba de 3, el creativo se está quemando** |
| **CTR** | % que hizo clic | Cae con el tiempo → señal temprana de agotamiento |
| **Clics en el enlace** | Cuántos abrieron el chat | Entre esto y las conversaciones ves cuánta gente se arrepintió |

**Frecuencia es tu alarma temprana.** Tu ganadora va en 1.66 — sana. Cuando se
acerque a 3, no esperes a que el costo suba: cambia la imagen.

### Las que se ven bonitas y no significan nada

- **Campaign score / Opportunity score.** Es qué tanto le hiciste caso a Meta,
  no qué tan bien te va. Hoy tu consolidada tiene 55 sobre 100 y es exactamente
  la configuración que ya ganó. Ignóralo.
- **Reacciones y comentarios como objetivo.** Sirven como descuento en la
  subasta, pero nadie compró una boya por darle *like*.
- **Las "recommendations".** Meta te vende Meta.

### Y la trampa más importante de todas

Meta reportó **1,252 conversaciones** en 12 meses. En tus listas reales de
WhatsApp Business hay alrededor de **121 chats**.

Meta cuenta una "conversación iniciada" cuando alguien toca el botón y se abre
la ventana de chat — **aunque nunca escriba nada**. Es un número real, pero no
significa lo que parece.

De ahí sale el KPI que de verdad importa, y que ninguna herramienta de Meta te
va a poder dar: **cuánto te cuesta una cotización y cuánto te cuesta una venta
cerrada**. Eso solo puede salir de VIALUX Control, cruzando el gasto de Meta
contra las cotizaciones y los cierres reales.

Tu línea base ahí ya la tienes medida: **307 conversaciones fugadas contra 60
ventas ≈ 5% de conversación a venta.** Ése es el número contra el que se mide
cualquier mejora de seguimiento.

---

## 5 · Qué esperar, día por día

### Del 6 al 8 de agosto — el susto

**Te va a marcar $35-40 por conversación.** Casi el doble de tu baseline.

Es normal. Cuadruplicaste el presupuesto y la campaña es nueva: está en fase de
aprendizaje, pagando la escuela.

**No la toques.** Cada edición reinicia el aprendizaje desde cero y pierdes los
días que llevabas. Es la única forma real de arruinar esto.

### Del 9 al 11 de agosto — el cutover

Apaga `Ubis || 1.12.25`. A partir de ahí toda la señal se concentra en una sola
campaña, que es el punto.

### Del 11 al 13 de agosto — la lectura

Ya con la campaña graduada, el costo debe estabilizarse. Criterio:

| Resultado | Qué significa |
|---|---|
| **≤ $20/conv** | Mejor que S4. Decisión obvia. |
| **$20-25/conv** | Igualaste con la misma inversión, y ahora el control es tuyo. Adelante. |
| **$25-35/conv** | Zona gris. Todavía no salía de aprendizaje o falta ajustar. Se puede pedir un mes más de transición. |
| **> $35/conv** | Algo se configuró distinto. Revisar antes de decidir. |

### El 13 y 14 de agosto — decidir y avisar

Un día de colchón antes del 15, que es cuando se paga la mensualidad de S4. Si
decides el 16, pagaste otro mes.

### Del 15 de agosto al 11 de septiembre — tu primer mes solo

Aquí empieza lo tuyo de verdad:

- **Rutina de 15 minutos, un día fijo a la semana.** Abre Ads Manager, mira tres
  columnas: gasto, conversaciones, costo por conversación. Anótalas. Cuatro
  semanas de eso y vas a ver patrones que hoy no ves.
- **Regla dura:** anuncio arriba de $40 por conversación sostenido dos semanas →
  se cambia la imagen. Sin discutirlo contigo mismo.
- **Prepara el refresh creativo.** Tu anuncio vivo es de diciembre: para
  noviembre entra en zona de agotamiento. Misma idea de "3 precios", imagen
  nueva. No lo dejes para cuando el costo ya se haya duplicado.
- **Apaga la pauta si el inventario baja del punto de reorden.** No tiene sentido
  pagar por conversaciones que no puedes surtir. Ésta es justo la ventaja de
  tenerlo interno: lo decides el mismo día.
- **Al mes, el primer reporte propio:** gasto, conversaciones, cotizaciones
  generadas, ventas cerradas. Las dos últimas salen de VIALUX Control, no de
  Meta. Ése es tu primer reporte de negocio real, no de plataforma.

---

## 6 · Glosario

**Alcance** — personas distintas que vieron el anuncio.

**Conjunto de anuncios (ad set)** — el piso del medio: define a quién, dónde y
con cuánto presupuesto. Donde se cuenta la fase de aprendizaje.

**Conversación iniciada** — alguien abrió el chat desde el anuncio. **No
significa que haya escrito.**

**CPM** — costo por cada mil impresiones.

**CTR** — porcentaje de quienes vieron el anuncio y le dieron clic.

**Fase de aprendizaje** — periodo inicial en que Meta explora a quién mostrarte.
Costo más alto. Se sale con ~50 conversiones/semana **por conjunto**.

**Frecuencia** — cuántas veces vio el anuncio la misma persona. Arriba de 3, se
está quemando.

**Impresiones** — veces que se mostró, contando repeticiones.

**Advantage+** — la automatización de Meta. Decide sola público, ubicaciones o
creativo. Útil algún día; hoy no, porque cambia variables del experimento.

**Publicación existente (post ID)** — usar un post que ya existe en vez de crear
uno nuevo, para heredar sus reacciones y comentarios. Descuento real en la
subasta.

**Prueba social** — reacciones, comentarios y compartidos acumulados. Abaratan
el anuncio, no son decoración.

---

## En una frase

En doce meses el presupuesto estuvo repartido entre catorce campañas, así que
ninguna alcanzó nunca el volumen que Meta necesita para dejar de experimentar.
Hoy pusimos todo ese mismo dinero en un solo lugar, con el anuncio que ya había
demostrado que funciona y con su prueba social intacta. Eso es todo lo que
cambió — y es probablemente lo único que hacía falta.
