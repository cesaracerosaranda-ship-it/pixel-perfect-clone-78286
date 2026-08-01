# WhatsApp — Guía de operación y siguientes pasos

Estado al 31/jul/2026: **el ciclo completo funciona** (recibir, enviar, ligado
automático a clientes) con el **número de prueba** de Meta `+1 555 200-2984`.

Datos de la instalación:

| Dato | Valor |
|---|---|
| Phone Number ID | `1230528186813043` |
| WhatsApp Business Account ID | `940017629110755` |
| App ID (Meta) | `1462994488640283` |
| Webhook | `https://zolvicxzerlrkbitweov.supabase.co/functions/v1/whatsapp-webhook` |
| Secretos en Lovable | `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_VERIFY_TOKEN`, `WHATSAPP_APP_SECRET` |

Dónde vive todo en el panel de Meta: **Use cases → Connect on WhatsApp**. El
antiguo "API Setup" ahora se llama **Step 1. Try it out** (ya no hay entrada
"WhatsApp" en la barra lateral).

---

## 1. Renovar el token — guía de ejecución (~5 min)

El token de Step 1 **caduca cada 24 horas**. Cuando muera, la bandeja marca
*"El token de WhatsApp expiró o es inválido"*.

Son cuatro pasos y hay que hacerlos **en orden**. El paso C es el que se olvida.

### A · Generar el token en Meta

`developers.facebook.com` → app **VIALUX** → **Use cases** → **Connect on
WhatsApp** → **Step 1. Try it out** → sección *Claim a WhatsApp test number* →
botón **Generate token**.

Si pregunta a qué cuenta enlazarlo, elige la **WABA de prueba
`940017629110755`** (la que contiene el `+1 555 200-2984`). Hoy es la única
opción; cuando se conecte el número real aparecerá una segunda.

> **El token se enlaza a una cuenta (WABA), no a un número.** El número que
> *envía* lo decide el secreto `WHATSAPP_PHONE_NUMBER_ID` (`1230528186813043`).
> El token solo autoriza a usarlo.

**Copia el token de una vez.** Meta lo muestra una sola vez; después el campo
vuelve a decir *"Not generated yet"* aunque el token siga vivo. Ese mensaje **no**
significa que caducó.

### B · Cargarlo en Lovable

Pega este mensaje en Lovable:

```
Actualiza el secreto WHATSAPP_TOKEN de Supabase con el nuevo valor que te voy a
dar y vuelve a desplegar la edge function whatsapp-enviar para que tome el valor
nuevo.

No modifiques el código de la función ni ningún otro archivo: solo el secreto y
el redespliegue. No toques whatsapp-webhook, esa función no usa ese secreto.
```

Lovable va a abrir un **campo seguro** para que pegues el token ahí — no lo
escribas dentro del mensaje. Cuando termine debe confirmar el redespliegue de
`whatsapp-enviar`.

### C · Volver a autorizar tu número en Meta ⚠️

**Regenerar el token vacía la lista de destinatarios.** Es el paso que se olvida
y hace parecer que el token nuevo no sirve.

En la misma pantalla de Step 1, sección *Send a message from your test number*:
desplegable **Recipient** → **Manage phone number list** → agrega
`+52 81 2063 9813` → llega un código por WhatsApp → captúralo.

Al terminar, el campo **Recipient** debe mostrar el número, no
*"Select a recipient number"*.

> No presiones **Generate token** otra vez para habilitar el botón azul
> *Send message* de esa pantalla: ese botón es la prueba interna de Meta y
> generar un token nuevo invalidaría el que acabas de cargar en Lovable.

### D · Probar en VIALUX

1. Recarga con `Cmd + Shift + R`
2. Pestaña **WhatsApp** → conversación de **César Aranda**
3. Escribe cualquier cosa → **ENVIAR**

**Funcionó** si el mensaje aparece en amarillo del lado derecho y llega a tu
celular. Si marca error, busca el texto exacto en la tabla de *Diagnóstico
rápido* al final de este documento.

---

> El token **permanente** (System User, sin expiración) no se puede crear
> mientras usemos el número de prueba: los WABA de prueba no son activos de
> negocio asignables. Se desbloquea al conectar el número real (paso 4).

### Opcional: cambiar las 24 h por ~60 días

El token de Step 1 es un *user token* de corta vida, y Meta permite canjearlo por
uno de larga duración (~60 días). Vale la pena intentarlo para dejar de renovar a
diario mientras dure la etapa de pruebas. Con el token recién generado:

```bash
curl -s "https://graph.facebook.com/v21.0/oauth/access_token?grant_type=fb_exchange_token&client_id=1462994488640283&client_secret=APP_SECRET&fb_exchange_token=TOKEN_DE_24H"
```

