import React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { Button } from "@/components/ui";
import { labApi, labError, labKeys } from "../api";
import { fmtNumber } from "../format";
import {
  cenizasBaseSeca,
  cuerpoManual,
  erroresManual,
  etiquetaManual,
  formularioInicial,
  hayAlgo,
  humedadEstufa,
  humedadParaCenizas,
  type CapsulaForm,
  type ManualForm,
} from "../manual";
import { MANUAL_PARAMS, erroresDeCampos, localToIso, toDateTimeLocal } from "../samples";
import type { SampleMeasurementDto } from "../types";
import { LabModal } from "./LabModal";

/**
 * Análisis hecho con equipos sin conexión, con el esquema de la planilla del
 * laboratorio: humedad en estufa y cenizas en mufla por cápsula (el resultado
 * se calcula mientras se tipea), termobalanza, colorímetro y PMG.
 *
 * Una muestra tiene UN análisis manual: si ya hay uno, se abre ese para
 * completarlo o corregirlo. Se puede guardar a medio cargar (los pesos de la
 * balanza primero, el final al salir de la estufa o la mufla) y los números
 * quedan como se tipean, con todos sus decimales.
 */

const CLASE_CONTROL =
  "w-full h-9 px-2.5 text-[13px] border border-border rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-primary";
const CLASE_NUMERO = `${CLASE_CONTROL} text-right tabular-nums`;

const SUELTOS = MANUAL_PARAMS.filter((p) => p.kind === "valor").map((p) => p.code);
const COLORES = ["Color L", "Color a", "Color b"];

const estadoHttp = (e: unknown): number | undefined =>
  (e as { response?: { status?: number } })?.response?.status;

