import { describe, it, expect } from "vitest";
import {
  formatHours,
  formatPercent,
  padTicketNumber,
} from "../src/components/dashboards/shared";

describe("formatHours", () => {
  it("null → '—'", () => {
    expect(formatHours(null)).toBe("—");
  });

  it("menos de 1h → minutos", () => {
    expect(formatHours(0.5)).toBe("30 min");
    expect(formatHours(0.25)).toBe("15 min");
  });

  it("1-24h → horas", () => {
    expect(formatHours(2.5)).toBe("2.5 h");
    expect(formatHours(23)).toBe("23.0 h");
  });

  it("1-30 días → días", () => {
    expect(formatHours(48)).toBe("2.0 d");
    expect(formatHours(168)).toBe("7.0 d");
  });

  it("> 30 días → meses", () => {
    expect(formatHours(720 * 2)).toBe("2.0 m");
  });
});

describe("formatPercent", () => {
  it("null → '—'", () => {
    expect(formatPercent(null)).toBe("—");
  });

  it("formatea ratio como porcentaje con 1 decimal", () => {
    expect(formatPercent(0.123)).toBe("12.3 %");
    expect(formatPercent(1)).toBe("100.0 %");
    expect(formatPercent(0)).toBe("0.0 %");
  });
});

describe("padTicketNumber", () => {
  it("padea con ceros a la izquierda hasta 5 dígitos", () => {
    expect(padTicketNumber(1)).toBe("00001");
    expect(padTicketNumber(42)).toBe("00042");
    expect(padTicketNumber(12345)).toBe("12345");
  });

  it("números mayores a 5 dígitos quedan sin pad", () => {
    expect(padTicketNumber(123456)).toBe("123456");
  });
});
