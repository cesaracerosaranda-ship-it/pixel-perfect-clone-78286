import { Link } from "@tanstack/react-router";
import { Calculator, ClipboardList } from "lucide-react";
import type { ReactNode } from "react";

const tabs = [
  { to: "/", label: "Cotizador", icon: Calculator },
  { to: "/historial", label: "Historial", icon: ClipboardList },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <header className="border-b border-border bg-[#343331]">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-6 px-6 py-4">
          <Link to="/" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-[#EDBA1A] font-mono text-lg font-bold text-[#1C1E22]">
              VX
            </div>
            <div className="leading-tight">
              <div className="text-base font-bold tracking-wider text-white">VIALUX</div>
              <div className="text-[11px] uppercase tracking-[0.18em] text-[#9aa3ad]">
                Control
              </div>
            </div>
          </Link>
          <nav className="flex items-center gap-1">
            {tabs.map((t) => {
              const Icon = t.icon;
              return (
                <Link
                  key={t.to}
                  to={t.to}
                  className="flex items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold uppercase tracking-wider text-[#CFCFCF] transition-colors hover:bg-[#3a3a3a]"
                  activeProps={{
                    className:
                      "flex items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold uppercase tracking-wider bg-[#EDBA1A] text-[#1C1E22] hover:bg-[#EDBA1A]",
                  }}
                  activeOptions={{ exact: t.to === "/" }}
                >
                  <Icon className="h-4 w-4" />
                  {t.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-border bg-[#343331] py-4">
        <div className="mx-auto w-full max-w-7xl px-6 text-center text-xs uppercase tracking-[0.2em] text-[#9aa3ad]">
          © 2026 VIALUX — Señalización Vial de Precisión
        </div>
      </footer>
    </div>
  );
}
