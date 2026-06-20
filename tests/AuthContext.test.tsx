import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

// Mock de toast (para que no rompa por falta de root).
vi.mock("react-hot-toast", () => ({
  default: { success: vi.fn(), error: vi.fn() },
}));

// Mock de api: reemplazamos el módulo entero por un objeto controlable.
vi.mock("../src/lib/api", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    defaults: { baseURL: "http://test" },
  },
}));

import api from "../src/lib/api";
import { AuthProvider, useAuth } from "../src/contexts/AuthContext";

const apiMock = api as unknown as {
  get: ReturnType<typeof vi.fn>;
  post: ReturnType<typeof vi.fn>;
};

const TestConsumer: React.FC = () => {
  const auth = useAuth();
  return (
    <div>
      <div data-testid="loading">{String(auth.isLoading)}</div>
      <div data-testid="user">{auth.user ? auth.user.email : "anon"}</div>
      <button
        onClick={() =>
          auth.login({ email: "u@test.local", password: "secret123" })
        }
      >
        login
      </button>
      <button onClick={() => auth.logout()}>logout</button>
    </div>
  );
};

const renderWithProvider = () =>
  render(
    <MemoryRouter>
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    </MemoryRouter>,
  );

describe("AuthContext", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
  });

  it("sin token guardado, bootstrap termina con user=null y isLoading=false", async () => {
    renderWithProvider();
    await waitFor(() =>
      expect(screen.getByTestId("loading")).toHaveTextContent("false"),
    );
    expect(screen.getByTestId("user")).toHaveTextContent("anon");
    // No debe haber llamado a /me si no había token.
    expect(apiMock.get).not.toHaveBeenCalled();
  });

  it("con token guardado, bootstrap llama /me y setea el user", async () => {
    window.localStorage.setItem("accessToken", "fake-token");
    window.localStorage.setItem(
      "user",
      JSON.stringify({ id: "u-1", email: "u@test.local" }),
    );

    apiMock.get.mockResolvedValueOnce({
      data: {
        success: true,
        data: {
          user: {
            id: "u-1",
            email: "u@test.local",
            name: "Test",
            role: "USER",
            mustChangePassword: false,
            createdAt: "",
            updatedAt: "",
          },
        },
      },
    });

    renderWithProvider();

    await waitFor(() =>
      expect(screen.getByTestId("user")).toHaveTextContent("u@test.local"),
    );
    expect(apiMock.get).toHaveBeenCalledWith("/api/auth/me");
  });

  it("login exitoso guarda tokens en localStorage y setea user", async () => {
    const user = userEvent.setup();
    apiMock.post.mockResolvedValueOnce({
      data: {
        data: {
          accessToken: "tok",
          refreshToken: "ref",
          user: {
            id: "u-1",
            email: "u@test.local",
            name: "Test",
            role: "USER",
            mustChangePassword: false,
            createdAt: "",
            updatedAt: "",
          },
        },
      },
    });

    renderWithProvider();
    await waitFor(() =>
      expect(screen.getByTestId("loading")).toHaveTextContent("false"),
    );

    await user.click(screen.getByText("login"));

    await waitFor(() =>
      expect(screen.getByTestId("user")).toHaveTextContent("u@test.local"),
    );
    expect(window.localStorage.getItem("accessToken")).toBe("tok");
    expect(window.localStorage.getItem("refreshToken")).toBe("ref");
    expect(JSON.parse(window.localStorage.getItem("user") || "{}").id).toBe(
      "u-1",
    );
  });

  it("logout limpia localStorage y resetea user", async () => {
    window.localStorage.setItem("accessToken", "tok");
    window.localStorage.setItem("refreshToken", "ref");
    window.localStorage.setItem(
      "user",
      JSON.stringify({ id: "u-1", email: "u@test.local" }),
    );

    apiMock.get.mockResolvedValueOnce({
      data: {
        success: true,
        data: {
          user: {
            id: "u-1",
            email: "u@test.local",
            name: "Test",
            role: "USER",
            mustChangePassword: false,
            createdAt: "",
            updatedAt: "",
          },
        },
      },
    });
    apiMock.post.mockResolvedValueOnce({ data: { success: true } });

    const user = userEvent.setup();
    renderWithProvider();

    await waitFor(() =>
      expect(screen.getByTestId("user")).toHaveTextContent("u@test.local"),
    );

    await user.click(screen.getByText("logout"));

    await waitFor(() =>
      expect(screen.getByTestId("user")).toHaveTextContent("anon"),
    );
    expect(window.localStorage.getItem("accessToken")).toBeNull();
    expect(window.localStorage.getItem("refreshToken")).toBeNull();
    expect(window.localStorage.getItem("user")).toBeNull();
  });

  it("evento auth:logout limpia sesión", async () => {
    window.localStorage.setItem("accessToken", "tok");
    window.localStorage.setItem(
      "user",
      JSON.stringify({ id: "u-1", email: "u@test.local" }),
    );
    apiMock.get.mockResolvedValueOnce({
      data: {
        success: true,
        data: {
          user: {
            id: "u-1",
            email: "u@test.local",
            name: "Test",
            role: "USER",
            mustChangePassword: false,
            createdAt: "",
            updatedAt: "",
          },
        },
      },
    });

    renderWithProvider();
    await waitFor(() =>
      expect(screen.getByTestId("user")).toHaveTextContent("u@test.local"),
    );

    act(() => {
      window.dispatchEvent(new Event("auth:logout"));
    });

    await waitFor(() =>
      expect(screen.getByTestId("user")).toHaveTextContent("anon"),
    );
    expect(window.localStorage.getItem("accessToken")).toBeNull();
  });
});
