import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { formatSla, slaToneClasses } from "../src/lib/sla";

describe("formatSla", () => {
  beforeEach(() => {
    // Pin del reloj para tests deterministas.
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-02T12:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("dueAt nullo devuelve neutral con texto '—'", () => {
    const r = formatSla(null, "OPEN");
    expect(r).toEqual({
      text: "—",
      tone: "neutral",
      dueAt: null,
      overdue: false,
    });
  });

  it("ticket RESOLVED ignora la fecha y devuelve 'Cerrado' neutral", () => {
    const r = formatSla("2026-04-30T12:00:00.000Z", "RESOLVED");
    expect(r.tone).toBe("neutral");
    expect(r.text).toBe("Cerrado");
    expect(r.overdue).toBe(false);
  });

  it("ticket CLOSED idem RESOLVED", () => {
    const r = formatSla("2026-04-30T12:00:00.000Z", "CLOSED");
    expect(r.tone).toBe("neutral");
  });

  it("dueAt en el pasado y status activo → danger overdue", () => {
    const r = formatSla("2026-05-01T12:00:00.000Z", "OPEN"); // hace 24h
    expect(r.tone).toBe("danger");
    expect(r.overdue).toBe(true);
    expect(r.text).toContain("Vencido hace");
  });

  it("dueAt en menos de 4h → warning", () => {
    const r = formatSla("2026-05-02T14:00:00.000Z", "OPEN"); // en 2h
    expect(r.tone).toBe("warning");
    expect(r.overdue).toBe(false);
    expect(r.text).toContain("Vence en");
  });

  it("dueAt en más de 4h → ok", () => {
    const r = formatSla("2026-05-03T12:00:00.000Z", "IN_PROGRESS"); // en 24h
    expect(r.tone).toBe("ok");
    expect(r.overdue).toBe(false);
  });

  it("formato de duración: minutos", () => {
    const r = formatSla("2026-05-02T12:30:00.000Z", "OPEN"); // en 30min
    expect(r.text).toBe("Vence en 30 min");
  });

  it("formato de duración: horas con minutos sueltos", () => {
    const r = formatSla("2026-05-02T15:30:00.000Z", "OPEN"); // en 3h 30m
    expect(r.text).toBe("Vence en 3 h 30 min");
  });

  it("formato de duración: días", () => {
    const r = formatSla("2026-05-05T12:00:00.000Z", "OPEN"); // en 3 días
    expect(r.text).toBe("Vence en 3 d");
  });

  it("formato de duración: semanas (>= 14 días)", () => {
    const r = formatSla("2026-05-30T12:00:00.000Z", "OPEN"); // en 28 días = 4 sem
    expect(r.text).toBe("Vence en 4 sem");
  });
});

describe("slaToneClasses", () => {
  it("define clases para cada tono", () => {
    expect(slaToneClasses.danger).toContain("red");
    expect(slaToneClasses.warning).toContain("amber");
    expect(slaToneClasses.ok).toContain("emerald");
    expect(slaToneClasses.neutral).toBeTruthy();
  });
});
