import React from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Copy, Pencil } from "lucide-react";
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

/**
 * Ficha de una muestra: metadata + TODOS sus análisis enlazados, por equipo.
 *
 * Se consulta por accesión (no se reusa la fila de la lista) porque la ficha
 * trae las mediciones, y se refresca sola mientras está abierta: el operario
 * registra, tipea la accesión en el equipo y ve aparecer el resultado acá sin
 * cerrar y volver a abrir.
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

  const copiar = async () => {
    (await copiarAlPortapapeles(accession))
      ? toast.success("Accesión copiada")
      : toast.error("No se pudo copiar");
  };

  return (
    <LabModal
      wide
      onClose={onClose}
      title={
        <span className="flex items-center gap-2 flex-wrap">
          <span className="font-mono tracking-wider">{accession}</span>
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
          {canEdit && data && (
            <Button size="sm" variant="outline" onClick={() => onEdit(data)}>
              <Pencil size={13} className="mr-1.5" />
              Editar ficha
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

      {data && <Ficha sample={data} kinds={kinds} />}
    </LabModal>
  );
};

const Ficha: React.FC<{ sample: SampleDetailDto; kinds: SampleKindDto[] }> = ({ sample, kinds }) => {
  const kind = kinds.find((k) => k.id === sample.kindId);
  const defs = kind?.fields ?? [];

  // Primero los campos del catálogo en su orden; después cualquier valor cuyo
  // campo ya no exista, para no esconder lo que alguien cargó.
  const filas: { label: string; valor: string }[] = [];
  const usados = new Set<string>();
  for (const def of defs) {
    const v = sample.fields[def.key];
    usados.add(def.key);
    if (v === undefined || v === null || v === "") continue;
    filas.push({
      label: def.label,
      valor: def.type === "DATETIME" ? fmtDateTime(String(v)) : String(v),
    });
  }
  for (const [k, v] of Object.entries(sample.fields)) {
    if (usados.has(k) || v === undefined || v === null || v === "") continue;
    filas.push({ label: k, valor: String(v) });
  }

  const porEquipo = new Map<LabSource, SampleMeasurementDto[]>();
  for (const m of sample.measurements) {
    const lista = porEquipo.get(m.source) ?? [];
    lista.push(m);
    porEquipo.set(m.source, lista);
  }
  const equipos = SOURCE_ORDER.filter((s) => porEquipo.has(s));

  return (
    <div className="space-y-5">
      <div>
        <p className="text-base font-medium">{sample.displayName}</p>
        <p className="text-[12px] text-muted-foreground mt-0.5">
          {SITE_LABEL[sample.site]} · {sample.kind.name} · toma {fmtDateTime(sample.sampledAt)}
        </p>
      </div>

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

      {/* ─── Análisis ─────────────────────────────────────────────────── */}
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
          </div>
        ) : (
          <div className="space-y-3">
            {equipos.map((source) => (
              <TarjetaEquipo key={source} source={source} mediciones={porEquipo.get(source) ?? []} />
            ))}
          </div>
        )}
      </div>

      <p className="text-[11.5px] text-muted-foreground border-t border-border pt-3">
        Registró {sample.createdBy.name} el {fmtDateTime(sample.createdAt)}
        {sample.updatedAt !== sample.createdAt && ` · editada ${fmtDateTime(sample.updatedAt)}`}
      </p>
    </div>
  );
};

/**
 * Un equipo puede tener varias mediciones de la misma muestra (el FN corre dos
 * canales, una prueba se repite). Se muestran todas, cada una con su hora.
 */
const TarjetaEquipo: React.FC<{ source: LabSource; mediciones: SampleMeasurementDto[] }> = ({
  source,
  mediciones,
}) => {
  const instrumento = mediciones.find((m) => m.instrumentName)?.instrumentName;
  return (
    <div className="rounded-md border border-border overflow-hidden">
      <div className="flex items-center justify-between gap-2 px-3 py-1.5 bg-muted/30 border-b border-border">
        <span className="text-[12.5px] font-semibold">{SOURCE_LABEL[source]}</span>
        <span className="text-[11px] text-muted-foreground truncate">
          {instrumento ?? ""}
          {mediciones.length > 1 && ` · ${mediciones.length} mediciones`}
        </span>
      </div>
      <div className="divide-y divide-border/60">
        {mediciones.map((m) => (
          <div key={m.id} className="px-3 py-2">
            <div className="text-[11px] text-muted-foreground tabular-nums mb-1.5">
              {fmtDateTime(m.analyzedAt)}
              {m.productCode && ` · ${m.productCode}`}
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
