import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import logoT from "@/assets/vialux-logo-t.png";

export const Route = createFileRoute("/reset-password")({
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || (event === "SIGNED_IN" && session)) {
        setReady(true);
      }
    });
    // If already has a session (recovery link processed), allow update
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 6) {
      toast.error("La contraseña debe tener al menos 6 caracteres");
      return;
    }
    if (password !== confirm) {
      toast.error("Las contraseñas no coinciden");
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success("Contraseña actualizada");
      await supabase.auth.signOut();
      navigate({ to: "/auth", search: { next: undefined }, replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo actualizar");
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
          Nueva contraseña
        </p>

        {!ready ? (
          <p className="text-center text-sm text-[#8A857C]">
            Abre este enlace desde el correo de recuperación para continuar.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <Label htmlFor="password">Nueva contraseña</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                autoComplete="new-password"
              />
            </div>
            <div>
              <Label htmlFor="confirm">Confirmar contraseña</Label>
              <Input
                id="confirm"
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                minLength={6}
                autoComplete="new-password"
              />
            </div>
            <Button
              type="submit"
              disabled={busy}
              className="w-full bg-[#EDBA1A] text-[#1B1A17] hover:bg-[#C99B0E]"
            >
              {busy ? "Actualizando…" : "Guardar contraseña"}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}