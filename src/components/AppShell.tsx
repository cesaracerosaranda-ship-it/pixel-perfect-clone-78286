import { Link, useNavigate } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { InventarioBadge } from "./InventarioBadge";
import logoT from "@/assets/vialux-logo-t.png";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { LogOut } from "lucide-react";

const tabs = [
  { to: "/", label: "Cotizador" },
  { to: "/pipeline", label: "Pipeline" },
  { to: "/cobranza", label: "Cobranza" },
  { to: "/historial", label: "Historial" },
  { to: "/clientes", label: "Clientes" },
  { to: "/whatsapp", label: "WhatsApp" },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  async function handleSignOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true, search: { next: undefined } });
  }

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <a href="#contenido" className="vx-skip-link">
        Saltar al contenido
      </a>

      {/* Top accent line */}
      <div
        style={{
          height: "2px",
          background:
            "linear-gradient(to right, transparent 0%, #8A6508 20%, #EDBA1A 50%, #8A6508 80%, transparent 100%)",
        }}
      />

      <header className="border-b border-[#3A3936] bg-[#343331]">
        {/* En pantallas angostas el nav baja a su propio renglón y se desplaza
            en horizontal: seis pestañas con tipografía legible ya no caben en
            una sola fila, y comprimirlas sacrificaría lo que acabamos de ganar. */}
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 px-6 py-3 lg:flex-row lg:items-center lg:justify-between lg:gap-6">
          <div className="flex items-center justify-between gap-4">
            <Link to="/" search={{ duplicate: undefined, clienteId: undefined }} className="block shrink-0">
              <img src={logoT} alt="VIALUX" className="h-10 w-auto" />
            </Link>
            <InventarioBadge />
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden h-5 w-px shrink-0 bg-[#4A4842] lg:block" />

            <nav
              aria-label="Navegación principal"
              className="-mx-1 flex items-center gap-1 overflow-x-auto px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
              {tabs.map((t) => (
                <Link
                  key={t.to}
                  to={t.to}
                  className="shrink-0 whitespace-nowrap px-4 py-2 font-mono text-[12px] font-bold uppercase tracking-[0.2em] text-[#A8A29A] transition-colors hover:bg-white/[0.06] hover:text-white"
                  activeProps={{
                    "aria-current": "page",
                    className:
                      "shrink-0 whitespace-nowrap px-4 py-2 font-mono text-[12px] font-bold uppercase tracking-[0.2em] bg-[#EDBA1A] text-[#1B1A17] hover:bg-[#EDBA1A]",
                  }}
                  activeOptions={{ exact: t.to === "/" }}
                >
                  {t.label}
                </Link>
              ))}
              <button
                type="button"
                onClick={handleSignOut}
                title="Cerrar sesión"
                className="ml-2 flex shrink-0 items-center gap-1.5 whitespace-nowrap px-3 py-2 font-mono text-[12px] font-bold uppercase tracking-[0.2em] text-[#A8A29A] transition-colors hover:bg-white/[0.06] hover:text-white"
              >
                <LogOut className="h-3.5 w-3.5" />
                Salir
              </button>
            </nav>
          </div>
        </div>
      </header>

      <main id="contenido" tabIndex={-1} className="flex-1">
        {children}
      </main>

      <footer className="border-t border-[#3A3936] bg-[#343331] py-3">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-6">
          <span className="font-mono text-[11px] uppercase tracking-[0.3em] text-[#4A4842]">
            © 2026 VIALUX
          </span>
          <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-[#A8A29A]">
            Señalización Vial · Monterrey, N.L.
          </span>
          <div className="flex items-center gap-1.5">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#10B981] opacity-60" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#10B981]" />
            </span>
            <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-[#A8A29A]">
              En línea
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
