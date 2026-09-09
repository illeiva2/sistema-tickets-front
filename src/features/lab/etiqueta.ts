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
}

export const TAMANOS: TamanoEtiqueta[] = [
  { id: "dymo-89x28", nombre: "DYMO LabelWriter 89 × 28 mm (99010)", ancho: 89, alto: 28 },
  { id: "62x29", nombre: "Brother 62 × 29 mm", ancho: 62, alto: 29 },
  { id: "50x30", nombre: "Etiqueta 50 × 30 mm", ancho: 50, alto: 30 },
  { id: "100x50", nombre: "Etiqueta 100 × 50 mm", ancho: 100, alto: 50 },
  { id: "a4", nombre: "Hoja A4 (etiqueta arriba a la izquierda)", ancho: 89, alto: 28, hoja: true },
];

const CLAVE_TAMANO = "lab-etiqueta-tamano";

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

const reglaPagina = (t: TamanoEtiqueta) =>
  `@page{size:${t.hoja ? "A4" : `${t.ancho}mm ${t.alto}mm`};margin:${t.hoja ? "10mm" : "0"}}`;

/** Documento completo de la etiqueta. Puro: recibe el SVG ya generado. */
export const htmlEtiqueta = (m: SampleDto, svg: string, tamanoId: string, autoImprimir = true): string => {
  const t = TAMANOS.find((x) => x.id === tamanoId) ?? TAMANOS[0];
  const opciones = TAMANOS.map(
    (x) => `<option value="${x.id}"${x.id === t.id ? " selected" : ""}>${esc(x.nombre)}</option>`,
  ).join("");
  const acc = esc(m.accession);
  const nombre = esc(m.displayName);
  const meta = esc(`${SITE_LABEL[m.site]} · ${m.kind.name}`);
  const fecha = esc(fmtDateTime(m.sampledAt));

  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<title>Etiqueta ${acc}</title>
<style id="pagina">${reglaPagina(t)}</style>
<style>
  :root { --w: ${t.ancho}mm; --h: ${t.alto}mm; }
  html, body { margin: 0; padding: 0; background: #fff; color: #000; font-family: Arial, Helvetica, sans-serif; }
  .barra { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; padding: 8px 10px; background: #f3f4f6; border-bottom: 1px solid #d1d5db; font: 13px system-ui, sans-serif; }
  .barra select, .barra button { font: 13px system-ui, sans-serif; padding: 4px 8px; }
  .barra .ayuda { color: #6b7280; }
  .lienzo { padding: 12px; }
  .etiqueta { width: var(--w); height: var(--h); box-sizing: border-box; padding: 1.5mm 2mm; display: grid; grid-template-rows: auto minmax(0, 1fr) auto; row-gap: 0.6mm; overflow: hidden; background: #fff; outline: 1px dashed #9ca3af; }
  .fila1 { display: flex; justify-content: space-between; align-items: baseline; gap: 2mm; }
  .acc { font-family: Consolas, "Courier New", monospace; font-weight: 700; font-size: 7.2mm; letter-spacing: 0.4mm; line-height: 1; white-space: nowrap; }
  .meta { font-size: 2.6mm; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .codigo { display: flex; align-items: center; justify-content: center; min-height: 0; }
  .codigo svg { width: 100%; height: 100%; max-height: 9mm; display: block; }
  .pie { display: flex; justify-content: space-between; align-items: flex-end; gap: 2mm; font-size: 2.7mm; line-height: 1.2; }
  .nombre { overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
  .fecha { white-space: nowrap; }
  @media print { .barra { display: none; } .lienzo { padding: 0; } .etiqueta { outline: none; } }
</style>
</head>
<body>
<div class="barra">
  <label>Tamaño <select id="tamano">${opciones}</select></label>
  <button id="imprimir" type="button">Imprimir</button>
  <button id="cerrar" type="button">Cerrar</button>
  <span class="ayuda">La línea punteada marca el borde de la etiqueta y no se imprime. En el diálogo, elegí la impresora de etiquetas y su tamaño de papel.</span>
</div>
<div class="lienzo">
  <div class="etiqueta">
    <div class="fila1"><div class="acc">${acc}</div><div class="meta">${meta}</div></div>
    <div class="codigo">${svg}</div>
    <div class="pie"><div class="nombre">${nombre}</div><div class="fecha">${fecha}</div></div>
  </div>
</div>
<script>
  var TAMANOS = ${JSON.stringify(TAMANOS)};
  var sel = document.getElementById("tamano");
  function aplicar(id) {
    var t = TAMANOS.find(function (x) { return x.id === id; }) || TAMANOS[0];
    document.getElementById("pagina").textContent =
      "@page{size:" + (t.hoja ? "A4" : t.ancho + "mm " + t.alto + "mm") + ";margin:" + (t.hoja ? "10mm" : "0") + "}";
    document.documentElement.style.setProperty("--w", t.ancho + "mm");
    document.documentElement.style.setProperty("--h", t.alto + "mm");
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
