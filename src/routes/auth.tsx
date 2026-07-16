import { createFileRoute, useNavigate, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import logoT from "@/assets/vialux-logo-t.png";

export const Route = createFileRoute("/auth")({
  validateSearch: (s: Record<string, unknown>) => ({
    next: typeof s.next === "string" ? s.next : undefined,
  }),
  beforeLoad: async ({ search }) => {
    if (typeof window === "undefined") return;
    const { data } = await supabase.auth.getUser();
    if (data.user) {
      const next = search.next && search.next.startsWith("/") ? search.next : "/";
      throw redirect({ to: next });
    }
  },
  component: AuthPage,
});

function AuthPage() {
  const { next } = Route.useSearch();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if ((event === "SIGNED_IN" || event === "INITIAL_SESSION") && session?.user) {
        const target = next && next.startsWith("/") ? next : "/";
        navigate({ to: target, replace: true });
      }
    });
    return () => sub.subscription.unsubscribe();
  }, [navigate, next]);

  async function handleGoogle() {
    setBusy(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      toast.error(result.error.message ?? "No se pudo iniciar sesión con Google");
      setBusy(false);
    }
  }

  async function handleEmail(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        toast.success("Cuenta creada. Revisa tu correo si es requerido.");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al autenticar");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#FAF9F7] px-4">
      <div className="w-full max-w-sm rounded-none border border-[#E5E2DC] bg-white p-8 shadow-sm">
        <div className="mb-6 flex justify-center">
          <img src={logoT} alt="VIALUX" className="h-10 w-auto" style={{ filter: "invert(1)" }} />
        </div>
        <h1 className="mb-1 text-center font-mono text-[11px] uppercase tracking-[0.3em] text-[#8A857C]">
          VIALUX Control
        </h1>
        <p className="mb-6 text-center text-lg font-semibold text-[#2E2B27]">
          {mode === "signin" ? "Iniciar sesión" : "Crear cuenta"}
        </p>

        <Button
          type="button"
          onClick={handleGoogle}
          disabled={busy}
          variant="outline"
          className="mb-4 w-full"
        >
          Continuar con Google
        </Button>

        <div className="mb-4 flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-[#8A857C]">
          <div className="h-px flex-1 bg-[#E5E2DC]" />
          <span>o correo</span>
          <div className="h-px flex-1 bg-[#E5E2DC]" />
        </div>

        <form onSubmit={handleEmail} className="space-y-3">
          <div>
            <Label htmlFor="email">Correo</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>
          <div>
            <Label htmlFor="password">Contraseña</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
            />
          </div>
          <Button
            type="submit"
            disabled={busy}
            className="w-full bg-[#EDBA1A] text-[#1B1A17] hover:bg-[#C99B0E]"
          >
            {mode === "signin" ? "Entrar" : "Registrarme"}
          </Button>
        </form>

        <button
          type="button"
          onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
          className="mt-4 w-full text-center text-xs text-[#8A857C] hover:text-[#2E2B27]"
        >
          {mode === "signin" ? "¿No tienes cuenta? Crear una" : "¿Ya tienes cuenta? Iniciar sesión"}
        </button>
      </div>
    </div>
  );
}