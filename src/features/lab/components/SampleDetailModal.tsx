import React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Ban, Copy, FlaskConical, Pencil, Printer, Trash2, Undo2 } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui";
import { labApi, labError, labKeys } from "../api";
import { fmtDateTime, fmtNumber } from "../format";
import {
  SITE_LABEL,
  SOURCE_LABEL,
  SOURCE_ORDER,
  copiarAlPortapapeles,
  decimalesParam,
  etiquetaParam,
  ordenarParams,
} from "../samples";
import type { LabSource, SampleDetailDto, SampleDto, SampleKindDto, SampleMeasurementDto } from "../types";
import { LabModal } from "./LabModal";
import { LabTableSkeleton } from "./Loading";
import { ManualMeasurementModal } from "./ManualMeasurementModal";
import { NoLigaBadge } from "./NoLigaBadge";
import { RechazadoBadge } from "./RechazadoBadge";
import { RejectSampleModal } from "./RejectSampleModal";
import { imprimirEtiqueta } from "../etiqueta";

/**
 * Ficha de una muestra: metadata + TODOS sus análisis enlazados, por equipo.
 *
 * Se consulta por accesión (no se reusa la fila de la lista) porque la ficha
 * trae las mediciones, y se refresca sola mientras está abierta: el operario
 * registra, tipea la accesión en el equipo y ve aparecer el resultado acá sin
 * cerrar y volver a abrir.
 *
 * Los análisis de equipos sin conexión (termobalanza, estufa, colorímetro,
 * PMG) se cargan desde acá con "Análisis manual": quedan como una medición
 * más, con quién la cargó, y solo esas se corrigen o borran.
 */

const REFRESCO_MS = 30_000;

