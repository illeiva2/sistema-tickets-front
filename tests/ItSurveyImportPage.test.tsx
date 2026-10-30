import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

vi.mock("../src/lib/api", () => ({
  default: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));

vi.mock("react-hot-toast", () => ({
  default: { success: vi.fn(), error: vi.fn() },
}));

import toast from "react-hot-toast";
import api from "../src/lib/api";
import ItSurveyImportPage from "../src/pages/it/ItSurveyImportPage";
import type { SurveyItem, SurveyPreview } from "../src/features/it/survey-import/types";

const apiMock = api as unknown as { post: ReturnType<typeof vi.fn> };
const CSV = "Marca temporal,Dirección de correo electrónico,Nombre y apellido\n29/10/2026,aperez@empresa.test,Ana Pérez\n";
const HASH = "a".repeat(64);

const item = (overrides: Partial<SurveyItem>): SurveyItem => ({
  kind: "computer",
  key: "NB-ANA",
  title: "NB-ANA",
  detail: "Notebook · Lenovo ThinkPad E14",
  action: "create",
  holder: "Ana Pérez",
  notes: [],
  rows: [2],
  ...overrides,
});

// Datos inventados.
const preview = (overrides: Partial<SurveyPreview> = {}): SurveyPreview => ({
  planHash: HASH,
  responses: 3,
  counts: { create: 2, assign: 1, update: 0, unchanged: 1, conflict: 1 },
  sectors: [
    { value: "Compras", responses: 2, departmentId: "dep-compras", source: "auto" },
    { value: "Taller (Maquinarias)", responses: 1, departmentId: null, source: null },
  ],
  departments: [
    { id: "dep-compras", name: "Compras" },
    { id: "dep-taller", name: "Taller" },
  ],
  items: [
    item({
      kind: "person",
      key: "aperez@empresa.test",
      title: "Ana Pérez",
      detail: "aperez@empresa.test · Compras",
      action: "unchanged",
      holder: null,
    }),
    item({ action: "create" }),
    item({
      key: "COMPRAS-01",
      title: "COMPRAS-01",
      action: "conflict",
      holder: null,
      notes: ["En el inventario está asignada a Zoe Ruiz."],
      rows: [2, 3],
    }),
    item({
      kind: "line",
      key: "3515551234",
      title: "+5493515551234",
      detail: "Claro",
      action: "assign",
    }),
    item({
      kind: "phone",
      key: "phone:3515551234",
      title: "Samsung Galaxy A14",
      detail: "+5493515551234",
      action: "create",
    }),
  ],
  issues: [
    {
      row: 4,
      message: "Bruno Díaz: «pc_de_bruno» no sirve como nombre de la computadora (letras, números y guiones, de 3 a 32).",
    },
  ],
  notes: [
    { row: 4, name: "Bruno Díaz", otherEquipment: "Un monitor de 24 pulgadas", comments: null },
  ],
  ...overrides,
});

const ok = (data: unknown) => Promise.resolve({ data: { success: true, data } });
const fail = (status: number, error: Record<string, unknown>) =>
  Promise.reject(Object.assign(new Error("Request failed"), { response: { status, data: { success: false, error } } }));

function renderPage() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } },
  });
  const invalidate = vi.spyOn(client, "invalidateQueries");
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <ItSurveyImportPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
  return { invalidate };
}

async function chooseCsv(content = CSV, name = "Relevamiento de equipos (respuestas).csv") {
  const user = userEvent.setup();
  await user.upload(screen.getByLabelText("Elegir CSV"), new File([content], name, { type: "text/csv" }));
  return user;
}

