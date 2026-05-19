import { ExternalLink, Truck } from "lucide-react";
import { carriersForCp, cpToEstado, STATE_NAMES, type Carrier } from "@/data/carriers";

type Props = { cp: string };

export function CarriersPanel({ cp }: Props) {
  const estado = cpToEstado(cp);
  if (!estado || estado === "NL") return null;

  const carriers = carriersForCp(cp);
  if (carriers.length === 0) return null;

  const stateName = STATE_NAMES[estado] ?? estado;

  return (
    <section className="rounded-lg border border-border bg-[#3D4148] p-5">
      <div className="mb-3 flex items-center gap-2">
        <Truck className="h-3.5 w-3.5 text-[#EDBA1A]" />
        <h3 className="text-xs font-bold uppercase tracking-[0.18em] text-[#EDBA1A]">
          Paqueterías disponibles — {stateName.toUpperCase()}
        </h3>
      </div>
      <div className="space-y-1">
        {carriers.map((c) => (
          <CarrierRow key={c.name} carrier={c} />
        ))}
      </div>
    </section>
  );
}

function CarrierRow({ carrier }: { carrier: Carrier }) {
  return (
    <div className="flex items-center gap-3 rounded-md px-2 py-1.5 hover:bg-white/5 transition-colors">
      <span className="flex-1 text-sm font-medium">{carrier.name}</span>
      {carrier.nota && (
        <span className="text-[10px] text-muted-foreground">{carrier.nota}</span>
      )}
      {carrier.webUrl ? (
        <a
          href={carrier.webUrl}
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
  );
}
