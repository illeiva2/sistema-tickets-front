import React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Copy, Plus, Printer } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui";
import { labApi, labError, labKeys } from "../api";
import {
  SITES,
  SITE_LABEL,
  copiarAlPortapapeles,
  erroresDeCampos,
  errorDeFormato,
  esVisible,
  indiceTurno,
  localToIso,
  opcionesDe,
  pctKey,
  toDateTimeLocal,
} from "../samples";
import type { LabSite, SampleDto, SampleFieldDefDto, SampleKindDto } from "../types";
import { imprimirEtiqueta } from "../etiqueta";
import { LabModal } from "./LabModal";
import { NoLigaBadge } from "./NoLigaBadge";

/**
 * Alta y edición de una muestra.
 *
 * El formulario es DINÁMICO: los campos salen de `kind.fields`, que define el
 * laboratorio desde el catálogo. Acá no hay ningún campo hardcodeado más que
 * los intrínsecos de toda muestra (laboratorio, fecha/hora de la toma, notas).
 *
 * Las reglas del catálogo también se aplican acá, espejando al backend:
 * - `visibleWhen`: un campo aparece solo si otro vale cierta opción (Lote solo
 *   en los embolses, Silo solo en trigo sucio). Lo que queda oculto se descarta.
 * - `pattern`: se avisa el formato al salir del campo, antes de enviar.
 * - `withPercent`: una casilla marcada pide su porcentaje al lado.
 * - `suggest`: el texto propone los valores ya cargados (empresas, localidades).
 * - `uppercase`: se escribe en mayúsculas (patentes, lotes).
 * - `lockSite` del tipo: el laboratorio no se elige.
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

/** Lista de valores ya cargados para un campo con sugerencias; el navegador la muestra al tipear. */
const Sugerencias: React.FC<{ id: string; fieldKey: string; kindId: string }> = ({ id, fieldKey, kindId }) => {
  const q = useQuery({
    queryKey: labKeys.samplesSuggest(fieldKey, kindId),
    queryFn: () => labApi.samples.suggest(fieldKey, kindId),
    staleTime: 5 * 60_000,
  });
  // "Empresa" trae además la lista del ERP: la etiqueta (CUIT · localidad)
  // distingue homónimas; el valor sigue siendo el nombre, que es lo que se guarda.
  const items: { value: string; label?: string }[] =
    q.data?.items ?? (q.data?.values ?? []).map((value) => ({ value }));
  return (
    <datalist id={id}>
      {items.map((i) => (
        <option key={i.value} value={i.value} label={i.label} />
      ))}
    </datalist>
  );
};

