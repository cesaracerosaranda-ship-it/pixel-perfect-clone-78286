/**
 * Normalización de teléfonos para cruzar el wa_id de WhatsApp con el teléfono
 * capturado en el directorio de clientes.
 *
 * WhatsApp entrega el wa_id en E.164 sin "+" (MX: 52 + 1 opcional + 10 dígitos,
 * p.ej. "5218112345678"), mientras que en el directorio el teléfono se captura
 * a mano y llega en cualquier forma: "8112345678", "+52 1 81 2651 7968",
 * "81-1234-5678"... Para comparar, ambos se reducen a sus últimos 10 dígitos
 * (el número nacional mexicano).
 */
export function normalizarTelefono(valor: string | null | undefined): string | null {
  const digitos = (valor ?? "").replace(/\D/g, "");
  if (digitos.length < 10) return null; // demasiado corto para identificar a alguien
  return digitos.slice(-10);
}

/**
 * El sobrante antes de los últimos 10 dígitos debe ser vacío o lada de México.
 * Sin esta comprobación, un teléfono de EE.UU. (+1 818 123 4567) colisionaría
 * con un wa_id mexicano (52 818 123 4567) y ligaría el chat al expediente de
 * OTRO cliente.
 */
function prefijoMexicano(valor: string | null | undefined): boolean {
  const digitos = (valor ?? "").replace(/\D/g, "");
  if (digitos.length < 10) return false;
  const prefijo = digitos.slice(0, -10);
  return prefijo === "" || prefijo === "52" || prefijo === "521";
}

/** True si ambos teléfonos corresponden al mismo número nacional mexicano. */
export function mismoTelefono(
  a: string | null | undefined,
  b: string | null | undefined,
): boolean {
  const na = normalizarTelefono(a);
  const nb = normalizarTelefono(b);
  if (na === null || na !== nb) return false;
  return prefijoMexicano(a) && prefijoMexicano(b);
}

/** Formato legible para mostrar un wa_id: +52 1 81 1234 5678 → +5218112345678 */
export function formatearWaId(waId: string): string {
  return waId.startsWith("+") ? waId : `+${waId}`;
}
