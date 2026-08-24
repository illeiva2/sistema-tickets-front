import React from "react";
import { Skeleton } from "@/components/ui";

/**
 * Estados de carga del módulo de laboratorio.
 *
 * Este módulo agrega decenas de miles de mediciones contra Postgres del otro
 * lado de internet, así que hay consultas de varios segundos. Eso exige dos
 * cosas que el resto del repo no necesita:
 *
 * - Que un refetch NO reemplace la tabla por skeletons. Si los datos ya están en
 *   pantalla, se dejan y se avisa arriba que se están actualizando; hacerlos
 *   desaparecer cada 30 segundos es peor que no refrescar.
 * - Que después de unos segundos el indicador diga cuánto lleva. Una barra que
 *   gira sin más no distingue "tarda" de "se colgó", y la reacción natural es
 *   recargar la página justo cuando la consulta estaba por volver.
 */

/** Antes de esto no se muestra nada: un indicador que parpadea 80 ms es peor que ninguno. */
const RETARDO_MS = 350;

/** A partir de acá se agrega el contador de segundos. */
const PACIENCIA_MS = 4000;

/**
 * Barra indeterminada para el borde superior de un panel.
 *
 * `motion-reduce` la deja quieta: una barra que barre en loop es exactamente lo
 * que molesta a quien configuró reducir movimiento en el sistema.
 */
export const LabProgressBar: React.FC<{ active: boolean; className?: string }> = ({
  active,
  className = "",
}) => {
  const visible = useRetardo(active, RETARDO_MS);
  if (!visible) return null;

  return (
    <div
      className={`h-0.5 w-full overflow-hidden bg-primary/10 ${className}`}
      role="progressbar"
      aria-label="Cargando datos"
    >
      <div className="h-full w-1/4 bg-primary animate-lab-sweep motion-reduce:animate-none motion-reduce:w-full motion-reduce:opacity-60" />
    </div>
  );
};

/**
 * Texto de estado: "Actualizando…" y, si se pasa de unos segundos, cuántos.
 * Va al lado del título, no encima del contenido.
 */
export const LabFetchingHint: React.FC<{ active: boolean }> = ({ active }) => {
  const segundos = useSegundos(active);
  const visible = useRetardo(active, RETARDO_MS);
  if (!visible) return null;

  return (
    <span className="text-[11.5px] text-muted-foreground tabular-nums" aria-live="polite">
      {segundos >= PACIENCIA_MS / 1000
        ? `Consultando… ${segundos} s`
        : "Actualizando…"}
    </span>
  );
};

/** Cards de KPI en carga inicial. Se le pasa cuántas para que no salte el layout. */
export const LabKpiSkeletons: React.FC<{ count?: number }> = ({ count = 4 }) => (
  <>
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="rounded-lg border border-l-4 border-l-slate-300 bg-card p-4 shadow-sm">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-7 w-20 mt-2" />
        <Skeleton className="h-3 w-32 mt-2" />
      </div>
    ))}
  </>
);

/** Filas de tabla en carga inicial, con el mismo alto que las reales para no saltar. */
export const LabTableSkeleton: React.FC<{ rows?: number; cols?: number }> = ({
  rows = 8,
  cols = 6,
}) => (
  <div className="divide-y divide-border">
    {Array.from({ length: rows }).map((_, r) => (
      <div key={r} className="flex items-center gap-3 px-4 py-[11px]">
        {Array.from({ length: cols }).map((_, c) => (
          <Skeleton
            key={c}
            className={`h-3 ${c === 0 ? "w-28" : c === 1 ? "flex-1" : "w-16"}`}
          />
        ))}
      </div>
    ))}
  </div>
);

/**
 * Caja de altura fija para gráficos. Mantiene el alto en los tres estados
 * (cargando, vacío, con datos) para que la página no salte al terminar.
 */
export const LabChartBox: React.FC<{
  height: number;
  loading: boolean;
  empty: boolean;
  emptyLabel?: string;
  children: React.ReactNode;
}> = ({ height, loading, empty, emptyLabel = "Sin datos en el período", children }) => {
  if (loading) {
    return (
      <div
        className="flex flex-col items-center justify-center gap-2 text-muted-foreground"
        style={{ height }}
      >
        <div className="h-0.5 w-32 overflow-hidden rounded bg-primary/10">
          <div className="h-full w-1/3 bg-primary animate-lab-sweep motion-reduce:animate-none motion-reduce:w-full" />
        </div>
        <span className="text-xs">Calculando promedios…</span>
      </div>
    );
  }
  if (empty) {
    return (
      <div
        className="flex items-center justify-center text-xs text-muted-foreground"
        style={{ height }}
      >
        {emptyLabel}
      </div>
    );
  }
  return <div style={{ height }}>{children}</div>;
};

// ─── Hooks ───────────────────────────────────────────────────────────────────

/** true recién después de `ms` de actividad continua. Evita el parpadeo. */
function useRetardo(active: boolean, ms: number): boolean {
  const [visible, setVisible] = React.useState(false);

  React.useEffect(() => {
    if (!active) {
      setVisible(false);
      return;
    }
    const t = window.setTimeout(() => setVisible(true), ms);
    return () => window.clearTimeout(t);
  }, [active, ms]);

  return visible;
}

/** Segundos transcurridos desde que arrancó la actividad. 0 cuando está inactivo. */
function useSegundos(active: boolean): number {
  const [seg, setSeg] = React.useState(0);

  React.useEffect(() => {
    if (!active) {
      setSeg(0);
      return;
    }
    const inicio = Date.now();
    const i = window.setInterval(
      () => setSeg(Math.floor((Date.now() - inicio) / 1000)),
      1000,
    );
    return () => window.clearInterval(i);
  }, [active]);

  return seg;
}

/**
 * Re-renderiza cada `ms` para que los textos de tiempo relativo ("hace 3 min")
 * no queden congelados. El dashboard original resolvía esto colando una
 * expresión que siempre rendía string vacío; acá es un hook con nombre.
 */
export function useTicker(ms = 1000): void {
  const [, setTick] = React.useState(0);
  React.useEffect(() => {
    const i = window.setInterval(() => setTick((t) => t + 1), ms);
    return () => window.clearInterval(i);
  }, [ms]);
}