/** Una lista de dos opciones se muestra como dos botones: se ve todo de una y se elige con un clic. */
const Segmentos: React.FC<{ opciones: string[]; valor: string; onChange: (v: string) => void }> = ({
  opciones,
  valor,
  onChange,
}) => (
  <div className="flex flex-wrap gap-1.5" role="radiogroup">
    {opciones.map((o) => (
      <button
        key={o}
        type="button"
        role="radio"
        aria-checked={valor === o}
        onClick={() => onChange(valor === o ? "" : o)}
        className={`h-9 px-3.5 rounded-md border text-[13px] transition-colors ${
          valor === o
            ? "border-primary bg-primary/10 font-medium"
            : "border-border hover:bg-muted/50 text-muted-foreground"
        }`}
      >
        {o}
      </button>
    ))}
  </div>
);

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

  // Laboratorio fijo por tipo (las internas siempre son del molino): no se elige.
  const sitioFijo: LabSite | null = kind?.lockSite ? (kind.defaultSite ?? "MOLINO") : null;
  const sitioEfectivo: LabSite = esEdicion ? site : (sitioFijo ?? site);

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

  const defs = React.useMemo(() => kind?.fields ?? [], [kind]);
  const visibles = React.useMemo(() => defs.filter((d) => esVisible(d, values, defs)), [defs, values]);

  // Lo que quedó oculto al cambiar un controlador (el lote de un producto
  // anterior, el silo de una mezcla) se descarta: el backend lo ignoraría
  // igual, pero así no reaparece cargado si vuelven a la opción anterior.
  React.useEffect(() => {
    const claves = defs
      .filter((d) => !esVisible(d, values, defs))
      .flatMap((d) => [d.key, pctKey(d.key)])
      .filter((k) => values[k] !== undefined && values[k] !== "");
    if (claves.length === 0) return;
    setValues((v) => {
      const n = { ...v };
      for (const k of claves) delete n[k];
      return n;
    });
  }, [values, defs]);

  const setValor = (def: SampleFieldDefDto, valor: string) => {
    if (def.key === "turno") setTurnoTocado(true);
    const v = def.type === "TEXT" && def.uppercase ? valor.toUpperCase() : valor;
    setValues((prev) => ({ ...prev, [def.key]: v }));
    if (errores[def.key]) setErrores((e) => ({ ...e, [def.key]: "" }));
  };

  const setPct = (def: SampleFieldDefDto, valor: string) => {
    const k = pctKey(def.key);
    setValues((prev) => ({ ...prev, [k]: valor }));
    if (errores[k]) setErrores((e) => ({ ...e, [k]: "" }));
  };

  const mutation = useMutation({
    mutationFn: async () => {
      const iso = localToIso(sampledAt);
      if (!iso) throw new Error("La fecha de toma no es válida");

      // Formato de los textos con patrón, antes de viajar: el backend lo valida
      // igual, pero acá el aviso aparece pegado al campo y sin esperar.
      const locales: Record<string, string> = {};
      for (const def of visibles) {
        if (def.type !== "TEXT") continue;
        const err = errorDeFormato(def, (values[def.key] ?? "").trim());
        if (err) locales[def.key] = err;
      }
      if (Object.keys(locales).length > 0) {
        setErrores(locales);
        throw new Error("Revisá los campos marcados");
      }

      // Las fechas de los campos DATETIME también van con zona: el backend corre
      // en UTC y un "2026-09-07T10:30" pelado lo leería tres horas corrido.
      const fields: Record<string, unknown> = {};
      for (const def of visibles) {
        const v = values[def.key];
        if (v === undefined || v === "") continue;
        // Una casilla viaja como true solo si está marcada; sin marcar no viaja.
        if (def.type === "BOOLEAN") {
          if (v !== "true") continue;
          fields[def.key] = true;
          const p = values[pctKey(def.key)];
          if (def.withPercent && p !== undefined && p.trim() !== "") fields[pctKey(def.key)] = p.trim();
          continue;
        }
        fields[def.key] = def.type === "DATETIME" ? localToIso(v) ?? v : v;
      }

      const comun = { sampledAt: iso, fields, notes: notes.trim() || null };
      return esEdicion
        ? labApi.samples.update(editing!.id, comun)
        : labApi.samples.create({ kindId, site: sitioEfectivo, ...comun });
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
      if (Object.keys(porCampo).length > 0) setErrores(porCampo);
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

  const imprimir = (m: SampleDto) => {
    if (!imprimirEtiqueta(m)) {
      toast.error("El navegador bloqueó la ventana de impresión. Permití ventanas emergentes para este sitio.");
    }
  };

  // ─── Confirmación del alta: la accesión, grande, para tipearla en el equipo ──
  if (creada) {
    return (
      <LabModal onClose={onClose} title="Muestra registrada">
        <div className="text-center space-y-4 py-2">
          <p className="text-sm text-muted-foreground">
            Imprimí la etiqueta y pegala en la muestra: en cada equipo se escanea (o se tipea) esta
            accesión como código de muestra.
          </p>
          <div className="font-mono text-4xl sm:text-5xl font-bold tracking-wider tabular-nums select-all">
            {creada.accession}
          </div>
          <p className="text-sm font-medium">
            {creada.displayName}
            {creada.noLiga && <NoLigaBadge className="ml-2" />}
          </p>
          {creada.conditions && creada.conditions.length > 0 && (
            <div className="mx-auto max-w-md flex items-start gap-2 rounded-md border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 px-3 py-2 text-left text-[13px] text-amber-900 dark:text-amber-200">
              <AlertTriangle size={15} className="mt-0.5 shrink-0 text-amber-600" />
              <span>
                <strong>Muestra con alteración:</strong> {creada.conditions.join(" · ")}
              </span>
            </div>
          )}
          <div className="flex flex-wrap justify-center gap-2 pt-1">
            <Button size="sm" onClick={() => imprimir(creada)}>
              <Printer size={13} className="mr-1.5" />
              Imprimir etiqueta
            </Button>
            <Button size="sm" variant="outline" onClick={() => void copiar(creada.accession)}>
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
  const casillas = visibles.filter((def) => def.type === "BOOLEAN");
  const generales = visibles.filter((def) => def.type !== "BOOLEAN");

  const renderInput = (def: SampleFieldDefDto) => {
    const v = values[def.key] ?? "";
    switch (def.type) {
      case "SELECT": {
        const ops = opcionesDe(def);
        if (ops.length > 0 && ops.length <= 2) {
          return <Segmentos opciones={ops} valor={v} onChange={(o) => setValor(def, o)} />;
        }
        return (
          <select className={CLASE_CONTROL} value={v} onChange={(e) => setValor(def, e.target.value)}>
            <option value="">{def.placeholder ?? "Elegí…"}</option>
            {ops.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        );
      }
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
      default: {
        const listaId = def.suggest ? `sug-${kindId}-${def.key}` : undefined;
        return (
          <>
            <input
              type="text"
              className={`${CLASE_CONTROL} ${def.uppercase ? "uppercase" : ""}`}
              placeholder={def.placeholder ?? ""}
              value={v}
              maxLength={200}
              list={listaId}
              autoComplete="off"
              onChange={(e) => setValor(def, e.target.value)}
              onBlur={() => {
                const err = errorDeFormato(def, v.trim());
                if (err) setErrores((e) => ({ ...e, [def.key]: err }));
              }}
            />
            {listaId && <Sugerencias id={listaId} fieldKey={def.key} kindId={kindId} />}
          </>
        );
      }
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
          {sitioFijo && !esEdicion ? (
            <Campo
              label="Laboratorio"
              hint={`Fijo para este tipo de muestra: la accesión será ${sitioFijo === "MOLINO" ? "M" : "A"}-…`}
            >
              <input className={CLASE_CONTROL} value={SITE_LABEL[sitioFijo]} disabled readOnly />
            </Campo>
          ) : (
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
          )}

          <Campo label="Fecha y hora de la toma" required error={errores.sampledAt}>
            <input
              type="datetime-local"
              className={CLASE_CONTROL}
              value={sampledAt}
              onChange={(e) => setSampledAt(e.target.value)}
            />
          </Campo>

          {generales.map((def) => (
            <Campo
              key={def.id}
              label={def.label}
              required={def.required}
              error={errores[def.key]}
              hint={!errores[def.key] && def.pattern && def.patternHint ? def.patternHint : undefined}
            >
              {renderInput(def)}
            </Campo>
          ))}

          {/* Las casillas van juntas: son la revisión visual de la muestra y se
              marcan de corrido. Un triángulo señala las que cuentan como
              alteración; las que llevan porcentaje lo piden al marcarse. */}
          {casillas.length > 0 && (
            <fieldset className="sm:col-span-2 rounded-md border border-border px-3 pt-2 pb-3">
              <legend className="px-1 text-[11.5px] text-muted-foreground">
                Marcá lo que se observa en la muestra
              </legend>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-2">
                {casillas.map((def) => {
                  const marcada = values[def.key] === "true";
                  const pk = pctKey(def.key);
                  return (
                    <div key={def.id} className="flex items-center gap-2 min-h-[28px] flex-wrap">
                      <label className="flex items-center gap-2 text-[13px] cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={marcada}
                          onChange={(e) => {
                            setValor(def, e.target.checked ? "true" : "");
                            if (!e.target.checked) setPct(def, "");
                          }}
                        />
                        <span>{def.label}</span>
                        {def.isCondition && (
                          <AlertTriangle
                            size={12}
                            className="text-amber-600/80 shrink-0"
                            aria-label="Cuenta como alteración de la muestra"
                          />
                        )}
                      </label>
                      {def.withPercent && marcada && (
                        <span className="inline-flex items-center gap-1 text-[12px] text-muted-foreground">
                          <input
                            type="text"
                            inputMode="decimal"
                            className="h-7 w-16 px-2 text-[12.5px] border border-border rounded-md bg-background text-right focus:outline-none focus:ring-1 focus:ring-primary"
                            placeholder="%"
                            value={values[pk] ?? ""}
                            onChange={(e) => setPct(def, e.target.value)}
                            aria-label={`Porcentaje de ${def.label}`}
                          />
                          %
                        </span>
                      )}
                      {(errores[def.key] || errores[pk]) && (
                        <span className="text-[11.5px] text-red-600 dark:text-red-400 basis-full">
                          {errores[def.key] || errores[pk]}
                        </span>
                      )}
                    </div>
                  );
                })}
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