export const ManualMeasurementModal: React.FC<{
  sampleId: string;
  accession: string;
  /** El análisis manual de la muestra, si ya hay uno: se abre para completarlo o corregirlo. */
  editing?: SampleMeasurementDto | null;
  onClose: () => void;
}> = ({ sampleId, accession, editing, onClose }) => {
  const qc = useQueryClient();
  const esEdicion = Boolean(editing);
  const [analyzedAt, setAnalyzedAt] = React.useState(
    toDateTimeLocal(editing ? new Date(editing.analyzedAt) : new Date()),
  );
  const [inicial] = React.useState(() => formularioInicial(editing));
  const [form, setForm] = React.useState<ManualForm>(inicial);
  const [errores, setErrores] = React.useState<Record<string, string>>({});

  // Lo que pedía el formulario anterior a las cápsulas y este ya no: aparece
  // solo si el análisis lo tiene, para poder corregirlo o borrarlo sin perderlo.
  const anteriores = MANUAL_PARAMS.filter((p) => p.kind !== "valor" && inicial.values[p.code] !== undefined).map(
    (p) => p.code,
  );
  const codigos = [...SUELTOS, ...anteriores];

  const humedad = humedadEstufa(form.humedad);
  const humedadCenizas = humedadParaCenizas(form.humedad, form.cenizas);
  const cenizas = cenizasBaseSeca(form.cenizas, humedadCenizas);

  const mutation = useMutation({
    mutationFn: async () => {
      const iso = localToIso(analyzedAt);
      if (!iso) throw new Error("La fecha del análisis no es válida");
      const locales = erroresManual(form, codigos);
      if (Object.keys(locales).length > 0) {
        setErrores(locales);
        throw new Error("Revisá los valores marcados");
      }
      if (!hayAlgo(form, codigos)) throw new Error("Cargá al menos un valor");
      const body = cuerpoManual(form, codigos, iso);
      return esEdicion
        ? labApi.samples.manual.update(editing!.id, body)
        : labApi.samples.manual.create(sampleId, body);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: labKeys.sample(accession) });
      void qc.invalidateQueries({ queryKey: labKeys.samplesAll });
      toast.success(esEdicion ? "Análisis manual guardado" : "Análisis cargado");
      onClose();
    },
    onError: (e) => {
      toast.error(labError(e));
      // Otra persona lo cargó mientras tanto: al volver a abrir, se abre el suyo.
      if (estadoHttp(e) === 409) {
        void qc.invalidateQueries({ queryKey: labKeys.sample(accession) });
        onClose();
        return;
      }
      const porCampo = erroresDeCampos(e);
      if (Object.keys(porCampo).length > 0) setErrores(porCampo);
    },
  });

  const limpiar = (clave: string) => setErrores((e) => (e[clave] ? { ...e, [clave]: "" } : e));
  const setValor = (code: string, v: string) => {
    setForm((f) => ({ ...f, values: { ...f.values, [code]: v } }));
    limpiar(`values.${code}`);
  };
  const setCampo = (bloque: "humedad" | "cenizas", campo: string, v: string) => {
    setForm((f) => ({ ...f, [bloque]: { ...f[bloque], [campo]: v } }));
    limpiar(`${bloque}.${campo}`);
  };

  const campoSuelto = (code: string, extra?: { hint?: string }) => {
    const def = MANUAL_PARAMS.find((p) => p.code === code);
    return (
      <Campo
        key={code}
        etiqueta={etiquetaCorta(code)}
        unidad={def?.unit}
        valor={form.values[code] ?? ""}
        onChange={(v) => setValor(code, v)}
        error={errores[`values.${code}`]}
        hint={extra?.hint ?? def?.hint}
      />
    );
  };

  return (
    <LabModal
      wide
      onClose={onClose}
      title={
        <span>
          Análisis manual{" "}
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
          {editing ? (
            <>
              Este análisis ya está cargado{editing.createdBy ? ` (lo cargó ${editing.createdBy.name})` : ""}:
              completá o corregí lo que haga falta.{" "}
            </>
          ) : null}
          Los números quedan como se tipean, con todos sus decimales. Se puede guardar a medio cargar: los pesos de
          la balanza ahora y el final cuando sale de la estufa o la mufla. Lo que quede vacío no cuenta como cero.
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

        <Seccion titulo="Humedad">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">{campoSuelto("Humedad termobalanza")}</div>
          <Capsula
            titulo="Estufa"
            datos={form.humedad}
            final="Cápsula + muestra seca"
            onChange={(campo, v) => setCampo("humedad", campo, v)}
            errores={errores}
            prefijo="humedad"
          />
          <Resultado
            etiqueta="Humedad (estufa)"
            valor={humedad !== null ? `${fmtNumber(humedad, 2)} %` : null}
            pendiente={pendiente(form.humedad, "Falta el peso final, al salir de la estufa")}
          />
        </Seccion>

        <Seccion titulo="Cenizas (mufla)">
          <Capsula
            titulo="Mufla"
            datos={form.cenizas}
            final="Cápsula + cenizas"
            onChange={(campo, v) => setCampo("cenizas", campo, v)}
            errores={errores}
            prefijo="cenizas"
          />
          {humedad !== null ? (
            <p className="text-[11.5px] text-muted-foreground">
              Base seca con la humedad de la estufa: {fmtNumber(humedad, 2)} %.
            </p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Campo
                etiqueta="Humedad para la base seca"
                unidad="%"
                valor={form.cenizas.humedad}
                onChange={(v) => setCampo("cenizas", "humedad", v)}
                error={errores["cenizas.humedad"]}
                hint="Si no se hizo la estufa"
                ancho
              />
            </div>
          )}
          <Resultado
            etiqueta="Cenizas (base seca)"
            valor={cenizas !== null ? `${fmtNumber(cenizas, 3)} %` : null}
            pendiente={
              pendiente(form.cenizas, "Falta el peso final, al salir de la mufla") ??
              (humedadCenizas === null && completa(form.cenizas) ? "Falta la humedad para la base seca" : null)
            }
          />
        </Seccion>

        <Seccion titulo="Colorímetro">
          <div className="grid grid-cols-3 gap-3">{COLORES.map((code) => campoSuelto(code))}</div>
        </Seccion>

        <Seccion titulo="Peso de mil granos">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">{campoSuelto("Peso de mil granos")}</div>
        </Seccion>

        {anteriores.length > 0 && (
          <Seccion titulo="Cargado con el formulario anterior">
            <p className="text-[11.5px] text-muted-foreground">
              Antes no había lugar para las cápsulas. Si estos números ya están arriba, se pueden borrar; un
              resultado de cenizas tipeado acá se reemplaza por la cuenta al completar la cápsula.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {anteriores.map((code) => (
                <Campo
                  key={code}
                  etiqueta={etiquetaManual(code)}
                  unidad={MANUAL_PARAMS.find((p) => p.code === code)?.unit}
                  valor={form.values[code] ?? ""}
                  onChange={(v) => setValor(code, v)}
                  error={errores[`values.${code}`]}
                />
              ))}
            </div>
          </Seccion>
        )}

        <button type="submit" className="hidden" aria-hidden="true" tabIndex={-1} />
      </form>
    </LabModal>
  );
};

/** En el formulario, el bloque ya dice qué es: "Termobalanza" en vez de "Humedad (termobalanza)". */
const etiquetaCorta = (code: string): string =>
  ({ "Humedad termobalanza": "Termobalanza", "Peso de mil granos": "PMG" })[code] ?? etiquetaManual(code);

