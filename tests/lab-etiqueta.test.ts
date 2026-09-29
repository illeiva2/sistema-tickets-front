// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { TAMANOS, esEstrecha, htmlEtiqueta, tamanoGuardado } from "../src/features/lab/etiqueta";
import type { SampleDto } from "../src/features/lab/types";

// La etiqueta de la muestra: desde que llegaron las Xprinter arranca en
// 50 × 30 mm, y en ese ancho el contenido se apila en vez de ir en columnas.

const muestra = {
  id: "s1",
  accession: "M-0012-4",
  site: "MOLINO",
  kind: { id: "k", code: "INTERNA", name: "Interna de proceso" },
  displayName: "Molino · 3/0 · Lote 123A <b>",
  sampledAt: "2026-09-29T13:05:00.000Z",
} as unknown as SampleDto;

beforeEach(() => {
  localStorage.clear();
});

describe("tamaño por defecto", () => {
  it("arranca en 50 × 30 (Xprinter) y recuerda una elección válida", () => {
    expect(TAMANOS[0].id).toBe("50x30");
    expect(tamanoGuardado()).toBe("50x30");
    localStorage.setItem("lab-etiqueta-tamano-v2", "dymo-89x28");
    expect(tamanoGuardado()).toBe("dymo-89x28");
  });

  it("ignora un id guardado que ya no existe y la clave vieja de antes de las Xprinter", () => {
    localStorage.setItem("lab-etiqueta-tamano-v2", "zebra-100x100");
    expect(tamanoGuardado()).toBe("50x30");
    localStorage.clear();
    localStorage.setItem("lab-etiqueta-tamano", "dymo-89x28");
    expect(tamanoGuardado()).toBe("50x30");
  });

  it("es estrecha por debajo de 60 mm, salvo la hoja A4", () => {
    expect(TAMANOS.filter(esEstrecha).map((t) => t.id)).toEqual(["50x30"]);
  });
});

describe("htmlEtiqueta", () => {
  it("en 50 × 30 apila el contenido y deja la página al papel del driver (en vertical, sin girar)", () => {
    const html = htmlEtiqueta(muestra, "<svg data-test></svg>", "50x30", false);
    expect(html).toContain('class="etiqueta estrecha"');
    // Con size:50mm 30mm Chrome manda la página en horizontal y la Xprinter la gira 90°.
    expect(html).toContain("@page{size:auto;margin:0}");
    expect(html).not.toContain("size:50mm 30mm");
    expect(html).toContain("--w: 50mm; --h: 30mm; --bc: 46mm;");
    expect(html).toContain("<svg data-test></svg>");
    expect(html).toContain('<option value="50x30" selected>');
  });

  it("en la DYMO va en columnas con la página fija (el rollo es angosto y la etiqueta sale acostada); en A4, hoja con margen", () => {
    expect(htmlEtiqueta(muestra, "<svg></svg>", "dymo-89x28", false)).toContain('class="etiqueta"');
    expect(htmlEtiqueta(muestra, "<svg></svg>", "dymo-89x28", false)).toContain("@page{size:89mm 28mm;margin:0}");
    expect(htmlEtiqueta(muestra, "<svg></svg>", "a4", false)).toContain("@page{size:A4;margin:10mm}");
    expect(TAMANOS.filter((t) => t.paginaAuto).map((t) => t.id)).toEqual(["50x30", "100x50", "62x29"]);
  });

  it("escapa el texto de la muestra y solo dispara la impresión automática si se pide", () => {
    const html = htmlEtiqueta(muestra, "<svg></svg>", "50x30", false);
    expect(html).toContain("Lote 123A &lt;b&gt;");
    expect(html).not.toContain("Lote 123A <b>");
    expect(html).not.toContain("window.print(); }, 250)");
    expect(htmlEtiqueta(muestra, "<svg></svg>", "50x30")).toContain("window.print(); }, 250)");
  });
});
