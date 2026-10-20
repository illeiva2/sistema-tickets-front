import React from "react";

/**
 * Si se cumple una media query, y se actualiza al cambiar (achicar la ventana,
 * girar el celular).
 *
 * Sirve para no DIBUJAR lo que el CSS escondería: con `hidden md:block` los
 * elementos igual se crean, y en una tabla de cientos de filas eso es la mitad
 * del trabajo del navegador tirado. Sin `matchMedia` (tests, render del
 * servidor) devuelve `porDefecto`.
 */
export function useMediaQuery(query: string, porDefecto = false): boolean {
  const suscribir = React.useCallback(
    (avisar: () => void) => {
      if (typeof window === "undefined" || typeof window.matchMedia !== "function") return () => undefined;
      const mq = window.matchMedia(query);
      mq.addEventListener?.("change", avisar);
      return () => mq.removeEventListener?.("change", avisar);
    },
    [query],
  );
  const leer = () =>
    typeof window !== "undefined" && typeof window.matchMedia === "function"
      ? window.matchMedia(query).matches
      : porDefecto;
  return React.useSyncExternalStore(suscribir, leer, () => porDefecto);
}
