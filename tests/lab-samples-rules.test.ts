import { describe, it, expect } from "vitest";
import { errorDeFormato, esVisible, pctKey } from "../src/features/lab/samples";
import type { SampleFieldDefDto } from "../src/features/lab/types";

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
