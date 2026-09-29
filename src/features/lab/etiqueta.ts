import JsBarcode from "jsbarcode";
import { fmtDateTime } from "./format";
import { SITE_LABEL } from "./samples";
import type { SampleDto } from "./types";

/**
 * Etiqueta de muestra: accesión grande, código de barras Code 128 con la
 * accesión (lo que el lector "tipea" en el equipo es exactamente lo impreso),
 * nombre descriptivo y fecha/hora de la toma.
 *
 * Se imprime en una ventana aparte con su propio HTML, sin la app alrededor:
 * el diálogo de impresión del sistema manda la página al driver de la
 * impresora de etiquetas (DYMO, Brother, Zebra...), así que funciona en
 * cualquier PC que tenga el driver, incluida la del NIR. La ventanita deja
 * elegir el tamaño; la elección queda guardada para la próxima.
 */

export interface TamanoEtiqueta {
  id: string;
  nombre: string;
  /** Ancho y alto de la etiqueta en mm (la orientación en que sale del rollo). */
  ancho: number;
  alto: number;
  /** Imprime en una hoja común, con la etiqueta arriba a la izquierda. */
  hoja?: boolean;
  /**
   * No fija el tamaño de página: toma el papel que tenga elegido el driver, en
   * vertical. Es para rollos donde la etiqueta sale "derecha" (el ancho del
   * rollo es el ancho de la etiqueta: Xprinter 50 mm, Brother 62 mm). Si la
   * página declarara 50 × 30, Chrome la mandaría en horizontal por ser más
   * ancha que alta, y el driver la giraría 90° sobre la etiqueta. La DYMO es
   * al revés: el rollo mide 28 mm y la etiqueta sale acostada, así que ahí la
   * página 89 × 28 en horizontal es justo lo que hace falta.
   */
  paginaAuto?: boolean;
  /**
   * Ancho del código de barras en mm. Deliberadamente MENOR que la etiqueta:
   * la etiqueta va envuelta en frascos chicos y el lector necesita ver todas
   * las barras a la vez; un código ancho se curva y pierde los extremos. Con
   * ~42 mm para 8 caracteres el módulo queda en ~0,34 mm (4 puntos a 300 dpi).
   */
  codigoAncho: number;
}

// El primero es el DEFAULT del selector (localStorage recuerda la última
// elección por navegador). Desde el 29-sep-2026 los laboratorios imprimen en
// las Xprinter XP-410B con rollos de 50 × 30 mm, así que arranca ahí; la DYMO
// queda en la lista por si alguna PC la sigue usando (se elige una vez y queda
// recordado).
//
// codigoAncho por tamaño: en la Xprinter (térmica directa, 203 dpi) 46 mm hace
// que la accesión típica ("A-0002-3" = 123 módulos de Code 128) tenga módulos
// de ~3 puntos del cabezal (0,125 mm/punto). Es lo que da barras parejas y
// lectura confiable sobre el frasco curvo; un ancho con módulos de 2,x puntos
// redondea desparejo y el lector empieza a fallar.
export const TAMANOS: TamanoEtiqueta[] = [
  { id: "50x30", nombre: "Xprinter / genérica 50 × 30 mm", ancho: 50, alto: 30, codigoAncho: 46, paginaAuto: true },
  { id: "dymo-89x28", nombre: "DYMO LabelWriter 89 × 28 mm (99010)", ancho: 89, alto: 28, codigoAncho: 42 },
  { id: "100x50", nombre: "Xprinter / genérica 100 × 50 mm", ancho: 100, alto: 50, codigoAncho: 46, paginaAuto: true },
  { id: "62x29", nombre: "Brother 62 × 29 mm", ancho: 62, alto: 29, codigoAncho: 42, paginaAuto: true },
  { id: "a4", nombre: "Hoja A4 (etiqueta arriba a la izquierda)", ancho: 89, alto: 28, hoja: true, codigoAncho: 42 },
];

// La clave cambió de nombre al llegar las Xprinter: así todas las PC arrancan
// en 50 × 30 aunque antes hubieran elegido la DYMO, en vez de seguir mandando
// páginas de 89 mm a una impresora de 50.
const CLAVE_TAMANO = "lab-etiqueta-tamano-v2";

