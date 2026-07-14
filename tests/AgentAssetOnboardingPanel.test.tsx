import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import {
  buildAgentAssetOnboardingSubmission,
  mapAgentToAssetOnboardingForm,
} from "../src/features/it/live/agentAssetOnboarding";
import { AgentAssetOnboardingPanel } from "../src/features/it/live/components/AgentAssetOnboardingPanel";
import type { AgentDevice } from "../src/features/it/live/types";

const device: AgentDevice = {
  id: "agent-1",
  hostname: "NB-CONTABLE-07",
  osName: "Windows 11 Pro",
  osVersion: "10.0.26100",
  connState: "ONLINE",
  state: "ONLINE",
  loggedInUser: "GRF\\ana.perez",
  primaryMac: "AA:BB:CC:DD:EE:FF",
  ramTotalMb: 32 * 1024,
  batteryPct: 87,
  batteryCharging: false,
  vncRunning: true,
  sshRunning: false,
  isActive: true,
  updatedAt: "2026-07-13T12:00:00.000Z",
};

const payload = {
  inventory: {
    hardware: {
      manufacturer: "Lenovo",
      model: "ThinkPad T14 Gen 4",
      serialNumber: "PF-123456",
    },
    cpu: { model: "Intel Core i7-1365U" },
    disks: [
      {
        name: "C:",
        model: "Samsung PM9B1",
        mediaType: "NVMe",
        totalBytes: 512 * 1024 ** 3,
      },
    ],
  },
};

describe("mapeo de agente a alta patrimonial", () => {
  it("precarga hardware legible y clasifica una PC con batería como notebook", () => {
    const form = mapAgentToAssetOnboardingForm(device, payload);

    expect(form).toMatchObject({
      type: "NOTEBOOK",
      brand: "Lenovo",
      model: "ThinkPad T14 Gen 4",
      serialNumber: "PF-123456",
      cpu: "Intel Core i7-1365U",
      ramGb: "32",
      storage: "C: · Samsung PM9B1 · NVMe · 512 GB",
      os: "Windows 11 Pro · 10.0.26100",
      mac: "AA:BB:CC:DD:EE:FF",
      notes: "Hostname reportado por agente: NB-CONTABLE-07",
      personId: "",
      departmentId: "",
    });
  });

  it("prioriza servidor por sistema operativo y usa desktop sin batería", () => {
    expect(
      mapAgentToAssetOnboardingForm(
        { ...device, osName: "Windows Server 2019", batteryPct: 50 },
        payload,
      ).type,
    ).toBe("SERVER");
    expect(
      mapAgentToAssetOnboardingForm(
        {
          ...device,
          osName: "Windows 10 Pro",
          batteryPct: null,
          batteryCharging: null,
        },
        payload,
      ).type,
    ).toBe("DESKTOP");
  });

  it("construye un alta en depósito y sólo agrega custodia explícita", () => {
    const form = mapAgentToAssetOnboardingForm(device, payload);
    const withoutCustody = buildAgentAssetOnboardingSubmission({
      ...form,
      custodyNote: "No debe enviarse sin destino",
    });
    expect(withoutCustody.asset.status).toBe("IN_STOCK");
    expect(withoutCustody.custody).toBeUndefined();

    const withCustody = buildAgentAssetOnboardingSubmission({
      ...form,
      assetTag: "NB-107",
      location: "Administración",
      personId: "person-1",
      departmentId: "department-1",
      custodyNote: "Entrega inicial",
    });
    expect(withCustody).toEqual({
      asset: {
        type: "NOTEBOOK",
        status: "IN_STOCK",
        brand: "Lenovo",
        model: "ThinkPad T14 Gen 4",
        serialNumber: "PF-123456",
        assetTag: "NB-107",
        location: "Administración",
        notes: "Hostname reportado por agente: NB-CONTABLE-07",
        specs: {
          cpu: "Intel Core i7-1365U",
          ramGb: 32,
          storage: "C: · Samsung PM9B1 · NVMe · 512 GB",
          os: "Windows 11 Pro · 10.0.26100",
          mac: "AA:BB:CC:DD:EE:FF",
        },
      },
      custody: {
        personId: "person-1",
        departmentId: "department-1",
        note: "Entrega inicial",
      },
    });
  });
});

describe("AgentAssetOnboardingPanel", () => {
  it("mantiene la custodia vacía hasta elegirla y emite el alta revisada", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(
      <AgentAssetOnboardingPanel
        device={device}
        latestSnapshotPayload={payload}
        people={[
          {
            id: "person-1",
            firstName: "Ana",
            lastName: "Pérez",
            employeeNumber: "E-107",
            status: "ACTIVE",
          },
        ]}
        departments={[{ id: "department-1", name: "Administración" }]}
        isLoading={false}
        isSaving={false}
        onClose={vi.fn()}
        onSubmit={onSubmit}
      />,
    );

    const dialog = screen.getByRole("dialog", {
      name: "Crear activo desde NB-CONTABLE-07",
    });
    expect(within(dialog).getByLabelText("Marca")).toHaveValue("Lenovo");
    expect(within(dialog).getByLabelText("Modelo")).toHaveValue(
      "ThinkPad T14 Gen 4",
    );
    expect(within(dialog).getByLabelText(/^Estado inicial/)).toHaveValue(
      "En depósito",
    );
    expect(within(dialog).getByLabelText("Persona de custodia")).toHaveValue(
      "",
    );
    expect(within(dialog).getByLabelText("Sector de custodia")).toHaveValue("");
    expect(
      within(dialog).queryByLabelText(/Etiqueta interna/),
    ).not.toBeInTheDocument();
    expect(dialog).toHaveTextContent(
      "No se asignará al usuario conectado automáticamente",
    );

    await user.selectOptions(
      within(dialog).getByLabelText("Persona de custodia"),
      "person-1",
    );
    await user.selectOptions(
      within(dialog).getByLabelText("Sector de custodia"),
      "department-1",
    );
    await user.type(
      within(dialog).getByLabelText(/Observación de entrega/),
      "Entrega inicial",
    );
    await user.click(
      within(dialog).getByRole("button", {
        name: "Crear, vincular y asignar",
      }),
    );

    await waitFor(() => expect(onSubmit).toHaveBeenCalledOnce());
    expect(onSubmit.mock.calls[0][0]).toMatchObject({
      asset: {
        type: "NOTEBOOK",
        status: "IN_STOCK",
        brand: "Lenovo",
        model: "ThinkPad T14 Gen 4",
      },
      custody: {
        personId: "person-1",
        departmentId: "department-1",
        note: "Entrega inicial",
      },
    });
    expect(onSubmit.mock.calls[0][0]).not.toHaveProperty("asset.assetTag");
  });
});
