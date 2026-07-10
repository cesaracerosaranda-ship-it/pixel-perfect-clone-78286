// Repara datos existentes en el directorio de clientes:
// 1. Rellena teléfono/empresa del cliente desde su cotización más reciente que sí los tenga
// 2. Liga cotizaciones con cliente_id NULL a su cliente por nombre (creándolo si falta)
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

const env = Object.fromEntries(
  readFileSync(".env", "utf8")
    .split("\n")
    .filter((l) => l.includes("="))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^"|"$/g, "")];
    }),
);
const sb = createClient(env.SUPABASE_URL, env.SUPABASE_PUBLISHABLE_KEY);

const { data: cotizaciones, error: e1 } = await sb
  .from("cotizaciones")
  .select("id, cliente_id, cliente_nombre, cliente_empresa, cliente_telefono, fecha")
  .order("fecha", { ascending: false });
if (e1) throw e1;

const { data: clientes, error: e2 } = await sb
  .from("clientes")
  .select("id, nombre, empresa, telefono");
if (e2) throw e2;

const byNombre = new Map(clientes.map((c) => [c.nombre.trim().toUpperCase(), c]));
const clean = (v) => {
  const s = (v || "").trim();
  return s === "-" || s === "—" ? "" : s;
};

// 1) Backfill de teléfono/empresa (la cotización más reciente gana; lista ya viene desc)
let patched = 0;
for (const c of clientes) {
  const patch = {};
  for (const q of cotizaciones) {
    if (q.cliente_nombre.trim().toUpperCase() !== c.nombre.trim().toUpperCase()) continue;
    if (!clean(c.telefono) && !patch.telefono && clean(q.cliente_telefono))
      patch.telefono = clean(q.cliente_telefono);
    if (!clean(c.empresa) && !patch.empresa && clean(q.cliente_empresa))
      patch.empresa = clean(q.cliente_empresa).toUpperCase();
    if (patch.telefono && patch.empresa) break;
  }
  if (Object.keys(patch).length) {
    const { error } = await sb.from("clientes").update(patch).eq("id", c.id);
    if (error) throw error;
    patched++;
    console.log(`  ✓ ${c.nombre}: ${JSON.stringify(patch)}`);
  }
}

// 2) Ligar cotizaciones huérfanas
let linked = 0;
for (const q of cotizaciones) {
  if (q.cliente_id) continue;
  const nombre = q.cliente_nombre.trim().toUpperCase();
  let cliente = byNombre.get(nombre);
  if (!cliente) {
    const { data, error } = await sb
      .from("clientes")
      .insert({
        nombre,
        empresa: clean(q.cliente_empresa).toUpperCase(),
        telefono: clean(q.cliente_telefono),
      })
      .select("id, nombre, empresa, telefono")
      .single();
    if (error) throw error;
    cliente = data;
    byNombre.set(nombre, cliente);
    console.log(`  + cliente creado: ${nombre}`);
  }
  const { error } = await sb
    .from("cotizaciones")
    .update({ cliente_id: cliente.id })
    .eq("id", q.id);
  if (error) throw error;
  linked++;
}

console.log(`\nListo: ${patched} clientes con datos rellenados, ${linked} cotizaciones ligadas.`);
