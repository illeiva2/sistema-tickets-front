import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../src/lib/api", () => ({
  default: { get: vi.fn(), post: vi.fn(), patch: vi.fn() },
}));

vi.mock("react-hot-toast", () => ({
  default: { success: vi.fn(), error: vi.fn() },
}));

import api from "../src/lib/api";
import toast from "react-hot-toast";
import ItStaffPage from "../src/pages/it/ItStaffPage";
import { getStaffErrorInfo } from "../src/features/it/staff/api";
import type {
  StaffDepartment,
  StaffPerson,
} from "../src/features/it/staff/types";

const apiMock = api as unknown as {
  get: ReturnType<typeof vi.fn>;
  post: ReturnType<typeof vi.fn>;
  patch: ReturnType<typeof vi.fn>;
};

const toastMock = toast as unknown as {
  success: ReturnType<typeof vi.fn>;
  error: ReturnType<typeof vi.fn>;
};

const department: StaffDepartment = {
  id: "department-it",
  name: "Tecnología",
};

const basePerson: StaffPerson = {
  id: "person-1",
  employeeNumber: "L-0042",
  firstName: "Ana",
  lastName: "Pérez",
  jobTitle: "Analista IT",
  workEmail: "ana.perez@empresa.test",
  workPhone: "+54 11 4000 1000",
  departmentId: department.id,
  department,
  status: "ACTIVE",
  startDate: "2024-03-01T00:00:00.000Z",
  endDate: null,
  notes: "Responsable de soporte",
  updatedAt: "2026-07-12T12:00:00.000Z",
};

function listResponse(items: StaffPerson[]) {
  return {
    data: {
      success: true,
      data: {
        items,
        pagination: {
          page: 1,
          pageSize: 10,
          total: items.length,
          totalPages: 1,
        },
      },
    },
  };
}

function renderStaff() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <ItStaffPage />
    </QueryClientProvider>,
  );
}

