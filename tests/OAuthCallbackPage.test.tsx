import React from "react";
import { BrowserRouter } from "react-router-dom";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  post: vi.fn(),
  handleOAuthCallback: vi.fn(),
}));

vi.mock("../src/lib/api", () => ({
  default: {
    post: mocks.post,
  },
}));

vi.mock("../src/hooks", () => ({
  useAuth: () => ({
    handleOAuthCallback: mocks.handleOAuthCallback,
  }),
}));

import OAuthCallbackPage from "../src/pages/OAuthCallbackPage";

const exchangedUser = {
  id: "user-1",
  email: "user@grf.com.ar",
  name: "Usuario GRF",
  role: "USER",
  mustChangePassword: false,
  createdAt: "2026-07-13T00:00:00.000Z",
  updatedAt: "2026-07-13T00:00:00.000Z",
};

const renderCallback = (url: string) => {
  window.history.replaceState({}, "", url);
  return render(
    <React.StrictMode>
      <BrowserRouter>
        <OAuthCallbackPage />
      </BrowserRouter>
    </React.StrictMode>,
  );
};

describe("OAuthCallbackPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.history.replaceState({}, "", "/");
  });

  it("canjea el código una sola vez en StrictMode y limpia la URL antes del POST", async () => {
    mocks.post.mockImplementationOnce(async () => {
      expect(window.location.pathname).toBe("/oauth/callback");
      expect(window.location.search).toBe("");

      return {
        data: {
          success: true,
          data: {
            accessToken: "access-token",
            refreshToken: "refresh-token",
            user: exchangedUser,
          },
        },
      };
    });

    renderCallback("/oauth/callback?code=single-use-code");

    await waitFor(() =>
      expect(mocks.handleOAuthCallback).toHaveBeenCalledWith(
        "access-token",
        "refresh-token",
        exchangedUser,
      ),
    );

    expect(mocks.post).toHaveBeenCalledTimes(1);
    expect(mocks.post).toHaveBeenCalledWith("/api/auth/google/exchange", {
      code: "single-use-code",
    });
  });

  it("no acepta los parámetros legacy con tokens y usuario", async () => {
    renderCallback(
      "/oauth/callback?accessToken=legacy-access&refreshToken=legacy-refresh&user=%7B%7D",
    );

    expect(
      await screen.findByText(
        "El enlace de autenticación es inválido o está incompleto.",
      ),
    ).toBeInTheDocument();
    expect(window.location.search).toBe("");
    expect(mocks.post).not.toHaveBeenCalled();
    expect(mocks.handleOAuthCallback).not.toHaveBeenCalled();
  });

  it("trata el error OAuth como dato no confiable y no lo muestra", async () => {
    renderCallback("/oauth/callback?error=mensaje-controlado-por-terceros");

    expect(
      await screen.findByText(
        "No se pudo completar el inicio de sesión con Google. Inténtalo nuevamente.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("mensaje-controlado-por-terceros"),
    ).not.toBeInTheDocument();
    expect(window.location.search).toBe("");
    expect(mocks.post).not.toHaveBeenCalled();
  });

  it("no crea una sesión si el canje falla o devuelve datos incompletos", async () => {
    mocks.post.mockResolvedValueOnce({
      data: { success: true, data: { accessToken: "incompleto" } },
    });

    renderCallback("/oauth/callback?code=invalid-response-code");

    expect(
      await screen.findByText(
        "No se pudo completar el inicio de sesión con Google. Inténtalo nuevamente.",
      ),
    ).toBeInTheDocument();
    expect(mocks.handleOAuthCallback).not.toHaveBeenCalled();
  });

  it("vuelve al login reemplazando la entrada de historial tras un error", async () => {
    const user = userEvent.setup();
    renderCallback("/oauth/callback?error=access_denied");

    await user.click(
      await screen.findByRole("button", { name: "Volver al Login" }),
    );

    await waitFor(() => expect(window.location.pathname).toBe("/login"));
  });
});
