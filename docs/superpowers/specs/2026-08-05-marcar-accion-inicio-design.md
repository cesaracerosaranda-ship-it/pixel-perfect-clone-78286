# Marcar acción tomada desde INICIO

Fecha: **5/ago/2026** · Estado: aprobado, pendiente de plan de implementación

---

## 1 · El problema

César empezó a trabajar las colas de INICIO y no tiene cómo decirle al sistema
que ya atendió a alguien. Pidió tres cosas: palomear tareas, dejar comentarios y
que el contador de días se reinicie.

Al revisar el código resultó que **la mitad ya está construida, pero en el lugar
equivocado, y el contador mide otra cosa.**

### Lo que ya existe

La tabla `contactos` ya es una bitácora completa: `tipo`, `nota`,
`proxima_accion`, `proxima_fecha`, `cumplida`. `registrarContacto()` inserta,
`marcarCumplida()` palomea, y `ultimoContactoPorCliente()` alimenta el silencio
de las colas.

### Los tres huecos reales

1. **No se alcanza desde INICIO.** `BitacoraCliente` solo se renderiza en la
   pantalla de Clientes. Desde el panel hay que salirse, buscar al cliente y
   registrar allá — cuatro clics para decir "ya le escribí".
2. **El contador no mide el contacto.** La etiqueta `{d}D SIN MOVER` sale de
   `dias(cotizacion.updated_at)`. Registrar un contacto no toca ese campo, así
   que al vencer el silencio el cliente reaparece diciendo "9D SIN MOVER" aunque
   se habló con él anteayer.
3. **El silencio aplica a UNA sola cola.** `habloReciente()` se consulta
   únicamente en `01 Sin respuesta`. Vigencia vencida, Cobro vencido y Recompra
   no lo miran: registrar un contacto hoy no les hace nada. El ARRANQUE lo
   describe como si aplicara a todo el panel; el código no lo hace.

---

## 2 · Decisiones tomadas

| Decisión | Elegido | Por qué |
|---|---|---|
| Fricción | Un clic, nota opcional | Con 307 leads fugados, lo que se usa a diario es lo que no estorba. La nota obligatoria se abandona en una semana. |
| Registro automático al abrir WhatsApp | **Descartado** | Registraría la intención, no el envío: abrir el chat sin escribir marcaría al cliente como atendido y lo escondería 2 días. |
| Alcance por cola | Depende de la cola | El contacto oculta la fila solo cuando hablar era la tarea completa. Un precio vencido sigue vencido aunque le escribas. |
| Cómo reinicia el contador | Recalcular en INICIO | No inventa datos ni pide migración (ver §3). |
| Agendar el siguiente toque | Sí, atajos opcionales | Sin esto el lead contactado vuelve a quedar en el aire: se silencia 2 días y reaparece sin que nadie decidiera nada. |
| Elegir tipo de contacto desde INICIO | **Fuera de alcance** | Un selector más en una fila que ya tiene cuatro botones. Se corrige desde la bitácora del cliente si hace falta. |

---

## 3 · Modelo de datos

**Sin migraciones.** `contactos` ya tiene los cinco campos necesarios. Todo el
trabajo es de aplicación.

### El último toque

Se introduce un solo concepto: el *último toque* de una cotización es la fecha
más reciente entre `cotizaciones.updated_at` y el último contacto registrado de
ese cliente. INICIO cuenta desde ahí. La etiqueta pasa de `9D SIN MOVER` a
`2D SIN TOCAR`, que es lo que realmente mide.

### Por qué NO se escribe `updated_at`

Tocar `updated_at` al registrar un contacto sería una línea de código y todas
las vistas se enterarían solas. Se descartó: ese campo significa *"la cotización
cambió"*, y escribirlo por un WhatsApp lo vuelve mentira. Historial y Cobranza
también lo leen, y se perdería para siempre la respuesta a "¿cuándo se editó de
verdad esta cotización?".

Es la misma clase de error que ya costó el módulo de Cobranza: un campo que
significaba una cosa, usado para significar otra.

También se descartó una columna `ultimo_contacto_at` denormalizada: exige
migración, duplica lo que `contactos` ya tiene y puede desincronizarse. Solo
valdría si el cálculo resultara lento, y con ~60 ventas y 3000 contactos de tope
no lo será.

