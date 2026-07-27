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
        .select("*")
        .eq("id", 1)
        .maybeSingle();
      if (error) throw error;
      return data as
        | { boyas_disponibles: number; clavos_disponibles?: number }
        | null;
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
  const clavos = data?.clavos_disponibles;
  const isLow = boyas !== undefined && boyas < 100;

  const fmt = (n: number | undefined) =>
    n === undefined ? "—" : n.toLocaleString("es-MX");

  const accent = isLow ? "text-red-400" : "text-[#EDBA1A]";
  const label = isLow ? "text-red-400" : "text-[#C99B0E]";

  return (
    <div
      title={`Inventario: ${fmt(boyas)} boyas · ${fmt(clavos)} clavos`}
      className={`flex items-center gap-2.5 border px-3 py-1.5 ${
        isLow ? "border-red-500/40 bg-red-500/10" : "border-[#EDBA1A]/25 bg-[#EDBA1A]/10"
      }`}
    >
      <Package className={`h-3.5 w-3.5 ${accent}`} />
      <div className="flex items-baseline gap-1.5">
        <span className={`font-mono text-[9px] uppercase tracking-[0.2em] ${label}`}>Boyas</span>
        <span className={`font-mono text-sm font-bold ${accent}`}>{fmt(boyas)}</span>
      </div>
      <div className="h-3.5 w-px bg-[#EDBA1A]/25" />
      <div className="flex items-baseline gap-1.5">
        <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-[#C99B0E]">Clavos</span>
        <span className="font-mono text-sm font-bold text-[#EDBA1A]">{fmt(clavos)}</span>
      </div>
    </div>
  );
}
