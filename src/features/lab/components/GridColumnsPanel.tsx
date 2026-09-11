import React from "react";
import { ArrowDown, ArrowUp, Lock, RotateCcw, Search, X } from "lucide-react";
import { Button } from "@/components/ui";
import type { ColumnaGrid } from "../grid";

/**
 * Selector de columnas de la grilla: a la izquierda las visibles en su orden
 * (subir, bajar, quitar), a la derecha todas las disponibles agrupadas para
 * agregar. Flechas y no arrastrar-y-soltar a propósito: funciona igual con el
 * dedo en el celular y no suma una dependencia.
 */
export const GridColumnsPanel: React.FC<{
  disponibles: ColumnaGrid[];
  visibles: string[];
  personalizada: boolean;
  onChange: (ids: string[]) => void;
  onRestablecer: () => void;
  onClose: () => void;
}> = ({ disponibles, visibles, personalizada, onChange, onRestablecer, onClose }) => {
  const [busqueda, setBusqueda] = React.useState("");
  const panel = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const cerrar = (e: MouseEvent) => {
      if (panel.current && !panel.current.contains(e.target as Node)) onClose();
    };
    const tecla = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", cerrar);
    document.addEventListener("keydown", tecla);
    return () => {
      document.removeEventListener("mousedown", cerrar);
      document.removeEventListener("keydown", tecla);
    };
  }, [onClose]);

  const porId = React.useMemo(() => new Map(disponibles.map((c) => [c.id, c])), [disponibles]);
  const visiblesSet = new Set(visibles);

  const mover = (id: string, delta: number) => {
    const i = visibles.indexOf(id);
    const j = i + delta;
    // La accesión (índice 0) no se mueve ni se deja pasar.
    if (i <= 0 || j <= 0 || j >= visibles.length) return;
    const next = [...visibles];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };
  const quitar = (id: string) => onChange(visibles.filter((x) => x !== id));
  const agregar = (id: string) => onChange([...visibles, id]);

  const filtro = busqueda.trim().toLocaleLowerCase();
  const grupos = React.useMemo(() => {
    const out = new Map<string, ColumnaGrid[]>();
    for (const c of disponibles) {
      if (filtro && !`${c.label} ${c.grupoLabel}`.toLocaleLowerCase().includes(filtro)) continue;
      out.set(c.grupoLabel, [...(out.get(c.grupoLabel) ?? []), c]);
    }
    return out;
  }, [disponibles, filtro]);

  return (
    <div
      ref={panel}
      role="dialog"
      aria-label="Columnas de la grilla"
      className="absolute right-0 top-full mt-1 z-30 w-[640px] max-w-[92vw] rounded-lg border border-border bg-card shadow-lg"
    >
      <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-border">
        <div className="text-[12.5px] font-semibold">Columnas</div>
        <div className="flex items-center gap-1">
          {personalizada && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-[11.5px] text-muted-foreground"
              onClick={onRestablecer}
              title="Volver a la vista sugerida"
            >
              <RotateCcw size={12} className="mr-1" />
              Vista sugerida
            </Button>
          )}
          <button
            type="button"
            className="text-muted-foreground hover:text-foreground p-1"
            onClick={onClose}
            aria-label="Cerrar"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-border">
        {/* ─── Visibles, en orden ─────────────────────────────────────── */}
        <div className="p-2">
          <div className="text-[10.5px] uppercase tracking-wider text-muted-foreground px-1 mb-1">
            Visibles · {visibles.length}
          </div>
          <ul className="max-h-[360px] overflow-y-auto space-y-0.5">
            {visibles.map((id, i) => {
              const c = porId.get(id);
              if (!c) return null;
              return (
                <li
                  key={id}
                  className="flex items-center gap-1 rounded px-1.5 py-1 text-[12.5px] hover:bg-muted/40"
                >
                  <span className="flex-1 min-w-0 truncate">
                    {c.label}
                    {c.unit && <span className="text-muted-foreground ml-1 text-[11px]">{c.unit}</span>}
                    <span className="text-muted-foreground ml-1.5 text-[10.5px]">{c.grupoLabel}</span>
                  </span>
                  {c.fija ? (
                    <span className="text-muted-foreground px-1" title="Siempre visible">
                      <Lock size={12} />
                    </span>
                  ) : (
                    <>
                      <button
                        type="button"
                        className="text-muted-foreground hover:text-foreground disabled:opacity-30 p-0.5"
                        onClick={() => mover(id, -1)}
                        disabled={i <= 1}
                        aria-label={`Subir ${c.label}`}
                      >
                        <ArrowUp size={13} />
                      </button>
                      <button
                        type="button"
                        className="text-muted-foreground hover:text-foreground disabled:opacity-30 p-0.5"
                        onClick={() => mover(id, 1)}
                        disabled={i >= visibles.length - 1}
                        aria-label={`Bajar ${c.label}`}
                      >
                        <ArrowDown size={13} />
                      </button>
                      <button
                        type="button"
                        className="text-muted-foreground hover:text-red-600 p-0.5"
                        onClick={() => quitar(id)}
                        aria-label={`Quitar ${c.label}`}
                      >
                        <X size={13} />
                      </button>
                    </>
                  )}
                </li>
              );
            })}
          </ul>
        </div>

        {/* ─── Disponibles ────────────────────────────────────────────── */}
        <div className="p-2">
          <div className="relative mb-1.5">
            <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar columna…"
              className="w-full pl-7 pr-2 py-1 text-[12px] border border-border rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-primary"
              aria-label="Buscar columna"
            />
          </div>
          <div className="max-h-[330px] overflow-y-auto space-y-2">
            {[...grupos].map(([grupo, cols]) => (
              <div key={grupo}>
                <div className="text-[10.5px] uppercase tracking-wider text-muted-foreground px-1 mb-0.5">
                  {grupo}
                </div>
                <ul className="space-y-0.5">
                  {cols.map((c) => {
                    const activa = visiblesSet.has(c.id);
                    return (
                      <li key={c.id}>
                        <label className="flex items-center gap-2 rounded px-1.5 py-1 text-[12.5px] hover:bg-muted/40 cursor-pointer">
                          <input
                            type="checkbox"
                            className="accent-primary"
                            checked={activa}
                            disabled={c.fija}
                            onChange={() => (activa ? quitar(c.id) : agregar(c.id))}
                          />
                          <span className="flex-1 min-w-0 truncate">{c.label}</span>
                          {c.unit && <span className="text-muted-foreground text-[11px]">{c.unit}</span>}
                        </label>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
            {grupos.size === 0 && (
              <p className="text-[12px] text-muted-foreground px-1 py-3 text-center">Sin columnas para “{busqueda}”</p>
            )}
          </div>
        </div>
      </div>

      <div className="px-3 py-1.5 border-t border-border text-[11px] text-muted-foreground">
        La vista se guarda en tu perfil: la ves igual desde cualquier dispositivo. Ordená haciendo clic en
        el encabezado de una columna (Shift + clic para un segundo criterio).
      </div>
    </div>
  );
};

export default GridColumnsPanel;
