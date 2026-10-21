import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

vi.mock("../src/lib/api", () => ({
  default: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));

vi.mock("react-hot-toast", () => ({
  default: { success: vi.fn(), error: vi.fn() },
}));

import api from "../src/lib/api";
import { ManualMeasurementModal } from "../src/features/lab/components/ManualMeasurementModal";
import { SampleDetailModal } from "../src/features/lab/components/SampleDetailModal";
import type { SampleMeasurementDto } from "../src/features/lab/types";

// Análisis manual con el esquema de la planilla del laboratorio: humedad en
// estufa y cenizas en mufla por cápsula. Una muestra tiene uno solo: si ya hay,
// el botón lo abre con lo cargado; los números quedan como se tipearon.

const apiMock = api as unknown as { get: Mock; post: Mock; patch: Mock };
const ok = (data: unknown) => Promise.resolve({ data: { success: true, data } });

const conQuery = (ui: React.ReactElement) =>
  render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>{ui}</QueryClientProvider>);

const manual = (over: Partial<SampleMeasurementDto> = {}): SampleMeasurementDto => ({
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
const param = (code: string, value: number, unit: string | null = null) => ({ code, value, unit, isImplausible: false });

/** Los cuatro campos de una cápsula: el primero es la estufa, el segundo la mufla. */
const capsula = (indice: 0 | 1) => ({
  rotulo: screen.getAllByLabelText(/^Cápsula(?! vacía)(?! \+)/)[indice] as HTMLInputElement,
  vacia: screen.getAllByLabelText(/^Cápsula vacía/)[indice] as HTMLInputElement,
  muestra: screen.getAllByLabelText(/^Muestra/)[indice] as HTMLInputElement,
});
const tipear = (input: HTMLElement, valor: string) => fireEvent.change(input, { target: { value: valor } });

beforeEach(() => vi.clearAllMocks());

describe("formulario de análisis manual", () => {
  it("calcula humedad y cenizas mientras se tipea, como la planilla, y manda los textos tal cual", async () => {
    apiMock.post.mockReturnValue(ok({ id: "m1" }));
    conQuery(<ManualMeasurementModal sampleId="s1" accession="M-0010-4" onClose={vi.fn()} />);

    const estufa = capsula(0);
    tipear(estufa.rotulo, "I");
    tipear(estufa.vacia, "14,3716");
    tipear(estufa.muestra, "5,0006");
    expect(screen.getByText("Falta el peso final, al salir de la estufa")).toBeInTheDocument();
    tipear(screen.getByLabelText(/^Cápsula \+ muestra seca/), "18,6071");
    expect(screen.getByText("15,30 %")).toBeInTheDocument();

    const mufla = capsula(1);
    tipear(mufla.rotulo, "D");
    tipear(mufla.vacia, "34,3719");
    tipear(mufla.muestra, "5,0004");
    tipear(screen.getByLabelText(/^Cápsula \+ cenizas/), "34,3947");
    expect(screen.getByText("Base seca con la humedad de la estufa: 15,30 %.")).toBeInTheDocument();
    expect(screen.getByText("0,538 %")).toBeInTheDocument();

    tipear(screen.getByLabelText("Color L"), "89,50");
    fireEvent.click(screen.getByRole("button", { name: "Cargar" }));

    await waitFor(() => expect(apiMock.post).toHaveBeenCalledTimes(1));
    const [url, body] = apiMock.post.mock.calls[0];
    expect(url).toBe("/api/glutenlab/samples/s1/manual");
    expect(body.values).toMatchObject({ "Color L": "89,50", "Color a": null, "Humedad termobalanza": null });
    expect(body.humedad).toEqual({ capsula: "I", vacia: "14,3716", muestra: "5,0006", final: "18,6071" });
    expect(body.cenizas).toEqual({ capsula: "D", vacia: "34,3719", muestra: "5,0004", final: "34,3947" });
  });

  it("abre lo ya cargado con sus decimales y lo completa sobre el mismo análisis", async () => {
    apiMock.patch.mockReturnValue(ok({ id: "m1" }));
    conQuery(
      <ManualMeasurementModal
        sampleId="s1"
        accession="M-0010-4"
        onClose={vi.fn()}
        editing={manual({
          manualInput: {
            v: 1,
            values: { "Color L": "89.50" },
            cenizas: { capsula: "D", vacia: "34.3719", muestra: "5.0000" },
          },
          params: [param("Color L", 89.5)],
        })}
      />,
    );

    expect(screen.getByLabelText("Color L")).toHaveValue("89,50");
    const mufla = capsula(1);
    expect(mufla.rotulo).toHaveValue("D");
    expect(mufla.muestra).toHaveValue("5,0000");
    expect(screen.getByText("Falta el peso final, al salir de la mufla")).toBeInTheDocument();

    tipear(screen.getByLabelText(/^Cápsula \+ cenizas/), "34,3947");
    expect(screen.getByText("Falta la humedad para la base seca")).toBeInTheDocument();
    tipear(screen.getByLabelText(/^Humedad para la base seca/), "15,30");
    expect(screen.getByText("0,538 %")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));
    await waitFor(() => expect(apiMock.patch).toHaveBeenCalledTimes(1));
    const [url, body] = apiMock.patch.mock.calls[0];
    expect(url).toBe("/api/glutenlab/measurements/manual/m1");
    expect(body.cenizas).toEqual({ capsula: "D", vacia: "34,3719", muestra: "5,0000", final: "34,3947", humedad: "15,30" });
    expect(apiMock.post).not.toHaveBeenCalled();
  });

  it("lo cargado con el formulario anterior aparece aparte, con el número completo, para no perderlo", () => {
    conQuery(
      <ManualMeasurementModal
        sampleId="s1"
        accession="M-0010-4"
        onClose={vi.fn()}
        editing={manual({ params: [param("Color L", 89.52), param("Cenizas cápsula", 101), param("Cenizas estufa", 0.669, "%")] })}
      />,
    );
    expect(screen.getByLabelText("Color L")).toHaveValue("89,52");
    expect(screen.getByText("Cargado con el formulario anterior")).toBeInTheDocument();
    expect(screen.getByLabelText("Cenizas: cápsula")).toHaveValue("101");
    expect(screen.getByLabelText(/^Cenizas \(mufla, b\.s\.\)/)).toHaveValue("0,669");
  });
});

describe("ficha de la muestra", () => {
  const detalle = {
    id: "s1",
    accession: "M-0010-4",
    site: "MOLINO",
    seq: 10,
    kindId: "lsk_interna",
    sampledAt: "2026-10-20T10:00:00.000Z",
    displayName: "Molino · 3/0 · 20/10 07:00",
    fields: {},
    notes: null,
    createdById: "u",
    createdAt: "2026-10-20T10:00:00.000Z",
    updatedAt: "2026-10-20T10:00:00.000Z",
    kind: { id: "lsk_interna", code: "INTERNA", name: "Muestra interna de proceso" },
    createdBy: { id: "u", name: "Operario" },
    analyses: { MANUAL: 1 },
    conditions: [],
    noLiga: false,
    rejectedAt: null,
    rejectedReason: null,
    measurements: [
      manual({
        manualInput: {
          v: 1,
          values: { "Color L": "89.50" },
          humedad: { capsula: "I", vacia: "14.3716", muestra: "5.0006", final: "18.6071" },
          cenizas: { capsula: "D", vacia: "34.3719", muestra: "5.0004" },
        },
        params: [param("Color L", 89.5), param("Humedad estufa", 15.3002, "%")],
      }),
    ],
  };

  it("muestra lo manual como se cargó, con las cápsulas, y el botón abre ese análisis para completarlo", async () => {
    apiMock.get.mockReturnValue(ok(detalle));
    conQuery(
      <SampleDetailModal accession="M-0010-4" kinds={[]} canEdit onEdit={vi.fn()} onClose={vi.fn()} />,
    );

    expect(await screen.findByText("89,50")).toBeInTheDocument();
    expect(screen.getByText("15,30")).toBeInTheDocument();
    expect(screen.getByText("Humedad (estufa)")).toBeInTheDocument();
    expect(
      screen.getByText("Estufa: cápsula I · vacía 14,3716 g · muestra 5,0006 g · final 18,6071 g"),
    ).toBeInTheDocument();
    expect(screen.getByText("Mufla: cápsula D · vacía 34,3719 g · muestra 5,0004 g · falta el peso final")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Análisis manual/ }));
    expect(await screen.findByText(/ya está cargado \(lo cargó Operario\): completá o corregí/)).toBeInTheDocument();
    expect(screen.getByLabelText("Color L")).toHaveValue("89,50");
    expect(screen.getByRole("button", { name: "Guardar cambios" })).toBeInTheDocument();
  });
});
