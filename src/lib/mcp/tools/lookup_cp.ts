import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabaseForUser";

export default defineTool({
  name: "lookup_cp",
  title: "Lookup Mexican postal code",
  description: "Look up a Mexican postal code (CP) and return municipio, estado, and coordinates.",
  inputSchema: { cp: z.string().regex(/^\d{5}$/).describe("5-digit Mexican postal code") },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ cp }, ctx) => {
    if (!ctx.isAuthenticated()) return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    const sb = supabaseForUser(ctx);
    const { data, error } = await sb.from("codigos_postales").select("cp,municipio,estado,estado_clave,lat,lng").eq("cp", cp).maybeSingle();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    if (!data) return { content: [{ type: "text", text: `CP ${cp} no encontrado` }], isError: true };
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }], structuredContent: data };
  },
});