### Caso borde: cotizaciones sin cliente ligado

`cotizaciones.cliente_id` admite nulo; `contactos.cliente_id` es obligatorio y
tiene llave foránea. En cotizaciones viejas sin cliente el insert fallaría.

Se resuelve con `upsertCliente()`, que ya existe: busca por nombre y si no está
lo crea con teléfono y empresa. Efecto secundario deseable — cada seguimiento
va completando el directorio.

---

## 4 · Comportamiento por cola

| Cola | Al registrar seguimiento | Mecanismo | Qué la saca de verdad |
|---|---|---|---|
| `00` Recordatorios | *sin cambios* — ya tiene "Hecha" | — | Palomear el compromiso |
| `01` Sin respuesta | Reinicia el contador, y con eso sale de la cola | Último toque | Que conteste, recotizar o marcar perdida |
| `02` Vigencia vencida | Sella `YA LE ESCRIBISTE HACE 1D`, **no oculta** | Sello | Recotizar o marcar perdida |
| `03` Cobro vencido | Sella, **no oculta** | Sello | Registrar el pago |
| `04` Ya les toca | Oculta 2 días; el contador **no** se reinicia | Silencio | Que vuelva a pedir |

La regla en una línea: **el contacto oculta la fila solo cuando hablar era la
tarea completa.** Donde queda un hecho sin resolver — precio vencido, saldo
vivo — la fila se queda y solo se marca: no le escribes dos veces, pero tampoco
se te pierde.

### Dos mecanismos distintos, y no son intercambiables

Es la ambigüedad que hay que tener clara al implementar, porque `01` y `04`
parecen el mismo caso y no lo son:

- **`01 Sin respuesta` cuenta días sin tocar.** Registrar el contacto reinicia
  ese contador, y al reiniciarlo la fila deja de cumplir
  `dias(últimoToque) >= DIAS_SIN_RESPUESTA` y sale sola. **No** hay que aplicarle
  además `habloReciente()`: serían dos mecanismos haciendo el mismo trabajo, y
  con ambos umbrales en 2 días la condición es idéntica. Se retira de esta cola.
- **`04 Ya les toca` cuenta días desde la última compra.** Esa fecha es un hecho
  histórico y **no** debe reiniciarse porque le hayas escrito: el cliente compró
  cuando compró. Aquí el ocultamiento sí lo hace `habloReciente()`, que se
  conserva y pasa a ser su único uso.

Consecuencia práctica: si más adelante se tunea `DIAS_SILENCIO`, solo cambia el
comportamiento de Recompra. Si se tunea `DIAS_SIN_RESPUESTA`, solo cambia el de
Seguimiento. Hoy ambos valen 2 y eso escondía que son perillas separadas.

Los umbrales (`DIAS_SILENCIO` y compañía) se quedan como constantes juntas al
principio de `inicio.tsx`, con su comentario de por qué. César va a calibrar en
productivo, así que ajustar debe ser cambiar un número y pushear.

---

## 5 · Interfaz y flujo

**El clic registra de inmediato.** Botón `Ya le di seguimiento` junto a
WhatsApp / Recotizar / Perdida. Al tocarlo se inserta el contacto: sin modal,
sin confirmación. Tipo por omisión `whatsapp`, el canal real casi siempre.

**La nota llega después, sin bloquear.** La fila no desaparece de golpe: queda
marcada como recién atendida y despliega una tira delgada con un campo de nota y
los atajos `Mañana · En 3 días · En 1 semana`. Si escribes o tocas un atajo, se
actualiza ese mismo contacto. Si los ignoras, la tira se va sola en el siguiente
refetch — y con ella la fila, en las colas que ocultan (`01`, `04`). En `02` y
`03` la fila se queda con su sello, que es justo lo que se decidió en §4.

Esto resuelve un conflicto de la cola `01`: si la fila se ocultara en el instante
del clic, no quedaría dónde escribir la nota.

### Piezas nuevas

- `BotonSeguimiento` — el botón, con estado de guardando y de error.
- `TiraSeguimiento` — nota + atajos de fecha. Única pieza con estado propio.
- `registrarSeguimiento()` en `contactos.ts` — resuelve el `cliente_id` faltante
  vía `upsertCliente()` y luego inserta.

