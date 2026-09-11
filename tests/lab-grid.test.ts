import { describe, it, expect } from "vitest";
import {
  COLUMNAS_FIJAS,
  VISTA_SUGERIDA,
  claveAnalisis,
  construirColumnas,
  sanearVista,
} from "../src/features/lab/grid";
import type { AnalysisColumnDto, GridSampleDto, SampleKindDto } from "../src/features/lab/types";

// Modelo de columnas de la grilla de análisis: cómo se arma el catálogo desde
// los campos configurables y los análisis, cómo lee cada valor y cómo se
// sanea una vista guardada contra lo que existe hoy.

const campo = (
  kindId: string,
  key: string,
  label: string,
  type: SampleKindDto["fields"][number]["type"],
  extra: Partial<SampleKindDto["fields"][number]> = {},
): SampleKindDto["fields"][number] => ({
  id: `${kindId}-${key}`,
  kindId,
  key,
  label,
  type,
  required: false,
  options: null,
  inName: false,
  namePrefix: null,
  placeholder: null,
  isCondition: false,
  conditionValues: null,
  sortOrder: 0,
  isActive: true,
  ...extra,
});

const kinds: SampleKindDto[] = [
  {
    id: "k-rec",
    code: "RECEPCION",
    name: "Recepción de grano",
    description: null,
    defaultSite: "ACOPIO",
    sortOrder: 1,
    isActive: true,
    fields: [
      campo("k-rec", "empresa", "Empresa", "TEXT"),
      campo("k-rec", "humedad_campo", "Humedad a campo", "NUMBER"),
      campo("k-rec", "brotado", "Brotado", "BOOLEAN", { isCondition: true }),
      campo("k-rec", "lote", "Lote", "TEXT"),
      campo("k-rec", "viejo", "Campo desactivado", "TEXT", { isActive: false }),
    ],
  },
  {
    id: "k-int",
    code: "INTERNA",
    name: "Muestra interna",
    description: null,
    defaultSite: "MOLINO",
    sortOrder: 2,
    isActive: true,
    fields: [campo("k-int", "lote", "Lote", "TEXT"), campo("k-int", "producto", "Producto", "SELECT")],
  },
];

const analysis: AnalysisColumnDto[] = [
  { key: "NIR|Proteína DryBasis", source: "NIR", code: "Proteína DryBasis", label: "Proteína (NIR, b.s.)", unit: "%", decimals: 1 },
  { key: "ALVEOLAB|P/L", source: "ALVEOLAB", code: "P/L", label: "P/L", decimals: 2 },
];

const muestra = (over: Partial<GridSampleDto> = {}): GridSampleDto => ({
  id: "s1",
  accession: "A-0002-3",
  site: "ACOPIO",
  seq: 2,
  kindId: "k-rec",
  sampledAt: "2026-09-11T13:25:00.000Z",
  displayName: "Acopio · Empresa X",
  fields: { empresa: "Empresa X", humedad_campo: "12.5", brotado: true },
  notes: null,
  createdById: "u",
  createdAt: "",
  updatedAt: "",
  kind: { id: "k-rec", code: "RECEPCION", name: "Recepción de grano" },
  createdBy: { id: "u", name: "Operario" },
  analyses: { NIR: 2 },
  conditions: ["Brotado"],
  values: { "NIR|Proteína DryBasis": 12.34 },
  implausible: [],
  ...over,
});

