# Plan: Auth del equipo VIALUX + servidor MCP con OAuth

## Contexto

Hoy VIALUX es una app interna sin login, con RLS pública en todas las tablas. Para exponer un MCP protegido con OAuth (ChatGPT/Claude conectan como usuario real), la app necesita:

1. Autenticación de usuarios (login con Google + correo/contraseña).
2. Todas las tablas del negocio pasan a "solo usuarios autenticados" (mismo comportamiento: todos ven todo, pero requieren sesión).
3. Servidor MCP con las herramientas de VIALUX.

## Cambios en la app

### 1. Auth (Google + correo/contraseña)
- Habilitar Google + Email en Lovable Cloud (`configure_social_auth`).
- Crear ruta pública `/auth` (login/signup con Google prominente + correo/contraseña).
- Crear layout `src/routes/_authenticated/route.tsx` (gestionado por la integración: `ssr:false`, redirige a `/auth`).
- **Mover TODAS las rutas actuales bajo `_authenticated/`**: `index.tsx` (cotizador), `historial.tsx`, `clientes.tsx`. Home protegida = cotizador.
- Agregar UI mínima de "cerrar sesión" en el AppShell.
- Sin roles: cualquier usuario autenticado ve todo (igual que hoy).

### 2. RLS: público → authenticated
Migración que reemplaza las políticas `public` actuales por políticas `TO authenticated` en: `cotizaciones`, `clientes`, `documentos`, `inventario`, `folio_counter`, `carrier_coverage`, `codigos_postales`. Ajusta también las 4 policies del bucket `documentos` en storage.

Efecto: la app funciona igual para el equipo logueado; deja de ser accesible anónimamente (que es justo el punto).

### 3. Servidor MCP (`@lovable.dev/mcp-js`)
- Instalar `@lovable.dev/mcp-js` (agregar al `minimumReleaseAgeExcludes` de `bunfig.toml`).
- Activar OAuth server con `supabase--configure_oauth_server`.
- Crear ruta de consentimiento `src/routes/[.]lovable.oauth.consent.tsx` (usa la sesión Supabase existente; el `/auth` recién creado preserva `next` para volver a esta URL).
- `src/lib/mcp/index.ts` con `auth.oauth.issuer` apuntando al issuer directo de Supabase.
- Plugin `mcpPlugin()` en `vite.config.ts`, endpoint público `/mcp`.

### 4. Herramientas MCP iniciales (todas usan la sesión OAuth del usuario → RLS aplica)
Cada tool corre con el token del usuario que conectó — mismos permisos que en la app.

Lectura:
- `list_cotizaciones` — filtros por estado/cliente/folio, límite.
- `get_cotizacion` — detalle por folio o id.
- `list_clientes` — buscar por nombre/empresa.
- `get_inventario` — boyas disponibles.
- `buscar_cp` — municipio/estado/coordenadas por CP.

Escritura (con `annotations.destructiveHint`):
- `crear_cotizacion` — genera folio, calcula totales, guarda draft "cotizado".
- `actualizar_estado_cotizacion` — cotizado → enviado/cerrado/perdido (dispara trigger de inventario).
- `crear_cliente` — alta rápida.

No incluyo tools que manden correo ni generen PDF por ahora (requieren edge function/PDF en cliente; se pueden agregar después si las pides).

### 5. Favicon
La app no tiene favicon custom; agrego uno simple con la "V" amarilla de VIALUX para que aparezca en el conector.

## Cambios que verás

- Al abrir la app te pedirá login. Todo el equipo debe crearse cuenta (una sola vez).
- Desde ChatGPT/Claude podrás "Añadir conector VIALUX MCP", firmarás con tu cuenta VIALUX, y podrás pedirle cosas como *"lista las cotizaciones cerradas de junio"* o *"crea una cotización para Itzare Dayan de 500 boyas con clavos, con factura, CP 64000"*.

## Fuera de alcance de esta primera entrega

- Roles admin/ventas (elegiste "login simple"; si luego quieres restringir escrituras solo agrega la capa `user_roles`).
- Que las herramientas MCP manden correo o generen PDF automáticamente.
- Migrar históricos de usuarios (no hay: arrancamos desde cero).

## Detalles técnicos

- Middleware `attachSupabaseAuth` ya está registrado en `src/start.ts` (bien).
- `SUPABASE_JWKS` ya está en secretos (bien para verificación de tokens OAuth).
- Issuer OAuth = `https://zolvicxzerlrkbitweov.supabase.co/auth/v1` (directo, no proxy).
- Tools MCP construyen un Supabase client por request con el token del `ctx.getToken()` para que RLS respete la identidad del usuario OAuth.
- La edge function `enviar-cotizacion` sigue funcionando igual (usa service-role internamente).

¿Le doy?
