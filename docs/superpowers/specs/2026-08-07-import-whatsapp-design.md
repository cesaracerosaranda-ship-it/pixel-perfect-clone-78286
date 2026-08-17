# Import del histórico de WhatsApp a VIALUX Control

Fecha: **7/ago/2026** · Estado: aprobado en principio, para implementar el 8/ago

---

## 1 · Qué se importa y para qué

`/Users/cesararanda/vialux/data/chats.json` (unificado el 7/ago): **1,067
conversaciones, 18,327 mensajes, del 19/ago/2025 al 7/ago/2026**, año continuo
verificado mes por mes.

El objetivo NO es un inbox — César contesta desde WhatsApp Web y así se queda.
Son tres usos, en orden de valor:

1. **Extender INICIO hacia arriba del embudo**: hoy la lista arranca en la
   cotización; de los ~307 leads fugados, ~206 nunca llegaron a cotizar y son
   invisibles. Con el import aparece la fila *"te escribió · sin cotizar"*.
2. **Auditoría**: cada conversación consultable desde la app, ligada al cliente.
3. **Base para medir tiempo de respuesta** (se calcula después; los datos ya
   traen dirección y timestamp).

---

## 2 · Principios de diseño (el "porqué" de cada decisión)

### Ni una tabla nueva, ni una migración

`wa_conversaciones` y `wa_mensajes` ya existen y mapean 1:1 con lo extraído.
El módulo WhatsApp (604 líneas) ya sabe listarlas, buscarlas y mostrar la
conversación — el histórico importado se vuelve auditable con CERO UI nueva.
Además evitamos el baile de migraciones con Lovable, que ya costó una mañana.

### La clasificación se DERIVA, no se guarda

La lección de Cobranza y del "último toque": estado duplicado se pudre. Las
tres cubetas:

| Cubeta | Dónde vive | Por qué |
|---|---|---|
| **Cliente / ya cotizado** | **Derivada** al leer: teléfono (últimos 10 dígitos) presente en `cotizaciones.cliente_telefono` o `clientes.telefono` | En cuanto César cotiza a alguien, sale de "sin cotizar" SOLO, sin sincronizar nada |
| **Ruido** (proveedores, personal, spam) | `archivada = true` | Es juicio humano, sí se guarda. El inbox YA filtra `archivada = false` (whatsapp.tsx), así que queda oculto en todos lados con la semántica existente |
| **Sin cotizar** (el oro) | Lo que queda: tiene mensajes entrantes, no matchea cotización, no está archivada | — |

`pipeline` NO se toca: sus valores (`nuevo/potencial/seguimiento/vendido/
perdido`) pertenecen al flujo del inbox en vivo. Todo entra como `nuevo`.

### Nadie revisa 1,067 filas a mano

La clasificación de ruido es **orgánica**: un botón `Ruido` en la propia fila
de INICIO (un clic → `archivada = true` → desaparece). César limpia sobre la
marcha, solo lo que le estorba. El resto del backlog vive en el módulo
WhatsApp con su buscador.

### Honestidad sobre la frescura

El dato es una FOTO (la extracción), no un radar. Hasta que llegue la Cloud
API (post-15/ago), no entran conversaciones nuevas solas. Por eso:

- El tramo de INICIO y la pantalla de import muestran **"DATOS AL {fecha de
  última extracción}"** — la fecha sale del mensaje más reciente importado.
- Re-importar es el refresh: correr `--extract` y volver a subir el archivo.
  El import es idempotente justo para eso.

---

## 3 · La pantalla de import

Vive en el módulo WhatsApp (sección "Importar histórico"), porque el 401 de
hoy demostró que `anon` no lee las tablas: el import corre DENTRO de la app,
con la sesión de César. Sin llaves de servicio en scripts.

**Flujo en tres pasos, nada escribe hasta el paso 3:**

1. **Subir** `chats.json` → se parsea y valida en el navegador (3.7 MB, ok).
2. **Vista previa (dry-run)** — el "no desorden" del diseño: cuántas
   conversaciones por cubeta, cobertura de fechas, cuántas ya existen en la
   base, cuántos mensajes se insertarían. César ve exactamente qué va a pasar.
3. **Confirmar** → escritura por lotes (~500 filas por request) → reporte
   final con los mismos números, ya ejecutados.

**Idempotencia:**

- Conversaciones: upsert por `wa_id`. Si no hay constraint único (verificar
  mañana con un intento; ver §5), fallback: select de los `wa_id` existentes y
  separar insert/update en la app.
- Mensajes: **delete + reinsert por conversación** al re-importar. Es la
  idempotencia más simple sin exigir constraints, y el volumen (≤1000 msgs por
  chat) lo permite.
- `no_leidos = 0` en todo lo importado — no fabricar urgencia falsa.

**Mapeo:**

| chats.json | wa_conversaciones |
|---|---|
| clave (`...@c.us`) | `wa_id` |
| `contact_name` (si no es puro dígito) | `nombre_contacto` |
| último mensaje (texto, recortado) | `ultimo_mensaje` |
| timestamp del último mensaje → ISO | `ultima_actividad` |
| match de teléfono contra `clientes` | `cliente_id` (si hay) |

