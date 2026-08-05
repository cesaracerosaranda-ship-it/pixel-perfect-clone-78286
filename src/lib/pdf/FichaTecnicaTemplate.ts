/**
 * Ficha técnica del producto — documento fijo para el cliente.
 *
 * Se genera desde la app en lugar de guardar un PDF y reenviarlo: WhatsApp marca
 * los archivos reenviados con "reenviado muchas veces", que le resta seriedad a
 * un documento comercial. Cada generación produce un archivo nuevo.
 *
 * Mismas medidas que la cotización: 816×1056px, escala 0.75 → carta (612×792pt).
 */

const TINTA = "#2E2B27";
const GRAFITO = "#1E1C19";
const AMARILLO = "#EDBA1A";
const DORADO = "#C79100";
const GRIS = "#8A857C";
const GRIS_OSC = "#57524A";
const BORDE = "#E5E2DC";
const PAPEL = "#F5F3EF";

const esc = (s: string) =>
  (s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Riel lateral: número + etiqueta rotada. html2canvas NO soporta writing-mode. */
function rail(num: string, label: string) {
  const alto = Math.ceil(label.length * 6) + 8;
  return `<div style="border-right:1px solid ${BORDE};padding:12px 0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:9px;">
    <div style="font-size:13px;font-weight:700;color:${DORADO};">${num}</div>
    <div style="position:relative;width:12px;height:${alto}px;">
      <div style="position:absolute;top:50%;left:50%;transform:rotate(-90deg) translate(-50%,-50%);transform-origin:0 0;white-space:nowrap;font-size:7.5px;letter-spacing:1.5px;color:${GRIS};">${label}</div>
    </div></div>`;
}

function celdaSpec(label: string, valor: string) {
  return `<div style="border:1px solid ${BORDE};padding:9px 12px;">
    <div style="font-size:7.5px;letter-spacing:1.4px;color:${DORADO};">${esc(label)}</div>
    <div style="font-size:10.5px;font-weight:700;color:${TINTA};margin-top:3px;">${esc(valor)}</div>
  </div>`;
}

function config(args: {
  num: string;
  sku: string;
  titulo: string;
  desc: string;
  incluye: string[];
  destacada?: boolean;
}) {
  const { num, sku, titulo, desc, incluye, destacada } = args;
  const fondo = destacada ? AMARILLO : "#FFFFFF";
  const borde = destacada ? AMARILLO : BORDE;
  const tintaLocal = destacada ? GRAFITO : TINTA;
  const tenue = destacada ? "rgba(30,28,25,0.72)" : GRIS_OSC;
  return `<div style="position:relative;border:1px solid ${borde};background:${fondo};padding:14px 15px;">
    ${destacada ? `<div style="position:absolute;top:-9px;left:14px;background:${GRAFITO};color:${AMARILLO};font-size:7px;font-weight:700;letter-spacing:1.4px;padding:3px 8px;">MÁS VENDIDA</div>` : ""}
    <div style="display:flex;justify-content:space-between;align-items:baseline;">
      <span style="font-size:7.5px;letter-spacing:1.4px;color:${destacada ? GRAFITO : DORADO};">CONFIG · ${num}</span>
      <span style="font-size:7.5px;letter-spacing:1.2px;color:${tenue};">${esc(sku)}</span>
    </div>
    <div style="font-size:14px;font-weight:800;letter-spacing:0.5px;color:${tintaLocal};margin-top:6px;">${esc(titulo)}</div>
    <div style="font-size:8px;line-height:1.6;color:${tenue};margin-top:6px;">${esc(desc)}</div>
    <div style="height:1px;background:${destacada ? "rgba(30,28,25,0.2)" : BORDE};margin:10px 0 8px;"></div>
    <div style="font-size:7.5px;letter-spacing:1.4px;color:${destacada ? GRAFITO : DORADO};">INCLUYE</div>
    ${incluye
      .map(
        (i) =>
          `<div style="font-size:8px;color:${tintaLocal};margin-top:4px;">+ ${esc(i)}</div>`,
      )
      .join("")}
  </div>`;
}

export function renderFichaHtml(args: {
  logoDataUrl: string;
  correo: string;
  telefono: string;
}): string {
  const { logoDataUrl, correo, telefono } = args;
  const anio = new Date().getFullYear();

  return `
<div style="width:816px;min-height:1055px;background:#FFFFFF;display:flex;flex-direction:column;font-family:'JetBrains Mono',monospace;color:${TINTA};">

  <!-- Header -->
  <div style="background:${GRAFITO};padding:16px 26px;display:flex;justify-content:space-between;align-items:center;">
    <img src="${logoDataUrl}" style="height:52px;width:auto;" />
    <div style="text-align:right;">
      <div style="font-size:7.5px;letter-spacing:2px;color:${GRIS};">DOCUMENTO TÉCNICO · REV. ${anio} · SKU VLX-22-118</div>
      <div style="font-size:20px;letter-spacing:4px;color:#FFFFFF;margin-top:4px;">FICHA <span style="color:${AMARILLO};font-weight:700;">TÉCNICA</span></div>
    </div>
  </div>
  <div style="height:5px;background:${AMARILLO};"></div>

  <!-- 00 PRODUCTO -->
  <div style="display:grid;grid-template-columns:56px 1fr;border-bottom:1px solid ${BORDE};">
    ${rail("00", "PRODUCTO")}
    <div style="padding:18px 26px;">
      <div style="font-size:8px;letter-spacing:1.6px;color:${DORADO};">BOYA VIAL METÁLICA · GRADO INDUSTRIAL</div>
      <div style="font-size:24px;font-weight:800;letter-spacing:1px;line-height:1.2;margin-top:6px;">
        BOYA VIAL DE ACERO<br><span style="color:${DORADO};">GRADO INDUSTRIAL.</span>
      </div>
      <div style="font-size:8px;line-height:1.7;color:${GRIS_OSC};margin-top:10px;max-width:560px;">
        DISPOSITIVO DE CANALIZACIÓN VIAL DISEÑADO PARA ALTO TRÁNSITO VEHICULAR Y CONDICIONES
        EXTREMAS DE INTEMPERIE. ENTREGA NACIONAL CON DISPONIBILIDAD INMEDIATA.
      </div>
      <div style="display:flex;gap:0;margin-top:14px;border:1px solid ${BORDE};width:fit-content;">
        ${[
          ["18 T", "RESISTENCIA"],
          ["3.17 MM", "CALIBRE"],
          ["1.2 KG", "PESO"],
        ]
          .map(
            ([v, l], i) =>
              `<div style="padding:9px 18px;${i ? `border-left:1px solid ${BORDE};` : ""}">
                 <div style="font-size:15px;font-weight:800;">${v}</div>
                 <div style="font-size:7px;letter-spacing:1.4px;color:${GRIS};margin-top:2px;">${l}</div>
               </div>`,
          )
          .join("")}
      </div>
    </div>
  </div>

  <!-- 01 CONFIGURACIONES -->
  <div style="display:grid;grid-template-columns:56px 1fr;border-bottom:1px solid ${BORDE};">
    ${rail("01", "COTIZACIÓN")}
    <div style="padding:20px 26px 18px;display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;">
      ${config({
        num: "01",
        sku: "VLX-22-S",
        titulo: "BOYA SOLA",
        desc: "PIEZA INDIVIDUAL SIN CLAVOS NI REFLEJANTES. IDEAL PARA REPOSICIONES Y HABILITADO EN SITIO.",
        incluye: ["1× BOYA METÁLICA 22 CM", "ACABADO AMARILLO TRÁFICO"],
      })}
      ${config({
        num: "02",
        sku: "VLX-22-BC",
        titulo: "BOYA + CLAVOS",
        desc: "CONFIGURACIÓN ESTÁNDAR PARA INSTALACIÓN INMEDIATA EN PAVIMENTO. LISTO PARA FIJAR.",
        incluye: ['1× BOYA METÁLICA 22 CM', '4× CLAVOS ACERO 1/4" × 2 1/2"', "FIJACIÓN CONCRETO/ASFALTO"],
        destacada: true,
      })}
      ${config({
        num: "03",
        sku: "VLX-22-BCR",
        titulo: "BOYA + REFLEJANTES",
        desc: "MÁXIMA VISIBILIDAD NOCTURNA. RECOMENDADA EN CARRETERA Y ZONAS SIN ALUMBRADO.",
        incluye: [
          "1× BOYA METÁLICA 22 CM",
          '4× CLAVOS ACERO 1/4" × 2 1/2"',
          "2× CINTAS REFLEJANTES",
        ],
      })}
    </div>
  </div>

  <!-- 02 TÉCNICO -->
  <div style="display:grid;grid-template-columns:56px 1fr;border-bottom:1px solid ${BORDE};">
    ${rail("02", "TÉCNICO")}
    <div style="padding:18px 26px;display:grid;grid-template-columns:repeat(4,1fr);gap:0;">
      ${celdaSpec("MATERIAL", 'ACERO AL CARBÓN 1/8"')}
      ${celdaSpec("ACABADO", "ELECTROSTÁTICO AMARILLO")}
      ${celdaSpec("DIMENSIONES", "22×22×5.5 CM")}
      ${celdaSpec("PESO", "1.2 KG / PIEZA")}
      ${celdaSpec("RESISTENCIA", "HASTA 18 TON")}
      ${celdaSpec("CALIBRE", "3.17 MM")}
      ${celdaSpec("CLAVOS", '4× 1/4"×2 1/2"')}
      ${celdaSpec("REFLEJANTES", "2 ESPACIOS LATERALES")}
    </div>
  </div>

  <!-- 03 APLICACIONES -->
  <div style="display:grid;grid-template-columns:56px 1fr;border-bottom:1px solid ${BORDE};">
    ${rail("03", "APLICACIONES")}
    <div style="padding:18px 26px;display:grid;grid-template-columns:1fr 1fr;gap:10px 26px;">
      ${[
        ["A.01", "SEÑALAMIENTO VIAL URBANO E INDUSTRIAL"],
        ["A.04", "CICLOVÍAS, ENTRONQUES Y GLORIETAS"],
        ["A.02", "REDUCCIÓN DE VELOCIDAD Y CONTROL DE TRÁFICO"],
        ["A.05", "ESTACIONAMIENTOS Y ZONAS ESCOLARES"],
        ["A.03", "CANALIZACIÓN Y DELIMITACIÓN DE CARRILES"],
        ["A.06", "PARQUES INDUSTRIALES Y CENTROS DE DISTRIBUCIÓN"],
      ]
        .map(
          ([n, t]) =>
            `<div style="border-bottom:1px solid ${BORDE};padding-bottom:7px;">
               <span style="font-size:8px;color:${DORADO};">${n}</span>
               <span style="font-size:8px;color:${TINTA};margin-left:6px;">${t}</span>
             </div>`,
        )
        .join("")}
    </div>
  </div>

  <!-- 04 INSTALACIÓN -->
  <div style="display:grid;grid-template-columns:56px 1fr;flex:1;">
    ${rail("04", "INSTALACIÓN")}
    <div style="padding:18px 26px;display:flex;flex-direction:column;justify-content:space-evenly;">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:26px;">
        ${[
          [
            "EN ASFALTO",
            [
              "MARCAR LA POSICIÓN DE LOS 4 BARRENOS",
              "COLOCAR LA BOYA Y CLAVAR A GOLPE CON MAZO",
              "VERIFICAR QUE LA BOYA QUEDE FIRME Y A NIVEL",
            ],
          ],
          [
            "EN CONCRETO HIDRÁULICO",
            [
              'PERFORAR 4 GUÍAS CON BROCA 3/16" A 3" DE PROFUNDIDAD',
              "COLOCAR LA BOYA SOBRE LOS BARRENOS",
              "INSERTAR LOS 4 CLAVOS A GOLPE CON MAZO",
              "OPCIONAL: APLICAR RESINA EPÓXICA EN LA BASE",
            ],
          ],
        ]
          .map(
            ([t, pasos]) => `<div>
              <div style="font-size:8px;letter-spacing:1.4px;color:${DORADO};border-bottom:1px solid ${BORDE};padding-bottom:6px;">${t as string}</div>
              ${(pasos as string[])
                .map(
                  (p) =>
                    `<div style="font-size:8px;color:${TINTA};margin-top:6px;">+ ${esc(p)}</div>`,
                )
                .join("")}
            </div>`,
          )
          .join("")}
      </div>
      <div style="border-left:3px solid ${AMARILLO};background:${PAPEL};padding:9px 12px;margin-top:14px;">
        <span style="font-size:7.5px;font-weight:700;color:${DORADO};">NOTA:</span>
        <span style="font-size:7.5px;line-height:1.7;color:${GRIS_OSC};">
          LA SUPERFICIE DEBE ESTAR LIMPIA Y SECA ANTES DE LA INSTALACIÓN. PARA ASFALTO, LOS CLAVOS
          ENTRAN A GOLPE DIRECTAMENTE. PARA CONCRETO HIDRÁULICO, SE REQUIERE PERFORACIÓN PREVIA.
        </span>
      </div>
    </div>
  </div>

  <!-- Footer -->
  <div style="background:${PAPEL};padding:10px 26px;text-align:center;">
    <span style="font-size:7.5px;letter-spacing:1.6px;color:${GRIS};">COTIZACIONES</span>
    <span style="font-size:8px;font-weight:700;color:${TINTA};margin-left:8px;">${esc(correo.toUpperCase())}</span>
    <span style="font-size:7.5px;color:${GRIS};margin:0 8px;">·</span>
    <span style="font-size:7.5px;letter-spacing:1.6px;color:${GRIS};">TEL</span>
    <span style="font-size:8px;font-weight:700;color:${TINTA};margin-left:8px;">${esc(telefono)}</span>
  </div>
  <div style="background:${GRAFITO};padding:9px 26px;text-align:center;">
    <div style="font-size:7.5px;letter-spacing:1.8px;color:#FFFFFF;">
      SEÑALIZACIÓN VIAL DE PRECISIÓN <span style="color:${AMARILLO};">·</span>
      DISPONIBILIDAD INMEDIATA <span style="color:${AMARILLO};">·</span> ENVÍO NACIONAL
    </div>
    <div style="font-size:7px;letter-spacing:1.4px;color:${GRIS};margin-top:3px;">
      MONTERREY, NUEVO LEÓN, MÉXICO
    </div>
  </div>
</div>`;
}
