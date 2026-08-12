import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../src/lib/api", () => ({
  default: { get: vi.fn(), post: vi.fn() },
}));

import api from "../src/lib/api";
import { enablePush, isIos, isStandalone } from "../src/lib/push";

const apiMock = api as unknown as { post: ReturnType<typeof vi.fn> };

const setUserAgent = (value: string) => {
  vi.stubGlobal("navigator", {
    ...window.navigator,
    userAgent: value,
    platform: window.navigator.platform,
    maxTouchPoints: window.navigator.maxTouchPoints,
  });
};

const setPlatform = (platform: string, maxTouchPoints: number) => {
  vi.stubGlobal("navigator", {
    ...window.navigator,
    userAgent: window.navigator.userAgent,
    platform,
    maxTouchPoints,
  });
};

describe("isIos", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("detecta iPhone y iPad por el user agent", () => {
    setUserAgent(
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15",
    );
    expect(isIos()).toBe(true);

    setUserAgent(
      "Mozilla/5.0 (iPad; CPU OS 17_4 like Mac OS X) AppleWebKit/605.1.15",
    );
    expect(isIos()).toBe(true);
  });

  it("detecta iPadOS 13+ que se identifica como MacIntel con touch", () => {
    setPlatform("MacIntel", 5);
    expect(isIos()).toBe(true);
  });

  it("no confunde una Mac de escritorio (sin touch) con iPad", () => {
    setPlatform("MacIntel", 0);
    expect(isIos()).toBe(false);
  });

  it("no detecta Android ni desktop como iOS", () => {
    setUserAgent("Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36");
    expect(isIos()).toBe(false);
  });
});

describe("isStandalone", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("detecta standalone vía display-mode (Android/desktop instalados)", () => {
    vi.stubGlobal("matchMedia", (query: string) => ({
      matches: query === "(display-mode: standalone)",
    }));
    expect(isStandalone()).toBe(true);
  });

  it("detecta standalone vía navigator.standalone (iOS agregado a inicio)", () => {
    vi.stubGlobal("matchMedia", () => ({ matches: false }));
    vi.stubGlobal("navigator", { ...window.navigator, standalone: true });
    expect(isStandalone()).toBe(true);
  });

  it("da false en una pestaña normal del navegador", () => {
    vi.stubGlobal("matchMedia", () => ({ matches: false }));
    vi.stubGlobal("navigator", { ...window.navigator, standalone: false });
    expect(isStandalone()).toBe(false);
  });
});

describe("enablePush", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("manda al server sólo endpoint y keys, sin expirationTime ni otros campos", async () => {
    // subscription.toJSON() del navegador real (Chrome/Safari) incluye
    // expirationTime — justamente el campo que rompió el subscribe cuando
    // se mandaba el objeto completo tal cual.
    const browserSubscription = {
      endpoint: "https://web.push.apple.com/abc123",
      expirationTime: null,
      keys: { p256dh: "clave-p256dh", auth: "clave-auth" },
      toJSON() {
        return {
          endpoint: this.endpoint,
          expirationTime: this.expirationTime,
          keys: this.keys,
        };
      },
    };
    const subscribe = vi.fn().mockResolvedValue(browserSubscription);
    const registration = {
      pushManager: { subscribe },
    } as unknown as ServiceWorkerRegistration;

    vi.stubGlobal("navigator", {
      ...window.navigator,
      serviceWorker: { getRegistration: vi.fn().mockResolvedValue(registration) },
    });
    vi.stubGlobal("PushManager", function () {});
    vi.stubGlobal("Notification", {
      requestPermission: vi.fn().mockResolvedValue("granted"),
    });
    apiMock.post.mockResolvedValue({ data: { success: true } });

    const result = await enablePush("clave-publica-del-server");

    expect(result).toBe(true);
    expect(apiMock.post).toHaveBeenCalledWith("/api/push/subscribe", {
      endpoint: "https://web.push.apple.com/abc123",
      keys: { p256dh: "clave-p256dh", auth: "clave-auth" },
    });
    // Ningún objeto extra (expirationTime incluido) llega al server.
    const sentPayload = apiMock.post.mock.calls[0][1];
    expect(Object.keys(sentPayload).sort()).toEqual(["endpoint", "keys"]);
  });

  it("devuelve false si el usuario no otorga el permiso, sin llamar al server", async () => {
    const registration = {
      pushManager: { subscribe: vi.fn() },
    } as unknown as ServiceWorkerRegistration;

    vi.stubGlobal("navigator", {
      ...window.navigator,
      serviceWorker: { getRegistration: vi.fn().mockResolvedValue(registration) },
    });
    vi.stubGlobal("PushManager", function () {});
    vi.stubGlobal("Notification", {
      requestPermission: vi.fn().mockResolvedValue("denied"),
    });

    const result = await enablePush("clave-publica-del-server");

    expect(result).toBe(false);
    expect(apiMock.post).not.toHaveBeenCalled();
  });
});
