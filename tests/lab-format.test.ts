import { describe, expect, it } from "vitest";
import { VACIO, fechaAplicable, fmtDate, fmtDateTime, fmtInt, fmtNumber } from "../src/features/lab/format";

describe("formato del laboratorio con formateadores reusados", () => {
  it("los números salen igual que con toLocaleString, con los mismos decimales fijos", () => {
    for (const n of [0, 8.8, 11.04, 77.5, 291, -3.456, 1234567.891, 0.005]) {
      for (const decimals of [0, 1, 2, 3]) {
        expect(fmtNumber(n, decimals)).toBe(
          n.toLocaleString("es-AR", { minimumFractionDigits: decimals, maximumFractionDigits: decimals }),
        );
      }
    }
    expect(fmtNumber(8.8)).toBe("8,80");
    expect(fmtNumber(1234.5, 1)).toBe("1.234,5");
    expect(fmtInt(46597)).toBe((46597).toLocaleString("es-AR"));
  });

  it("las fechas salen igual que con toLocaleString y toLocaleDateString", () => {
    for (const iso of ["2026-10-19T13:30:00.000Z", "2026-01-02T03:04:05.000Z", "2025-12-31T23:59:59.000Z"]) {
      expect(fmtDateTime(iso)).toBe(
        new Date(iso).toLocaleString("es-AR", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }),
      );
      expect(fmtDate(iso)).toBe(
        new Date(iso).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "2-digit" }),
      );
    }
  });

  it("sin dato es el guion largo, y una fecha inválida sigue diciendo Invalid Date", () => {
    expect(fmtNumber(null)).toBe(VACIO);
    expect(fmtNumber(undefined, 1)).toBe(VACIO);
    expect(fmtInt(null)).toBe(VACIO);
    expect(fmtDateTime(null)).toBe(VACIO);
    expect(fmtDate("")).toBe(VACIO);
    expect(fmtDateTime("no es una fecha")).toBe("Invalid Date");
    expect(fmtDate("no es una fecha")).toBe("Invalid Date");
  });
});

describe("fechaAplicable: qué fecha de un filtro vale la pena pedir", () => {
  const hoy = new Date(2026, 9, 20);

  it("acepta fechas completas del 2000 al año que viene", () => {
    expect(fechaAplicable("2026-09-01", hoy)).toBe(true);
    expect(fechaAplicable("2000-01-01", hoy)).toBe(true);
    expect(fechaAplicable("2027-12-31", hoy)).toBe(true);
  });

  it("rechaza lo que pasa por el campo mientras se tipea", () => {
    // Día o mes a medio escribir: el campo queda vacío.
    expect(fechaAplicable("", hoy)).toBe(false);
    // El año, tecla por tecla.
    expect(fechaAplicable("0002-09-01", hoy)).toBe(false);
    expect(fechaAplicable("0020-09-01", hoy)).toBe(false);
    expect(fechaAplicable("0202-09-01", hoy)).toBe(false);
    expect(fechaAplicable("2028-01-01", hoy)).toBe(false);
  });

  it("rechaza lo que no es una fecha", () => {
    expect(fechaAplicable("2026-02-30", hoy)).toBe(false);
    expect(fechaAplicable("2026-13-01", hoy)).toBe(false);
    expect(fechaAplicable("01/09/2026", hoy)).toBe(false);
  });
});
