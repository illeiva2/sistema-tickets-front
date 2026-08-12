import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  fetchPushPublicKey: vi.fn(),
  isPushSupported: vi.fn(),
  isIos: vi.fn(),
  isStandalone: vi.fn(),
  getCurrentSubscription: vi.fn(),
  enablePush: vi.fn(),
  disablePush: vi.fn(),
}));

vi.mock("../src/lib/push", () => mocks);

import PushToggle from "../src/components/PushToggle";

describe("PushToggle", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentSubscription.mockResolvedValue(null);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("no muestra nada si el servidor no tiene el canal configurado", async () => {
    mocks.fetchPushPublicKey.mockResolvedValue(null);
    const { container } = render(<PushToggle />);
    await waitFor(() => expect(mocks.fetchPushPublicKey).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });

  it("muestra el botón normal cuando el navegador soporta push", async () => {
    mocks.fetchPushPublicKey.mockResolvedValue("clave-publica");
    mocks.isPushSupported.mockReturnValue(true);
    render(<PushToggle />);
    expect(
      await screen.findByRole("button", { name: /activar push/i }),
    ).toBeInTheDocument();
  });

  it("en iPhone/iPad sin instalar muestra el aviso de instalación en vez del botón", async () => {
    mocks.fetchPushPublicKey.mockResolvedValue("clave-publica");
    mocks.isPushSupported.mockReturnValue(false);
    mocks.isIos.mockReturnValue(true);
    mocks.isStandalone.mockReturnValue(false);
    render(<PushToggle />);

    expect(
      await screen.findByText(/agregar a inicio/i),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("en iPhone ya instalado (standalone) no muestra el aviso — sigue el flujo normal", async () => {
    mocks.fetchPushPublicKey.mockResolvedValue("clave-publica");
    mocks.isPushSupported.mockReturnValue(true);
    mocks.isIos.mockReturnValue(true);
    mocks.isStandalone.mockReturnValue(true);
    render(<PushToggle />);

    expect(
      await screen.findByRole("button", { name: /activar push/i }),
    ).toBeInTheDocument();
    expect(screen.queryByText(/agregar a inicio/i)).toBeNull();
  });

  it("no muestra el aviso de iOS si el canal ni siquiera está configurado en el server", async () => {
    mocks.fetchPushPublicKey.mockResolvedValue(null);
    mocks.isPushSupported.mockReturnValue(false);
    mocks.isIos.mockReturnValue(true);
    mocks.isStandalone.mockReturnValue(false);
    const { container } = render(<PushToggle />);

    await waitFor(() => expect(mocks.fetchPushPublicKey).toHaveBeenCalled());
    expect(screen.queryByText(/agregar a inicio/i)).toBeNull();
    expect(container).toBeEmptyDOMElement();
  });
});
