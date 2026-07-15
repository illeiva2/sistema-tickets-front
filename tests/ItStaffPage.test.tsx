import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../src/lib/api", () => ({
  default: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));

vi.mock("../src/hooks/useAuth", () => ({
  useAuth: () => ({ user: { id: "admin-1", role: "ADMIN" } }),
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
  StaffPersonDetail,
} from "../src/features/it/staff/types";
import type {
  PhoneLine,
  PhoneSimChange,
} from "../src/features/it/phone-lines/types";

const apiMock = api as unknown as {
  get: ReturnType<typeof vi.fn>;
  post: ReturnType<typeof vi.fn>;
  patch: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
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

const baseLine: PhoneLine = {
  id: "line-1",
  phoneNumber: "+5493415551234",
  carrier: "CLARO",
  carrierOther: null,
  planName: "Corporativo 20 GB",
  dataAllowanceGb: 20,
  monthlyCost: "12500.00",
  currency: "ARS",
  simIccid: "8954012345678901234",
  status: "ACTIVE",
  contractEndsAt: null,
  notes: "Línea de guardia",
  isActive: true,
  holderId: basePerson.id,
  holder: basePerson,
  assetId: null,
  asset: null,
  assignments: [],
  updatedAt: "2026-07-13T12:00:00.000Z",
};

const availableLine: PhoneLine = {
  ...baseLine,
  id: "line-available",
  phoneNumber: "+5493415554321",
  status: "AVAILABLE",
  holderId: null,
  holder: null,
  assetId: null,
  asset: null,
  updatedAt: "2026-07-13T14:00:00.000Z",
};

let listedLines: PhoneLine[];
let detailLine: PhoneLine;
let detailPerson: StaffPersonDetail;
let phoneAssets: Array<{
  id: string;
  type: string;
  status: string;
  brand: string;
  model: string;
  assetTag: string;
  serialNumber: null;
  assignedPersonId: string | null;
}>;
let phoneAssetsError: Error | null;
let simHistoryPages: Record<number, PhoneSimChange[]>;
let simHistoryTotal: number;

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

function phoneLineListResponse(items: PhoneLine[]) {
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

function renderStaff(initialEntry = "/it/staff") {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <ItStaffPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("ItStaffPage", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
    listedLines = [baseLine];
    detailLine = baseLine;
    detailPerson = basePerson;
    phoneAssets = [];
    phoneAssetsError = null;
    simHistoryPages = { 1: [] };
    simHistoryTotal = 0;
    apiMock.get.mockImplementation(
      (url: string, config?: { params?: { page?: number } }) => {
        if (url === "/api/departments") {
          return Promise.resolve({
            data: { success: true, data: [department] },
          });
        }
        if (url === "/api/it/people") {
          return Promise.resolve(listResponse([basePerson]));
        }
        if (url === `/api/it/people/${basePerson.id}`) {
          return Promise.resolve({
            data: { success: true, data: { person: detailPerson } },
          });
        }
        if (url === "/api/it/phone-lines") {
          return Promise.resolve(phoneLineListResponse(listedLines));
        }
        if (url === `/api/it/phone-lines/${detailLine.id}`) {
          return Promise.resolve({
            data: { success: true, data: { phoneLine: detailLine } },
          });
        }
        if (url === `/api/it/phone-lines/${detailLine.id}/sim-changes`) {
          const page = config?.params?.page ?? 1;
          return Promise.resolve({
            data: {
              success: true,
              data: {
                items: simHistoryPages[page] ?? [],
                pagination: {
                  page,
                  pageSize: 25,
                  total: simHistoryTotal,
                  totalPages: Math.ceil(simHistoryTotal / 25),
                },
              },
            },
          });
        }
        if (url === "/api/it/assets") {
          if (phoneAssetsError) return Promise.reject(phoneAssetsError);
          return Promise.resolve({
            data: {
              success: true,
              data: {
                items: phoneAssets,
                pagination: {
                  page: 1,
                  pageSize: 100,
                  total: phoneAssets.length,
                  totalPages: phoneAssets.length ? 1 : 0,
                },
              },
            },
          });
        }
        return Promise.reject(new Error(`Unexpected GET ${url}`));
      },
    );
    apiMock.post.mockImplementation((url: string) => {
      if (url === "/api/it/phone-lines") {
        return Promise.resolve({
          data: { success: true, data: { phoneLine: baseLine } },
        });
      }
      if (url === `/api/it/phone-lines/${baseLine.id}/sim-changes`) {
        return Promise.resolve({
          data: {
            success: true,
            data: {
              simChange: {
                id: "sim-change-1",
                previousIccid: baseLine.simIccid,
                newIccid: "8954098765432101234",
                changedAt: "2026-07-14T12:00:00.000Z",
              },
            },
          },
        });
      }
      return Promise.resolve({
        data: { success: true, data: { person: basePerson } },
      });
    });
    apiMock.patch.mockImplementation((url: string) => {
      if (url === `/api/it/phone-lines/${baseLine.id}`) {
        return Promise.resolve({
          data: { success: true, data: { phoneLine: baseLine } },
        });
      }
      return Promise.resolve({
        data: { success: true, data: { person: basePerson } },
      });
    });
    apiMock.delete.mockResolvedValue({ data: { success: true } });
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

  it("muestra las fechas laborales como fechas civiles en Buenos Aires", async () => {
    vi.stubEnv("TZ", "America/Argentina/Buenos_Aires");
    renderStaff();

    expect(
      (await screen.findAllByText("01 de mar de 2024")).length,
    ).toBeGreaterThan(0);
    expect(screen.queryByText("29 de feb de 2024")).toBeNull();
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

  it("cierra el alta aunque la revalidación posterior quede pendiente", async () => {
    let peopleCalls = 0;
    apiMock.get.mockImplementation((url: string) => {
      if (url === "/api/departments") {
        return Promise.resolve({ data: { success: true, data: [department] } });
      }
      if (url === "/api/it/people") {
        peopleCalls += 1;
        if (peopleCalls === 1)
          return Promise.resolve(listResponse([basePerson]));
        return new Promise(() => undefined);
      }
      return Promise.reject(new Error(`Unexpected GET ${url}`));
    });

    const user = userEvent.setup();
    renderStaff();
    await screen.findAllByText("L-0042");
    await user.click(screen.getByRole("button", { name: "Nueva persona" }));
    const dialog = screen.getByRole("dialog", { name: "Registrar persona" });
    await user.type(within(dialog).getByLabelText("Nombre"), "Mario");
    await user.type(within(dialog).getByLabelText("Apellido"), "Gómez");
    await user.click(
      within(dialog).getByRole("button", { name: "Registrar persona" }),
    );

    await waitFor(() =>
      expect(
        screen.queryByRole("dialog", { name: "Registrar persona" }),
      ).toBeNull(),
    );
    expect(toastMock.success).toHaveBeenCalledWith("Persona registrada");
    expect(peopleCalls).toBe(2);
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

  it("expone el aviso de privacidad y muestra Líneas operativo", async () => {
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
      await screen.findByRole("heading", { name: "Gestión de líneas" }),
    ).toBeInTheDocument();
    expect(
      (await screen.findAllByText(baseLine.phoneNumber)).length,
    ).toBeGreaterThan(0);
    expect(screen.queryByText(/en preparación/i)).toBeNull();
  });

  it("registra número, gigas e ICCID sin solicitar secretos de SIM", async () => {
    const user = userEvent.setup();
    renderStaff();
    await screen.findAllByText("L-0042");
    await user.click(screen.getByRole("tab", { name: /Líneas/i }));
    await screen.findAllByText(baseLine.phoneNumber);
    await user.click(screen.getByRole("button", { name: "Nueva línea" }));

    const dialog = screen.getByRole("dialog", { name: "Registrar línea" });
    expect(within(dialog).queryByLabelText(/PIN|PUK|eSIM|cuenta/i)).toBeNull();
    await user.type(
      within(dialog).getByLabelText("Número de línea"),
      "+5493415559999",
    );
    await user.type(within(dialog).getByLabelText(/Datos del plan/), "25");
    await user.type(
      within(dialog).getByLabelText(/ICCID actual/),
      "8954098765432101234",
    );
    await user.click(
      within(dialog).getByRole("button", { name: "Registrar línea" }),
    );

    await waitFor(() =>
      expect(apiMock.post).toHaveBeenCalledWith(
        "/api/it/phone-lines",
        expect.objectContaining({
          phoneNumber: "+5493415559999",
          dataAllowanceGb: 25,
          simIccid: "8954098765432101234",
          status: "AVAILABLE",
        }),
      ),
    );
    const payload = apiMock.post.mock.calls.find(
      ([url]: [string]) => url === "/api/it/phone-lines",
    )?.[1];
    expect(JSON.stringify(payload)).not.toMatch(/pin|puk|esim|account/i);
  });

  it("muestra detalle, custodia y registro de cambios de chip", async () => {
    const user = userEvent.setup();
    renderStaff();
    await screen.findAllByText("L-0042");
    await user.click(screen.getByRole("tab", { name: /Líneas/i }));
    await screen.findAllByText(baseLine.phoneNumber);
    await user.click(
      screen.getAllByRole("button", {
        name: `Ver línea ${baseLine.phoneNumber}`,
      })[0],
    );

    const dialog = await screen.findByRole("dialog", {
      name: baseLine.phoneNumber,
    });
    expect(within(dialog).getByText("Ana Pérez")).toBeInTheDocument();
    expect(within(dialog).getByText(baseLine.simIccid!)).toBeInTheDocument();
    expect(
      within(dialog).getByRole("heading", { name: "Cambios de chip" }),
    ).toBeInTheDocument();
    expect(
      within(dialog).getByRole("button", { name: "Dar de baja" }),
    ).toBeDisabled();

    await user.type(
      within(dialog).getByLabelText("Nuevo ICCID"),
      "8954098765432101234",
    );
    fireEvent.change(within(dialog).getByLabelText(/Fecha del cambio/), {
      target: { value: "2026-07-14T09:30" },
    });
    await user.click(
      within(dialog).getByRole("button", { name: "Registrar cambio de chip" }),
    );
    await waitFor(() =>
      expect(apiMock.post).toHaveBeenCalledWith(
        `/api/it/phone-lines/${baseLine.id}/sim-changes`,
        {
          expectedUpdatedAt: baseLine.updatedAt,
          newIccid: "8954098765432101234",
          changedAt: expect.stringMatching(/Z$/),
        },
      ),
    );
  });

  it("permite asignar sin celular si falla ese lookup y envía CAS", async () => {
    const user = userEvent.setup();
    listedLines = [availableLine];
    detailLine = availableLine;
    phoneAssetsError = new Error("assets unavailable");
    apiMock.post.mockImplementation((url: string) => {
      if (url === `/api/it/phone-lines/${availableLine.id}/assign`) {
        return Promise.resolve({
          data: {
            success: true,
            data: {
              phoneLine: {
                ...availableLine,
                status: "ACTIVE",
                holderId: basePerson.id,
                holder: basePerson,
              },
            },
          },
        });
      }
      return Promise.reject(new Error(`Unexpected POST ${url}`));
    });

    renderStaff("/it/staff?tab=lines");
    await screen.findAllByText(availableLine.phoneNumber);
    await user.click(
      screen.getAllByRole("button", {
        name: `Ver línea ${availableLine.phoneNumber}`,
      })[0],
    );
    const dialog = await screen.findByRole("dialog", {
      name: availableLine.phoneNumber,
    });
    expect(
      await within(dialog).findByText(/Podés asignar la línea sin equipo/i),
    ).toBeInTheDocument();
    expect(
      within(dialog).getByRole("button", { name: "Reintentar celulares" }),
    ).toBeEnabled();
    await user.selectOptions(
      within(dialog).getByLabelText("Persona activa"),
      basePerson.id,
    );
    const assignButton = within(dialog).getByRole("button", {
      name: "Confirmar asignación",
    });
    expect(assignButton).toBeEnabled();
    await user.click(assignButton);

    await waitFor(() =>
      expect(apiMock.post).toHaveBeenCalledWith(
        `/api/it/phone-lines/${availableLine.id}/assign`,
        {
          expectedUpdatedAt: availableLine.updatedAt,
          personId: basePerson.id,
          assetId: null,
          note: null,
        },
      ),
    );
  });

  it("ofrece sólo celulares elegibles y rotula su estado", async () => {
    const user = userEvent.setup();
    listedLines = [availableLine];
    detailLine = availableLine;
    phoneAssets = [
      {
        id: "asset-stock",
        type: "PHONE",
        status: "IN_STOCK",
        brand: "Samsung",
        model: "Stock",
        assetTag: "CEL-01",
        serialNumber: null,
        assignedPersonId: null,
      },
      {
        id: "asset-own",
        type: "PHONE",
        status: "ASSIGNED",
        brand: "Motorola",
        model: "Propio",
        assetTag: "CEL-02",
        serialNumber: null,
        assignedPersonId: basePerson.id,
      },
      {
        id: "asset-other",
        type: "PHONE",
        status: "ASSIGNED",
        brand: "Apple",
        model: "Ajeno",
        assetTag: "CEL-03",
        serialNumber: null,
        assignedPersonId: "person-other",
      },
      {
        id: "asset-repair",
        type: "PHONE",
        status: "IN_REPAIR",
        brand: "Nokia",
        model: "Taller",
        assetTag: "CEL-04",
        serialNumber: null,
        assignedPersonId: null,
      },
    ];

    renderStaff("/it/staff?tab=lines");
    await screen.findAllByText(availableLine.phoneNumber);
    await user.click(
      screen.getAllByRole("button", {
        name: `Ver línea ${availableLine.phoneNumber}`,
      })[0],
    );
    const dialog = await screen.findByRole("dialog", {
      name: availableLine.phoneNumber,
    });
    await user.selectOptions(
      within(dialog).getByLabelText("Persona activa"),
      basePerson.id,
    );
    const assetSelect = within(dialog).getByLabelText(/Celular/);
    expect(
      within(assetSelect).getByRole("option", { name: /Stock.*En depósito/ }),
    ).toBeInTheDocument();
    expect(
      within(assetSelect).getByRole("option", {
        name: /Propio.*asignado a esta persona/,
      }),
    ).toBeInTheDocument();
    expect(within(assetSelect).queryByText(/Ajeno|Taller/)).toBeNull();
  });

  it("recarga una edición en conflicto y reintenta con el updatedAt nuevo", async () => {
    const user = userEvent.setup();
    const refreshedLine = {
      ...baseLine,
      planName: "Corporativo actualizado",
      updatedAt: "2026-07-14T15:00:00.000Z",
    };
    let patchCalls = 0;
    apiMock.patch.mockImplementation((url: string) => {
      if (url !== `/api/it/phone-lines/${baseLine.id}`) {
        return Promise.reject(new Error(`Unexpected PATCH ${url}`));
      }
      patchCalls += 1;
      if (patchCalls === 1) {
        detailLine = refreshedLine;
        return Promise.reject({
          response: {
            status: 409,
            data: {
              error: {
                code: "PHONE_LINE_VERSION_CONFLICT",
                message: "La línea cambió.",
              },
            },
          },
        });
      }
      return Promise.resolve({
        data: { success: true, data: { phoneLine: refreshedLine } },
      });
    });

    renderStaff("/it/staff?tab=lines");
    await screen.findAllByText(baseLine.phoneNumber);
    await user.click(
      screen.getAllByRole("button", {
        name: `Ver línea ${baseLine.phoneNumber}`,
      })[0],
    );
    const detailDialog = await screen.findByRole("dialog", {
      name: baseLine.phoneNumber,
    });
    await user.click(
      within(detailDialog).getByRole("button", { name: "Editar" }),
    );
    let editor = await screen.findByRole("dialog", { name: "Editar línea" });
    await user.click(
      within(editor).getByRole("button", { name: "Guardar cambios" }),
    );

    expect(
      await screen.findByText("Versión actual recargada"),
    ).toBeInTheDocument();
    editor = screen.getByRole("dialog", { name: "Editar línea" });
    expect(
      within(editor).getByDisplayValue("Corporativo actualizado"),
    ).toBeInTheDocument();
    await user.click(
      within(editor).getByRole("button", { name: "Guardar cambios" }),
    );

    await waitFor(() => expect(apiMock.patch).toHaveBeenCalledTimes(2));
    expect(apiMock.patch.mock.calls[1][1]).toMatchObject({
      expectedUpdatedAt: refreshedLine.updatedAt,
    });
  });

  it("carga páginas adicionales del historial de SIM", async () => {
    const user = userEvent.setup();
    simHistoryTotal = 26;
    simHistoryPages = {
      1: [
        {
          id: "change-1",
          previousIccid: null,
          newIccid: "8954011111111111111",
          changedAt: "2026-07-01T12:00:00.000Z",
        },
      ],
      2: [
        {
          id: "change-2",
          previousIccid: "8954011111111111111",
          newIccid: "8954022222222222222",
          changedAt: "2026-07-02T12:00:00.000Z",
        },
      ],
    };

    renderStaff("/it/staff?tab=lines");
    await screen.findAllByText(baseLine.phoneNumber);
    await user.click(
      screen.getAllByRole("button", {
        name: `Ver línea ${baseLine.phoneNumber}`,
      })[0],
    );
    const dialog = await screen.findByRole("dialog", {
      name: baseLine.phoneNumber,
    });
    expect(
      await within(dialog).findByText("8954011111111111111"),
    ).toBeInTheDocument();
    await user.click(
      within(dialog).getByRole("button", { name: "Cargar más cambios" }),
    );
    expect(
      await within(dialog).findByText("8954022222222222222"),
    ).toBeInTheDocument();
    expect(apiMock.get).toHaveBeenCalledWith(
      `/api/it/phone-lines/${baseLine.id}/sim-changes`,
      { params: { page: 2, pageSize: 25 } },
    );
  });

  it("navega las pestañas con flechas, Inicio y Fin", async () => {
    const user = userEvent.setup();
    renderStaff();
    await screen.findAllByText("L-0042");

    const peopleTab = screen.getByRole("tab", { name: /Personal/i });
    const linesTab = screen.getByRole("tab", { name: /Líneas/i });
    expect(peopleTab).toHaveAttribute("tabindex", "0");
    expect(linesTab).toHaveAttribute("tabindex", "-1");

    peopleTab.focus();
    await user.keyboard("{ArrowRight}");
    expect(linesTab).toHaveFocus();
    expect(linesTab).toHaveAttribute("aria-selected", "true");
    expect(linesTab).toHaveAttribute("tabindex", "0");

    await user.keyboard("{Home}");
    expect(peopleTab).toHaveFocus();
    await user.keyboard("{End}");
    expect(linesTab).toHaveFocus();
    await user.keyboard("{ArrowLeft}");
    expect(peopleTab).toHaveFocus();
  });

  it("abre Líneas desde el deep-link y mantiene la pestaña en la URL", async () => {
    renderStaff("/it/staff?tab=lines");

    const linesTab = await screen.findByRole("tab", { name: /Líneas/i });
    expect(linesTab).toHaveAttribute("aria-selected", "true");
    expect(
      await screen.findByRole("heading", { name: "Gestión de líneas" }),
    ).toBeInTheDocument();
  });

  it("informa el fallo de sectores y conserva el sector al editar", async () => {
    apiMock.get.mockImplementation((url: string) => {
      if (url === "/api/departments") {
        return Promise.reject(new Error("departments unavailable"));
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

    const user = userEvent.setup();
    renderStaff();
    await screen.findAllByText("L-0042");
    expect(screen.getByLabelText("Sector")).toBeDisabled();
    expect(
      screen.getByText("No se pudieron cargar los sectores"),
    ).toBeInTheDocument();

    await user.click(
      screen.getAllByRole("button", { name: "Editar Ana Pérez" })[0],
    );
    const dialog = await screen.findByRole("dialog", {
      name: "Editar persona",
    });
    const departmentSelect = await within(dialog).findByLabelText(/Sector/);
    expect(departmentSelect).toBeDisabled();
    expect(departmentSelect).toHaveValue(department.id);
    expect(
      within(departmentSelect).getByRole("option", { name: department.name }),
    ).toBeInTheDocument();

    await user.click(
      within(dialog).getByRole("button", { name: "Reintentar sectores" }),
    );
    await waitFor(() =>
      expect(
        apiMock.get.mock.calls.filter(
          ([url]: [string]) => url === "/api/departments",
        ),
      ).toHaveLength(2),
    );
  });

  it("abre el resumen desde la fila con custodia, línea y sector", async () => {
    detailPerson = {
      ...basePerson,
      assignedAssets: [
        {
          id: "asset-1",
          assetTag: "NB-0007",
          type: "NOTEBOOK",
          status: "ASSIGNED",
          brand: "Lenovo",
          model: "ThinkPad E14",
          serialNumber: "SN-778",
          location: "Oficina central",
          updatedAt: "2026-07-10T12:00:00.000Z",
        },
      ],
      phoneLines: [
        {
          id: "line-1",
          phoneNumber: "+5493415551234",
          carrier: "CLARO",
          carrierOther: null,
          planName: "Corporativo 20 GB",
          status: "ACTIVE",
          contractEndsAt: null,
        },
      ],
      assetAssignments: [
        {
          id: "assignment-1",
          startAt: "2026-07-01T12:00:00.000Z",
          endAt: null,
          asset: {
            id: "asset-1",
            assetTag: "NB-0007",
            type: "NOTEBOOK",
            status: "ASSIGNED",
          },
        },
      ],
      phoneLineAssignments: [],
    } satisfies StaffPersonDetail;

    const user = userEvent.setup();
    renderStaff();
    await screen.findAllByText("L-0042");

    await user.click(
      screen.getAllByRole("button", { name: "Ver resumen de Ana Pérez" })[0],
    );

    const dialog = await screen.findByRole("dialog", { name: "Pérez, Ana" });
    expect(
      within(dialog).getByText("Equipos en custodia (1)"),
    ).toBeInTheDocument();
    expect(within(dialog).getAllByText("NB-0007").length).toBeGreaterThan(0);
    expect(within(dialog).getByText(/Notebook · Lenovo ThinkPad E14/)).toBeInTheDocument();
    expect(
      within(dialog).getByText("Líneas asignadas (1)"),
    ).toBeInTheDocument();
    expect(within(dialog).getByText("+5493415551234")).toBeInTheDocument();
    expect(within(dialog).getByText(/Claro · Corporativo 20 GB/)).toBeInTheDocument();
    expect(within(dialog).getByText("Tecnología")).toBeInTheDocument();
    expect(within(dialog).getByText(/vigente/)).toBeInTheDocument();
  });

  it("muestra vacíos honestos y salta del resumen a la edición", async () => {
    const user = userEvent.setup();
    renderStaff();
    await screen.findAllByText("L-0042");

    await user.click(
      screen.getAllByRole("button", { name: "Ver resumen de Ana Pérez" })[0],
    );
    const dialog = await screen.findByRole("dialog", { name: "Pérez, Ana" });
    expect(
      within(dialog).getByText("Sin equipos en custodia."),
    ).toBeInTheDocument();
    expect(
      within(dialog).getByText("Sin líneas asignadas."),
    ).toBeInTheDocument();

    await user.click(within(dialog).getByRole("button", { name: "Editar" }));
    await screen.findByRole("dialog", { name: "Editar persona" });
    expect(
      screen.queryByRole("dialog", { name: "Pérez, Ana" }),
    ).toBeNull();
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
