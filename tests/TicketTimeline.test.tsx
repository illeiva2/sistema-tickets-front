import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

vi.mock("../src/lib/api", () => ({
  default: { get: vi.fn() },
}));

import api from "../src/lib/api";
import TicketTimeline from "../src/components/TicketTimeline";

const apiMock = api as unknown as { get: ReturnType<typeof vi.fn> };

const sampleLog = (overrides: Partial<any> = {}) => ({
  id: "log-1",
  entity: "ticket",
  entityId: "t-1",
  action: "ticket_created",
  actorId: "u-1",
  meta: null,
  createdAt: new Date().toISOString(),
  actor: { id: "u-1", name: "María López", email: "maria@test.local" },
  ...overrides,
});

describe("TicketTimeline", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("muestra skeleton mientras carga", () => {
    apiMock.get.mockReturnValueOnce(new Promise(() => {})); // pending forever
    render(<TicketTimeline ticketId="t-1" />);
    expect(screen.getByText(/Actividad/i)).toBeInTheDocument();
    // No hay verbos de acciones todavía.
    expect(screen.queryByText(/creó el ticket/i)).not.toBeInTheDocument();
  });

  it("muestra empty state cuando no hay logs", async () => {
    apiMock.get.mockResolvedValueOnce({ data: { data: [] } });
    render(<TicketTimeline ticketId="t-1" />);
    await waitFor(() =>
      expect(
        screen.getByText(/Todavía no hay actividad/i),
      ).toBeInTheDocument(),
    );
  });

  it("renderiza los logs con verbos traducidos en español", async () => {
    apiMock.get.mockResolvedValueOnce({
      data: {
        data: [
          sampleLog({ action: "ticket_created" }),
          sampleLog({
            id: "log-2",
            action: "ticket_assigned_updated",
            actor: { id: "u-2", name: "Lucas Romero", email: "l@t.local" },
          }),
          sampleLog({
            id: "log-3",
            action: "ticket_resolved",
            actor: { id: "u-2", name: "Lucas Romero", email: "l@t.local" },
          }),
        ],
      },
    });

    render(<TicketTimeline ticketId="t-1" />);

    await waitFor(() =>
      expect(screen.getByText(/creó el ticket/i)).toBeInTheDocument(),
    );
    expect(screen.getByText(/cambió la asignación/i)).toBeInTheDocument();
    expect(screen.getByText(/resolvió el ticket/i)).toBeInTheDocument();
    expect(screen.getAllByText("María López")).toHaveLength(1);
    expect(screen.getAllByText("Lucas Romero")).toHaveLength(2);
  });

  it("muestra error cuando la API falla", async () => {
    apiMock.get.mockRejectedValueOnce({
      response: { data: { error: { message: "Boom" } } },
    });
    render(<TicketTimeline ticketId="t-1" />);
    await waitFor(() =>
      expect(screen.getByText("Boom")).toBeInTheDocument(),
    );
  });

  it("refetch cuando cambia refreshKey", async () => {
    apiMock.get.mockResolvedValue({ data: { data: [] } });
    const { rerender } = render(
      <TicketTimeline ticketId="t-1" refreshKey="v1" />,
    );
    await waitFor(() => expect(apiMock.get).toHaveBeenCalledTimes(1));

    rerender(<TicketTimeline ticketId="t-1" refreshKey="v2" />);
    await waitFor(() => expect(apiMock.get).toHaveBeenCalledTimes(2));
  });
});
