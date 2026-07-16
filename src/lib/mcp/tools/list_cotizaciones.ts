import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabaseForUser";

export default defineTool({
  name: "list_cotizaciones",
  title: "List quotes",
  description:
    "List VIALUX quotes (cotizaciones) ordered by fecha desc. Optional filters by estado and cliente_nombre substring.",
  inputSchema: {
    limit: z.number().int().min(1).max(100).optional().describe("Max rows (default 20)"),
    estado: z
      .enum(["cotizado", "cerrado", "enviado", "perdido"])
      .optional()
      .describe("Filter by quote status"),
    cliente: z.string().optional().describe("Substring match on cliente_nombre (case-insensitive)"),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit, estado, cliente }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const sb = supabaseForUser(ctx);
    let q = sb
      .from("cotizaciones")
      .select(
        "folio,fecha,cliente_nombre,cliente_empresa,producto,cantidad,total,estado,revision",
      )
      .order("fecha", { ascending: false })
      .limit(limit ?? 20);
    if (estado) q = q.eq("estado", estado);
    if (cliente) q = q.ilike("cliente_nombre", `%${cliente}%`);
    const { data, error } = await q;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      structuredContent: { cotizaciones: data ?? [] },
    };
  },
});