/** Por debajo de 60 mm de ancho el contenido se apila (accesión sola arriba, datos abajo). */
export const esEstrecha = (t: TamanoEtiqueta): boolean => !t.hoja && t.ancho < 60;

export const tamanoGuardado = (): string => {
  try {
    const id = localStorage.getItem(CLAVE_TAMANO);
    return id && TAMANOS.some((t) => t.id === id) ? id : TAMANOS[0].id;
  } catch {
    return TAMANOS[0].id;
  }
};

/**
 * Code 128 como SVG escalable. Sin ancho/alto fijos y con preserveAspectRatio
 * "none": el CSS de la etiqueta le da el tamaño en mm, y las barras conservan
 * sus proporciones relativas (que es lo único que le importa al lector).
 */
export const svgCodigoBarras = (texto: string): string => {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  JsBarcode(svg, texto, {
    format: "CODE128",
    displayValue: false,
    margin: 0,
    width: 2,
    height: 40,
    background: "#ffffff",
    lineColor: "#000000",
  });
  // JsBarcode escribe "246px": el viewBox no admite unidades, y con "px" el
  // navegador lo ignora en silencio y las barras no se estiran al ancho.
  const w = parseFloat(svg.getAttribute("width") ?? "");
  const h = parseFloat(svg.getAttribute("height") ?? "");
  if (w > 0 && h > 0) svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
  svg.removeAttribute("width");
  svg.removeAttribute("height");
  svg.setAttribute("preserveAspectRatio", "none");
  return svg.outerHTML;
};

const esc = (s: string): string =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] ?? c);

/** Tamaño de página CSS: A4 en hoja, el del driver en rollos "derechos", el de la etiqueta en la DYMO. */
export const tamanoPagina = (t: TamanoEtiqueta): string =>
  t.hoja ? "A4" : t.paginaAuto ? "auto" : `${t.ancho}mm ${t.alto}mm`;

const reglaPagina = (t: TamanoEtiqueta) => `@page{size:${tamanoPagina(t)};margin:${t.hoja ? "10mm" : "0"}}`;

