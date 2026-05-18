export const EJECUTIVO = "AUGUSTO ROBLES";
export const COSTO_BASE = 32;
export const VIGENCIA_DIAS = 7;
export const IVA_RATE = 0.16;

export type ProductoKey = "boya" | "boya_clavos" | "boya_clavos_refl";

export const PRODUCTOS: Record<
  ProductoKey,
  { label: string; descripcion: string; conFactura: number; sinFactura: number }
> = {
  boya: {
    label: "Boya sola",
    descripcion: "BOYAS METÁLICAS C 1/8 COLOR AMARILLO TRÁFICO",
    conFactura: 44,
    sinFactura: 47,
  },
  boya_clavos: {
    label: "Boya + clavos",
    descripcion:
      "BOYAS METÁLICAS C 1/8 COLOR AMARILLO TRÁFICO CON 4 CLAVOS DE ALTA RESISTENCIA",
    conFactura: 48,
    sinFactura: 51,
  },
  boya_clavos_refl: {
    label: "Boya + clavos + reflejantes",
    descripcion:
      "BOYAS METÁLICAS C 1/8 COLOR AMARILLO TRÁFICO CON 4 CLAVOS DE ALTA RESISTENCIA Y 2 REFLEJANTES COLOR AMARILLO/PLATA",
    conFactura: 53,
    sinFactura: 56,
  },
};

export const SPECS: Array<{ label: string; value: string }> = [
  { label: "MATERIAL", value: 'ACERO AL CARBÓN CALIBRE 1/8" (3.17 MM)' },
  { label: "ACABADO", value: "PINTURA ELECTROSTÁTICA AMARILLO TRÁFICO" },
  { label: "DIMENSIONES", value: "22 CM × 22 CM × 5.5 CM" },
  { label: "PESO", value: "1.2 KG POR PIEZA" },
  { label: "RESISTENCIA", value: "SOPORTA HASTA 18 TONELADAS" },
  { label: "CLAVOS", value: '4 CLAVOS DE ACERO REFORZADO 1/4" × 2 1/2"' },
  { label: "REFLEJANTES", value: "2 ESPACIOS LATERALES" },
  { label: "INSTALACIÓN", value: "FIJACIÓN DIRECTA EN PAVIMENTO" },
];

const NL_PREFIXES = ["64", "65", "66", "67"];

export function deliveryMessage(cp: string, cantidad: number): string {
  const prefix = (cp ?? "").trim().slice(0, 2);
  const isLocal = NL_PREFIXES.includes(prefix);
  if (isLocal) {
    if (cantidad >= 500) return "ENTREGA INMEDIATA — ÁREA METROPOLITANA DE MONTERREY";
    if (cantidad >= 250) return "SUJETO A DISPONIBILIDAD DE UNIDAD";
    return "RECOLECCIÓN EN NARDO #705, COL. VICTORIA, MONTERREY, NL";
  }
  return "CONSOLIDADO — 3 A 5 DÍAS HÁBILES";
}

export const FORMA_DE_PAGO =
  "TRANSFERENCIA BANCARIA / PAGO ANTICIPADO REQUERIDO / DATOS BANCARIOS AL CONFIRMAR ORDEN";

export const TERMINOS = [
  "VIGENCIA DE LA COTIZACIÓN: 7 DÍAS NATURALES A PARTIR DE LA FECHA DE EMISIÓN.",
  "CAMBIOS Y DEVOLUCIONES: SOLO EN CASO DE DEFECTO DE FÁBRICA, DENTRO DE LOS 5 DÍAS POSTERIORES A LA ENTREGA.",
  "LA ACEPTACIÓN DE LA PRESENTE COTIZACIÓN IMPLICA LA ACEPTACIÓN DE LOS TÉRMINOS Y CONDICIONES.",
];

export function formatMoney(n: number): string {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 2,
  }).format(Number.isFinite(n) ? n : 0);
}

export function formatInt(n: number): string {
  return new Intl.NumberFormat("es-MX").format(Math.round(n || 0));
}
