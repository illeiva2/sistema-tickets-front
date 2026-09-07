import React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Copy, Plus } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui";
import { labApi, labError, labKeys } from "../api";
import {
  SITES,
  SITE_LABEL,
  copiarAlPortapapeles,
  erroresDeCampos,
  indiceTurno,
  localToIso,
  opcionesDe,
  toDateTimeLocal,
} from "../samples";
import type { LabSite, SampleDto, SampleFieldDefDto, SampleKindDto } from "../types";
import { LabModal } from "./LabModal";

/**
 * Alta y edición de una muestra.
 *
 * El formulario es DINÁMICO: los campos salen de `kind.fields`, que define el
 * laboratorio desde el catálogo. Acá no hay ningún campo hardcodeado más que
 * los intrínsecos de toda muestra (laboratorio, fecha/hora de la toma, notas).
 *
 * Se monta recién al abrirse y se desmonta al cerrar, así el estado nace
 * limpio en cada alta sin efectos de "reset".
 */

const CLASE_CONTROL =
  "w-full h-9 px-2.5 text-[13px] border border-border rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-60 disabled:cursor-not-allowed";

const Campo: React.FC<{
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
  className?: string;
  children: React.ReactNode;
}> = ({ label, required, error, hint, className = "", children }) => (
  <label className={`block ${className}`}>
    <span className="block text-[11.5px] text-muted-foreground mb-1">
      {label}
      {required && <span className="text-red-500 ml-0.5">*</span>}
    </span>
    {children}
    {error ? (
      <span className="block text-[11.5px] text-red-600 dark:text-red-400 mt-1">{error}</span>
    ) : hint ? (
      <span className="block text-[11px] text-muted-foreground mt-1">{hint}</span>
    ) : null}
  </label>
);

/** Valores guardados (string | number) a strings para los inputs. Las fechas ISO pasan a datetime-local. */
const aStrings = (
  fields: Record<string, string | number | boolean> | undefined,
  defs: SampleFieldDefDto[],
): Record<string, string> => {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(fields ?? {})) {
    if (v === null || v === undefined) continue;
    if (typeof v === "boolean") {
      out[k] = v ? "true" : "";
      continue;
    }
    const def = defs.find((d) => d.key === k);
    if (def?.type === "DATETIME") {
      const d = new Date(String(v));
      out[k] = Number.isNaN(d.getTime()) ? "" : toDateTimeLocal(d);
    } else {
      out[k] = String(v);
    }
  }
  return out;
};