describe("ItStaffPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiMock.get.mockImplementation((url: string) => {
      if (url === "/api/departments") {
        return Promise.resolve({ data: { success: true, data: [department] } });
      }
      if (url === "/api/it/people") {
        return Promise.resolve(listResponse([basePerson]));
      }
      if (url === `/api/it/people/${basePerson.id}`) {
        return Promise.resolve({
          data: { success: true, data: { person: basePerson } },
        });
      }
      return Promise.reject(new Error(`Unexpected GET ${url}`));
    });
    apiMock.post.mockResolvedValue({
      data: { success: true, data: { person: basePerson } },
    });
    apiMock.patch.mockResolvedValue({
      data: { success: true, data: { person: basePerson } },
    });
  });

  it("renderiza la lista y envía búsqueda, estado y sector a la API", async () => {
    const user = userEvent.setup();
    renderStaff();

    expect((await screen.findAllByText("L-0042")).length).toBeGreaterThan(0);
    expect(screen.getByText("1 personas encontradas")).toBeInTheDocument();

    await user.type(screen.getByLabelText("Buscar persona"), "Ana");
    await user.selectOptions(screen.getByLabelText("Estado"), "ACTIVE");
    await user.selectOptions(screen.getByLabelText("Sector"), department.id);
    await user.click(screen.getByRole("button", { name: "Buscar" }));

    await waitFor(() =>
      expect(apiMock.get).toHaveBeenCalledWith("/api/it/people", {
        params: {
          q: "Ana",
          status: "ACTIVE",
          departmentId: department.id,
          page: 1,
          pageSize: 10,
        },
      }),
    );
  });

  it("registra una persona usando exclusivamente datos laborales", async () => {
    const user = userEvent.setup();
    renderStaff();
    await screen.findAllByText("L-0042");

    await user.click(screen.getByRole("button", { name: "Nueva persona" }));
    const dialog = screen.getByRole("dialog", { name: "Registrar persona" });
    await user.type(within(dialog).getByLabelText("Nombre"), "Mario");
    await user.type(within(dialog).getByLabelText("Apellido"), "Gómez");
    await user.type(
      within(dialog).getByLabelText(/Email laboral/),
      "mario.gomez@empresa.test",
    );
    await user.selectOptions(
      within(dialog).getByLabelText(/Sector/),
      department.id,
    );
    await user.click(
      within(dialog).getByRole("button", { name: "Registrar persona" }),
    );

    await waitFor(() => expect(apiMock.post).toHaveBeenCalledTimes(1));
    const payload = apiMock.post.mock.calls[0][1] as Record<string, unknown>;
    expect(payload).toMatchObject({
      firstName: "Mario",
      lastName: "Gómez",
      workEmail: "mario.gomez@empresa.test",
      departmentId: department.id,
      status: "ACTIVE",
      endDate: null,
    });
    expect(JSON.stringify(payload)).not.toMatch(
      /dni|document|address|domicilio|health|personalPhone/i,
    );
  });

  it("edita con expectedUpdatedAt y limpia egreso al mantener ACTIVE", async () => {
    const user = userEvent.setup();
    renderStaff();
    await screen.findAllByText("L-0042");
    await user.click(
      screen.getAllByRole("button", { name: "Editar Ana Pérez" })[0],
    );

    await screen.findByRole("dialog", {
      name: "Editar persona",
    });
    const jobTitle = await screen.findByDisplayValue("Analista IT");
    const hydratedDialog = screen.getByRole("dialog", {
      name: "Editar persona",
    });
    expect(within(hydratedDialog).getByDisplayValue("Ana")).toBeInTheDocument();
    expect(
      within(hydratedDialog).getByDisplayValue("Pérez"),
    ).toBeInTheDocument();
    expect(
      within(hydratedDialog).getByDisplayValue("ana.perez@empresa.test"),
    ).toBeInTheDocument();
    await user.clear(jobTitle);
    await user.type(jobTitle, "Coordinadora IT");
    await user.click(
      within(hydratedDialog).getByRole("button", { name: "Guardar cambios" }),
    );

    await waitFor(() => expect(apiMock.patch).toHaveBeenCalledTimes(1));
    expect(apiMock.patch.mock.calls[0][1]).toMatchObject({
      jobTitle: "Coordinadora IT",
      status: "ACTIVE",
      endDate: null,
      expectedUpdatedAt: "2026-07-12T12:00:00.000Z",
    });
  });

  it("recarga la versión actual cuando PATCH devuelve PERSON_VERSION_CONFLICT", async () => {
    const refreshedPerson: StaffPerson = {
      ...basePerson,
      jobTitle: "Gerente de Tecnología",
      updatedAt: "2026-07-12T13:00:00.000Z",
    };
    let detailCalls = 0;
    apiMock.get.mockImplementation((url: string) => {
      if (url === "/api/departments") {
        return Promise.resolve({ data: { success: true, data: [department] } });
      }
      if (url === "/api/it/people")
        return Promise.resolve(listResponse([basePerson]));
      if (url === `/api/it/people/${basePerson.id}`) {
        detailCalls += 1;
        return Promise.resolve({
          data: {
            success: true,
            data: { person: detailCalls === 1 ? basePerson : refreshedPerson },
          },
        });
      }
      return Promise.reject(new Error(`Unexpected GET ${url}`));
    });
    apiMock.patch.mockRejectedValue({
      response: {
        status: 409,
        data: {
          error: {
            code: "PERSON_VERSION_CONFLICT",
            message: "La ficha fue actualizada por otro usuario.",
          },
        },
      },
    });

    const user = userEvent.setup();
    renderStaff();
    await screen.findAllByText("L-0042");
    await user.click(
      screen.getAllByRole("button", { name: "Editar Ana Pérez" })[0],
    );
    const dialog = await screen.findByRole("dialog", {
      name: "Editar persona",
    });
    await user.click(
      within(dialog).getByRole("button", { name: "Guardar cambios" }),
    );

    expect(
      await within(dialog).findByText("Hay una versión más reciente"),
    ).toBeInTheDocument();
    await user.click(
      within(dialog).getByRole("button", { name: "Recargar versión actual" }),
    );

    expect(
      await screen.findByDisplayValue("Gerente de Tecnología"),
    ).toBeInTheDocument();
    expect(detailCalls).toBe(2);
  });

  it("cierra y descarta el detalle si falla la recarga del conflicto", async () => {
    let detailCalls = 0;
    apiMock.get.mockImplementation((url: string) => {
      if (url === "/api/departments") {
        return Promise.resolve({ data: { success: true, data: [department] } });
      }
      if (url === "/api/it/people")
        return Promise.resolve(listResponse([basePerson]));
      if (url === `/api/it/people/${basePerson.id}`) {
        detailCalls += 1;
        if (detailCalls === 2)
          return Promise.reject(new Error("reload failed"));
        return Promise.resolve({
          data: { success: true, data: { person: basePerson } },
        });
      }
      return Promise.reject(new Error(`Unexpected GET ${url}`));
    });
    apiMock.patch.mockRejectedValue({
      response: {
        status: 409,
        data: {
          error: {
            code: "PERSON_VERSION_CONFLICT",
            message: "La ficha cambió.",
          },
        },
      },
    });

    const user = userEvent.setup();
    renderStaff();
    await screen.findAllByText("L-0042");
    await user.click(
      screen.getAllByRole("button", { name: "Editar Ana Pérez" })[0],
    );
    const dialog = await screen.findByRole("dialog", {
      name: "Editar persona",
    });
    await user.click(
      within(dialog).getByRole("button", { name: "Guardar cambios" }),
    );
    await user.click(
      await within(dialog).findByRole("button", {
        name: "Recargar versión actual",
      }),
    );

    await waitFor(() =>
      expect(
        screen.queryByRole("dialog", { name: "Editar persona" }),
      ).toBeNull(),
    );
    expect(toastMock.error).toHaveBeenCalledWith(
      expect.stringContaining("se cerró"),
    );

    await user.click(
      screen.getAllByRole("button", { name: "Editar Ana Pérez" })[0],
    );
    await screen.findByRole("dialog", { name: "Editar persona" });
    expect(detailCalls).toBe(3);
  });

  it("no confunde un duplicado 409 con conflicto de versión", () => {
    const info = getStaffErrorInfo({
      response: {
        status: 409,
        data: {
          error: {
            code: "PERSON_EMAIL_ALREADY_EXISTS",
            message: "El email laboral ya existe.",
          },
        },
      },
    });
    expect(info).toEqual({
      message: "El email laboral ya existe.",
      isConflict: false,
    });
  });

  it("expone el aviso de privacidad y mantiene Líneas en preparación", async () => {
    const user = userEvent.setup();
    renderStaff();
    await screen.findAllByText("L-0042");
    expect(screen.getByText(/No registrar DNI/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Nueva persona" }));
    const dialog = screen.getByRole("dialog", { name: "Registrar persona" });
    expect(
      within(dialog).queryByLabelText(/DNI|domicilio|teléfono personal/i),
    ).toBeNull();
    expect(within(dialog).getByText(/No cargues DNI/i)).toBeInTheDocument();
    await user.click(within(dialog).getByRole("button", { name: "Cancelar" }));

    await user.click(screen.getByRole("tab", { name: /Líneas/i }));
    expect(
      screen.getByRole("heading", { name: "Gestión de líneas en preparación" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/todavía no muestra ni solicita números/i),
    ).toBeInTheDocument();
  });

  it("muestra estados vacío y error sin datos ficticios", async () => {
    apiMock.get.mockImplementation((url: string) => {
      if (url === "/api/departments") {
        return Promise.resolve({ data: { success: true, data: [department] } });
      }
      if (url === "/api/it/people") return Promise.resolve(listResponse([]));
      return Promise.reject(new Error(`Unexpected GET ${url}`));
    });
    const firstRender = renderStaff();
    expect(
      await screen.findByText("Todavía no hay personas registradas"),
    ).toBeInTheDocument();
    firstRender.unmount();

    apiMock.get.mockImplementation((url: string) => {
      if (url === "/api/departments") {
        return Promise.resolve({ data: { success: true, data: [department] } });
      }
      return Promise.reject(new Error("people unavailable"));
    });
    renderStaff();
    expect(
      await screen.findByText("No se pudo cargar el personal"),
    ).toBeInTheDocument();
    expect(screen.getByText("people unavailable")).toBeInTheDocument();
  });
});
