import axios, { AxiosError, type AxiosAdapter } from "axios";
import { afterEach, describe, expect, it, vi } from "vitest";
import api from "../src/lib/api";

describe("auth API interceptors", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("no refresca ni limpia la sesión cuando falla el canje OAuth", async () => {
    window.localStorage.setItem("accessToken", "existing-access");
    window.localStorage.setItem("refreshToken", "existing-refresh");
    const refreshRequest = vi
      .spyOn(axios, "post")
      .mockRejectedValue(new Error("refresh must not run"));
    const logoutListener = vi.fn();
    window.addEventListener("auth:logout", logoutListener);

    const rejectWithUnauthorized: AxiosAdapter = async (config) => {
      throw new AxiosError(
        "Código inválido",
        "ERR_BAD_REQUEST",
        config,
        undefined,
        {
          data: {},
          status: 401,
          statusText: "Unauthorized",
          headers: {},
          config,
        },
      );
    };

    await expect(
      api.post(
        "/api/auth/google/exchange",
        { code: "invalid-code" },
        { adapter: rejectWithUnauthorized },
      ),
    ).rejects.toMatchObject({ response: { status: 401 } });

    expect(refreshRequest).not.toHaveBeenCalled();
    expect(logoutListener).not.toHaveBeenCalled();
    expect(window.localStorage.getItem("refreshToken")).toBe(
      "existing-refresh",
    );
    window.removeEventListener("auth:logout", logoutListener);
  });
});
