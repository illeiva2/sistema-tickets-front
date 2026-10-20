import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

vi.mock("../src/lib/api", () => ({
  default: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));

vi.mock("../src/hooks/useAuth", () => ({
  useAuth: () => ({ user: { id: "user-1", role: "USER" } }),
}));

vi.mock("../src/contexts/ModulesContext", () => ({
  useModules: () => ({ levelOf: () => "VIEWER", has: () => true, modules: [], isLoading: false }),
}));

vi.mock("react-hot-toast", () => ({
  default: { success: vi.fn(), error: vi.fn() },
}));

// Se espía el formato de la fecha de toma: cada llamada es una celda de esa columna dibujada.
vi.mock("../src/features/lab/format", async (importOriginal) => {
  const real = await importOriginal<typeof import("../src/features/lab/format")>();
  return { ...real, fmtDateTime: vi.fn(real.fmtDateTime) };
});

import api from "../src/lib/api";
import { fmtDateTime } from "../src/features/lab/format";
import LabAnalysisPage from "../src/pages/lab/LabAnalysisPage";

const apiMock = api as unknown as { get: ReturnType<typeof vi.fn>; put: ReturnType<typeof vi.fn> };
const ok = (data: unknown) => Promise.resolve({ data: { success: true, data } });

const muestra = (i: number) => ({
  id: `s-${i}`,
  accession: `M-${String(i + 1).padStart(4, "0")}-0`,
  site: "MOLINO",
  seq: i + 1,
  kindId: "lsk_interna",
  sampledAt: new Date(Date.UTC(2026, 9, 19, 12) - i * 3_600_000).toISOString(),
  displayName: `Muestra ${i + 1}`,
  fields: {},
  notes: null,
  createdById: "user-1",
  createdAt: "2026-10-19T12:00:00.000Z",
  updatedAt: "2026-10-19T12:00:00.000Z",
  kind: { id: "lsk_interna", code: "INTERNA", name: "Muestra interna de proceso" },
  createdBy: { id: "user-1", name: "Operario" },
  analyses: { NIR: 1 },
  conditions: [],
  noLiga: false,
  rejectedAt: null,
  rejectedReason: null,
  values: { "NIR|Proteína DryBasis": 8.8 },
  implausible: [],
});

const grilla = (n: number) => ({
  items: Array.from({ length: n }, (_, i) => muestra(i)),
  total: n,
  limit: 500,
  truncated: false,
  columns: [
    { key: "NIR|Proteína DryBasis", source: "NIR", code: "Proteína DryBasis", label: "Proteína (NIR, B.S.)", unit: "%", decimals: 1 },
  ],
});

/** Filtros con que se pidió la grilla, en orden. */
let pedidos: Record<string, unknown>[] = [];
/** Respuesta de cada pedido de la grilla (por defecto, 30 muestras). */
let responderGrilla: (params: Record<string, unknown>) => Promise<unknown> = () => ok(grilla(30));

const pantalla = (ancha: boolean) => {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: query === "(min-width: 768px)" ? ancha : false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
};

const filasTabla = () => document.querySelectorAll("table tbody tr");

function renderPage() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <LabAnalysisPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("LabAnalysisPage: filtrar no cuelga la página", () => {
  const matchMediaOriginal = window.matchMedia;

  beforeEach(() => {
    vi.clearAllMocks();
    pedidos = [];
    responderGrilla = () => ok(grilla(30));
    pantalla(true);
    apiMock.get.mockImplementation((url: string, config?: { params?: Record<string, unknown> }) => {
      if (url.endsWith("/samples/kinds")) return ok([]);
      if (url.endsWith("/samples/grid")) {
        pedidos.push(config?.params ?? {});
        return responderGrilla(config?.params ?? {});
      }
      if (url === "/api/me/ui-preferences") return ok({ theme: "quiet-pro", darkMode: null, savedViews: {} });
      if (url.startsWith("/api/glutenlab/samples/")) return ok({ ...muestra(0), measurements: [] });
      return ok([]);
    });
    apiMock.put.mockImplementation(() => ok({}));
  });

  afterEach(() => {
    window.matchMedia = matchMediaOriginal;
  });

  it("tipear una fecha en Desde pide la grilla una vez, no una por tecla", async () => {
    renderPage();
    await waitFor(() => expect(filasTabla()).toHaveLength(30));
    expect(pedidos).toHaveLength(1);

    // Lo que emite el campo de fecha al tipear 03/02/2001: vacío con el día a medias, y el año tecla por tecla.
    const desde = screen.getByLabelText("Desde");
    for (const valor of ["", "2001-02-03", "", "2001-02-03", "0002-02-03", "0020-02-03", "0200-02-03", "2001-02-03"]) {
      fireEvent.change(desde, { target: { value: valor } });
    }

    await waitFor(() => expect(pedidos).toHaveLength(2), { timeout: 2000 });
    expect(pedidos[1].from).toBe("2001-02-03");
    // Pasada la pausa, no aparece ningún otro pedido.
    await new Promise((r) => setTimeout(r, 700));
    expect(pedidos).toHaveLength(2);
  });

  it("mientras llega el filtro nuevo la grilla anterior sigue en pantalla, atenuada", async () => {
    let entregar: (datos: unknown) => void = () => undefined;
    renderPage();
    await waitFor(() => expect(filasTabla()).toHaveLength(30));

    responderGrilla = () => new Promise((resolve) => (entregar = (datos) => resolve({ data: { success: true, data: datos } })));
    const desde = screen.getByLabelText("Desde");
    fireEvent.change(desde, { target: { value: "2001-02-03" } });
    fireEvent.blur(desde);

    await waitFor(() => expect(pedidos).toHaveLength(2));
    expect(filasTabla()).toHaveLength(30);
    expect(document.querySelector('[aria-busy="true"]')).not.toBeNull();

    entregar(grilla(5));
    await waitFor(() => expect(filasTabla()).toHaveLength(5));
    expect(document.querySelector('[aria-busy="true"]')).toBeNull();
  });

  it("dibuja de a 100 filas y 'Mostrar más' suma las siguientes", async () => {
    responderGrilla = () => ok(grilla(250));
    renderPage();
    await waitFor(() => expect(filasTabla()).toHaveLength(100));
    expect(screen.getByText("Mostrando 100 de 250")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Mostrar 100 más" }));
    expect(filasTabla()).toHaveLength(200);
    fireEvent.click(screen.getByRole("button", { name: "Mostrar 50 más" }));
    expect(filasTabla()).toHaveLength(250);
    expect(screen.queryByRole("button", { name: /^Mostrar \d+ más$/ })).not.toBeInTheDocument();
  });

  it("en pantalla ancha dibuja solo la tabla, y en una angosta solo las tarjetas", async () => {
    const { unmount } = renderPage();
    await waitFor(() => expect(filasTabla()).toHaveLength(30));
    expect(document.querySelectorAll("li")).toHaveLength(0);
    unmount();

    pantalla(false);
    renderPage();
    await waitFor(() => expect(document.querySelectorAll("li")).toHaveLength(30));
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("abrir una fila no vuelve a dibujar las demás", async () => {
    renderPage();
    await waitFor(() => expect(filasTabla()).toHaveLength(30));
    const formatos = vi.mocked(fmtDateTime);
    formatos.mockClear();

    fireEvent.click(filasTabla()[0]);
    await screen.findByRole("button", { name: "Abrir ficha completa" });

    // Solo se redibuja la fila abierta: una fecha de toma, no las treinta.
    expect(formatos.mock.calls.length).toBeLessThanOrEqual(2);
    expect(filasTabla()[0]).toHaveAttribute("aria-expanded", "true");
  });
});
