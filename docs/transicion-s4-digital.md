# VIALUX · Transición de la operación publicitaria a esquema interno

**Para:** equipo de S4 Digital
**De:** César Aranda — VIALUX
**Fecha:** 5 de agosto de 2026

---

## 1 · Propósito de este documento

VIALUX va a mover la operación de campañas de Meta a un esquema interno. Este
documento explica **por qué**, con los datos en los que se basó la decisión, y
**cómo** proponemos hacer la transición de forma ordenada.

Lo compartimos completo y con números por dos razones: porque nos parece lo
correcto después de doce meses de trabajo conjunto, y porque varias de las
conclusiones salieron de campañas que ustedes construyeron y que nos van a
seguir sirviendo.

No hay ningún reclamo detrás de esta decisión. Los mejores números de los doce
meses son los más recientes.

---

## 2 · Lo que la auditoría encontró a favor del trabajo hecho

Antes de la parte estructural, tres hallazgos que conviene dejar por escrito:

**La eficiencia venía mejorando de forma consistente.**

| Periodo | Costo por conversación |
|---|---|
| ago–dic 2025 | $28.48 |
| ene–ago 2026 | $24.10 |

**Las calificaciones de Meta sobre el creativo son *above average*** en calidad
y en engagement. El material publicitario no fue el problema en ningún momento
del periodo analizado.

**El hallazgo comercial más valioso de los doce meses salió de aquí:** el
concepto **"3 precios"** — mostrar $44 / $48 / $53 directamente en el anuncio.

| Anuncio | Gasto | Conversaciones | $/conv |
|---|---|---|---|
| AD Boyas 3 precios (sep 25) | $18,802 | 697 | $26.98 |
| AD Boyas 3 precios 2 (dic 25) | $7,775 | 350 | $22.21 |
| AD Boyas 1 (intereses) | $4,246 | 139 | $30.54 |
| Otros 6 anuncios | $1,993 | 66 | — |

**Dos anuncios del mismo concepto generaron el 84% de todas las
conversaciones.** Y funciona por una razón que ya adoptamos como criterio
permanente: el prospecto llega al chat sabiendo el precio, así que la
conversación empieza en la intención de compra y no en la cotización. Ese
concepto se queda como base de todo el material futuro de VIALUX.

Otras dos lecturas que también conservamos: el público **abierto 25-55** rindió
mejor ($22.21/conv) que la segmentación por intereses ($27-31/conv), y quedó
documentado que el creativo tiene una **vida útil de 6 a 9 meses** antes de que
el costo se degrade — el anuncio de septiembre llegó a $51/conv en julio, contra
$26.98 de promedio histórico.

---

## 3 · El hallazgo estructural

El punto central del análisis no es de ejecución, sino de **escala**.

Meta requiere aproximadamente **50 conversiones por semana en un mismo conjunto
de anuncios** para que ese conjunto salga de la fase de aprendizaje y estabilice
su costo.

La cuenta de VIALUX genera alrededor de **100 conversaciones al mes** — unas 25
por semana **en total**, sumando toda la actividad.

De ahí se sigue algo que aplica sin importar quién opere la cuenta:

> Con el volumen actual de VIALUX, **cualquier estructura con más de un conjunto
> de anuncios activo deja a todos por debajo del umbral de aprendizaje.**

Durante el periodo hubo 14 campañas creadas y varias corriendo en paralelo. El
resultado no fue un problema de gestión: fue una consecuencia aritmética de
repartir un presupuesto que solo alcanza para un conjunto. La conclusión práctica
es la misma para cualquier operador: **una sola campaña, un solo conjunto, todo
el presupuesto concentrado.**

Es exactamente el cambio que acabamos de implementar y que detallamos en la
sección 5.

---

## 4 · Por qué interno, y por qué ahora

La razón de fondo no es publicitaria. Es operativa.

### El cuello de botella de VIALUX es producción, no demanda

Es el dato que reordena todo: hubo **dos meses sin pauta activa en los que el
inventario se agotó igual**, solo con recompra de clientes existentes.

Eso significa que la pauta de VIALUX no debe correr siempre a la misma
intensidad. Tiene que **subir cuando hay inventario y apagarse cuando el
inventario baja del punto de reorden**, porque pagar por conversaciones que no
se pueden surtir cuesta dinero y además quema al prospecto.

Esa decisión depende de un dato que cambia el mismo día — el conteo de boyas y
clavos en piso, y lo que el proveedor entregó esa mañana. Es una decisión que
tiene que tomarse **dentro de la operación**, no coordinándose con nadie externo.
No es una crítica al servicio: es que la información simplemente no vive del
lado de la agencia.

### El indicador que importa ya no lo puede dar Meta

Meta reportó **1,252 conversaciones iniciadas** en doce meses. Las listas reales
de WhatsApp Business de VIALUX contienen alrededor de **121 chats**.

Ambos números son correctos: Meta cuenta la apertura de la ventana de chat,
haya o no mensaje. Pero significa que **el costo por conversación ya no es
suficiente para decidir**.

VIALUX opera hoy un sistema propio (VIALUX Control) donde viven las
cotizaciones, los cierres y el expediente de cada cliente. Ahí ya está medida la
línea base real del embudo: **307 conversaciones sin cerrar contra 60 ventas, es
decir alrededor de 5% de conversación a venta.**

Los indicadores que van a gobernar las decisiones de aquí en adelante son
**costo por cotización** y **costo por venta cerrada**, y solo se pueden calcular
cruzando el gasto de Meta contra esa base interna.

### Lo que viene técnicamente

