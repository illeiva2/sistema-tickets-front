import "@testing-library/jest-dom/vitest";
import { afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";

// Cleanup automático del DOM después de cada test.
afterEach(() => {
  cleanup();
});

// matchMedia no existe en jsdom; muchos componentes (ThemeContext) lo usan.
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// localStorage está disponible en jsdom, lo limpiamos antes de cada suite.
beforeEach(() => {
  window.localStorage.clear();
});

// Algunos componentes (recharts) necesitan ResizeObserver.
class MockResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
Object.defineProperty(window, "ResizeObserver", {
  writable: true,
  value: MockResizeObserver,
});

// Helper global de vitest disponible.
declare global {
  // eslint-disable-next-line no-var
  var beforeEach: typeof import("vitest").beforeEach;
}
import { beforeEach } from "vitest";
(globalThis as any).beforeEach = beforeEach;