describe("construirColumnas", () => {
  const cols = construirColumnas(kinds, analysis);
  const ids = cols.map((c) => c.id);

  it("arranca con las fijas, sigue con la ficha y termina con los análisis", () => {
    expect(ids.slice(0, COLUMNAS_FIJAS.length)).toEqual(COLUMNAS_FIJAS.map((c) => c.id));
    expect(ids.slice(-2)).toEqual(["a:NIR|Proteína DryBasis", "a:ALVEOLAB|P/L"]);
  });

  it("una key compartida por dos tipos es UNA columna, sin tipo en el grupo; una exclusiva nombra su tipo", () => {
    expect(ids.filter((id) => id === "f:lote")).toHaveLength(1);
    expect(cols.find((c) => c.id === "f:lote")?.grupoLabel).toBe("Ficha");
    expect(cols.find((c) => c.id === "f:empresa")?.grupoLabel).toBe("Ficha · Recepción de grano");
  });

  it("no ofrece campos desactivados", () => {
    expect(ids).not.toContain("f:viejo");
  });

  it("lee los valores de la ficha según el tipo: casilla marcada, número tipeado como texto, vacío", () => {
    const r = muestra();
    const de = (id: string) => cols.find((c) => c.id === id)!;
    expect(de("f:brotado").valor(r)).toBe("Sí");
    expect(de("f:humedad_campo").valor(r)).toBe(12.5);
    expect(de("f:humedad_campo").tipo).toBe("numero");
    expect(de("f:lote").valor(r)).toBeUndefined();
    expect(de("f:lote").texto(r)).toBe("");
    expect(de("f:empresa").texto(r)).toBe("Empresa X");
  });

  it("las columnas de análisis traen unidad y decimales, y formatean con coma", () => {
    const c = cols.find((col) => col.id === "a:NIR|Proteína DryBasis")!;
    expect(c).toMatchObject({ grupo: "analisis", grupoLabel: "NIR", unit: "%", decimals: 1, tipo: "numero" });
    expect(c.valor(muestra())).toBe(12.34);
    expect(c.texto(muestra())).toBe("12,3");
    const pl = cols.find((col) => col.id === "a:ALVEOLAB|P/L")!;
    expect(pl.valor(muestra())).toBeUndefined();
    expect(pl.texto(muestra())).toBe("—");
  });

  it("las fijas resumen alteraciones y equipos con datos", () => {
    const r = muestra();
    const de = (id: string) => COLUMNAS_FIJAS.find((c) => c.id === id)!;
    expect(de("conditions").valor(r)).toBe("Brotado");
    expect(de("analyses").valor(r)).toBe("NIR");
    expect(de("conditions").valor(muestra({ conditions: [] }))).toBeUndefined();
  });
});

describe("sanearVista", () => {
  const cols = construirColumnas(kinds, analysis);

  it("descarta columnas que ya no existen y pone la accesión primera aunque la vista no la tenga", () => {
    const v = sanearVista(
      { columns: ["f:empresa", "f:borrada", "a:NIR|Proteína DryBasis", "accession"], sort: [{ id: "f:borrada", desc: true }, { id: "f:empresa", desc: false }] },
      cols,
    );
    expect(v.columns).toEqual(["accession", "f:empresa", "a:NIR|Proteína DryBasis"]);
    expect(v.sort).toEqual([{ id: "f:empresa", desc: false }]);
  });

  it("acota el orden a tres criterios", () => {
    const v = sanearVista(
      {
        columns: ["accession", "sampledAt", "site", "kind", "displayName"],
        sort: [
          { id: "sampledAt", desc: true },
          { id: "site", desc: false },
          { id: "kind", desc: false },
          { id: "displayName", desc: false },
        ],
      },
      cols,
    );
    expect(v.sort).toHaveLength(3);
  });

  it("la vista sugerida saneada contra un catálogo sin esos campos sigue siendo válida", () => {
    const v = sanearVista(VISTA_SUGERIDA, cols);
    expect(v.columns[0]).toBe("accession");
    expect(v.columns).toContain("a:NIR|Proteína DryBasis");
    expect(v.columns).not.toContain("f:patente"); // este catálogo de prueba no lo tiene
    expect(v.sort).toEqual([{ id: "sampledAt", desc: true }]);
  });
});

describe("claveAnalisis", () => {
  it("extrae la clave del análisis solo de las columnas de análisis", () => {
    expect(claveAnalisis("a:NIR|Proteína DryBasis")).toBe("NIR|Proteína DryBasis");
    expect(claveAnalisis("f:empresa")).toBeNull();
    expect(claveAnalisis("accession")).toBeNull();
  });
});
