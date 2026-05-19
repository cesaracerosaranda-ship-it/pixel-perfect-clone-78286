export type Carrier = {
  name: string;
  states: string[] | "NACIONAL";
  webUrl?: string;
  nota?: string;
};

export const CARRIERS: Carrier[] = [
  {
    name: "AUTOSAG",
    states: ["NL", "SLP", "JAL", "CDMX"],
    nota: "Mejor tarifa",
  },
  {
    name: "Transportes Condesa",
    states: ["NL", "COAH", "CHIH", "JAL", "AGS", "SLP", "QRO", "GTO", "DGO", "ZAC", "TAMPS"],
  },
  {
    name: "TRANSURGE",
    states: ["NL", "COAH", "CHIH", "DGO", "GTO", "JAL", "AGS", "SLP", "TAMPS", "VER", "ZAC"],
    nota: "Rápido a Saltillo",
  },
  {
    name: "Julián Obregón",
    states: "NACIONAL",
    webUrl: "https://www.juliandeobregon.com.mx/",
    nota: "Nacional",
  },
  {
    name: "Tres Guerras",
    states: "NACIONAL",
    webUrl: "https://www.tresguerras.com.mx/",
    nota: "Tarifa más alta",
  },
  {
    name: "JR Paquetería",
    states: ["SON", "SIN", "CHIH", "BCS", "BCN"],
    webUrl: "https://www.jrpaqueteria.com/",
    nota: "Noroeste",
  },
  {
    name: "Castores",
    states: "NACIONAL",
  },
  {
    name: "Central de Fletes",
    states: ["JAL", "GTO", "AGS", "MICH", "COL", "NAY", "QRO", "SLP"],
    nota: "Bajío",
  },
  {
    name: "Flecha Amarilla",
    states: ["CDMX", "MEX", "GTO", "QRO", "SLP", "MICH", "JAL", "AGS", "HGO"],
    webUrl: "https://www.flechaamarilla.com.mx/",
    nota: "Poco confiable",
  },
  {
    name: "Transportes Cueto",
    states: ["VER", "TAB", "CAMP", "CHIS", "YUC", "QROO"],
    nota: "Sureste",
  },
  {
    name: "Potosinos",
    states: ["SLP", "AGS", "ZAC", "GTO", "QRO"],
  },
  {
    name: "Transportes Pitic",
    states: ["SON", "SIN", "BCN", "BCS"],
    nota: "Noroeste",
  },
];

// Primeros 2 dígitos del CP → clave de estado
const CP_RANGES: [number, number, string][] = [
  [1, 9, "CDMX"],
  [10, 12, "CDMX"],
  [13, 13, "HGO"],
  [14, 14, "TLAX"],
  [15, 16, "CDMX"],
  [20, 20, "AGS"],
  [21, 22, "BCN"],
  [23, 23, "BCS"],
  [24, 24, "CAMP"],
  [25, 27, "COAH"],
  [28, 28, "COL"],
  [29, 30, "CHIS"],
  [31, 33, "CHIH"],
  [34, 35, "DGO"],
  [36, 38, "GTO"],
  [39, 41, "GRO"],
  [42, 43, "HGO"],
  [44, 48, "JAL"],
  [49, 49, "NAY"],
  [50, 56, "MEX"],
  [57, 61, "MICH"],
  [62, 62, "MOR"],
  [63, 63, "NAY"],
  [64, 67, "NL"],
  [68, 71, "OAX"],
  [72, 75, "PUE"],
  [76, 76, "QRO"],
  [77, 77, "QROO"],
  [78, 79, "SLP"],
  [80, 82, "SIN"],
  [83, 85, "SON"],
  [86, 86, "TAB"],
  [87, 89, "TAMPS"],
  [90, 96, "VER"],
  [97, 97, "YUC"],
  [98, 99, "ZAC"],
];

export const STATE_NAMES: Record<string, string> = {
  AGS: "Aguascalientes",
  BCN: "Baja California",
  BCS: "Baja California Sur",
  CAMP: "Campeche",
  CDMX: "Ciudad de México",
  COAH: "Coahuila",
  COL: "Colima",
  CHIS: "Chiapas",
  CHIH: "Chihuahua",
  DGO: "Durango",
  GTO: "Guanajuato",
  GRO: "Guerrero",
  HGO: "Hidalgo",
  JAL: "Jalisco",
  MEX: "Estado de México",
  MICH: "Michoacán",
  MOR: "Morelos",
  NAY: "Nayarit",
  NL: "Nuevo León",
  OAX: "Oaxaca",
  PUE: "Puebla",
  QRO: "Querétaro",
  QROO: "Quintana Roo",
  SLP: "San Luis Potosí",
  SIN: "Sinaloa",
  SON: "Sonora",
  TAB: "Tabasco",
  TAMPS: "Tamaulipas",
  TLAX: "Tlaxcala",
  VER: "Veracruz",
  YUC: "Yucatán",
  ZAC: "Zacatecas",
};

export function cpToEstado(cp: string): string | null {
  if (cp.length < 2) return null;
  const prefix = parseInt(cp.slice(0, 2), 10);
  if (isNaN(prefix)) return null;
  const match = CP_RANGES.find(([lo, hi]) => prefix >= lo && prefix <= hi);
  return match?.[2] ?? null;
}

export function carriersForCp(cp: string): Carrier[] {
  const estado = cpToEstado(cp);
  if (!estado || estado === "NL") return [];
  return CARRIERS.filter(
    (c) => c.states === "NACIONAL" || c.states.includes(estado),
  ).sort((a, b) => {
    if (a.webUrl && !b.webUrl) return -1;
    if (!a.webUrl && b.webUrl) return 1;
    return 0;
  });
}