| mensaje | wa_mensajes |
|---|---|
| `type` incoming/outgoing | `direccion` |
| `timestamp` → ISO | `timestamp_wa` |
| `text` (vacío si es media sin caption) | `texto` |
| `typeMessage` | `tipo` |
| — (histórico no trae id) | `wa_message_id = null` |

Grupos ya vienen excluidos de la extracción. Chats con 0 mensajes no se
importan.

---

## 4 · El tramo nuevo en INICIO

**`TE ESCRIBIÓ · SIN COTIZAR`** — entra al ranking de la lista de 10.

**Filtro:** `archivada = false` · tiene al menos un mensaje entrante · su
teléfono NO matchea ninguna cotización ni cliente con cotización · última
actividad ≤ **30 días** (constante junto a las demás, calibrable).

**Posición: tramo 3**, después de "Sin respuesta" y antes de "Vencida".
Razón: una cotización sin respuesta trae monto conocido y vigencia corriendo;
un WhatsApp sin cotizar vale mucho pero su monto es desconocido y su frescura
depende de la foto. Es un punto de partida — se calibra en productivo, como
todo lo demás del panel.

**Orden interno:** por recencia (no hay monto que ponderar).
**Etiqueta:** `TE ESCRIBIÓ HACE {n}D · SIN COTIZAR`.

**Acciones por fila:**

- **WhatsApp** — wa.me con el teléfono.
- **Cotizar** — al cotizador con teléfono y `nombre_contacto` prellenados. Al
  guardarse la cotización, el teléfono matchea y la fila sale sola del tramo
  (clasificación derivada en acción).
- **Ruido** — `archivada = true`, un clic, desaparece.
- **Seguimiento** — solo si hay `nombre_contacto` utilizable
  (`identidadCliente` lo decide); sin nombre no hay cómo crear el cliente y el
  botón no se ofrece.
- **Ver conversación** — abre el módulo WhatsApp en esa conversación.

---

## 5 · Verificaciones previas (mañana, antes de escribir código)

1. ¿`wa_id` tiene constraint único? → intentar upsert; si truena, fallback §3.
2. ¿RLS deja escribir `wa_conversaciones`/`wa_mensajes` con sesión? — el inbox
   ya hace updates, así que casi seguro sí; confirmar el INSERT.
3. Confirmar el teléfono de César/Gerardo para sugerirlos como ruido en el
   dry-run (el chat "César Aranda" trae 1,000 mensajes y es interno).

## 6 · Fuera de alcance

- Responder mensajes desde Control (decisión explícita de César).
- Radar en vivo / webhooks / Cloud API — post-15/ago, con la atribución
  (`ctwa_clid`) como parte de ese trabajo.
- Panel de tiempo de respuesta — los datos quedan listos; el análisis es otro
  entregable.
- Separar clientes ya fusionados por "A QUIEN CORRESPONDA" (pendiente aparte).

## 6.5 · ADDENDUM 13/ago — el dato de abr-ago es de UN SOLO LADO

Medido el 13/ago: después del 15/abr los datos traen **1,700 mensajes salientes
y 1 entrante**. El dispositivo re-vinculado sincronizó lo enviado, no lo
recibido. Consecuencias para la implementación:

- **La ventana confiable para "te escribió" empieza el 7/ago** (día del
  re-vinculado, cuando el dispositivo quedó recibiendo en vivo). Antes del
  15/abr el histórico sí es de dos lados.
- El tramo de INICIO debe alimentarse SOLO de conversaciones con mensajes
  entrantes en ventana confiable; abr-ago es el registro de la ráfaga de
  reactivación de César con las respuestas invisibles — presentarlo como
  "conversaciones enfriadas" vendería humo.
- La lista Excel del 13/ago ya usa estas cubetas (ver `lista_leads.py` en el
  repo del Analyzer): VIVOS (entrante ≥7/ago) · QUEDARON SIN RESPUESTA
  (último mensaje del cliente, pre-abril) · ENFRIADOS (dos lados, pre-abril) ·
  YA LOS BUSCASTE (solo salientes abr-ago).
- Esto invalida la conclusión del 13/ago en la mañana ("sí contestas, 0 sin
  responder en 90 días"): no era que César contestara todo, es que las
  respuestas de los clientes no están en los datos.

## 7 · Contexto operativo del Analyzer (para no re-aprenderlo)

- La extracción vive en `/Users/cesararanda/vialux` (`main.py --extract`).
- Green API expone el historial del **dispositivo vinculado**, no del
  teléfono: al re-vincular se pierde lo profundo y se sincroniza lo reciente.
  Por eso existe `merge_chats.py`, que une extracciones deduplicando por
  `(timestamp, tipo, texto)`.
- La tarifa actual NO permite `enableMessagesHistory` (setSettings responde
  éxito y lo ignora) — si el dispositivo se desvincula, vuelve a quedarse
  mudo. Revisar plan de Green API antes de apoyar el radar continuo en él.
- Tres fallos silenciosos documentados hoy: diario vacío con HTTP 200, 429
  disfrazado de respuesta vacía, setSettings que confirma sin aplicar. La
  guarda de `extract.py` ahora compara chats CON MENSAJES, no totales.
