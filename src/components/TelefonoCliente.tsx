import { Phone } from "lucide-react";
import { normTelefono } from "@/lib/vialux/normaliza";

/**
 * Teléfono del cliente, visible y en monoespaciada.
 *
 * Muchos registros se guardan como "A QUIEN CORRESPONDA" —el caso de cotizar a
 * una empresa sin nombre de contacto— y en pantalla todos se ven idénticos. El
 * teléfono es lo único que los distingue, y además es la llave para encontrar
 * la conversación en WhatsApp. Ocultarlo obligaba a abrir cada ficha para saber
 * de quién se trata.
 */
export function TelefonoCliente({
  tel,
  icono = false,
  className = "",
}: {
  tel: string | null | undefined;
  icono?: boolean;
  className?: string;
}) {
  if (!tel?.trim()) return null;
  return (
    <span
      className={`inline-flex items-center gap-1 font-mono tabular-nums ${className}`}
      title="Teléfono del cliente"
    >
      {icono && <Phone className="h-3 w-3 shrink-0" aria-hidden="true" />}
      {normTelefono(tel)}
    </span>
  );
}
