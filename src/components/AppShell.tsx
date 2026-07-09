import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { InventarioBadge } from "./InventarioBadge";
import logoT from "@/assets/vialux-logo-t.png";

const tabs = [
  { to: "/", label: "Cotizador" },
  { to: "/historial", label: "Historial" },
  { to: "/clientes", label: "Clientes" },
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

      <header className="border-b border-[#3A3936] bg-[#343331]">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-6 px-6 py-3">
          {/* Brand */}
          <Link to="/" className="block">
            <img src={logoT} alt="VIALUX" className="h-10 w-auto" />
          </Link>

          {/* Right: inventory + separator + nav */}
          <div className="flex items-center gap-4">
            <InventarioBadge />

            <div className="h-5 w-px bg-[#4A4842]" />

            <nav className="flex items-center gap-1">
              {tabs.map((t) => (
                <Link
                  key={t.to}
                  to={t.to}
                  className="px-4 py-2 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-[#8C867A] transition-colors hover:bg-white/[0.06] hover:text-white"
                  activeProps={{
                    className:
                      "px-4 py-2 font-mono text-[10px] font-bold uppercase tracking-[0.2em] bg-[#EDBA1A] text-[#1B1A17] hover:bg-[#EDBA1A]",
                  }}
                  activeOptions={{ exact: t.to === "/" }}
                >
                  {t.label}
                </Link>
              ))}
            </nav>
          </div>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-[#3A3936] bg-[#343331] py-3">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-6">
          <span className="font-mono text-[9px] uppercase tracking-[0.3em] text-[#4A4842]">
            © 2026 VIALUX
          </span>
          <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-[#7C766A]">
            Señalización Vial · Monterrey, N.L.
          </span>
          <div className="flex items-center gap-1.5">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#10B981] opacity-60" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#10B981]" />
            </span>
            <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-[#7C766A]">
              En línea
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
