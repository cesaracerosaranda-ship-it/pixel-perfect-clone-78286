import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listCotizaciones from "./tools/list_cotizaciones";
import getCotizacion from "./tools/get_cotizacion";
import listClientes from "./tools/list_clientes";
import getInventario from "./tools/get_inventario";
import lookupCp from "./tools/lookup_cp";

const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "vialux-mcp",
  title: "VIALUX Control",
  version: "0.1.0",
  instructions:
    "Herramientas VIALUX (señalización vial, Monterrey MX): consulta cotizaciones, clientes, inventario de boyas y códigos postales.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [listCotizaciones, getCotizacion, listClientes, getInventario, lookupCp],
});