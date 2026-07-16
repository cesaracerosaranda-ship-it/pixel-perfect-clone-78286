import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabaseForUser";

export default defineTool({
  name: "list_clientes",
  title: "List clients",
  description: "List VIALUX clients. Optional case-insensitive substring search on nombre or empresa.",
  inputSchema: {
    limit: z.number().int().min(1).max(100).optional(),
    search: z.string().optional().describe("Substring match on nombre or empresa"),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit, search }, ctx) => {
    if (!ctx.isAuthenticated()) return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    const sb = supabaseForUser(ctx);
    let q = sb.from("clientes")
      .select("id,nombre,empresa,telefono,email,contacto_nombre,contacto_telefono")
      .order("nombre")
      .limit(limit ?? 50);
    if (search) q = q.or(`nombre.ilike.%${search}%,empresa.ilike.%${search}%`);
    const { data, error } = await q;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }], structuredContent: { clientes: data ?? [] } };
  },
});