export const SampleFormModal: React.FC<{
  kinds: SampleKindDto[];
  /** Muestra a editar. Ausente = alta. */
  editing?: SampleDto | null;
  onClose: () => void;
}> = ({ kinds, editing, onClose }) => {
  const qc = useQueryClient();
  const esEdicion = Boolean(editing);

  const [kindId, setKindId] = React.useState(editing?.kindId ?? kinds[0]?.id ?? "");
  const kind = kinds.find((k) => k.id === kindId);
  const [site, setSite] = React.useState<LabSite>(editing?.site ?? kind?.defaultSite ?? "MOLINO");
  const [sampledAt, setSampledAt] = React.useState(
    toDateTimeLocal(editing ? new Date(editing.sampledAt) : new Date()),
  );
  const [values, setValues] = React.useState<Record<string, string>>(() =>
    aStrings(editing?.fields, kind?.fields ?? []),
  );
  const [notes, setNotes] = React.useState(editing?.notes ?? "");
  const [errores, setErrores] = React.useState<Record<string, string>>({});
  // En edición el turno ya está cargado: no se pisa con el derivado de la hora.
  const [turnoTocado, setTurnoTocado] = React.useState(esEdicion);
  const [creada, setCreada] = React.useState<SampleDto | null>(null);

  const cambiarKind = (id: string) => {
    setKindId(id);
    const k = kinds.find((x) => x.id === id);
    if (k?.defaultSite) setSite(k.defaultSite);
    setValues({});
    setErrores({});
    setTurnoTocado(false);
  };

  // El turno del molino se deriva de la hora de la toma. Solo propone: apenas
  // el operario lo toca, se respeta lo que eligió.
  const turnoDef = kind?.fields.find((f) => f.key === "turno" && f.type === "SELECT");
  React.useEffect(() => {
    if (!turnoDef || turnoTocado) return;
    const ops = opcionesDe(turnoDef);
    if (ops.length < 3) return;
    const h = new Date(sampledAt).getHours();
    if (Number.isNaN(h)) return;
    const propuesto = ops[indiceTurno(h)];
    setValues((v) => (v.turno === propuesto ? v : { ...v, turno: propuesto }));
  }, [sampledAt, turnoDef, turnoTocado]);

  const setValor = (def: SampleFieldDefDto, valor: string) => {
    if (def.key === "turno") setTurnoTocado(true);
    setValues((v) => ({ ...v, [def.key]: valor }));
    if (errores[def.key]) setErrores((e) => ({ ...e, [def.key]: "" }));
  };

  const mutation = useMutation({
    mutationFn: async () => {
      const iso = localToIso(sampledAt);
      if (!iso) throw new Error("La fecha de toma no es válida");

      // Las fechas de los campos DATETIME también van con zona: el backend corre
      // en UTC y un "2026-09-07T10:30" pelado lo leería tres horas corrido.
      const fields: Record<string, unknown> = {};
      for (const def of kind?.fields ?? []) {
        const v = values[def.key];
        if (v === undefined || v === "") continue;
        // Una casilla viaja como true solo si está marcada; sin marcar no viaja.
        if (def.type === "BOOLEAN") {
          if (v === "true") fields[def.key] = true;
          continue;
        }
        fields[def.key] = def.type === "DATETIME" ? localToIso(v) ?? v : v;
      }

      const comun = { sampledAt: iso, fields, notes: notes.trim() || null };
      return esEdicion
        ? labApi.samples.update(editing!.id, comun)
        : labApi.samples.create({ kindId, site, ...comun });
    },
    onSuccess: (s) => {
      void qc.invalidateQueries({ queryKey: labKeys.samplesAll });
      if (esEdicion) {
        toast.success("Muestra actualizada");
        onClose();
      } else {
        setCreada(s);
      }
    },
    onError: (e) => {
      const porCampo = erroresDeCampos(e);
      setErrores(porCampo);
      toast.error(Object.keys(porCampo).length > 0 ? "Revisá los campos marcados" : labError(e));
    },
  });

  const registrarOtra = () => {
    setCreada(null);
    setValues({});
    setErrores({});
    setNotes("");
    setSampledAt(toDateTimeLocal(new Date()));
    setTurnoTocado(false);
  };

  const copiar = async (texto: string) => {
    (await copiarAlPortapapeles(texto))
      ? toast.success("Accesión copiada")
      : toast.error("No se pudo copiar; anotala a mano");
  };

  // ─── Confirmación del alta: la accesión, grande, para tipearla en el equipo ──
  if (creada) {
    return (
      <LabModal onClose={onClose} title="Muestra registrada">
        <div className="text-center space-y-4 py-2">
          <p className="text-sm text-muted-foreground">
            Tipeá esta accesión como código de muestra en el equipo:
          </p>
          <div className="font-mono text-4xl sm:text-5xl font-bold tracking-wider tabular-nums select-all">
            {creada.accession}
          </div>
          <p className="text-sm font-medium">{creada.displayName}</p>
          {creada.conditions && creada.conditions.length > 0 && (
            <div className="mx-auto max-w-md flex items-start gap-2 rounded-md border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 px-3 py-2 text-left text-[13px] text-amber-900 dark:text-amber-200">
              <AlertTriangle size={15} className="mt-0.5 shrink-0 text-amber-600" />
              <span>
                <strong>Muestra con alteración:</strong> {creada.conditions.join(" · ")}
              </span>
            </div>
          )}
          <div className="flex flex-wrap justify-center gap-2 pt-1">
            <Button size="sm" onClick={() => void copiar(creada.accession)}>
              <Copy size={13} className="mr-1.5" />
              Copiar accesión
            </Button>
            <Button size="sm" variant="outline" onClick={registrarOtra}>
              <Plus size={13} className="mr-1.5" />
              Registrar otra
            </Button>
            <Button size="sm" variant="ghost" onClick={onClose}>
              Cerrar
            </Button>
          </div>
        </div>
      </LabModal>
    );
  }

  // ─── Formulario ────────────────────────────────────────────────────────────
  const casillas = (kind?.fields ?? []).filter((def) => def.type === "BOOLEAN");

  const renderInput = (def: SampleFieldDefDto) => {
    const v = values[def.key] ?? "";
    switch (def.type) {
      case "SELECT":
        return (
          <select className={CLASE_CONTROL} value={v} onChange={(e) => setValor(def, e.target.value)}>
            <option value="">{def.placeholder ?? "Elegí…"}</option>
            {opcionesDe(def).map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        );
      case "NUMBER":
        return (
          <input
            type="text"
            inputMode="decimal"
            className={CLASE_CONTROL}
            placeholder={def.placeholder ?? ""}
            value={v}
            onChange={(e) => setValor(def, e.target.value)}
          />
        );
      case "DATETIME":
        return (
          <input
            type="datetime-local"
            className={CLASE_CONTROL}
            value={v}
            onChange={(e) => setValor(def, e.target.value)}
          />
        );
      default:
        return (
          <input
            type="text"
            className={CLASE_CONTROL}
            placeholder={def.placeholder ?? ""}
            value={v}
            maxLength={200}
            onChange={(e) => setValor(def, e.target.value)}
          />
        );
    }
  };

  return (
    <LabModal
      onClose={onClose}
      title={esEdicion ? `Editar ${editing!.accession}` : "Nueva muestra"}
      footer={
        <>
          <Button size="sm" variant="ghost" onClick={onClose} disabled={mutation.isPending}>
            Cancelar
          </Button>
          <Button
            size="sm"
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending || !kind}
          >
            {mutation.isPending ? "Guardando…" : esEdicion ? "Guardar cambios" : "Registrar muestra"}
          </Button>
        </>
      }
    >
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (!mutation.isPending && kind) mutation.mutate();
        }}
      >
        {!esEdicion && kinds.length > 1 && (
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Tipo de muestra">
            {kinds.map((k) => (
              <button
                key={k.id}
                type="button"
                role="radio"
                aria-checked={k.id === kindId}
                onClick={() => cambiarKind(k.id)}
                className={`px-3 py-1.5 rounded-md border text-[12.5px] transition-colors ${
                  k.id === kindId
                    ? "border-primary bg-primary/10 font-medium"
                    : "border-border hover:bg-muted/50 text-muted-foreground"
                }`}
              >
                {k.name}
              </button>
            ))}
          </div>
        )}
        {kind?.description && (
          <p className="text-[11.5px] text-muted-foreground">{kind.description}</p>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Campo
            label="Laboratorio"
            required
            error={errores.site}
            hint={esEdicion ? "Define el prefijo de la accesión; no se cambia." : undefined}
          >
            <select
              className={CLASE_CONTROL}
              value={site}
              disabled={esEdicion}
              onChange={(e) => setSite(e.target.value as LabSite)}
            >
              {SITES.map((s) => (
                <option key={s} value={s}>
                  {SITE_LABEL[s]}
                </option>
              ))}
            </select>
          </Campo>

          <Campo label="Fecha y hora de la toma" required error={errores.sampledAt}>
            <input
              type="datetime-local"
              className={CLASE_CONTROL}
              value={sampledAt}
              onChange={(e) => setSampledAt(e.target.value)}
            />
          </Campo>

          {kind?.fields
            .filter((def) => def.type !== "BOOLEAN")
            .map((def) => (
              <Campo key={def.id} label={def.label} required={def.required} error={errores[def.key]}>
                {renderInput(def)}
              </Campo>
            ))}

          {/* Las casillas van juntas: son la revisión visual de la muestra y se
              marcan de corrido. Un triángulo señala las que cuentan como alteración. */}
          {casillas.length > 0 && (
            <fieldset className="sm:col-span-2 rounded-md border border-border px-3 pt-2 pb-3">
              <legend className="px-1 text-[11.5px] text-muted-foreground">
                Marcá lo que se observa en la muestra
              </legend>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-2">
                {casillas.map((def) => (
                  <label
                    key={def.id}
                    className="flex items-center gap-2 text-[13px] cursor-pointer select-none min-h-[28px]"
                  >
                    <input
                      type="checkbox"
                      checked={values[def.key] === "true"}
                      onChange={(e) => setValor(def, e.target.checked ? "true" : "")}
                    />
                    <span>{def.label}</span>
                    {def.isCondition && (
                      <AlertTriangle
                        size={12}
                        className="text-amber-600/80 shrink-0"
                        aria-label="Cuenta como alteración de la muestra"
                      />
                    )}
                    {errores[def.key] && (
                      <span className="text-[11.5px] text-red-600 dark:text-red-400">{errores[def.key]}</span>
                    )}
                  </label>
                ))}
              </div>
            </fieldset>
          )}

          <Campo label="Notas" className="sm:col-span-2" error={errores.notes}>
            <textarea
              className={`${CLASE_CONTROL} h-auto py-2`}
              rows={2}
              maxLength={2000}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Observaciones de la toma (opcional)"
            />
          </Campo>
        </div>

        {/* Submit invisible para que Enter en un input envíe el formulario. */}
        <button type="submit" className="hidden" aria-hidden="true" tabIndex={-1} />
      </form>
    </LabModal>
  );
};

export default SampleFormModal;
