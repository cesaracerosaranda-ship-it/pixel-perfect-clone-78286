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

## 1. Renovar el token (hacer esto primero, ~5 min)

El token de Step 1 **caduca cada 24 horas**. Cuando muera, la bandeja marca
*"El token de WhatsApp expiró o es inválido"*.

1. Meta → **Use cases → Connect on WhatsApp → Step 1. Try it out**
2. En **Access token**, botón **Generate token**.
   - **¿A qué se enlaza el token?** No a un número: a una **cuenta de WhatsApp
     Business (WABA)**. Si pide elegir, selecciona la **WABA de prueba
     `940017629110755`** (la que contiene el `+1 555 200-2984`). Hoy debería ser
     la única opción; cuando se conecte el número real aparecerá una segunda.
   - El número que **envía** no lo decide el token, lo decide el secreto
     `WHATSAPP_PHONE_NUMBER_ID` (`1230528186813043`). El token solo autoriza.
   - Copia el token: Meta lo muestra **una sola vez**. Después el campo vuelve a
     decir *"Not generated yet"* aunque el token siga vivo — ese mensaje no
     significa que se haya invalidado.
3. En Lovable, actualiza el secreto `WHATSAPP_TOKEN` y pídele que redespliegue
   la edge function `whatsapp-enviar`.
4. **Vuelve a poner el Recipient.** Regenerar el token *vacía* la lista de
   destinatarios autorizados. Desplegable **Recipient** → agrega
   `+52 81 2063 9813` → verifica con el código que llega por WhatsApp.

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

## 2. Restaurar el inventario

El contador quedó en **BOYAS 0 · CLAVOS 0**. La causa era un defecto en el modal
de *Actualizar inventario*: al **borrar un campo para reescribirlo**, `Number("")`
vale `0` en JavaScript, y ese cero pasaba la validación y se guardaba.

Ya está corregido (un campo vacío ahora es inválido, no cero). Solo hay que
recapturar los valores reales en **Historial → Actualizar inventario**. Los
últimos conocidos eran **190 boyas** y **182 clavos** — confirma contra el conteo
físico antes de guardar.

---

## 3. Business Verification (Step 3)

Sube el límite de **250 → 1,000+** conversaciones iniciadas por día y es
requisito para operar en serio. Es el trámite más lento, así que conviene
arrancarlo cuanto antes: la revisión de Meta tarda de horas a varios días.

### ⚠️ Revisar ANTES de enviar

La cuenta de negocio en Meta está a nombre de **"Celosias"**. Meta rechaza la
verificación si el nombre del negocio **no coincide exactamente** con el de los
documentos. Antes de mandar nada, decidir con qué razón social se va a verificar
y dejar el nombre del negocio idéntico al del acta/cédula fiscal. Esta es la
causa #1 de rechazo.

### Documentos a tener a la mano

Meta muestra la lista exacta dentro del flujo, pero típicamente pide **uno** que
acredite el nombre legal y **uno** que acredite el domicilio:

- Acta constitutiva
- Cédula de identificación fiscal (RFC / SAT)
- Comprobante de domicilio reciente (recibo de luz, agua o teléfono, con menos
  de 90 días)
- Estado de cuenta bancario a nombre del negocio

Datos que pide el formulario, y que deben coincidir entre sí y con los documentos:

- Nombre legal del negocio
- Domicilio: **Juan Zuazua #2945, Col. Victoria, C.P. 64520, Monterrey, N.L.**
- Teléfono del negocio
- Sitio web: `vialuxmty.com`

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

## Diagnóstico rápido

| Síntoma | Causa probable |
|---|---|
| *"El token de WhatsApp expiró o es inválido"* | Token de 24 h vencido → paso 1 |
| *"El destinatario no está en la lista autorizada"* | Recipient vacío en Step 1, o se perdió al regenerar el token |
| *"Pasaron más de 24 h desde el último mensaje"* | Fuera de ventana: hace falta plantilla aprobada |
| No llegan mensajes entrantes | Revisar que el WABA siga suscrito a la app: `POST /940017629110755/subscribed_apps` |
| Mensajes entrantes rechazados con 401 | Firma HMAC: `WHATSAPP_APP_SECRET` no coincide con la clave secreta de Meta |

### Nota técnica: el "1" mexicano

WhatsApp entrega los `wa_id` de México como `521XXXXXXXXXX`, pero Meta registra
al destinatario en su forma real `52XXXXXXXXXX`. Para Meta son identificadores
distintos, y enviar al que no espera devuelve el código **131030**. El envío
prueba ambas variantes automáticamente (`variantesDestino` en
`supabase/functions/whatsapp-enviar/index.ts`).