describe("Importar relevamiento", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("muestra la vista previa del CSV sin guardar nada", async () => {
    apiMock.post.mockImplementation(() => ok(preview()));
    renderPage();

    await chooseCsv();

    expect(await screen.findByText("Relevamiento de equipos (respuestas).csv")).toBeInTheDocument();
    expect(apiMock.post).toHaveBeenCalledTimes(1);
    expect(apiMock.post).toHaveBeenCalledWith("/api/it/survey-import/preview", { csv: CSV, sectorMap: {} });

    const summary = screen.getByRole("region", { name: "Resumen" });
    expect(within(summary).getByText("Para crear").closest("article")).toHaveTextContent("2");
    expect(within(summary).getByText("Para revisar").closest("article")).toHaveTextContent("1");

    const computers = screen.getByRole("region", { name: /Computadoras/ });
    const conflict = within(computers).getByText("COMPRAS-01").closest("li");
    expect(conflict).toHaveAttribute("data-action", "conflict");
    expect(conflict).toHaveTextContent("Revisar");
    expect(conflict).toHaveTextContent("En el inventario está asignada a Zoe Ruiz.");
    expect(conflict).toHaveTextContent("Filas 2, 3");
    expect(within(computers).getByText("NB-ANA").closest("li")).toHaveTextContent("Asignado aAna Pérez");

    expect(screen.getByRole("region", { name: /Respuestas con problemas/ })).toHaveTextContent(
      "Fila 4Bruno Díaz: «pc_de_bruno» no sirve",
    );
    expect(screen.getByRole("region", { name: /Para cargar a mano/ })).toHaveTextContent(
      "Otros equipos: Un monitor de 24 pulgadas",
    );
    expect(screen.getByText("Se guardan 3 cambios. Lo que está para revisar no se toca.")).toBeInTheDocument();
  });

  it("oculta lo que no cambia hasta que se pide", async () => {
    apiMock.post.mockImplementation(() => ok(preview()));
    renderPage();
    const user = await chooseCsv();

    const people = await screen.findByRole("region", { name: /Personas/ });
    expect(people).toHaveTextContent("Nada cambia.");
    expect(within(people).queryByText("Ana Pérez")).not.toBeInTheDocument();

    await user.click(screen.getByLabelText("Mostrar lo que no cambia (1)"));

    expect(within(people).getByText("Ana Pérez").closest("li")).toHaveTextContent("Sin cambios");
  });

  it("al elegir el sector de uno que no coincide, vuelve a pedir la vista previa", async () => {
    apiMock.post.mockImplementation(() => ok(preview()));
    renderPage();
    const user = await chooseCsv();

    const sectors = await screen.findByRole("region", { name: "Sectores" });
    expect(sectors).toHaveTextContent("No coincide con ningún sector del sistema");
    await user.selectOptions(within(sectors).getByLabelText(/Taller \(Maquinarias\)/), "dep-taller");

    await waitFor(() => expect(apiMock.post).toHaveBeenCalledTimes(2));
    expect(apiMock.post).toHaveBeenLastCalledWith("/api/it/survey-import/preview", {
      csv: CSV,
      sectorMap: { "Taller (Maquinarias)": "dep-taller" },
    });
  });

  it("importa con el plan que se vio y muestra lo que se guardó", async () => {
    const applied = preview({ issues: [], notes: [] });
    apiMock.post.mockImplementation((url: string) =>
      url.endsWith("/preview")
        ? ok(preview())
        : ok({
            applied: {
              people: { created: 1, updated: 0 },
              assets: { created: 2, assigned: 1, updated: 0 },
              lines: { created: 0, assigned: 1, updated: 0 },
            },
            preview: applied,
          }),
    );
    const { invalidate } = renderPage();
    const user = await chooseCsv();

    await user.click(await screen.findByRole("button", { name: "Importar" }));

    expect(apiMock.post).toHaveBeenLastCalledWith("/api/it/survey-import/apply", {
      csv: CSV,
      sectorMap: {},
      expectedPlanHash: HASH,
    });
    const done = await screen.findByText("Relevamiento importado");
    expect(done.closest("div")).toHaveTextContent("Personas: 1 nueva.");
    expect(done.closest("div")).toHaveTextContent("Equipos: 2 nuevos, 1 asignado.");
    expect(done.closest("div")).toHaveTextContent("Líneas: 1 asignada.");
    expect(screen.queryByRole("button", { name: "Importar" })).not.toBeInTheDocument();
    // Lo que se hizo, en pasado; lo que quedó para revisar, igual.
    const computers = screen.getByRole("region", { name: /Computadoras/ });
    expect(within(computers).getByText("NB-ANA").closest("li")).toHaveTextContent("Creado");
    expect(within(computers).getByText("COMPRAS-01").closest("li")).toHaveTextContent("Revisar");
    expect(screen.getByRole("combobox", { name: /Taller \(Maquinarias\)/ })).toBeDisabled();
    expect(toast.success).toHaveBeenCalledWith("Relevamiento importado");
    expect(invalidate.mock.calls.map(([filters]) => filters?.queryKey)).toEqual([
      ["it", "assets"],
      ["it", "people"],
      ["it", "phone-lines"],
      ["it", "overview"],
    ]);
  });

  it("si los datos cambiaron, muestra la vista previa nueva y no importa", async () => {
    const changed = preview({
      planHash: "b".repeat(64),
      counts: { create: 1, assign: 0, update: 0, unchanged: 2, conflict: 2 },
    });
    apiMock.post.mockImplementation((url: string) =>
      url.endsWith("/preview")
        ? ok(preview())
        : fail(409, {
            code: "SURVEY_PLAN_CHANGED",
            message: "Los datos cambiaron desde la vista previa: revisala de nuevo antes de importar",
            details: { preview: changed },
          }),
    );
    renderPage();
    const user = await chooseCsv();

    await user.click(await screen.findByRole("button", { name: "Importar" }));

    expect(toast.error).toHaveBeenCalledWith(
      "Los datos cambiaron desde la vista previa: revisala de nuevo antes de importar",
    );
    expect(await screen.findByText("Se guardan 1 cambio. Lo que está para revisar no se toca.")).toBeInTheDocument();
    expect(screen.queryByText("Relevamiento importado")).not.toBeInTheDocument();
  });

  it("explica por qué no pudo leer el archivo", async () => {
    apiMock.post.mockImplementation(() =>
      fail(400, {
        code: "SURVEY_CSV_COLUMNS_MISSING",
        message: "No parece la planilla del relevamiento: faltan las columnas del correo o de «Nombre y apellido»",
      }),
    );
    renderPage();
    await chooseCsv("Fecha,Monto\n1/1/2026,10\n", "gastos.csv");

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("No se pudo leer la planilla");
    expect(alert).toHaveTextContent("No parece la planilla del relevamiento");
    expect(screen.queryByRole("button", { name: "Importar" })).not.toBeInTheDocument();
  });

  it("no manda un archivo que no puede ser la planilla", async () => {
    renderPage();
    await chooseCsv("x".repeat(2_000_001), "enorme.csv");

    expect(await screen.findByRole("alert")).toHaveTextContent("El archivo es demasiado grande");
    expect(apiMock.post).not.toHaveBeenCalled();
  });
});
