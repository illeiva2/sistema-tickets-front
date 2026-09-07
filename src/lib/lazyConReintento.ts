import { lazy, type ComponentType } from "react";

/**
 * Carga diferida de páginas que se recupera sola de un deploy.
 *
 * Los chunks llevan hash en el nombre. Tras un deploy, una pestaña abierta con
 * el index.html anterior sigue pidiendo `DashboardPage-<hash viejo>.js`, que ya
 * no existe (el service worker nuevo limpió el caché viejo y Vercel solo sirve
 * el deploy actual) → el import() falla → React mostraba "Algo salió mal". El
 * usuario no hizo nada raro: hay una versión nueva. La respuesta correcta es
 * recargar, una sola vez, y seguir.
 */

const CLAVE = "recarga-por-version-nueva";
/** Si ya recargamos hace menos de esto y sigue fallando, el problema es otro: que se vea el error. */
const VENTANA_MS = 60_000;

/** ¿Es el fallo típico de un chunk que dejó de existir? (mensajes de Chrome, Firefox, Safari y webpack) */
export const esErrorDeChunk = (e: unknown): boolean => {
  const msg = String((e as { message?: unknown })?.message ?? e ?? "");
  return /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module|Loading (CSS )?chunk [\w-]+ failed|Unable to preload CSS/i.test(
    msg,
  );
};

/** Recarga la página si no lo hicimos en el último minuto. Devuelve si recargó. */
export const recargarPorVersionNueva = (): boolean => {
  try {
    const ultima = Number(sessionStorage.getItem(CLAVE) ?? 0);
    if (Date.now() - ultima < VENTANA_MS) return false;
    sessionStorage.setItem(CLAVE, String(Date.now()));
  } catch {
    // Sin sessionStorage (modo privado estricto): recargar igual; el peor caso
    // es un bucle que el usuario corta cerrando la pestaña, y es rarísimo.
  }
  window.location.reload();
  return true;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function lazyConReintento<T extends ComponentType<any>>(
  importar: () => Promise<{ default: T }>,
) {
  return lazy(async () => {
    try {
      return await importar();
    } catch (e) {
      if (esErrorDeChunk(e) && recargarPorVersionNueva()) {
        // La recarga ya está en curso: una promesa que no resuelve evita que
        // React pinte el error durante los milisegundos que tarda en irse.
        return new Promise<{ default: T }>(() => {});
      }
      throw e;
    }
  });
}
