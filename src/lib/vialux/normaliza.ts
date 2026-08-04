/**
 * Normalización CONSERVADORA de texto capturado.
 *
 * Portado del patrón de CorteClaro (ERP de Lattice Works). El problema que
 * resuelve: el mismo cliente capturado como "juan perez", "JUAN PEREZ" y
 * "Juan Pérez" produce tres entradas distintas en el directorio y rompe el
 * cruce por nombre. Se aplica en blur, nunca mientras se escribe.
 *
 * Regla de oro: ante la duda, NO tocar. Es preferible dejar un nombre sin
 * acento que corromper una razón social.
 */

// Palabras que van en minúscula dentro de un nombre (salvo al inicio).
const CONECTORES = new Set([
  "de", "del", "la", "las", "los", "y", "e", "en", "el", "al", "por", "para",
]);

// Siglas y formas societarias que SIEMPRE van en mayúscula.
// OJO: nada de "DE" ni "S" sueltos — colisionan con el conector "de" y con
// iniciales, y convertirían "Juan de la Garza" en "Juan DE la Garza".
// Las formas societarias completas las arma normEmpresa por separado.
const SIGLAS = new Set([
  "SA", "S.A.", "CV", "C.V.", "SA.", "SAPI", "SC", "AC", "RL",
  "SRL", "S.R.L.", "SAS", "S.A.S.", "MX", "MTY", "NL", "N.L.", "CDMX",
  "II", "III", "IV", "VI",
]);

/**
 * Title Case para nombres de persona y razones sociales.
 * Respeta siglas conocidas, deja conectores en minúscula y no toca palabras
 * que ya vienen con mayúsculas internas (p.ej. "McDonald", "GrupoBBVA").
 */
export function normTitulo(valor: string): string {
  const limpio = valor.trim().replace(/\s+/g, " ");
  if (!limpio) return "";

  const palabras = limpio.split(" ");
  return palabras
    .map((p, i) => {
      const sinPunt = p.replace(/[.,]/g, "");

      // Siglas: se respetan tal cual, en mayúscula.
      if (SIGLAS.has(p.toUpperCase()) || SIGLAS.has(sinPunt.toUpperCase())) {
        return p.toUpperCase();
      }

      // Ya tiene mayúscula interna (McDonald, iPhone): el usuario sabe algo
      // que nosotros no. No tocar.
      if (/[a-záéíóúñ][A-ZÁÉÍÓÚÑ]/.test(p)) return p;

      const bajo = p.toLowerCase();

      // Conectores en minúscula, salvo si abren el nombre.
      if (i > 0 && CONECTORES.has(bajo)) return bajo;

      return bajo.charAt(0).toUpperCase() + bajo.slice(1);
    })
    .join(" ");
}

/**
 * Normaliza una empresa. Igual que normTitulo pero además compacta las formas
 * societarias más comunes para que "s.a de c.v", "SA DE CV" y "S.A. de C.V."
 * converjan a una sola escritura.
 */
export function normEmpresa(valor: string): string {
  const base = normTitulo(valor);
  return base
    .replace(/\bS\.?\s*A\.?\s+de\s+C\.?\s*V\.?/gi, "S.A. de C.V.")
    .replace(/\bS\.?\s*de\s+R\.?\s*L\.?/gi, "S. de R.L.")
    .replace(/\bS\.?\s*A\.?\s*P\.?\s*I\.?/gi, "SAPI");
}

/** Normaliza correo: minúsculas y sin espacios. Los correos no llevan mayúsculas. */
export function normCorreo(valor: string): string {
  return valor.trim().toLowerCase().replace(/\s+/g, "");
}

/**
 * Formatea un teléfono mexicano de 10 dígitos como "81 3073 0586" para que se
 * lea igual en toda la app. Si no reconoce el formato, devuelve el original —
 * un número extranjero o incompleto no se debe deformar.
 */
export function normTelefono(valor: string): string {
  const d = (valor ?? "").replace(/\D/g, "");
  const nac = d.length > 10 ? d.slice(-10) : d;
  if (nac.length !== 10) return valor.trim();
  // Las ciudades grandes usan lada de 2 dígitos (55/56 CDMX, 33 GDL, 81 MTY)
  // y el resto del país de 3. El bloque final SIEMPRE es de 4 dígitos.
  const lada = /^(55|56|33|81)/.test(nac) ? 2 : 3;
  return `${nac.slice(0, lada)} ${nac.slice(lada, -4)} ${nac.slice(-4)}`;
}
