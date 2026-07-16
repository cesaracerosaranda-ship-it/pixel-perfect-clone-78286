import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabaseForUser";

export default defineTool({
  name: "get_cotizacion",
  title: "Get quote by folio",
  description: "Fetch a single VIALUX quote by folio (e.g. VX-2026-0042).",
  inputSchema: { folio: z.string().min(1).describe("Folio, e.g. VX-2026-0042") },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ folio }, ctx) => {
    if (!ctx.isAuthenticated()) return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    const sb = supabaseForUser(ctx);
    const { data, error } = await sb.from("cotizaciones").select("*").eq("folio", folio).maybeSingle();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    if (!data) return { content: [{ type: "text", text: `No se encontró folio ${folio}` }], isError: true };
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }], structuredContent: { cotizacion: data } };
  },
});