export const SampleDetailModal: React.FC<{
  accession: string;
  kinds: SampleKindDto[];
  canEdit: boolean;
  onEdit: (s: SampleDto) => void;
  onClose: () => void;
}> = ({ accession, kinds, canEdit, onEdit, onClose }) => {
  const { data, isPending, error, isFetching } = useQuery({
    queryKey: labKeys.sample(accession),
    queryFn: () => labApi.samples.get(accession),
    refetchInterval: REFRESCO_MS,
  });

  // null = cerrado; editing null = alta; editing con medición = corrección.
  const [manual, setManual] = React.useState<{ editing: SampleMeasurementDto | null } | null>(null);
  const [rechazar, setRechazar] = React.useState(false);

  // Con un formulario anidado abierto (análisis manual, rechazo), Escape y el
  // clic afuera cierran ese formulario, no la ficha entera.
  const cerrar = React.useCallback(() => {
    if (manual || rechazar) return;
    onClose();
  }, [manual, rechazar, onClose]);

  const qc = useQueryClient();
  const quitarRechazo = useMutation({
    mutationFn: (id: string) => labApi.samples.unreject(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: labKeys.samplesAll });
      toast.success("Rechazo quitado");
    },
    onError: (e) => toast.error(labError(e)),
  });

  const copiar = async () => {
    (await copiarAlPortapapeles(accession))
      ? toast.success("Accesión copiada")
      : toast.error("No se pudo copiar");
  };

  return (
    <LabModal
      wide
      onClose={cerrar}
      title={
        <span className="flex items-center gap-2 flex-wrap">
          <span className="font-mono tracking-wider">{accession}</span>
          {data?.conditions && data.conditions.length > 0 && (
            <AlertTriangle
              size={15}
              className="text-amber-600 shrink-0"
              aria-label="Muestra con alteración"
            />
          )}
          {data?.noLiga && <NoLigaBadge />}
          {data?.rejectedAt && <RechazadoBadge reason={data.rejectedReason} />}
          <button
            type="button"
            onClick={() => void copiar()}
            className="text-muted-foreground hover:text-foreground"
            aria-label="Copiar accesión"
            title="Copiar accesión"
          >
            <Copy size={14} />
          </button>
          {isFetching && !isPending && (
            <span className="text-[11px] text-muted-foreground font-normal">actualizando…</span>
          )}
        </span>
      }
      footer={
        <>
          {data && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                if (!imprimirEtiqueta(data)) {
                  toast.error("El navegador bloqueó la ventana de impresión. Permití ventanas emergentes para este sitio.");
                }
              }}
            >
              <Printer size={13} className="mr-1.5" />
              Imprimir etiqueta
            </Button>
          )}
          {canEdit && data && (
            <Button size="sm" variant="outline" onClick={() => setManual({ editing: null })}>
              <FlaskConical size={13} className="mr-1.5" />
              Análisis manual
            </Button>
          )}
          {canEdit && data && (
            <Button size="sm" variant="outline" onClick={() => onEdit(data)}>
              <Pencil size={13} className="mr-1.5" />
              Editar ficha
            </Button>
          )}
          {/* El rechazo es del camión: solo en recepciones. Marcar pide la nota; quitar, confirmar. */}
          {canEdit && data && data.kind.code === "RECEPCION" && !data.rejectedAt && (
            <Button
              size="sm"
              variant="outline"
              className="text-red-700 dark:text-red-300"
              onClick={() => setRechazar(true)}
            >
              <Ban size={13} className="mr-1.5" />
              Rechazar camión
            </Button>
          )}
          {canEdit && data && data.rejectedAt && (
            <Button
              size="sm"
              variant="outline"
              disabled={quitarRechazo.isPending}
              onClick={() => {
                if (window.confirm("¿Quitar el rechazo? La muestra vuelve a quedar como no rechazada.")) {
                  quitarRechazo.mutate(data.id);
                }
              }}
            >
              <Undo2 size={13} className="mr-1.5" />
              Quitar rechazo
            </Button>
          )}
          <Button size="sm" variant="ghost" onClick={onClose}>
            Cerrar
          </Button>
        </>
      }
    >
      {isPending && <LabTableSkeleton rows={5} cols={4} />}

      {error && (
        <div className="rounded-md border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/30 p-3 text-sm">
          <p className="font-medium text-red-800 dark:text-red-200">No se pudo cargar la ficha</p>
          <p className="text-red-700 dark:text-red-300 font-mono text-xs mt-1">{labError(error)}</p>
        </div>
      )}

      {data && (
        <Ficha
          sample={data}
          kinds={kinds}
          acciones={canEdit ? { onEditarManual: (m) => setManual({ editing: m }) } : undefined}
        />
      )}

      {manual && data && (
        <ManualMeasurementModal
          sampleId={data.id}
          accession={data.accession}
          editing={manual.editing}
          onClose={() => setManual(null)}
        />
      )}

      {rechazar && data && <RejectSampleModal sample={data} onClose={() => setRechazar(false)} />}
    </LabModal>
  );
};

/** Lo que puede hacer quien tiene QC sobre los análisis manuales de la muestra. */
export interface AccionesManual {
  onEditarManual: (m: SampleMeasurementDto) => void;
}

