import React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { Button } from "@/components/ui";
import { labApi, labError, labKeys } from "../api";
import { MANUAL_PARAMS, erroresDeCampos, localToIso, toDateTimeLocal } from "../samples";
import type { SampleMeasurementDto } from "../types";
import { LabModal } from "./LabModal";

/**
 * Carga (o corrección) de un análisis hecho con un equipo sin conexión:
 * termobalanza, estufa, colorímetro, balanza para PMG. Se completa solo lo que
 * se midió; lo vacío no viaja. Queda enlazado a la muestra como una medición
 * más, y aparece en la ficha, la grilla y el reporte diario.
 */

const CLASE_CONTROL =
  "w-full h-9 px-2.5 text-[13px] border border-border rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-primary";

const aTexto = (v: number | undefined): string => (v === undefined ? "" : String(v).replace(".", ","));

/** "" → null (no se midió); coma o punto decimal; cualquier otra cosa → NaN para avisar. */
const aNumero = (s: string): number | null => {
  const t = s.trim().replace(",", ".");
  if (t === "") return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : Number.NaN;
};

export const ManualMeasurementModal: React.FC<{
  sampleId: string;
  accession: string;
  /** Medición manual a corregir. Ausente = alta. */
  editing?: SampleMeasurementDto | null;
  onClose: () => void;
}> = ({ sampleId, accession, editing, onClose }) => {
  const qc = useQueryClient();
  const esEdicion = Boolean(editing);
  const [analyzedAt, setAnalyzedAt] = React.useState(
    toDateTimeLocal(editing ? new Date(editing.analyzedAt) : new Date()),
  );
  const [valores, setValores] = React.useState<Record<string, string>>(() => {
    const v: Record<string, string> = {};
    for (const p of editing?.params ?? []) v[p.code] = aTexto(p.value);
    return v;
  });
  const [errores, setErrores] = React.useState<Record<string, string>>({});

  const mutation = useMutation({
    mutationFn: async () => {
      const iso = localToIso(analyzedAt);
      if (!iso) throw new Error("La fecha del análisis no es válida");
      const values: Record<string, number | null> = {};
      const locales: Record<string, string> = {};
      let alguno = false;
      for (const p of MANUAL_PARAMS) {
        const n = aNumero(valores[p.code] ?? "");
        if (n === null) {
          values[p.code] = null;
          continue;
        }
        if (Number.isNaN(n)) {
          locales[p.code] = "Tiene que ser un número";
          continue;
        }
        if (n < p.min || n > p.max) {
          locales[p.code] = `Entre ${p.min} y ${p.max}`;
          continue;
        }
        values[p.code] = n;
        alguno = true;
      }
      if (Object.keys(locales).length > 0) {
        setErrores(locales);
        throw new Error("Revisá los valores marcados");
      }
      if (!alguno) throw new Error("Cargá al menos un valor");
      return esEdicion
        ? labApi.samples.manual.update(editing!.id, { analyzedAt: iso, values })
        : labApi.samples.manual.create(sampleId, { analyzedAt: iso, values });
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: labKeys.sample(accession) });
      void qc.invalidateQueries({ queryKey: labKeys.samplesAll });
      toast.success(esEdicion ? "Análisis corregido" : "Análisis cargado");
      onClose();
    },
    onError: (e) => {
      const porCampo = erroresDeCampos(e);
      if (Object.keys(porCampo).length > 0) setErrores(porCampo);
      toast.error(labError(e));
    },
  });

  const setValor = (code: string, v: string) => {
    setValores((prev) => ({ ...prev, [code]: v }));
    if (errores[code]) setErrores((e) => ({ ...e, [code]: "" }));
  };

  return (
    <LabModal
      onClose={onClose}
      title={
        <span>
          {esEdicion ? "Corregir análisis manual" : "Análisis manual"}{" "}
          <span className="font-mono tracking-wider text-muted-foreground font-normal">· {accession}</span>
        </span>
      }
      footer={
        <>
          <Button size="sm" variant="ghost" onClick={onClose} disabled={mutation.isPending}>
            Cancelar
          </Button>
          <Button size="sm" onClick={() => mutation.mutate()} disabled={mutation.isPending}>
            {mutation.isPending ? "Guardando…" : esEdicion ? "Guardar cambios" : "Cargar"}
          </Button>
        </>
      }
    >
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (!mutation.isPending) mutation.mutate();
        }}
      >
        <p className="text-[12px] text-muted-foreground">
          Termobalanza, estufa, colorímetro y balanza no están conectados: lo que midieron se carga acá.
          Completá solo lo que se hizo; lo que quede vacío no cuenta como cero.
        </p>

        <label className="block sm:max-w-xs">
          <span className="block text-[11.5px] text-muted-foreground mb-1">Fecha y hora del análisis</span>
          <input
            type="datetime-local"
            className={CLASE_CONTROL}
            value={analyzedAt}
            onChange={(e) => setAnalyzedAt(e.target.value)}
          />
        </label>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {MANUAL_PARAMS.map((p) => (
            <label key={p.code} className="block">
              <span className="block text-[11.5px] text-muted-foreground mb-1">
                {p.label}
                {p.unit && <span className="ml-1 text-muted-foreground/70">({p.unit})</span>}
              </span>
              <input
                type="text"
                inputMode="decimal"
                className={`${CLASE_CONTROL} text-right tabular-nums`}
                value={valores[p.code] ?? ""}
                placeholder="—"
                onChange={(e) => setValor(p.code, e.target.value)}
              />
              {errores[p.code] ? (
                <span className="block text-[11.5px] text-red-600 dark:text-red-400 mt-1">{errores[p.code]}</span>
              ) : p.hint ? (
                <span className="block text-[11px] text-muted-foreground mt-1">{p.hint}</span>
              ) : null}
            </label>
          ))}
        </div>

        <button type="submit" className="hidden" aria-hidden="true" tabIndex={-1} />
      </form>
    </LabModal>
  );
};

export default ManualMeasurementModal;