const completa = (c: CapsulaForm) => c.vacia.trim() !== "" && c.muestra.trim() !== "" && c.final.trim() !== "";

/** Por qué todavía no hay resultado, si se empezó la cápsula. */
const pendiente = (c: CapsulaForm, sinFinal: string): string | null => {
  const empezada = [c.capsula, c.vacia, c.muestra, c.final].some((v) => v.trim() !== "");
  if (!empezada) return null;
  if (c.vacia.trim() === "" || c.muestra.trim() === "") return "Faltan el peso de la cápsula vacía y los gramos de muestra";
  if (c.final.trim() === "") return sinFinal;
  return null;
};

const Seccion: React.FC<{ titulo: string; children: React.ReactNode }> = ({ titulo, children }) => (
  <fieldset className="rounded-md border border-border px-3 pt-2 pb-3 space-y-3">
    <legend className="px-1 text-[12px] font-medium">{titulo}</legend>
    {children}
  </fieldset>
);

const Campo: React.FC<{
  etiqueta: string;
  unidad?: string;
  valor: string;
  onChange: (v: string) => void;
  error?: string;
  hint?: string;
  /** Texto en vez de número (el rótulo de la cápsula). */
  texto?: boolean;
  /** Ocupa dos columnas de la grilla: para un rótulo largo. */
  ancho?: boolean;
}> = ({ etiqueta, unidad, valor, onChange, error, hint, texto = false, ancho = false }) => (
  <label className={`block min-w-0 ${ancho ? "col-span-2" : ""}`}>
    <span className="block text-[11.5px] text-muted-foreground mb-1 truncate">
      {etiqueta}
      {unidad && <span className="ml-1 text-muted-foreground/70">({unidad})</span>}
    </span>
    <input
      type="text"
      inputMode={texto ? "text" : "decimal"}
      autoComplete="off"
      className={texto ? CLASE_CONTROL : CLASE_NUMERO}
      value={valor}
      placeholder={texto ? undefined : "—"}
      onChange={(e) => onChange(e.target.value)}
      aria-invalid={error ? true : undefined}
    />
    {error ? (
      <span className="block text-[11.5px] text-red-600 dark:text-red-400 mt-1">{error}</span>
    ) : hint ? (
      <span className="block text-[11px] text-muted-foreground mt-1">{hint}</span>
    ) : null}
  </label>
);

/** Una determinación por cápsula, con las columnas de la planilla. */
const Capsula: React.FC<{
  titulo: string;
  datos: CapsulaForm;
  /** Rótulo del peso al salir del horno. */
  final: string;
  onChange: (campo: keyof CapsulaForm, v: string) => void;
  errores: Record<string, string>;
  prefijo: "humedad" | "cenizas";
}> = ({ titulo, datos, final, onChange, errores, prefijo }) => (
  <div>
    <p className="text-[11.5px] font-medium text-muted-foreground mb-1.5">{titulo} · por cápsula</p>
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <Campo
        etiqueta="Cápsula"
        texto
        valor={datos.capsula}
        onChange={(v) => onChange("capsula", v)}
        error={errores[`${prefijo}.capsula`]}
        hint="Número o letra"
      />
      <Campo
        etiqueta="Cápsula vacía"
        unidad="g"
        valor={datos.vacia}
        onChange={(v) => onChange("vacia", v)}
        error={errores[`${prefijo}.vacia`]}
      />
      <Campo
        etiqueta="Muestra"
        unidad="g"
        valor={datos.muestra}
        onChange={(v) => onChange("muestra", v)}
        error={errores[`${prefijo}.muestra`]}
        hint="Gramos pesados"
      />
      <Campo
        etiqueta={final}
        unidad="g"
        valor={datos.final}
        onChange={(v) => onChange("final", v)}
        error={errores[`${prefijo}.final`]}
      />
    </div>
  </div>
);

const Resultado: React.FC<{ etiqueta: string; valor: string | null; pendiente: string | null }> = ({
  etiqueta,
  valor,
  pendiente,
}) => (
  <div
    className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 rounded-md bg-muted/30 px-3 py-2"
    aria-live="polite"
  >
    <span className="text-[12px] text-muted-foreground">{etiqueta}</span>
    {valor !== null ? (
      <span className="text-[15px] font-semibold tabular-nums">{valor}</span>
    ) : (
      <span className="text-[12px] text-muted-foreground">{pendiente ?? "Se calcula con los tres pesos"}</span>
    )}
  </div>
);

export default ManualMeasurementModal;
