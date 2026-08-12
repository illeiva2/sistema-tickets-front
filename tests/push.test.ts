import { afterEach, describe, expect, it, vi } from "vitest";
import { isIos, isStandalone } from "../src/lib/push";

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
