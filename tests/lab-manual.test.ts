import { describe, expect, it } from "vitest";
import {
  aNumero,
  cenizasBaseSeca,
  cuerpoManual,
  erroresManual,
  formularioInicial,
  humedadEstufa,
  humedadParaCenizas,
  textoManual,
  ultimoManual,
} from "../src/features/lab/manual";
import type { SampleDetailDto, SampleMeasurementDto } from "../src/features/lab/types";

const medicion = (over: Partial<SampleMeasurementDto> = {}): SampleMeasurementDto => ({
  id: "m1",
  source: "MANUAL",
  sourceId: "x",
  instrumentSerial: null,
  instrumentName: null,
  productCode: null,
  sampleRef: "M-0010-4",
  analyzedAt: "2026-10-20T10:00:00.000Z",
  createdBy: { id: "u", name: "Operario" },
  manualInput: null,
  params: [],
  ...over,
});
const param = (code: string, value: number) => ({ code, value, unit: null, isImplausible: false });

describe("análisis manual: cuentas de la planilla", () => {
  it("humedad en estufa y cenizas en base seca dan lo mismo que la planilla (000 del 20/10)", () => {
    const humedad = humedadEstufa({ vacia: "14,3716", muestra: "5,0006", final: "18,6071" });
    expect(humedad).toBeCloseTo(15.3, 2);
    expect(cenizasBaseSeca({ vacia: "34,3719", muestra: "5,0004", final: "34,3947" }, humedad)).toBeCloseTo(0.538, 3);
  });

  it("sin el peso final, o con un peso que no es número, todavía no hay resultado", () => {
    expect(humedadEstufa({ vacia: "14,3716", muestra: "5,0006" })).toBeNull();
    expect(humedadEstufa({ vacia: "14,37g", muestra: "5", final: "18" })).toBeNull();
    expect(aNumero("14,37g")).toBeNaN();
    expect(aNumero(" 5,0006 ")).toBe(5.0006);
    expect(aNumero("")).toBeNull();
  });

  it("las cenizas usan la humedad de la estufa; sin estufa, la cargada en cenizas", () => {
    const estufa = { vacia: "14.3716", muestra: "5.0006", final: "18.6071" };
    expect(humedadParaCenizas(estufa, { humedad: "10" })).toBeCloseTo(15.3, 2);
    expect(humedadParaCenizas({ capsula: "I" }, { humedad: "12,5" })).toBe(12.5);
    expect(humedadParaCenizas(undefined, { humedad: "" })).toBeNull();
  });
});

describe("análisis manual: en la ficha, como se cargó", () => {
  it("lo tipeado con sus ceros, lo calculado con los decimales de la planilla y lo viejo con todos sus decimales", () => {
    const nueva = medicion({
      manualInput: {
        v: 1,
        values: { "Color L": "89.50", "Humedad termobalanza": "14.30" },
        humedad: { capsula: "I", vacia: "14.3716", muestra: "5.0006", final: "18.6071" },
      },
      params: [
        param("Color L", 89.5),
        param("Humedad termobalanza", 14.3),
        param("Humedad estufa", 15.3002),
        param("Cenizas estufa", 0.5383),
      ],
    });
    expect(nueva.params.map((p) => textoManual(nueva, p))).toEqual(["89,50", "14,30", "15,30", "0,538"]);
    // Cargadas antes de guardar lo tipeado: el número completo, sin redondear al catálogo.
    const vieja = medicion({ params: [param("Color L", 89.52), param("Cenizas estufa", 0.669), param("Color a", -1.46)] });
    expect(vieja.params.map((p) => textoManual(vieja, p))).toEqual(["89,52", "0,669", "-1,46"]);
  });

  it("el botón abre el último análisis manual de la muestra", () => {
    const sample = {
      measurements: [
        medicion({ id: "a", analyzedAt: "2026-10-01T10:00:00Z" }),
        medicion({ id: "nir", source: "NIR", analyzedAt: "2026-10-03T10:00:00Z" }),
        medicion({ id: "b", analyzedAt: "2026-10-02T10:00:00Z" }),
      ],
    } as unknown as SampleDetailDto;
    expect(ultimoManual(sample)?.id).toBe("b");
    expect(ultimoManual({ measurements: [] } as unknown as SampleDetailDto)).toBeNull();
  });
});

describe("análisis manual: formulario", () => {
  it("abre con lo tipeado tal cual; en las cargas viejas, con los números completos", () => {
    const f = formularioInicial(
      medicion({
        manualInput: {
          v: 1,
          values: { "Color L": "89.50" },
          cenizas: { capsula: "D", vacia: "34.3719", muestra: "5.0000", humedad: "15.30" },
        },
      }),
    );
    expect(f.values).toEqual({ "Color L": "89,50" });
    expect(f.cenizas).toEqual({ capsula: "D", vacia: "34,3719", muestra: "5,0000", final: "", humedad: "15,30" });
    expect(f.humedad).toEqual({ capsula: "", vacia: "", muestra: "", final: "" });
    const vieja = formularioInicial(medicion({ params: [param("Color L", 89.52), param("Cenizas cápsula", 101)] }));
    expect(vieja.values).toEqual({ "Color L": "89,52", "Cenizas cápsula": "101" });
  });

  it("manda los textos como se tipearon; la humedad de cenizas solo si no hay estufa", () => {
    const form = formularioInicial(null);
    form.values["Color L"] = " 89,50 ";
    form.humedad = { capsula: "I", vacia: "14,3716", muestra: "5,0006", final: "18,6071" };
    form.cenizas = { capsula: "D", vacia: "34,3719", muestra: "5,0004", final: "", humedad: "12" };
    expect(cuerpoManual(form, ["Color L", "Color a"], "2026-10-20T10:00:00.000Z")).toEqual({
      analyzedAt: "2026-10-20T10:00:00.000Z",
      values: { "Color L": "89,50", "Color a": null },
      humedad: { capsula: "I", vacia: "14,3716", muestra: "5,0006", final: "18,6071" },
      cenizas: { capsula: "D", vacia: "34,3719", muestra: "5,0004" },
    });
    form.humedad.final = "";
    expect(cuerpoManual(form, [], "x").cenizas).toEqual({
      capsula: "D",
      vacia: "34,3719",
      muestra: "5,0004",
      humedad: "12",
    });
  });

  it("marca en su campo un valor fuera de rango, un peso que no es número y una humedad imposible", () => {
    const form = formularioInicial(null);
    form.humedad = { capsula: "I", vacia: "14,3716", muestra: "5,0006", final: "28,6071" };
    form.cenizas.vacia = "34,37g";
    form.values["Color L"] = "150";
    expect(erroresManual(form, ["Color L"])).toEqual({
      "values.Color L": "Entre 0 y 100",
      "humedad.final": "La humedad da -184,68 %: revisá los pesos",
      "cenizas.vacia": "Tiene que ser un número",
    });
  });
});
