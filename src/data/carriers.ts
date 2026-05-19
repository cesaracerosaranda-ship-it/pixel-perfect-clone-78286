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

// Approximate coords for each state capital (lat, lng) — used as fallback when
// carrier_coverage has no rows with a parseable CP close to the client's CP.
export const STATE_COORDS: Record<string, [number, number]> = {
  AGS: [21.8853, -102.2916],
  BCN: [32.6245, -115.4523],
  BCS: [24.1426, -110.3128],
  CAMP: [19.8301, -90.5349],
  CDMX: [19.4326, -99.1332],
  COAH: [25.4232, -101.0053],
  COL: [19.2452, -103.7241],
  CHIS: [16.7569, -93.1292],
  CHIH: [28.6353, -106.0889],
  DGO: [24.0277, -104.6532],
  GTO: [21.019, -101.2574],
  GRO: [17.5506, -99.5017],
  HGO: [20.0911, -98.7624],
  JAL: [20.6597, -103.3496],
  MEX: [19.2826, -99.6558],
  MICH: [19.7008, -101.1844],
  MOR: [18.9242, -99.2216],
  NAY: [21.7514, -104.8455],
  NL: [25.6866, -100.3161],
  OAX: [17.0732, -96.7266],
  PUE: [19.0414, -98.2063],
  QRO: [20.5888, -100.3899],
  QROO: [21.1743, -86.8466],
  SLP: [22.1565, -100.9855],
  SIN: [24.8091, -107.394],
  SON: [29.0729, -110.9559],
  TAB: [17.9869, -92.9303],
  TAMPS: [23.7369, -99.1411],
  TLAX: [19.3182, -98.2375],
  VER: [19.1738, -96.1342],
  YUC: [20.9674, -89.5926],
  ZAC: [22.7709, -102.5832],
};

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
