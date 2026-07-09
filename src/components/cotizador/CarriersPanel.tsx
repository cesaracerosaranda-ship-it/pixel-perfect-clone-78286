import { ExternalLink, Loader2, Truck } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { carriersForCp, cpToEstado, STATE_COORDS, STATE_NAMES } from "@/data/carriers";
import type { Tables } from "@/integrations/supabase/types";

type CoverageRow = Tables<"carrier_coverage">;

type Props = { cp: string; clientLat?: number | null; clientLng?: number | null };

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

function resolveClientCoords(
  clientLat: number | null | undefined,
  clientLng: number | null | undefined,
  estado: string,
): [number, number] {
  if (clientLat != null && clientLng != null) return [clientLat, clientLng];
  return STATE_COORDS[estado] ?? [23.6345, -102.5528];
}

function webUrlForCarrier(name: string): string | null {
  const n = name.toLowerCase();
  if (n.includes("julian") || n.includes("obregon") || n.includes("obregón")) {
    return "https://www.juliandeobregon.com.mx/";
  }
  if (n.includes("tres guerras")) return "https://www.tresguerras.com.mx/";
  if (n.startsWith("jr ") || n === "jr paquetería" || n === "jr paqueteria") {
    return "https://www.jrpaqueteria.com/";
  }
  if (n.includes("flecha amarilla")) return "https://www.flechaamarilla.com.mx/";
  return null;
}

type CarrierEntry = {
  name: string;
  ciudad: string;
  km: number;
  webUrl: string | null;
};

export function CarriersPanel({ cp, clientLat, clientLng }: Props) {
  const estado = cpToEstado(cp);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["carrier_coverage", estado],
    enabled: !!estado && estado !== "NL" && cp.length === 5,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("carrier_coverage")
        .select("*")
        .eq("estado", estado!);
      if (error) throw error;
      return (data ?? []) as CoverageRow[];
    },
  });

  if (!estado || estado === "NL") return null;
  if (cp.length < 5) return null;

  const stateName = STATE_NAMES[estado] ?? estado;

  if (isLoading) {
    return (
      <section className="rounded-lg border border-border bg-[#3A3936] p-5">
        <div className="flex items-center gap-2">
          <Loader2 className="h-3.5 w-3.5 animate-spin text-[#EDBA1A]" />
          <span className="text-xs uppercase tracking-[0.16em] text-[#EDBA1A]">
            Cargando paqueterías…
          </span>
        </div>
      </section>
    );
  }

  // Fallback to static data on error or empty result
  if (isError || !data || data.length === 0) {
    const staticCarriers = carriersForCp(cp);
    if (staticCarriers.length === 0) return null;
    return (
      <section className="rounded-lg border border-border bg-[#3A3936] p-5">
        <div className="mb-3 flex items-center gap-2">
          <Truck className="h-3.5 w-3.5 text-[#EDBA1A]" />
          <h3 className="text-xs font-bold uppercase tracking-[0.18em] text-[#EDBA1A]">
            Paqueterías disponibles — {stateName.toUpperCase()}
          </h3>
        </div>
        <div className="space-y-1">
          {staticCarriers.map((c) => (
            <div
              key={c.name}
              className="flex items-center gap-3 rounded-md px-2 py-1.5 transition-colors hover:bg-white/5"
            >
              <span className="flex-1 text-sm font-medium">{c.name}</span>
              {c.nota && (
                <span className="text-[10px] text-muted-foreground">{c.nota}</span>
              )}
              {c.webUrl ? (
                <a
                  href={c.webUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 rounded-full bg-green-500/20 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-green-400 transition-colors hover:bg-green-500/30"
                >
                  WEB <ExternalLink className="h-2.5 w-2.5" />
                </a>
              ) : (
                <span className="rounded-full bg-gray-500/20 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                  CONTACTAR
                </span>
              )}
            </div>
          ))}
        </div>
      </section>
    );
  }

  // Compute client reference coordinates
  const [cLat, cLng] = resolveClientCoords(clientLat, clientLng, estado);

  // Group by carrier, keep nearest branch
  const byCarrier = new Map<string, CarrierEntry>();
  for (const row of data) {
    if (row.lat === null || row.lng === null) continue;
    const km = haversineKm(cLat, cLng, row.lat, row.lng);
    const existing = byCarrier.get(row.paqueteria);
    if (!existing || km < existing.km) {
      byCarrier.set(row.paqueteria, {
        name: row.paqueteria,
        ciudad: row.ciudad_destino,
        km,
        webUrl: webUrlForCarrier(row.paqueteria),
      });
    }
  }

  // Also include carriers with no coords (unknown distance) — add at end
  const noCoordsCarriers = new Map<string, CarrierEntry>();
  for (const row of data) {
    if (row.lat !== null && row.lng !== null) continue;
    if (!byCarrier.has(row.paqueteria) && !noCoordsCarriers.has(row.paqueteria)) {
      noCoordsCarriers.set(row.paqueteria, {
        name: row.paqueteria,
        ciudad: row.ciudad_destino,
        km: Infinity,
        webUrl: webUrlForCarrier(row.paqueteria),
      });
    }
  }

  const sorted = [
    ...[...byCarrier.values()].sort((a, b) => a.km - b.km),
    ...[...noCoordsCarriers.values()],
  ];

  if (sorted.length === 0) return null;

  return (
    <section className="rounded-lg border border-border bg-[#3A3936] p-5">
      <div className="mb-3 flex items-center gap-2">
        <Truck className="h-3.5 w-3.5 text-[#EDBA1A]" />
        <h3 className="text-xs font-bold uppercase tracking-[0.18em] text-[#EDBA1A]">
          Paqueterías disponibles — {stateName.toUpperCase()}
        </h3>
      </div>
      <div className="space-y-1">
        {sorted.map((entry) => (
          <CarrierRow key={entry.name} entry={entry} />
        ))}
      </div>
    </section>
  );
}

function CarrierRow({ entry }: { entry: CarrierEntry }) {
  const hasDistance = entry.km !== Infinity;
  const isClose = hasDistance && entry.km < 50;

  return (
    <div className="flex items-start gap-3 rounded-md px-2 py-1.5 transition-colors hover:bg-white/5">
      <span className="flex-1 text-sm font-medium">{entry.name}</span>
      <div className="flex flex-col items-end gap-0.5">
        {hasDistance && (
          <span
            className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
              isClose
                ? "bg-green-500/20 text-green-400"
                : "bg-amber-500/20 text-amber-400"
            }`}
          >
            {isClose
              ? `Cobertura directa: ${entry.ciudad} · ${entry.km} km`
              : `Sucursal más cercana: ${entry.ciudad} a ${entry.km} km — OCURRE recomendado`}
          </span>
        )}
        {entry.webUrl ? (
          <a
            href={entry.webUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 rounded-full bg-green-500/20 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-green-400 transition-colors hover:bg-green-500/30"
          >
            WEB <ExternalLink className="h-2.5 w-2.5" />
          </a>
        ) : (
          <span className="rounded-full bg-gray-500/20 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-gray-400">
            CONTACTAR
          </span>
        )}
      </div>
    </div>
  );
}
