import { describe, it, expect } from "vitest";
import {
  camposFiltrables,
  errorDeFormato,
  esVisible,
  paramsDeFiltros,
  pctKey,
  valoresIniciales,
} from "../src/features/lab/samples";
import type { SampleFieldDefDto, SampleKindDto } from "../src/features/lab/types";

// Espejo en el navegador de las reglas del catálogo (el backend las valida de
// nuevo): qué campos se muestran según otros y el aviso de formato.

const def = (over: Partial<SampleFieldDefDto> & Pick<SampleFieldDefDto, "key" | "label" | "type">): SampleFieldDefDto => ({
  id: over.key,
  kindId: "k",
  required: false,
  options: null,
  inName: false,
  namePrefix: null,
  placeholder: null,
  isCondition: false,
  conditionValues: null,
  visibleWhen: null,
  pattern: null,
  patternHint: null,
  withPercent: false,
  suggest: false,
  uppercase: false,
  defaultValue: null,
  filterable: false,
  sortOrder: 0,
  isActive: true,
  ...over,
});

const DEFS = [
  def({ key: "producto", label: "Producto", type: "SELECT", options: ["Trigo Sucio", "3/0", "3/0 Embolse"] }),
  def({ key: "origen_trigo", label: "Origen", type: "SELECT", options: ["Silo", "Mezcla"], visibleWhen: { field: "producto", values: ["Trigo Sucio"] } }),
  def({ key: "silo", label: "Silo", type: "TEXT", visibleWhen: { field: "origen_trigo", values: ["Silo"] } }),
  def({ key: "lote", label: "Lote", type: "TEXT", visibleWhen: { field: "producto", values: ["3/0 Embolse"] }, pattern: "^\\d{3}[A-Z]$", patternHint: "3 números y una letra, por ejemplo 123A" }),
  def({ key: "mezcla", label: "Mezcla", type: "BOOLEAN" }),
  def({ key: "acoplado", label: "Acoplado", type: "TEXT", visibleWhen: { field: "mezcla", values: ["true"] } }),
];

describe("esVisible (formulario)", () => {
  it("sin regla se muestra; con regla, según el valor del controlador", () => {
    expect(esVisible(DEFS[0], {}, DEFS)).toBe(true);
    expect(esVisible(DEFS[3], { producto: "3/0 Embolse" }, DEFS)).toBe(true);
    expect(esVisible(DEFS[3], { producto: "3/0" }, DEFS)).toBe(false);
    expect(esVisible(DEFS[3], {}, DEFS)).toBe(false);
  });

  it("sigue la cadena Producto → Origen → Silo", () => {
    expect(esVisible(DEFS[2], { producto: "Trigo Sucio", origen_trigo: "Silo" }, DEFS)).toBe(true);
    expect(esVisible(DEFS[2], { producto: "3/0", origen_trigo: "Silo" }, DEFS)).toBe(false);
  });

  it('una casilla marcada vale "true"', () => {
    expect(esVisible(DEFS[5], { mezcla: "true" }, DEFS)).toBe(true);
    expect(esVisible(DEFS[5], { mezcla: "" }, DEFS)).toBe(false);
  });
});

describe("errorDeFormato", () => {
  it("avisa con la explicación del catálogo cuando el valor no cumple, y nada cuando cumple o está vacío", () => {
    expect(errorDeFormato(DEFS[3], "12A")).toBe("3 números y una letra, por ejemplo 123A");
    expect(errorDeFormato(DEFS[3], "123A")).toBeNull();
    expect(errorDeFormato(DEFS[3], "")).toBeNull();
  });

  it("un patrón que no compila no bloquea", () => {
    expect(errorDeFormato(def({ key: "x", label: "X", type: "TEXT", pattern: "([" }), "algo")).toBeNull();
  });

  it("pctKey sigue la convención del backend", () => {
    expect(pctKey("picados")).toBe("picados_pct");
  });
});

// Lo pedido por acopio y comercio el 1-oct-2026: "Tipo de ingreso" arranca en
// Camión y se filtra en la lista y en Análisis.

const kind = (id: string, name: string, fields: SampleFieldDefDto[], isActive = true): SampleKindDto => ({
  id,
  code: id.toUpperCase(),
  name,
  description: null,
  defaultSite: null,
  lockSite: false,
  sortOrder: 0,
  isActive,
  fields,
});

const TIPO_INGRESO = def({
  key: "tipo_ingreso",
  label: "Tipo de ingreso",
  type: "SELECT",
  options: ["Camión", "Muestra del cliente"],
  defaultValue: "Camión",
  filterable: true,
});

describe("valoresIniciales", () => {
  it("arranca con los valores iniciales de los campos activos y nada más", () => {
    const defs = [
      TIPO_INGRESO,
      def({ key: "empresa", label: "Empresa", type: "TEXT" }),
      def({ key: "viejo", label: "Viejo", type: "SELECT", options: ["a"], defaultValue: "a", isActive: false }),
    ];
    expect(valoresIniciales(defs)).toEqual({ tipo_ingreso: "Camión" });
  });
});

describe("camposFiltrables", () => {
  const recepcion = kind("recepcion", "Recepción de grano", [
    TIPO_INGRESO,
    def({ key: "equipo", label: "Equipo", type: "SELECT", options: ["Chasis", "Batea"] }),
    def({ key: "chofer", label: "Chofer", type: "TEXT", filterable: true }),
  ]);
  const interna = kind("interna", "Interna", [
    def({ key: "tipo_ingreso", label: "Tipo de ingreso", type: "SELECT", options: ["Camión", "Otro"], filterable: true }),
  ]);
  const inactivo = kind("inactivo", "Inactivo", [TIPO_INGRESO], false);

  it("solo listas marcadas como filtro, de tipos activos; una key en dos tipos es un filtro con la unión de opciones", () => {
    expect(camposFiltrables([recepcion, interna, inactivo])).toEqual([
      { key: "tipo_ingreso", label: "Tipo de ingreso", options: ["Camión", "Muestra del cliente", "Otro"] },
    ]);
  });

  it("con un tipo elegido, solo los de ese tipo", () => {
    expect(camposFiltrables([recepcion, interna], "interna")).toEqual([
      { key: "tipo_ingreso", label: "Tipo de ingreso", options: ["Camión", "Otro"] },
    ]);
    expect(camposFiltrables([recepcion, interna], "nada")).toEqual([]);
  });
});

describe("paramsDeFiltros", () => {
  it("los campos de la ficha viajan planos como f.<clave>; lo vacío no viaja", () => {
    expect(
      paramsDeFiltros({ q: "x", rejected: true, fields: { tipo_ingreso: "Camión", equipo: "" }, pageSize: 50 }),
    ).toEqual({ q: "x", rejected: true, "f.tipo_ingreso": "Camión", pageSize: 50 });
    expect(paramsDeFiltros({ from: "2026-10-01" })).toEqual({ from: "2026-10-01" });
  });
});
