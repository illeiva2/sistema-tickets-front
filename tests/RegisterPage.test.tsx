import React from "react";
import { BrowserRouter } from "react-router-dom";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  loginWithGoogle: vi.fn(),
}));

vi.mock("../src/hooks", () => ({
  useAuth: () => ({
    loginWithGoogle: mocks.loginWithGoogle,
  }),
}));

import RegisterPage from "../src/pages/RegisterPage";

describe("RegisterPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.history.replaceState({}, "", "/register");
  });

  it("inicia el registro por Google sin consumir credenciales legacy de la URL", async () => {
    const user = userEvent.setup();
    window.history.replaceState(
      {},
      "",
      "/register?token=legacy-token&user=%7B%22role%22%3A%22ADMIN%22%7D",
    );

    render(
      <BrowserRouter>
        <RegisterPage />
      </BrowserRouter>,
    );

    expect(window.location.search).toBe("");
    expect(
      screen.queryByRole("option", { name: "Administrador" }),
    ).not.toBeInTheDocument();
    await user.click(
      screen.getByRole("button", { name: "Continuar con Google" }),
    );

    expect(mocks.loginWithGoogle).toHaveBeenCalledTimes(1);
  });
});