### Cambios en lo existente

- `registrarContacto()` hoy devuelve solo el mensaje de error. Debe devolver
  también el `id` del contacto creado: la tira lo necesita para adjuntar la nota.
  Es ampliar el retorno, no romper la firma.
- Quitar el tipo `Api` escrito a mano y el `supabase as unknown as` de
  `contactos.ts`. La tabla ya está en `types.ts`, así que ese andamio caducó —
  igual que los `as never` que se limpiaron el 5/ago en `cd5022b` y `cf2b663`.

---

## 6 · Manejo de errores

### Dos fallas silenciosas preexistentes

Al buscar dónde enganchar los errores del botón nuevo aparecieron dos que ya
están en INICIO, ambas con el patrón `if (error) return;` sin aviso:

- El botón **"Hecha"** de Recordatorios (`marcarCumplida`): palomeas, falla, no
  pasa nada, y el recordatorio sigue vivo sin explicación.
- **Marcar una cotización como perdida** (`MotivoPerdidaModal`, `onConfirm`):
  mismo patrón.

Entran en este trabajo: `toast.error(mensaje)`, que es lo que ya hacen Historial
y Cobranza. Son de la misma familia que el botón nuevo y viven en el archivo que
se va a tocar; dejarlas sería estrenar un botón que avisa sus errores al lado de
dos que no.

### Errores del flujo nuevo

| Caso | Comportamiento |
|---|---|
| No se pudo guardar (red, RLS, FK) | La fila revierte su estado de "recién registrado" + toast. Nunca queda marcado como atendido algo que no se guardó. |
| `upsertCliente()` devuelve null | Toast explicando que falta ligar el cliente. No se inserta nada a medias. |
| Doble clic | Botón deshabilitado mientras guarda. Sin esto entran dos contactos y ensucian la bitácora. |
| La nota falla pero el contacto ya se guardó | El seguimiento cuenta igual; se avisa que la nota no se adjuntó. Lo importante ya quedó. |

---

## 7 · Reversibilidad

El cambio no borra ni transforma nada: solo inserta filas en `contactos` y
cambia cómo INICIO calcula. Revertir el commit devuelve el panel exacto a como
está hoy, y los contactos registrados mientras tanto se quedan — siguen siendo
bitácora válida y se ven en Clientes. No hay estado corrupto posible.

Esto importa porque la calibración va a ser en productivo.

---

## 8 · Verificación

El repo **no tiene infraestructura de pruebas** — ni vitest, ni jest, ni un solo
archivo `.test.*`. No se finge cobertura y no se propone montar un harness: sería
otro proyecto.

Automático antes de entregar: `npx tsc --noEmit`, `npm run build`, `npm run lint`.

Manual en productivo, en este orden:

1. En `01 Sin respuesta`, dar seguimiento a alguien → la fila se marca, aparece
   la tira, y al refrescar **ya no está**. Al día siguiente tampoco. (Reaparece
   a los 2 días si el cliente nunca contestó: es el comportamiento correcto, no
   una falla.)
2. El mismo cliente en `02 Vigencia vencida` → **sí** se queda, con el sello de
   contactado.
3. Tocar el atajo `En 3 días` → aparece en `00 Recordatorios` ese día.
4. Abrir ese cliente en **Clientes** → el seguimiento está en su bitácora con la
   nota.
5. Con el celular en modo avión, dar seguimiento → **debe** salir toast de error,
   no quedarse callado.

El punto 5 es el que prueba que las fallas silenciosas de §6 quedaron cerradas.

---

## 9 · Fuera de alcance

- Elegir tipo de contacto (llamada/visita) desde INICIO.
- Notificaciones que alcancen a César fuera de la app. INICIO seguirá siendo
  *pull*: funciona si la abres. Es un hueco real y merece su propio diseño.
- Montar infraestructura de pruebas.
- Quitar `clavosSupported` de Historial: es código muerto desde que se aplicó la
  migración de clavos, pero ramifica UI en seis lugares y es cambio de
  comportamiento, no limpieza de tipos.

---

## Nota sobre referencias

Este documento cita **símbolos y archivos, no números de línea**. Los números se
pudren con el primer commit — igual que el hash fijo que traía el ARRANQUE en §H
y que mandó a repetir una migración que ya estaba aplicada.