`APP_SECRET` es la clave secreta de la app (Meta → Configuración → Básica, la
misma que está en el secreto `WHATSAPP_APP_SECRET`). Si responde con
`access_token`, ese es el que va en `WHATSAPP_TOKEN`; verifica la vigencia real
con:

```bash
curl -s "https://graph.facebook.com/v21.0/debug_token?input_token=TOKEN_NUEVO&access_token=TOKEN_NUEVO"
```

Busca `expires_at` en la respuesta. Si el canje falla, no pasa nada: se sigue con
el token de 24 h como en el paso 2.

---

## 2. Cargar el inventario (lunes, al recibir)

El contador está en **BOYAS 0 · CLAVOS 0** y eso es correcto: no hay existencias.
El lunes entran **clavos** del proveedor y **boyas** de pintura.

Al recibirlas: **Historial → Actualizar inventario** → capturar las cantidades
contadas físicamente.

> **No capturar inventario por adelantado.** Al cerrar una venta el sistema
> descuenta boyas automáticamente, y si el número está inflado deja pasar
> compromisos que no se pueden surtir.

*Nota técnica:* el modal tenía un defecto —al borrar un campo para reescribirlo,
`Number("")` vale `0` en JavaScript y ese cero se guardaba— ya corregido: ahora
un campo vacío es inválido y avisa en lugar de guardar cero.

---

## 3. Business Verification (Step 3)

Sube el límite de **250 → 1,000+** conversaciones iniciadas por día. Es el
trámite más lento (de horas a varios días de revisión), así que conviene
arrancarlo cuanto antes: corre en paralelo con todo lo demás.

### La entidad que se verifica es Aceros Aranda, no VIALUX

VIALUX es una **marca comercial** operada como célula de negocio dentro de Aceros
Aranda; no tiene personalidad jurídica propia. Meta no verifica marcas: verifica
**entidades legales**. Por lo tanto:

- Se verifica con la entidad de la **CSF** (Constancia de Situación Fiscal).
- **No hace falta acta constitutiva.** Meta acepta personas físicas con actividad
  empresarial, y en ese caso el acta simplemente no existe. La CSF es el
  documento estándar para México y acredita nombre legal, RFC y domicilio fiscal
  en un solo papel.
- **VIALUX sí puede ser el nombre visible** en WhatsApp. El *display name* del
  número es una aprobación **aparte** de la verificación de negocio, y admite una
  marca distinta de la razón social.

> Que el negocio tenga ~1 año y no estuviera dado de alta formalmente **no es un
> impedimento**: lo que Meta evalúa es que la entidad exista y que los datos
> coincidan, no su antigüedad.

### ⚠️ Lo primero: alinear el nombre en Meta

La cuenta de negocio en Meta está hoy a nombre de **"Celosias"**. Meta rechaza la
verificación cuando el nombre del negocio **no coincide exactamente** con el del
documento — es la causa #1 de rechazo.

Antes de enviar nada: *Business Settings → Business Info* → dejar el nombre del
negocio **idéntico, carácter por carácter**, al que aparece en la CSF (incluidos
acentos, comas y la forma societaria si la hay).

### Documentos y datos

| Qué | Con qué se cubre |
|---|---|
| Nombre legal + RFC | **CSF** |
| Domicilio fiscal | **CSF** (ya lo trae) |
| Teléfono del negocio | El de la CSF — Meta puede validarlo por llamada o SMS |
| Sitio web | `vialuxmty.com` |

Si Meta pide un **segundo documento** de domicilio, sirve un recibo de luz, agua
o teléfono con menos de 90 días, o un estado de cuenta bancario, **a nombre de la
misma entidad de la CSF**. Meta muestra la lista exacta dentro del flujo.

Todos los datos del formulario deben coincidir entre sí y con la CSF. El
domicilio que traemos documentado es **Juan Zuazua #2945, Col. Victoria,
C.P. 64520, Monterrey, N.L.** — verificar que sea el mismo de la CSF antes de
capturarlo; si difiere, **manda el de la CSF**.

### Recomendación: publicar la landing antes del display name

Para que Meta apruebe **VIALUX** como nombre visible de un número verificado a
nombre de otra entidad, ayuda mucho poder demostrar que la marca existe: que
`vialuxmty.com` cargue una página real con el nombre VIALUX, el domicilio y el
teléfono. Es la evidencia más simple de que la marca es legítima y no un intento
de suplantar a alguien más.

---

## 4. Conectar el número real — por COEXISTENCIA

Número destino: **+52 81 3073 0586** (los ~121 chats actuales).

### Por qué coexistencia y no migración

