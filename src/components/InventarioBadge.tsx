import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Package } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export function InventarioBadge() {
  const qc = useQueryClient();

  const { data } = useQuery({
    queryKey: ["inventario"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inventario")
        .select("boyas_disponibles")
        .eq("id", 1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    staleTime: 30_000,
  });

  useEffect(() => {
    const channel = supabase
      .channel("inventario-badge")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "inventario" },
        () => qc.invalidateQueries({ queryKey: ["inventario"] }),
      )
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [qc]);

  const boyas = data?.boyas_disponibles;
  const isLow = boyas !== undefined && boyas < 100;

  return (
    <div
      title={`Inventario: ${boyas ?? "—"} boyas disponibles`}
      className={`flex items-center gap-1.5 border px-2.5 py-1.5 ${
        isLow
          ? "border-red-500/40 bg-red-500/10"
          : "border-[#EDBA1A]/25 bg-[#EDBA1A]/10"
      }`}
    >
      <Package className={`h-3.5 w-3.5 ${isLow ? "text-red-400" : "text-[#EDBA1A]"}`} />
      <span
        className={`font-mono text-[9px] uppercase tracking-[0.2em] ${isLow ? "text-red-400" : "text-[#C99B0E]"}`}
      >
        Inv.
      </span>
      <span
        className={`font-mono text-sm font-bold ${isLow ? "text-red-400" : "text-[#EDBA1A]"}`}
      >
        {boyas ?? "—"}
      </span>
    </div>
  );
}