/** Documento completo de la etiqueta. Puro: recibe el SVG ya generado. */
export const htmlEtiqueta = (m: SampleDto, svg: string, tamanoId: string, autoImprimir = true): string => {
  const t = TAMANOS.find((x) => x.id === tamanoId) ?? TAMANOS[0];
  const opciones = TAMANOS.map(
    (x) => `<option value="${x.id}"${x.id === t.id ? " selected" : ""}>${esc(x.nombre)}</option>`,
  ).join("");
  const acc = esc(m.accession);
  const nombre = esc(m.displayName);
  // En la etiqueta angosta el laboratorio sobra (la letra de la accesión ya lo dice) y
  // el lugar se necesita para el tipo de muestra: se oculta por CSS.
  const meta = `<span class="sitio">${esc(SITE_LABEL[m.site])} · </span>${esc(m.kind.name)}`;
  const fecha = esc(fmtDateTime(m.sampledAt));

  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<title>Etiqueta ${acc}</title>
<style id="pagina">${reglaPagina(t)}</style>
<style>
  :root { --w: ${t.ancho}mm; --h: ${t.alto}mm; --bc: ${t.codigoAncho}mm; }
  html, body { margin: 0; padding: 0; background: #fff; color: #000; font-family: Arial, Helvetica, sans-serif; }
  .barra { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; padding: 8px 10px; background: #f3f4f6; border-bottom: 1px solid #d1d5db; font: 13px system-ui, sans-serif; }
  .barra select, .barra button { font: 13px system-ui, sans-serif; padding: 4px 8px; }
  .barra .ayuda { color: #6b7280; }
  .lienzo { padding: 12px; }
  /* Grilla con áreas: en una etiqueta ancha (DYMO 89 mm) la accesión y el
     laboratorio comparten la primera fila y el nombre y la fecha la última; en
     una estrecha (Xprinter 50 mm) se apilan, porque no entran al lado. */
  .etiqueta { width: var(--w); height: var(--h); box-sizing: border-box; padding: 1.5mm 2mm; display: grid; grid-template-columns: auto minmax(0, 1fr); grid-template-rows: auto minmax(0, 1fr) auto; grid-template-areas: "acc meta" "codigo codigo" "nombre fecha"; column-gap: 2mm; row-gap: 0.6mm; align-items: baseline; overflow: hidden; background: #fff; outline: 1px dashed #9ca3af; }
  .etiqueta.estrecha { grid-template-columns: minmax(0, 1fr) auto; grid-template-rows: auto minmax(0, 1fr) auto auto; grid-template-areas: "acc acc" "codigo codigo" "nombre nombre" "meta fecha"; row-gap: 0.4mm; }
  .acc { grid-area: acc; font-family: Consolas, "Courier New", monospace; font-weight: 700; font-size: 7.2mm; letter-spacing: 0.4mm; line-height: 1; white-space: nowrap; }
  /* Los textos largos se ACORTAN (min-width 0 + ellipsis): sin eso, un item con nowrap
     crece más que la etiqueta y empuja al vecino fuera del borde, donde no se imprime. */
  .meta { grid-area: meta; min-width: 0; font-size: 2.6mm; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; text-align: right; }
  .etiqueta.estrecha .meta { text-align: left; font-size: 2.4mm; }
  .etiqueta.estrecha .meta .sitio { display: none; }
  .codigo { grid-area: codigo; align-self: stretch; display: flex; align-items: center; justify-content: center; min-height: 0; }
  .codigo svg { width: var(--bc); max-width: 100%; height: 100%; max-height: 14mm; display: block; }
  .nombre { grid-area: nombre; min-width: 0; font-size: 2.7mm; line-height: 1.2; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
  .fecha { grid-area: fecha; font-size: 2.7mm; line-height: 1.2; white-space: nowrap; text-align: right; }
  .etiqueta.estrecha .fecha { font-size: 2.4mm; }
  @media print { .barra { display: none; } .lienzo { padding: 0; } .etiqueta { outline: none; } }
</style>
</head>
<body>
<div class="barra">
  <label>Tamaño <select id="tamano">${opciones}</select></label>
  <button id="imprimir" type="button">Imprimir</button>
  <button id="cerrar" type="button">Cerrar</button>
  <span class="ayuda">La línea punteada marca el borde de la etiqueta y no se imprime. En el diálogo, elegí la impresora de etiquetas y su papel; en la Xprinter, orientación vertical.</span>
</div>
<div class="lienzo">
  <div class="etiqueta${esEstrecha(t) ? " estrecha" : ""}" id="etiqueta">
    <div class="acc">${acc}</div>
    <div class="meta">${meta}</div>
    <div class="codigo">${svg}</div>
    <div class="nombre">${nombre}</div>
    <div class="fecha">${fecha}</div>
  </div>
</div>
<script>
  var TAMANOS = ${JSON.stringify(TAMANOS)};
  var sel = document.getElementById("tamano");
  function aplicar(id) {
    var t = TAMANOS.find(function (x) { return x.id === id; }) || TAMANOS[0];
    document.getElementById("pagina").textContent =
      "@page{size:" + (t.hoja ? "A4" : t.paginaAuto ? "auto" : t.ancho + "mm " + t.alto + "mm") + ";margin:" + (t.hoja ? "10mm" : "0") + "}";
    document.documentElement.style.setProperty("--w", t.ancho + "mm");
    document.documentElement.style.setProperty("--h", t.alto + "mm");
    document.documentElement.style.setProperty("--bc", t.codigoAncho + "mm");
    document.getElementById("etiqueta").classList.toggle("estrecha", !t.hoja && t.ancho < 60);
    try { localStorage.setItem(${JSON.stringify(CLAVE_TAMANO)}, id); } catch (e) {}
  }
  sel.addEventListener("change", function () { aplicar(sel.value); });
  document.getElementById("imprimir").addEventListener("click", function () { window.print(); });
  document.getElementById("cerrar").addEventListener("click", function () { window.close(); });
  ${autoImprimir ? 'window.addEventListener("load", function () { setTimeout(function () { window.print(); }, 250); });' : ""}
</script>
</body>
</html>`;
};

/**
 * Abre la etiqueta en una ventana aparte lista para imprimir. Devuelve false si
 * el navegador bloqueó la ventana (hay que permitir emergentes para el sitio).
 */
export const imprimirEtiqueta = (m: SampleDto): boolean => {
  const html = htmlEtiqueta(m, svgCodigoBarras(m.accession), tamanoGuardado());
  const w = window.open("", "_blank", "width=760,height=440");
  if (!w) return false;
  w.document.open();
  w.document.write(html);
  w.document.close();
  return true;
};
