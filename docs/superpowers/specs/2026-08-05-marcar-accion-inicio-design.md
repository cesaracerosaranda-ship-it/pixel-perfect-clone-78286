# INICIO — la lista de trabajo del día

Fecha: **5/ago/2026** · Reemplaza la primera versión de este mismo día

---

## Qué necesita César

Abrir la app en la mañana y ver **a quién le habla hoy para cerrar más ventas**,
en el orden correcto, sin tener que decidir por dónde empezar.

La primera versión de este spec falló por diseñar encima de las cinco colas que
ya existían. Cinco colas obligan a elegir cuál trabajar primero — eso es trabajo
mental que la herramienta debe quitar, no repartir.

Prioridades del negocio que manda la pantalla: **vender más, recomprar la
cartera, y tener trazabilidad de qué se hizo con cada lead.**

---

## La pantalla

### Tres cifras arriba

| Cifra | Qué suma |
|---|---|
| **Pipeline vivo** | Cotizaciones abiertas dentro de vigencia |
| **En riesgo esta semana** | Las que vencen en ≤3 días |
| **Cerrado este mes** | Ventas cerradas del mes en curso |

*En riesgo* es la que dice si hoy fue un buen día o solo un día ocupado.

### Una lista: "Hoy" — máximo 10

Cada fila lleva una etiqueta que dice **por qué está ahí**:

```
Constructora Sur · 1,200 pzs · $63,600     [PROMETISTE HABLARLE HOY]
Ferretería del Norte · 800 pzs · $42,400   [NO CONTESTÓ · 4D]
Grupo Vial MTY · 2,000 pzs · $106,000      [VENCIÓ AYER · RECOTIZAR]
Aceros del Golfo · 500 pzs · $26,500       [COMPRÓ HACE 3 MESES]
```

**El orden no lo elige César.** Por prioridad de tramo, y dentro de cada tramo
por monto:

1. **Compromiso** — se lo prometió al cliente. Va primero siempre.
2. **Sin respuesta** — cotización viva sin movimiento ≥2 días. Lo más caliente:
   ya pidieron precio. Ponderada por monto y frescura.
3. **Vencida** — pasó la vigencia de 7 días. Recientes primero: la que caducó
   ayer se recupera, la de hace dos meses es arqueología.
4. **Recompra** — cerró hace ≥60 días y no ha vuelto. La cartera es lo más
   barato de reactivar y es prioridad declarada del negocio.

**10 renglones** (confirmado con César). Una lista de treinta no se ataca, se
ignora.

### Trazabilidad en la fila

Cada renglón muestra el último toque —*"le escribiste hace 2d"*— y un clic abre
la bitácora completa del cliente sin salir de la pantalla.

---

## Cambios respecto a la primera versión

**Cobranza sale de INICIO.** Tiene su propio módulo, y como en VIALUX se cobra
antes de cerrar, esa cola estaría vacía casi siempre. INICIO es para vender.

**Recompra sube** de quinto lugar a tramo propio.

**Se elimina la lógica de inventario.** César confirma que dan abasto; la app no
debe frenarlo por eso.

**El silencio pasa a ser uniforme: 2 días para todos los tramos.** En la primera
versión se decidió que una vigencia vencida se quedara visible con sello de
contactado. Eso tenía sentido cuando la pantalla era un tablero de estado; en una
lista de **solo 10 lugares**, un lead contactado ayer le quita el lugar a uno que
nadie ha tocado. Vuelve a aparecer solo si sigue sin resolverse.

---

## Registrar la acción

**Un clic.** Botón `Ya le di seguimiento` en cada fila. Inserta el contacto en la
bitácora al instante: sin modal, sin confirmación. Tipo `whatsapp` por omisión.

**La nota es opcional y llega después.** Al registrar, la fila queda marcada y
despliega una tira con campo de nota y atajos `Mañana · En 3 días · En 1 semana`.
Si se ignoran, la fila cae en el siguiente refetch.

**En una fila de compromiso, el mismo botón marca el recordatorio como cumplido.**
Un solo concepto, no dos botones que hacen casi lo mismo.

### El contador

El *último toque* de una cotización es la fecha más reciente entre
`cotizaciones.updated_at` y el último contacto del cliente. INICIO cuenta desde
ahí.

**No se escribe `updated_at`.** Ese campo significa "la cotización cambió", y
usarlo para un WhatsApp lo vuelve mentira — es el mismo error que costó el
módulo de Cobranza. Tampoco se agrega columna: `contactos` ya tiene el dato.

**Sin migraciones.**

---

## Detalles de implementación

**Caso borde:** `cotizaciones.cliente_id` admite nulo pero `contactos.cliente_id`
es obligatorio con llave foránea. Se resuelve con `upsertCliente()`, que ya
existe: busca por nombre y si no está lo crea. Efecto secundario bueno — cada
seguimiento completa el directorio.

**Piezas nuevas:** `BotonSeguimiento`, `TiraSeguimiento`, y
`registrarSeguimiento()` en `contactos.ts`.

**Cambios en lo existente:** `registrarContacto()` debe devolver también el `id`
del contacto creado (la tira lo necesita para adjuntar la nota). Y se quita el
tipo `Api` a mano de `contactos.ts`: la tabla ya está en `types.ts`, ese andamio
caducó igual que los `as never` limpiados hoy.

---

## Errores

**Dos fallas silenciosas preexistentes** en INICIO, ambas con el patrón
`if (error) return;` sin avisar: el botón de marcar recordatorio cumplido y el
de marcar cotización como perdida. Entran en este trabajo con `toast.error`,
como ya hacen Historial y Cobranza.

**Del flujo nuevo:**

| Caso | Comportamiento |
|---|---|
| No se pudo guardar | La fila revierte su marca + toast. Nunca queda marcado lo que no se guardó. |
| `upsertCliente()` devuelve null | Toast pidiendo ligar el cliente. No se inserta nada a medias. |
| Doble clic | Botón deshabilitado mientras guarda. |
| La nota falla, el contacto ya se guardó | El seguimiento cuenta; se avisa que la nota no se adjuntó. |

---

## Reversibilidad y verificación

Solo inserta filas en `contactos` y cambia cómo INICIO calcula. Revertir el
commit devuelve la pantalla anterior, y los contactos registrados se quedan como
bitácora válida en Clientes. No hay estado corrupto posible.

El repo **no tiene infraestructura de pruebas** y no se propone montarla.
Verificación: `tsc --noEmit`, `npm run build`, `npm run lint`, y revisión en
productivo — que es como César quiere calibrarlo.

---

## Fuera de alcance

- Elegir tipo de contacto (llamada/visita) desde INICIO. Se corrige en la
  bitácora del cliente.
- **Notificaciones que alcancen a César fuera de la app.** INICIO seguirá siendo
  *pull*. Es el hueco más caro que queda y merece su propio diseño.
- Traer al panel los 307 rezagados de WhatsApp: no están en la base. Requiere el
  backfill del histórico, que es otro trabajo.
