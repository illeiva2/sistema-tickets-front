import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

vi.mock("../src/lib/api", () => ({
  default: { get: vi.fn() },
}));

import api from "../src/lib/api";
import CommandPalette from "../src/components/CommandPalette";

const apiMock = api as unknown as { get: ReturnType<typeof vi.fn> };

const renderPalette = () =>
  render(
    <MemoryRouter>
      <CommandPalette />
    </MemoryRouter>,
  );

describe("CommandPalette", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("no se renderiza por default", () => {
    renderPalette();
    expect(screen.queryByPlaceholderText(/Buscar tickets/i)).toBeNull();
  });

  it("Cmd/Ctrl+K abre el palette", async () => {
    const user = userEvent.setup();
    renderPalette();

    await user.keyboard("{Control>}k{/Control}");

    await waitFor(() =>
      expect(
        screen.getByPlaceholderText(/Buscar tickets/i),
      ).toBeInTheDocument(),
    );
  });

  it("Esc cierra el palette", async () => {
    const user = userEvent.setup();
    renderPalette();

    await user.keyboard("{Control>}k{/Control}");
    await waitFor(() =>
      expect(screen.getByPlaceholderText(/Buscar tickets/i)).toBeInTheDocument(),
    );

    await user.keyboard("{Escape}");

    await waitFor(() =>
      expect(screen.queryByPlaceholderText(/Buscar tickets/i)).toBeNull(),
    );
  });

  it("muestra prompt cuando el query está vacío", async () => {
    const user = userEvent.setup();
    renderPalette();
    await user.keyboard("{Control>}k{/Control}");

    expect(
      await screen.findByText(/Escribí para buscar tickets/i),
    ).toBeInTheDocument();
  });

  it("ejecuta búsqueda contra /api/tickets cuando se tipea", async () => {
    apiMock.get.mockResolvedValueOnce({
      data: {
        data: {
          data: [
            {
              id: "t-1",
              ticketNumber: 42,
              title: "Bug en el ERP",
              status: "OPEN",
              priority: "HIGH",
              category: "ERP",
            },
          ],
        },
      },
    });

    const user = userEvent.setup();
    renderPalette();
    await user.keyboard("{Control>}k{/Control}");

    const input = await screen.findByPlaceholderText(/Buscar tickets/i);
    await user.type(input, "ERP");

    // Debounce: 200ms.
    await waitFor(
      () => {
        expect(apiMock.get).toHaveBeenCalled();
        const call = apiMock.get.mock.calls[0][0] as string;
        expect(call).toContain("q=ERP");
      },
      { timeout: 1000 },
    );

    await waitFor(() =>
      expect(screen.getByText("Bug en el ERP")).toBeInTheDocument(),
    );
    expect(screen.getByText(/00042/)).toBeInTheDocument();
  });

  it("muestra 'sin resultados' cuando la API devuelve []", async () => {
    apiMock.get.mockResolvedValueOnce({ data: { data: { data: [] } } });

    const user = userEvent.setup();
    renderPalette();
    await user.keyboard("{Control>}k{/Control}");
    const input = await screen.findByPlaceholderText(/Buscar tickets/i);
    await user.type(input, "xyz");

    await waitFor(
      () => expect(screen.getByText(/Sin resultados/i)).toBeInTheDocument(),
      { timeout: 1000 },
    );
  });
});
