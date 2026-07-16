import { useState } from "react";
import { Input } from "@/components/ui/input";
import { ArrowLeftRight, MapPin } from "lucide-react";
import { useCpLookup } from "@/hooks/useCpLookup";
import { haversineKm } from "@/lib/vialux/geo";

/**
 * Comparador de destino alterno: dado el CP del cliente, permite capturar otro
 * CP y ver la distancia entre ambos — para ofrecer un punto de entrega alterno
 * cuando el CP original no tiene ocurre ni entrega a domicilio.
 */
export function CpDistanceTool({
  originCp,
  originMunicipio,
  originEstado,
  originLat,
  originLng,
}: {
  originCp: string;
  originMunicipio: string;
  originEstado: string;
  originLat: number | null;
  originLng: number | null;
}) {
  const [destCp, setDestCp] = useState("");
  const { data: dest, isFetching } = useCpLookup(destCp);

  const originOk = originCp.length === 5 && originLat != null && originLng != null;
  const destComplete = destCp.length === 5;
  const km =
    originOk && dest?.lat != null && dest?.lng != null
      ? haversineKm(originLat, originLng, dest.lat, dest.lng)
      : null;

  return (
    <section className="border border-border bg-card p-5">
      <div className="mb-4 flex items-center gap-2">
        <ArrowLeftRight className="h-3.5 w-3.5 text-[#C79100]" />
        <h3 className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-[#C79100]">
          Comparador de destino alterno
        </h3>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
        {/* Origen (CP del cliente) */}
        <div className="border border-border bg-background px-3 py-2.5">
          <div className="font-mono text-[8px] uppercase tracking-[0.2em] text-[#8A857C]">
            CP del cliente
          </div>
          {originCp.length === 5 ? (
            <>
              <div className="font-mono text-sm font-bold">{originCp}</div>
              <div className="mt-0.5 text-[10px] leading-tight text-muted-foreground">
                {originMunicipio ? `${originMunicipio}, ${originEstado}` : "—"}
              </div>
            </>
          ) : (
            <div className="mt-1 text-[10px] text-muted-foreground">
              Captura el CP del cliente arriba
            </div>
          )}
        </div>

        {/* Distancia */}
        <div className="flex items-center justify-center py-1 sm:px-2">
          {km != null ? (
            <div className="text-center">
              <div className="font-mono text-xl font-black leading-none text-[#C79100] tabular-nums">
                {km}
              </div>
              <div className="font-mono text-[8px] tracking-[0.2em] text-[#8A857C]">KM</div>
            </div>
          ) : (
            <ArrowLeftRight className="h-4 w-4 text-[#D8D5CE]" />
          )}
        </div>

        {/* Destino alterno */}
        <div className="border border-border bg-background px-3 py-2.5">
          <div className="font-mono text-[8px] uppercase tracking-[0.2em] text-[#8A857C]">
            CP alterno
          </div>
          <Input
            value={destCp}
            onChange={(e) => setDestCp(e.target.value.replace(/\D/g, "").slice(0, 5))}
            placeholder="Ej. 64000"
            maxLength={5}
            className="mt-0.5 h-7 border-0 bg-transparent p-0 font-mono text-sm font-bold shadow-none focus-visible:ring-0"
          />
          {destComplete && (
            <div className="mt-0.5 text-[10px] leading-tight text-muted-foreground">
              {isFetching
                ? "Buscando…"
                : dest?.municipio
                  ? `${dest.municipio}, ${dest.estado}`
                  : "CP no encontrado"}
            </div>
          )}
        </div>
      </div>

      {/* Mensaje de apoyo */}
      {km != null && dest && (
        <div className="mt-3 flex items-start gap-2 border border-[#EDBA1A]/25 bg-[#EDBA1A]/5 px-3 py-2.5">
          <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#C79100]" />
          <div className="text-[11px] leading-relaxed">
            {km <= 60 ? (
              <>
                <span className="font-bold">{dest.municipio}</span> está a{" "}
                <span className="font-bold">{km} km</span> del cliente — buen destino
                alterno para ocurre si su CP no tiene cobertura directa.
              </>
            ) : (
              <>
                <span className="font-bold">{dest.municipio}</span> está a{" "}
                <span className="font-bold">{km} km</span> — probablemente demasiado
                lejos para ofrecerlo como recolección. Busca un CP más cercano.
              </>
            )}
          </div>
        </div>
      )}

      {originCp.length === 5 && !originOk && (
        <div className="mt-3 font-mono text-[10px] text-[#8A857C]">
          El CP del cliente no tiene coordenada registrada; no se puede calcular la distancia.
        </div>
      )}
    </section>
  );
}