| | Coexistencia | Migración clásica |
|---|---|---|
| Historial de chats | Se conserva (sincroniza hasta 6 meses) | **Se borra para siempre** |
| App de WhatsApp Business | Sigue funcionando en el celular | Deja de funcionar |
| Reversible | Sí, en un clic | No |

**Nunca hacer la migración clásica.** Requisitos de la coexistencia: app de
WhatsApp Business ≥ 2.24.17 y abrir la app al menos cada ~13 días. Las
**etiquetas** de la app no pasan a la API (los chats y contactos sí).

Para desconectar: *Ajustes → Cuenta → Plataforma de negocios → Desconectar*.

Documentación:
`developers.facebook.com/docs/whatsapp/embedded-signup/custom-flows/onboarding-business-app-users/`

### Antes de conectar

- Tener a la mano el **PIN de verificación en dos pasos** del número. Es el
  bloqueador más común al registrar. Si no se recuerda, desactivarlo desde la
  app *antes* de empezar.
- Publicar la app en Meta (hoy está en **Unpublished**). Sin modo Live no se le
  puede escribir a clientes cualquiera desde el número real.

---

## 5. Reglas de operación (no romper)

1. **No mandar difusión a los ~121 contactos previos.** No hay opt-in formal:
   los bloqueos y reportes tumban el *quality rating* y Meta puede restringir el
   número. Recapturar el consentimiento de forma orgánica, conversación por
   conversación.
2. **Responder dentro de la ventana de 24 h es zona segura** y no consume
   límite. Fuera de esa ventana WhatsApp no permite texto libre: hace falta una
   **plantilla aprobada** (pendiente de crear).
3. El producto (señalización vial B2B) no cae en ninguna categoría prohibida de
   la Commerce Policy.

---

## Prompts para Lovable (copiar y pegar)

Lovable es co-editor de este repo: también hace commits. Por eso conviene pedirle
cosas acotadas y decirle explícitamente qué **no** tocar.

**Actualizar el token de WhatsApp** (el de cada 24 h):

```
Actualiza el secreto WHATSAPP_TOKEN de Supabase con el nuevo valor que te voy a
dar y vuelve a desplegar la edge function whatsapp-enviar para que tome el valor
nuevo.

No modifiques el código de la función ni ningún otro archivo: solo el secreto y
el redespliegue. No toques whatsapp-webhook, esa función no usa ese secreto.
```

**Traer cambios que hice en el repo** (después de que yo suba algo a GitHub):

```
Sincroniza con la última versión de main en GitHub y vuelve a desplegar las edge
functions que hayan cambiado. Dime cuáles redesplegaste. No modifiques código.
```

**Aplicar una migración nueva de base de datos:**

```
Ejecuta la migración SQL que está en supabase/migrations/NOMBRE_DEL_ARCHIVO.sql
tal cual, sin modificarla. Confírmame qué tablas o políticas creó o cambió.
```

*(Lovable no aplica solo las migraciones que vienen del repo — siempre hay que
pedírselo.)*

**Reactivar la validación de firma del webhook** (si se cambia la clave secreta
de la app en Meta):

```
Actualiza el secreto WHATSAPP_APP_SECRET de Supabase con el valor que te voy a
dar y vuelve a desplegar la edge function whatsapp-webhook. No cambies código.
```

En todos los casos, cuando el mensaje mencione un secreto, Lovable abre un
**campo seguro** aparte para pegar el valor. Nunca escribir el token dentro del
mensaje.

---

## Diagnóstico rápido

| Síntoma | Causa probable |
|---|---|
| *"El token de WhatsApp expiró o es inválido"* | Token de 24 h vencido → paso 1 |
| *"El destinatario no está en la lista autorizada"* | Recipient vacío en Step 1, o se perdió al regenerar el token (paso 1·C) |
| *"Pasaron más de 24 h desde el último mensaje"* | Fuera de ventana: hace falta plantilla aprobada |
| Sigue fallando igual después de cargar el token | Lovable no redesplegó `whatsapp-enviar`: la función conserva el secreto viejo hasta que se redespliega |
| No llegan mensajes entrantes | Revisar que el WABA siga suscrito a la app: `POST /940017629110755/subscribed_apps` |
| Mensajes entrantes rechazados con 401 | Firma HMAC: `WHATSAPP_APP_SECRET` no coincide con la clave secreta de Meta |

### Nota técnica: el "1" mexicano

WhatsApp entrega los `wa_id` de México como `521XXXXXXXXXX`, pero Meta registra
al destinatario en su forma real `52XXXXXXXXXX`. Para Meta son identificadores
distintos, y enviar al que no espera devuelve el código **131030**. El envío
prueba ambas variantes automáticamente (`variantesDestino` en
`supabase/functions/whatsapp-enviar/index.ts`).