Está en desarrollo la integración de **WhatsApp Cloud API dentro de VIALUX
Control**, incluyendo la captura de los parámetros de referencia del anuncio
(`referral` / `ctwa_clid`). Cuando esté lista, cada conversación que entre por un
anuncio va a quedar ligada a la cotización y a la venta que produzca.

Esa trazabilidad exige que la operación de campañas y el sistema comercial estén
en las mismas manos. Es la razón técnica por la que el momento de la transición
es ahora y no después.

---

## 5 · Qué se montó el 5 de agosto

Por transparencia, y para que quede claro que la transición no implica
descartar lo aprendido, aquí está la configuración que quedó activa:

**Campaña:** `VIALUX || Consolidada || 08.26`
**Conjunto:** `WAB || 3 precios || Abierta || FB || 25-55`
**Presupuesto:** $200 MXN diarios
**Anuncio:** uno solo, `AD Boyas 3 precios 2`

Decisiones y su fundamento:

**Se duplicó la campaña ganadora en lugar de crear una nueva.** Se conservaron
sin modificación el objetivo, el público abierto 25-55, las 14 ubicaciones con
sus radios, las ubicaciones de Facebook y la estrategia de puja. Todo eso ya
estaba probado; rearmarlo a mano habría introducido diferencias involuntarias.

**El presupuesto pasó de ~$45 a $200 diarios en un solo conjunto.** No es un
aumento de inversión: es la **misma inversión total** que estaba repartida entre
varias campañas, ahora concentrada. Con el costo actual, $200/día proyecta cerca
de **70 conversaciones por semana** — por encima del umbral de 50 y, por lo
tanto, la primera vez que la cuenta debería salir de fase de aprendizaje.

**El anuncio se montó con "usar publicación existente"** (post original del
1/dic/2025), conservando sus **215 reacciones, 14 comentarios y 13 compartidos**.
Un duplicado convencional habría generado una publicación nueva en ceros y
perdido esa prueba social, que además abarata la subasta.

**Se rechazaron deliberadamente todas las recomendaciones automáticas de Meta**
—Advantage+ audience, Advantage+ placements, ajuste automático de presupuesto e
imágenes generadas con IA— para no alterar variables durante la comparación. Se
evaluarán una por una después del corte.

**Se apagaron las dos campañas de menor rendimiento.** Al 4 de agosto:

| Campaña | Conversaciones | $/conv | Estado |
|---|---|---|---|
| Boyas 3 precios · Ubis · 1.12.25 | 67 | **$20.35** | Activa hasta el cutover |
| Nuevas img AI · 20.03.26 | 13 | $48.83 | Apagada |
| Boyas 3 precios · IG · 10.12.25 | 12 | $55.94 | Apagada |

Sobre la campaña dedicada a Instagram: a lo largo del periodo promedió $45.81
por conversación, cerca del doble del canal ganador. Se descarta el canal
dedicado; Instagram seguirá recibiendo tráfico a través de las ubicaciones
automáticas cuando corresponda.

---

## 6 · Cómo se va a evaluar

La comparación es deliberadamente exigente para VIALUX: la campaña interna
arranca **desde cero en aprendizaje**, mientras que el punto de referencia es una
campaña con ocho meses de optimización acumulada.

**Referencia a igualar: $20.35 por conversación** (67 conversaciones en la
ventana de 30 días al 4 de agosto).

| Fecha | Etapa |
|---|---|
| 5–8 ago | Fase de aprendizaje. Se espera costo elevado; sin intervenciones. |
| 9–11 ago | Cutover: se apaga la campaña de referencia. |
| 11–13 ago | Lectura de resultados ya estabilizados. |
| 13–14 ago | Decisión y comunicación formal. |

**Criterio:** costo por conversación **igual o menor a $25** con la campaña fuera
de aprendizaje. Si el resultado queda en zona gris, lo diremos con el número en
la mano y conversaremos el siguiente paso en lugar de forzar la decisión.

---

## 7 · Transición

La propuesta es que sea ordenada y sin urgencias:

**Accesos.** Hoy existen accesos individuales con permisos completos al Business
Manager (Carlos, Diego y Pato), más un acceso parcial a nombre de "Alan
Hernández" que quisiéramos identificar. Proponemos convertirlos en relación de
Partner o retirarlos en la fecha de corte, según lo que ustedes prefieran.

**Activos.** La cuenta publicitaria, el píxel y la página son propiedad de VIALUX
y ya están verificados en Business Manager, así que no hay ningún traspaso
pendiente ni riesgo de interrupción del servicio.

**Documentación.** Ya quedaron documentados los dos anuncios ganadores con sus
imágenes y textos. Si hay material, aprendizajes o pruebas que hayan hecho y no
estén reflejados en la cuenta, nos serían de mucha utilidad.

**Cierre administrativo.** Confirmar que no queden reglas automatizadas activas
ni facturación pendiente. El calendario preciso y las condiciones del último
periodo los acordamos directamente.

---

## 8 · Cierre

La etapa que se contrató se cumplió: VIALUX necesitaba validar que existía
demanda para las boyas metálicas sin montar un área de marketing, y esa
validación se logró. Hoy el negocio tiene un producto probado, un concepto
publicitario ganador y un sistema interno donde ya viven cotizaciones, clientes
y ventas.

Lo que cambia no es la calidad del trabajo, sino el lugar desde donde se decide.
La pauta de VIALUX depende cada vez más de datos que solo existen dentro de la
operación —inventario, capacidad de producción, cierres reales— y esa cercanía es
lo que estamos buscando.

Agradecemos el trabajo de estos doce meses. El concepto "3 precios" salió de esta
colaboración y va a seguir siendo la base del material publicitario de VIALUX.

**César Aranda**
VIALUX
