import { supabase } from "@/integrations/supabase/client";

/**
 * Nombres que no identifican a nadie.
 *
 * Cotizar "A QUIEN CORRESPONDA" es el caso normal cuando quien llama no da sus
 * datos. El problema es que el directorio empareja por nombre: sin esto, TODAS
 * las cotizaciones a quien corresponda colapsan en un solo cliente y se
 * mezclan las bitácoras de empresas que no tienen nada que ver.
 */
const NOMBRES_GENERICOS = new Set([
  "", "-", "—", "A QUIEN CORRESPONDA", "QUIEN CORRESPONDA", "SIN NOMBRE", "N/A", "NA",
]);

export function esNombreGenerico(valor: string | null | undefined): boolean {
  return NOMBRES_GENERICOS.has((valor ?? "").trim().toUpperCase());
}

/**
 * Con qué nombre vive este cliente en el directorio.
 *
 * Si hay persona, manda la persona. Si no la hay pero sí empresa, manda la
 * empresa — que en B2B industrial es de todos modos la entidad que perdura.
 * Si no hay ninguna de las dos, no se puede identificar y no se crea nada.
 */
export function identidadCliente(input: {
  nombre?: string | null;
  empresa?: string | null;
}): string | null {
  const nombre = (input.nombre ?? "").trim().toUpperCase();
  if (!esNombreGenerico(nombre)) return nombre;
  const empresa = (input.empresa ?? "").trim().toUpperCase();
  if (!esNombreGenerico(empresa)) return empresa;
  return null;
}

/** Cómo se muestra en pantalla: la empresa cuando la persona es anónima. */
export function nombreParaMostrar(input: {
  nombre?: string | null;
  empresa?: string | null;
}): string {
  const id = identidadCliente(input);
  if (id) return id;
  return (input.nombre ?? "").trim().toUpperCase() || "SIN NOMBRE";
}

/**
 * Busca el cliente y devuelve su id para ligar la cotización.
 * Si no existe, lo crea. Si existe, rellena/actualiza teléfono y empresa
 * cuando la cotización trae datos más recientes (backfill) — sin esto,
 * el teléfono capturado en el cotizador nunca llega al directorio.
 *
 * Empareja por `identidadCliente`, no por el nombre crudo.
 */
/**
 * Último C.P. de destino conocido para un cliente.
 *
 * El directorio no guarda código postal — vive en cada cotización. Cuando un
 * cliente existente se carga en el cotizador, su destino más probable es el de
 * su cotización más reciente, así que se deriva de ahí. Se busca primero por
 * cliente_id y, para cotizaciones viejas que se guardaron sin ligar, por
 * nombre. Devuelve "" si no hay antecedente.
 */
export async function ultimoCpDeCliente(args: {
  clienteId?: string | null;
  nombre?: string | null;
}): Promise<string> {
  if (args.clienteId) {
    const { data } = await supabase
      .from("cotizaciones")
      .select("cp_destino")
      .eq("cliente_id", args.clienteId)
      .not("cp_destino", "is", null)
      .order("fecha", { ascending: false })
      .limit(1);
    const cp = (data?.[0]?.cp_destino ?? "").trim();
    if (cp) return cp;
  }
  const nombre = (args.nombre ?? "").trim().toUpperCase();
  if (nombre) {
    const { data } = await supabase
      .from("cotizaciones")
      .select("cp_destino")
      .eq("cliente_nombre", nombre)
      .not("cp_destino", "is", null)
      .order("fecha", { ascending: false })
      .limit(1);
    const cp = (data?.[0]?.cp_destino ?? "").trim();
    if (cp) return cp;
  }
  return "";
}

/**
 * Lanza si la base rechaza la operación.
 *
 * Antes las tres consultas descartaban su error: el select, el update (cuyo
 * resultado ni se guardaba) y el insert. Cuando algo fallaba —RLS, un nombre
 * duplicado que hace fallar el `maybeSingle`, una restricción— la función
 * devolvía null sin decir nada, la cotización se guardaba con `cliente_id`
 * vacío, y el correo capturado en el formulario nunca llegaba a `clientes`.
 *
 * El síntoma aparecía mucho después y en otro lado: "El cliente no tiene correo
 * registrado" al intentar enviar la cotización. Un fallo mudo aquí cuesta media
 * hora de diagnóstico allá.
 */
export async function upsertCliente(input: {
  nombre: string;
  empresa?: string;
  telefono?: string;
  email?: string;
}): Promise<string | null> {
  const nombre = identidadCliente(input);
  if (!nombre) return null;
  const empresaRaw = (input.empresa || "").trim().toUpperCase();
  const empresa = empresaRaw === "-" || empresaRaw === "—" ? "" : empresaRaw;
  const telefono = (input.telefono || "").trim();
  const email = (input.email || "").trim();

  // Se pide una lista en vez de `maybeSingle`: con nombres duplicados aquel
  // devuelve error y el cliente existente se volvía invisible, provocando un
  // insert que chocaba o duplicaba. Si hay varios se toma el más reciente.
  const { data: encontrados, error: eBuscar } = await supabase
    .from("clientes")
    .select("id, empresa, telefono, email, updated_at")
    .eq("nombre", nombre)
    .order("updated_at", { ascending: false })
    .limit(1);
  if (eBuscar) throw new Error(`No se pudo buscar al cliente: ${eBuscar.message}`);

  const existing = encontrados?.[0];
  if (existing) {
    const patch: { telefono?: string; empresa?: string; email?: string } = {};
    if (telefono && telefono !== existing.telefono) patch.telefono = telefono;
    if (empresa && empresa !== existing.empresa) patch.empresa = empresa;
    if (email && email !== existing.email) patch.email = email;
    if (Object.keys(patch).length) {
      const { error: eActualizar } = await supabase
        .from("clientes")
        .update(patch)
        .eq("id", existing.id);
      if (eActualizar) {
        throw new Error(`No se pudieron actualizar los datos del cliente: ${eActualizar.message}`);
      }
    }
    return existing.id;
  }

  const { data: created, error: eCrear } = await supabase
    .from("clientes")
    .insert({ nombre, empresa, telefono, email })
    .select("id")
    .single();
  if (eCrear) throw new Error(`No se pudo crear el cliente: ${eCrear.message}`);
  return created?.id ?? null;
}
