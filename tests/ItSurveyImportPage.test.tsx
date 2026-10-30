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

const apiMock = api as unknown as {
  post: ReturnType<typeof vi.fn>;
  put: ReturnType<typeof vi.fn>;
};
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
    { key: "compras", value: "Compras", responses: 2, departmentId: "dep-compras", source: "auto" },
    {
      key: "taller (maquinarias)",
      value: "Taller (Maquinarias)",
      responses: 1,
      departmentId: null,
      source: null,
    },
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
  corrections: [],
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
    expect(apiMock.post).toHaveBeenCalledWith("/api/it/survey-import/preview", { csv: CSV });

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

  it("al elegir el sector de uno que no coincide, lo guarda y muestra la vista previa con él", async () => {
    apiMock.post.mockImplementation(() => ok(preview()));
    apiMock.put.mockImplementation(() =>
      ok(
        preview({
          sectors: [
            {
              key: "taller (maquinarias)",
              value: "Taller (Maquinarias)",
              responses: 1,
              departmentId: "dep-taller",
              source: "manual",
            },
          ],
        }),
      ),
    );
    renderPage();
    const user = await chooseCsv();

    const sectors = await screen.findByRole("region", { name: "Sectores" });
    expect(sectors).toHaveTextContent("No coincide con ningún sector del sistema");
    await user.selectOptions(within(sectors).getByLabelText(/Taller \(Maquinarias\)/), "dep-taller");

    await waitFor(() => expect(apiMock.put).toHaveBeenCalledTimes(1));
    expect(apiMock.put).toHaveBeenCalledWith("/api/it/survey-import/corrections", {
      csv: CSV,
      corrections: [{ scope: "sector", key: "taller (maquinarias)", value: { departmentId: "dep-taller" } }],
    });
    await waitFor(() => expect(sectors).not.toHaveTextContent("No coincide con ningún sector del sistema"));
    expect(apiMock.post).toHaveBeenCalledTimes(1);
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

  it("corrige un nombre a mano y muestra la vista previa con la corrección", async () => {
    const conflict = item({
      key: "82YU",
      title: "82YU",
      action: "conflict",
      holder: "Darío Ruiz",
      notes: ["82YU no sigue el estándar PUESTO###: corregilo o confirmá que está bien así."],
      confirmName: true,
      edits: [
        { scope: "hostname", key: "82YU", from: "82YU", responses: 1, tag: "82YU" },
        {
          scope: "computer",
          key: "hp|prodesk400",
          from: "HP prodesk 400",
          responses: 2,
          brand: "HP",
          model: "ProDesk 400",
        },
      ],
    });
    const corrected = item({
      key: "PUESTO021",
      title: "PUESTO021",
      action: "create",
      fixes: [{ field: "hostname", from: "82YU", to: "PUESTO021", source: "manual" }],
      edits: [{ scope: "hostname", key: "82YU", from: "82YU", responses: 1, tag: "PUESTO021" }],
    });
    apiMock.post.mockImplementation(() => ok(preview({ items: [conflict] })));
    apiMock.put.mockImplementation(() => ok(preview({ items: [corrected] })));
    renderPage();
    const user = await chooseCsv();

    await user.click(await screen.findByRole("button", { name: "Corregir 82YU" }));
    const form = screen.getByRole("form", { name: "Corregir" });
    expect(form).toHaveTextContent("Cambia las 2 respuestas con «HP ProDesk 400».");
    const name = within(form).getByLabelText("Nombre de la PC");
    await user.clear(name);
    await user.type(name, "puesto 21");
    await user.click(within(form).getByRole("button", { name: "Guardar" }));
    expect(await within(form).findByRole("alert")).toHaveTextContent("letras, números y guiones");
    expect(apiMock.put).not.toHaveBeenCalled();

    await user.clear(name);
    await user.type(name, "puesto021");
    await user.click(within(form).getByRole("button", { name: "Guardar" }));

    // Solo lo que cambió: la marca y el modelo quedan como estaban.
    expect(apiMock.put).toHaveBeenCalledWith("/api/it/survey-import/corrections", {
      csv: CSV,
      corrections: [{ scope: "hostname", key: "82YU", value: { tag: "PUESTO021" } }],
    });
    const computers = screen.getByRole("region", { name: /Computadoras/ });
    const fixed = await within(computers).findByText("PUESTO021");
    expect(fixed.closest("li")).toHaveTextContent("A mano«82YU» → PUESTO021");
    expect(screen.queryByRole("form", { name: "Corregir" })).not.toBeInTheDocument();
  });

  it("confirma un nombre fuera del estándar o usa la computadora que ya tiene", async () => {
    const conflict = item({
      key: "82YU",
      title: "82YU",
      action: "conflict",
      suggestions: ["PUESTO020"],
      confirmName: true,
      edits: [{ scope: "hostname", key: "82YU", from: "82YU", responses: 1, tag: "82YU" }],
    });
    apiMock.post.mockImplementation(() => ok(preview({ items: [conflict] })));
    apiMock.put.mockImplementation(() => ok(preview({ items: [conflict] })));
    renderPage();
    const user = await chooseCsv();

    await user.click(await screen.findByRole("button", { name: "Usar PUESTO020" }));
    expect(apiMock.put).toHaveBeenLastCalledWith("/api/it/survey-import/corrections", {
      csv: CSV,
      corrections: [{ scope: "hostname", key: "82YU", value: { tag: "PUESTO020" } }],
    });
    await waitFor(() => expect(screen.getByRole("button", { name: "Es correcto así" })).toBeEnabled());
    await user.click(screen.getByRole("button", { name: "Es correcto así" }));
    expect(apiMock.put).toHaveBeenLastCalledWith("/api/it/survey-import/corrections", {
      csv: CSV,
      corrections: [{ scope: "hostname", key: "82YU", value: { tag: "82YU" } }],
    });
  });

  it("muestra en el formulario lo que el back no acepta", async () => {
    const phone = item({
      kind: "phone",
      key: "phone:2:1",
      title: "Samsung Galaxy A14",
      detail: "Número no reconocido: 4555",
      edits: [
        {
          scope: "phone",
          key: "samsung|galaxya14",
          from: "Samsung Galaxy A14",
          responses: 1,
          brand: "Samsung",
          model: "Galaxy A14",
        },
        { scope: "number", key: "4555", from: "4555", responses: 1, number: "4555" },
      ],
    });
    apiMock.post.mockImplementation(() => ok(preview({ items: [phone] })));
    apiMock.put.mockImplementation(() =>
      fail(400, {
        code: "VALIDATION_ERROR",
        message: "Datos de entrada inválidos",
        details: [{ field: "body.corrections.0.value.number", message: "No parece un número de celular" }],
      }),
    );
    renderPage();
    const user = await chooseCsv();

    await user.click(await screen.findByRole("button", { name: "Corregir Samsung Galaxy A14" }));
    const form = screen.getByRole("form", { name: "Corregir" });
    const number = within(form).getByLabelText("Número");
    await user.clear(number);
    await user.type(number, "12345");
    await user.click(within(form).getByRole("button", { name: "Guardar" }));

    expect(await within(form).findByRole("alert")).toHaveTextContent("No parece un número de celular");
    expect(apiMock.put).toHaveBeenCalledWith("/api/it/survey-import/corrections", {
      csv: CSV,
      corrections: [{ scope: "number", key: "4555", value: { number: "12345" } }],
    });
    // Queda abierto para corregirlo.
    expect(within(form).getByLabelText("Número")).toHaveValue("12345");
  });

  it("lista las correcciones y deja deshacerlas", async () => {
    const corrections: SurveyPreview["corrections"] = [
      {
        scope: "hostname",
        key: "PUERTO058",
        from: "PUERTO058",
        to: "PUESTO058",
        source: "auto",
        responses: 1,
        undo: { tag: "PUERTO058" },
      },
      { scope: "hostname", key: "82YU", from: "82YU", to: "PUESTO020", source: "manual", responses: 1 },
      {
        scope: "phone",
        key: "samsung|galaxya032m",
        from: "Motorola galaxy a032m",
        to: "Samsung Galaxy A032M",
        source: "auto",
        responses: 2,
      },
    ];
    apiMock.post.mockImplementation(() => ok(preview({ corrections })));
    apiMock.put.mockImplementation(() => ok(preview({ corrections })));
    renderPage();
    const user = await chooseCsv();

    const panel = await screen.findByRole("region", { name: /Correcciones/ });
    const phones = within(panel).getByText("Marca y modelo de celulares").nextElementSibling;
    expect(phones).toHaveTextContent("Automática«Motorola galaxy a032m» → Samsung Galaxy A032M");
    expect(phones).toHaveTextContent("2 respuestas");
    // La de marca y modelo se cambia con el lápiz del ítem: no tiene botón.
    expect(within(panel).getAllByRole("button")).toHaveLength(2);

    await user.click(within(panel).getByRole("button", { name: "Deshacer «82YU» → PUESTO020" }));
    expect(apiMock.put).toHaveBeenLastCalledWith("/api/it/survey-import/corrections", {
      csv: CSV,
      corrections: [{ scope: "hostname", key: "82YU", value: null }],
    });
    const keep = within(panel).getByRole("button", { name: "Dejar «PUERTO058» como estaba" });
    await waitFor(() => expect(keep).toBeEnabled());
    await user.click(keep);
    expect(apiMock.put).toHaveBeenLastCalledWith("/api/it/survey-import/corrections", {
      csv: CSV,
      corrections: [{ scope: "hostname", key: "PUERTO058", value: { tag: "PUERTO058" } }],
    });
  });

  it("después de importar, las correcciones solo se muestran", async () => {
    const shown = preview({
      items: [
        item({
          fixes: [{ field: "hostname", from: "nb ana", to: "NB-ANA", source: "manual" }],
          edits: [{ scope: "hostname", key: "NB ANA", from: "nb ana", responses: 1, tag: "NB-ANA" }],
        }),
      ],
      corrections: [
        { scope: "hostname", key: "NB ANA", from: "nb ana", to: "NB-ANA", source: "manual", responses: 1 },
      ],
    });
    apiMock.post.mockImplementation((url: string) =>
      url.endsWith("/preview")
        ? ok(shown)
        : ok({
            applied: {
              people: { created: 0, updated: 0 },
              assets: { created: 1, assigned: 0, updated: 0 },
              lines: { created: 0, assigned: 0, updated: 0 },
            },
            preview: shown,
          }),
    );
    renderPage();
    const user = await chooseCsv();

    expect(await screen.findByRole("button", { name: "Corregir NB-ANA" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Importar" }));

    await screen.findByText("Relevamiento importado");
    expect(screen.queryByRole("button", { name: /Corregir/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Deshacer/ })).not.toBeInTheDocument();
    expect(screen.getByRole("region", { name: /Correcciones/ })).toHaveTextContent("«nb ana» → NB-ANA");
  });
});
