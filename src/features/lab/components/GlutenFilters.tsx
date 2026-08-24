import React from "react";
import { Search, X } from "lucide-react";
import { Button } from "@/components/ui";
import type { EquipmentDto, MeasurementsFilters, MethodDto } from "../types";

/**
 * Barra de filtros de las mediciones de gluten.
 *
 * Inputs y selects NATIVOS con clases inline, no los componentes `Input`/`Select`
 * de `@/components/ui`: en este repo esos se usan en formularios y modales, y
 * miden ~40 px de alto. En una barra de filtros de 26 px se verían fuera de
 * lugar respecto del resto de la aplicación.
 */

const CLASE_CONTROL =
  "px-2 py-1 text-[12.5px] border border-border rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-primary";

export const hayFiltrosActivos = (f: MeasurementsFilters): boolean =>
  Boolean(
    f.from ||
      f.to ||
      f.instrumentSerial ||
      f.method ||
      f.sampleCodeContains ||
      f.includeIncomplete === false,
  );

export const GlutenFilters: React.FC<{
  equipment: EquipmentDto[];
  methods: MethodDto[];
  value: MeasurementsFilters;
  onChange: (f: MeasurementsFilters) => void;
}> = ({ equipment, methods, value, onChange }) => {
  // El texto se maneja local y se propaga con debounce: sin esto, cada tecla
  // dispara tres consultas agregadas contra decenas de miles de filas.
  const [texto, setTexto] = React.useState(value.sampleCodeContains ?? "");

  React.useEffect(() => {
    const t = window.setTimeout(() => {
      const limpio = texto.trim();
      if (limpio !== (value.sampleCodeContains ?? "")) {
        onChange({ ...value, sampleCodeContains: limpio || undefined });
      }
    }, 300);
    return () => window.clearTimeout(t);
    // `value` y `onChange` a propósito fuera: solo el texto reinicia el timer.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [texto]);

  // Se sincroniza si los filtros se limpian desde afuera.
  React.useEffect(() => {
    setTexto(value.sampleCodeContains ?? "");
  }, [value.sampleCodeContains]);

  const activos = hayFiltrosActivos(value);

  return (
    <div className="flex flex-wrap items-center gap-2 px-3 py-2 border-b border-border bg-muted/20">
      <label className="flex items-center gap-1.5 text-[11.5px] text-muted-foreground">
        Desde
        <input
          type="date"
          className={CLASE_CONTROL}
          value={value.from ?? ""}
          onChange={(e) => onChange({ ...value, from: e.target.value || undefined })}
        />
      </label>

      <label className="flex items-center gap-1.5 text-[11.5px] text-muted-foreground">
        Hasta
        <input
          type="date"
          className={CLASE_CONTROL}
          value={value.to ?? ""}
          onChange={(e) => onChange({ ...value, to: e.target.value || undefined })}
        />
      </label>

      <select
        className={CLASE_CONTROL}
        value={value.instrumentSerial ?? ""}
        onChange={(e) =>
          onChange({ ...value, instrumentSerial: e.target.value || undefined })
        }
      >
        <option value="">Todos los equipos</option>
        {equipment.map((e) => (
          <option key={e.serial} value={e.serial}>
            {e.displayName}
          </option>
        ))}
      </select>

      <select
        className={CLASE_CONTROL}
        value={value.method ?? ""}
        onChange={(e) => onChange({ ...value, method: e.target.value || undefined })}
      >
        <option value="">Todos los métodos</option>
        {methods.map((m) => (
          // El value va SIN recortar: los nombres vienen con espacios de relleno
          // desde el instrumento y el backend compara contra el valor completo.
          // El .trim() es solo para mostrar.
          <option key={m.name} value={m.name}>
            {m.name.trim()} ({m.totalUses})
          </option>
        ))}
      </select>

      <div className="relative flex-1 min-w-[170px]">
        <Search
          size={13}
          className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
        />
        <input
          type="text"
          placeholder="Buscar por muestra: AC26M, SILO2…"
          className={`${CLASE_CONTROL} w-full pl-8`}
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
        />
      </div>

      <label className="flex items-center gap-1.5 text-[11.5px] text-muted-foreground cursor-pointer">
        <input
          type="checkbox"
          className="accent-primary"
          checked={value.includeIncomplete !== false}
          onChange={(e) =>
            onChange({ ...value, includeIncomplete: e.target.checked ? undefined : false })
          }
        />
        Incluir incompletas
      </label>

      {activos && (
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-[11.5px] text-muted-foreground"
          onClick={() => onChange({ pageSize: value.pageSize, sortBy: value.sortBy, sortDesc: value.sortDesc })}
        >
          <X size={12} className="mr-1" />
          Limpiar
        </Button>
      )}
    </div>
  );
};

export default GlutenFilters;