const Ficha: React.FC<{ sample: SampleDetailDto; kinds: SampleKindDto[]; acciones?: AccionesManual }> = ({
  sample,
  kinds,
  acciones,
}) => {
  const kind = kinds.find((k) => k.id === sample.kindId);
  const defs = kind?.fields ?? [];

  // Primero los campos del catálogo en su orden; después cualquier valor cuyo
  // campo ya no exista, para no esconder lo que alguien cargó.
  const filas: { label: string; valor: string }[] = [];
  const usados = new Set<string>();
  for (const def of defs) {
    const v = sample.fields[def.key];
    usados.add(def.key);
    if (v === undefined || v === null || v === "" || v === false) continue;
    filas.push({
      label: def.label,
      valor: v === true ? "Sí" : def.type === "DATETIME" ? fmtDateTime(String(v)) : String(v),
    });
  }
  for (const [k, v] of Object.entries(sample.fields)) {
    if (usados.has(k) || v === undefined || v === null || v === "" || v === false) continue;
    filas.push({ label: k, valor: v === true ? "Sí" : String(v) });
  }
  const alteraciones = sample.conditions ?? [];

  return (
    <div className="space-y-5">
      <div>
        <p className="text-base font-medium">{sample.displayName}</p>
        <p className="text-[12px] text-muted-foreground mt-0.5">
          {SITE_LABEL[sample.site]} · {sample.kind.name} · toma {fmtDateTime(sample.sampledAt)}
        </p>
      </div>

      {alteraciones.length > 0 && (
        <div className="flex items-start gap-2 rounded-md border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 px-3 py-2 text-[13px] text-amber-900 dark:text-amber-200">
          <AlertTriangle size={15} className="mt-0.5 shrink-0 text-amber-600" />
          <span>
            <strong>Muestra con alteración:</strong> {alteraciones.join(" · ")}
          </span>
        </div>
      )}

      {sample.noLiga && (
        <div className="flex items-start gap-2 rounded-md border border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-950/30 px-3 py-2 text-[13px] text-red-900 dark:text-red-200">
          <span className="mt-0.5 shrink-0 font-bold">✕</span>
          <span>
            <strong>No liga:</strong> el Glutomatic no formó gluten (la prueba quedó registrada en 0).
          </span>
        </div>
      )}

      {sample.rejectedAt && (
        <div className="flex items-start gap-2 rounded-md border border-red-400 dark:border-red-800 bg-red-50 dark:bg-red-950/40 px-3 py-2 text-[13px] text-red-900 dark:text-red-200">
          <Ban size={15} className="mt-0.5 shrink-0 text-red-600" />
          <span>
            <strong>Camión rechazado:</strong> {sample.rejectedReason || "sin motivo cargado"}
            <span className="block text-[11.5px] opacity-80 mt-0.5">
              {sample.rejectedBy ? `Marcó ${sample.rejectedBy.name} el ` : "El "}
              {fmtDateTime(sample.rejectedAt)}
            </span>
          </span>
        </div>
      )}

      {filas.length === 0 ? (
        <p className="text-[12.5px] text-muted-foreground">Sin datos de ficha cargados.</p>
      ) : (
        <dl className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {filas.map((f) => (
            <div key={f.label} className="rounded-md border border-border bg-muted/20 px-3 py-2 min-w-0">
              <dt className="text-[10.5px] uppercase tracking-wider text-muted-foreground truncate">
                {f.label}
              </dt>
              <dd className="text-[13.5px] font-medium mt-0.5 break-words">{f.valor}</dd>
            </div>
          ))}
        </dl>
      )}

      {sample.notes && (
        <div>
          <h4 className="text-[10.5px] uppercase tracking-wider text-muted-foreground mb-1">Notas</h4>
          <p className="text-[13px] whitespace-pre-wrap">{sample.notes}</p>
        </div>
      )}

      <AnalisisPorEquipo sample={sample} acciones={acciones} />

      <p className="text-[11.5px] text-muted-foreground border-t border-border pt-3">
        Registró {sample.createdBy.name} el {fmtDateTime(sample.createdAt)}
        {sample.updatedAt !== sample.createdAt && ` · editada ${fmtDateTime(sample.updatedAt)}`}
      </p>
    </div>
  );
};

/**
 * Todos los análisis enlazados a la muestra, una tarjeta por equipo. Se exporta
 * porque la grilla de consulta lo muestra al expandir una fila: es la misma
 * información que la ficha, sin duplicar el render. `acciones` solo viene de
 * la ficha, con QC: corregir o borrar un análisis manual.
 */
export const AnalisisPorEquipo: React.FC<{ sample: SampleDetailDto; acciones?: AccionesManual }> = ({
  sample,
  acciones,
}) => {
  const porEquipo = new Map<LabSource, SampleMeasurementDto[]>();
  for (const m of sample.measurements) {
    const lista = porEquipo.get(m.source) ?? [];
    lista.push(m);
    porEquipo.set(m.source, lista);
  }
  const equipos = SOURCE_ORDER.filter((s) => porEquipo.has(s));

  return (
    <div>
      <div className="flex items-baseline justify-between gap-2 mb-2">
        <h4 className="text-sm font-semibold">
          Análisis
          <span className="text-[11.5px] text-muted-foreground font-normal ml-2 tabular-nums">
            {sample.measurements.length === 0
              ? "ninguno todavía"
              : `${sample.measurements.length} en ${equipos.length} equipo${equipos.length === 1 ? "" : "s"}`}
          </span>
        </h4>
      </div>

      {equipos.length === 0 ? (
        <div className="rounded-md border border-dashed border-border px-4 py-5 text-center text-[12.5px] text-muted-foreground">
          Todavía no hay análisis enlazados. Tipeá{" "}
          <span className="font-mono font-medium text-foreground">{sample.accession}</span> como
          código de muestra en el equipo: apenas llegue la medición, aparece acá.
          {acciones && " Lo de termobalanza, estufa o colorímetro se carga con “Análisis manual”."}
        </div>
      ) : (
        <div className="space-y-3">
          {equipos.map((source) => (
            <TarjetaEquipo
              key={source}
              source={source}
              mediciones={porEquipo.get(source) ?? []}
              accession={sample.accession}
              acciones={acciones}
            />
          ))}
        </div>
      )}
    </div>
  );
};

