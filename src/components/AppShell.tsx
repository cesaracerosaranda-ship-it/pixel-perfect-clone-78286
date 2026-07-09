import { Link } from "@tanstack/react-router";
import { Calculator, ClipboardList, Users } from "lucide-react";
import type { ReactNode } from "react";
import { InventarioBadge } from "./InventarioBadge";

const tabs = [
  { to: "/", label: "Cotizador", icon: Calculator },
  { to: "/historial", label: "Historial", icon: ClipboardList },
  { to: "/clientes", label: "Clientes", icon: Users },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      {/* Top accent line */}
      <div
        style={{
          height: "2px",
          background:
            "linear-gradient(to right, transparent 0%, #C99B0E 20%, #EDBA1A 50%, #C99B0E 80%, transparent 100%)",
        }}
      />

      <header className="border-b border-[#3a3a38] bg-[#343331]">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-6 px-6 py-3.5">
          {/* Brand */}
          <Link to="/" className="group flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#EDBA1A] font-mono text-sm font-black text-[#1B1A17] ring-2 ring-[#EDBA1A]/20 transition-all group-hover:ring-[#EDBA1A]/50">
              VX
            </div>
            <div className="leading-tight">
              <div className="text-[15px] font-black tracking-[0.1em] text-white">
                VIALUX
              </div>
              <div className="text-[9px] uppercase tracking-[0.24em] text-[#606672]">
                Sistema de Control
              </div>
            </div>
          </Link>

          {/* Right: inventory + separator + nav */}
          <div className="flex items-center gap-4">
            <InventarioBadge />

            <div className="h-5 w-px bg-[#4A4842]" />

            <nav className="flex items-center gap-0.5">
              {tabs.map((t) => {
                const Icon = t.icon;
                return (
                  <Link
                    key={t.to}
                    to={t.to}
                    className="flex items-center gap-1.5 rounded-md px-3.5 py-2 text-[11px] font-bold uppercase tracking-[0.12em] text-[#8A8F9A] transition-colors hover:bg-white/[0.06] hover:text-white"
                    activeProps={{
                      className:
                        "flex items-center gap-1.5 rounded-md px-3.5 py-2 text-[11px] font-bold uppercase tracking-[0.12em] bg-[#EDBA1A] text-[#1B1A17] hover:bg-[#EDBA1A]",
                    }}
                    activeOptions={{ exact: t.to === "/" }}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {t.label}
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-[#3a3a38] bg-[#343331] py-3">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-6">
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#4A4842]">
            © 2026 VIALUX
          </span>
          <span className="text-[10px] uppercase tracking-[0.16em] text-[#525866]">
            Señalización Vial · Monterrey, N.L.
          </span>
          <div className="flex items-center gap-1.5">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
            </span>
            <span className="text-[10px] uppercase tracking-[0.14em] text-[#525866]">
              En línea
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
