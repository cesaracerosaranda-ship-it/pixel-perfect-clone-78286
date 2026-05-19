import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Copy, Trash2, Search, Package } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { formatMoney } from "@/lib/vialux/constants";

export const Route = createFileRoute("/historial")({
  component: HistorialPage,
});

type Estado = "cotizado" | "cerrado" | "enviado" | "perdido";

const ESTADO_LABEL: Record<Estado, string> = {
  cotizado: "COTIZADO",
  cerrado: "CERRADO",
  enviado: "ENVIADO",
  perdido: "PERDIDO",
};
const ESTADO_CLASS: Record<Estado, string> = {
  cotizado: "bg-[#EDBA1A] text-[#1C1E22]",
  cerrado: "bg-emerald-500 text-white",
  enviado: "bg-sky-500 text-white",
  perdido: "bg-red-500 text-white",
};

function HistorialPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | Estado>("all");

  const cotizacionesQuery = useQuery({
    queryKey: ["cotizaciones"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cotizaciones")
        .select("*")
        .order("fecha", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const inventarioQuery = useQuery({
    queryKey: ["inventario"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inventario")
        .select("*")
        .eq("id", 1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    const ch = supabase
      .channel("cotizaciones-rt")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "cotizaciones" },
        () => qc.invalidateQueries({ queryKey: ["cotizaciones"] }),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "inventario" },
        () => qc.invalidateQueries({ queryKey: ["inventario"] }),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(ch);
    };
  }, [qc]);

  const rows = useMemo(() => {
    const all = cotizacionesQuery.data ?? [];
    return all.filter((r) => {
      if (filter !== "all" && r.estado !== filter) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          r.folio.toLowerCase().includes(q) ||
          r.cliente_nombre.toLowerCase().includes(q) ||
          (r.cliente_empresa ?? "").toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [cotizacionesQuery.data, search, filter]);

  const changeStatus = async (id: string, estado: Estado) => {
    if (estado === "cerrado") {
      const row = cotizacionesQuery.data?.find((r) => r.id === id);
      const inv = inventarioQuery.data?.boyas_disponibles ?? 0;
      if (row && row.estado !== "cerrado" && inv < row.cantidad) {
        toast.error(
          `Sin stock suficiente — ${inv} boyas disponibles, se requieren ${row.cantidad}`,
        );
        return;
      }
    }

    const { error } = await supabase
      .from("cotizaciones")
      .update({ estado })
      .eq("id", id);

    if (error) {
      if (error.message.includes("Stock insuficiente")) {
        const inv = inventarioQuery.data?.boyas_disponibles ?? "?";
        toast.error(`Sin stock — solo ${inv} boyas disponibles`);
      } else {
        toast.error(error.message);
      }
    } else {
      toast.success(`Estado: ${ESTADO_LABEL[estado]}`);
    }
  };

  const removeRow = async (id: string) => {
    const { error } = await supabase.from("cotizaciones").delete().eq("id", id);
    if (error) toast.error(error.message);
    else toast.success("Cotización eliminada");
  };

  const duplicate = (id: string) => {
    navigate({ to: "/", search: { duplicate: id } });
  };

  return (
    <div className="mx-auto w-full max-w-7xl px-6 py-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold uppercase tracking-wider">Historial</h1>
          <p className="text-xs uppercase tracking-[0.16em] text-[#6B8899]">
            Registro de ventas y cotizaciones
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-md border border-[#EDBA1A]/40 bg-[#EDBA1A]/5 px-4 py-2">
          <Package className="h-4 w-4 text-[#EDBA1A]" />
          <div className="text-[10px] uppercase tracking-[0.16em] text-[#C99B0E]">
            Inventario
          </div>
          <div className="font-mono text-base font-bold text-[#EDBA1A]">
            {inventarioQuery.data?.boyas_disponibles ?? "—"}
          </div>
          <div className="text-xs text-muted-foreground">boyas</div>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por cliente, empresa o folio..."
            className="pl-9"
          />
        </div>
        <Select value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
          <SelectTrigger className="w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            <SelectItem value="cotizado">Cotizado</SelectItem>
            <SelectItem value="enviado">Enviado</SelectItem>
            <SelectItem value="cerrado">Cerrado</SelectItem>
            <SelectItem value="perdido">Perdido</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="overflow-hidden rounded-lg border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-background/40 text-[10px] uppercase tracking-[0.14em] text-[#6B8899]">
            <tr>
              <th className="px-4 py-3 text-left">Folio</th>
              <th className="px-4 py-3 text-left">Fecha</th>
              <th className="px-4 py-3 text-left">Cliente</th>
              <th className="px-4 py-3 text-left">Empresa</th>
              <th className="px-4 py-3 text-right">Cant.</th>
              <th className="px-4 py-3 text-right">Total</th>
              <th className="px-4 py-3 text-left">Estado</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {cotizacionesQuery.isLoading ? (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-muted-foreground">
                  Cargando...
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-muted-foreground">
                  Sin cotizaciones todavía.
                </td>
              </tr>
            ) : (
              rows.map((r) => {
                const estado = r.estado as Estado;
                return (
                  <tr key={r.id} className="border-t border-border hover:bg-muted/20">
                    <td className="px-4 py-3 font-mono text-xs font-bold text-[#EDBA1A]">
                      {r.folio}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                      {new Date(r.fecha).toLocaleDateString("es-MX")}
                    </td>
                    <td className="px-4 py-3 font-semibold uppercase">
                      {r.cliente_nombre}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {r.cliente_empresa || "—"}
                    </td>
                    <td className="px-4 py-3 text-right font-mono">{r.cantidad}</td>
                    <td className="px-4 py-3 text-right font-mono font-bold">
                      {formatMoney(Number(r.total))}
                    </td>
                    <td className="px-4 py-3">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${ESTADO_CLASS[estado]}`}
                          >
                            {ESTADO_LABEL[estado]}
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          {(Object.keys(ESTADO_LABEL) as Estado[]).map((e) => (
                            <DropdownMenuItem
                              key={e}
                              onClick={() => changeStatus(r.id, e)}
                            >
                              {ESTADO_LABEL[e]}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => duplicate(r.id)}
                          title="Duplicar"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="icon" variant="ghost" title="Eliminar">
                              <Trash2 className="h-4 w-4 text-red-400" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Eliminar cotización</AlertDialogTitle>
                              <AlertDialogDescription>
                                ¿Eliminar {r.folio}? Esta acción no se puede deshacer.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => removeRow(r.id)}
                                className="bg-red-500 hover:bg-red-600"
                              >
                                Eliminar
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