/**
 * Un equipo puede tener varias mediciones de la misma muestra (el FN corre dos
 * canales, una prueba se repite). Se muestran todas, cada una con su hora.
 */
const TarjetaEquipo: React.FC<{
  source: LabSource;
  mediciones: SampleMeasurementDto[];
  accession: string;
  acciones?: AccionesManual;
}> = ({ source, mediciones, accession, acciones }) => {
  const qc = useQueryClient();
  const esManual = source === "MANUAL";
  const instrumento = mediciones.find((m) => m.instrumentName)?.instrumentName;

  const borrar = useMutation({
    mutationFn: (id: string) => labApi.samples.manual.remove(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: labKeys.sample(accession) });
      void qc.invalidateQueries({ queryKey: labKeys.samplesAll });
      toast.success("Análisis manual borrado");
    },
    onError: (e) => toast.error(labError(e)),
  });

  return (
    <div className="rounded-md border border-border overflow-hidden">
      <div className="flex items-center justify-between gap-2 px-3 py-1.5 bg-muted/30 border-b border-border">
        <span className="text-[12.5px] font-semibold">{SOURCE_LABEL[source]}</span>
        <span className="text-[11px] text-muted-foreground truncate">
          {esManual ? "Termobalanza, estufa, colorímetro, PMG" : (instrumento ?? "")}
          {mediciones.length > 1 && ` · ${mediciones.length} mediciones`}
        </span>
      </div>
      <div className="divide-y divide-border/60">
        {mediciones.map((m) => (
          <div key={m.id} className="px-3 py-2">
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <div className="text-[11px] text-muted-foreground tabular-nums">
                {fmtDateTime(m.analyzedAt)}
                {m.productCode && ` · ${m.productCode}`}
                {esManual && m.createdBy && ` · cargó ${m.createdBy.name}`}
              </div>
              {esManual && acciones && (
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    className="text-muted-foreground hover:text-foreground p-1"
                    title="Corregir"
                    aria-label="Corregir análisis manual"
                    onClick={() => acciones.onEditarManual(m)}
                  >
                    <Pencil size={13} />
                  </button>
                  <button
                    type="button"
                    className="text-muted-foreground hover:text-red-600 p-1 disabled:opacity-50"
                    title="Borrar"
                    aria-label="Borrar análisis manual"
                    disabled={borrar.isPending}
                    onClick={() => {
                      if (window.confirm("¿Borrar este análisis manual? Se puede volver a cargar.")) {
                        borrar.mutate(m.id);
                      }
                    }}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {ordenarParams(source, m.params).map((p) => (
                <span
                  key={p.code}
                  className={`inline-flex items-baseline gap-1 rounded border px-2 py-0.5 text-[12px] ${
                    p.isImplausible
                      ? "border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30"
                      : "border-border bg-background"
                  }`}
                  title={p.isImplausible ? "Fuera del rango de calibración" : undefined}
                >
                  <span className="text-muted-foreground">{etiquetaParam(p.code)}</span>
                  <span className="font-semibold tabular-nums">
                    {fmtNumber(p.value, decimalesParam(p.code))}
                  </span>
                  {p.unit && <span className="text-[10.5px] text-muted-foreground">{p.unit}</span>}
                  {p.isImplausible && <AlertTriangle size={11} className="text-amber-600 self-center" />}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SampleDetailModal;
