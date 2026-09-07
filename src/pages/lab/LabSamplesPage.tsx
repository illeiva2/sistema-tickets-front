import React from "react";
import { useQueries } from "@tanstack/react-query";
import { AlertTriangle, Plus, Search, X } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui";
import { KpiCard } from "@/components/dashboards/shared";
import { useModules } from "@/contexts/ModulesContext";
import { labApi, labError, labKeys } from "@/features/lab/api";
import { exportarCsv, type ColumnaCsv } from "@/features/lab/export";
import { fmtDateTime, fmtInt } from "@/features/lab/format";
import { SITES, SITE_LABEL } from "@/features/lab/samples";
import { ExportButton } from "@/features/lab/components/LabLayout";
import {
  LabFetchingHint,
  LabKpiSkeletons,
  LabProgressBar,
  LabTableSkeleton,
} from "@/features/lab/components/Loading";
import { SampleFormModal } from "@/features/lab/components/SampleFormModal";
import { SampleDetailModal } from "@/features/lab/components/SampleDetailModal";
import type { LabSite, SampleDto, SampleFilters } from "@/features/lab/types";

/**
 * Registro de muestras.
 *
 * Es la puerta de entrada del flujo: se registra la muestra, se obtiene la
 * accesión, se tipea en el equipo. La lista sirve para encontrar una muestra
 * (por accesión o por texto) y abrir su ficha. Registrar exige nivel QC; el
 * backend lo valida igual, acá solo se esconde el botón a quien no puede.
 */

const PAGE_SIZE = 50;

const CLASE_CONTROL =
  "px-2 py-1 text-[12.5px] border border-border rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-primary";

const CSV: ColumnaCsv<SampleDto>[] = [
  { header: "Accesión", value: (s) => s.accession },
  { header: "Nombre", value: (s) => s.displayName },
  { header: "Tipo", value: (s) => s.kind.name },
  { header: "Laboratorio", value: (s) => SITE_LABEL[s.site] },
  { header: "Fecha y hora de toma", value: (s) => fmtDateTime(s.sampledAt) },
  { header: "Registró", value: (s) => s.createdBy.name },
];

export const LabSamplesPage: React.FC = () => {
  const { levelOf } = useModules();
  const nivel = levelOf("glutenlab");
  const puedeEscribir = nivel === "QC" || nivel === "MANAGEMENT";

  const [filtros, setFiltros] = React.useState<SampleFilters>({ pageSize: PAGE_SIZE });
  const [texto, setTexto] = React.useState("");
  const [formAbierto, setFormAbierto] = React.useState(false);
  const [editando, setEditando] = React.useState<SampleDto | null>(null);
  const [detalle, setDetalle] = React.useState<SampleDto | null>(null);

  React.useEffect(() => {
    const t = window.setTimeout(() => {
      const limpio = texto.trim();
      setFiltros((f) =>
        (f.q ?? "") === limpio ? f : { ...f, q: limpio || undefined, pageSize: PAGE_SIZE },
      );
    }, 300);
    return () => window.clearTimeout(t);
  }, [texto]);

  const [kindsQ, summaryQ, listQ] = useQueries({
    queries: [
      { queryKey: labKeys.samplesKinds, queryFn: () => labApi.samples.kinds(), staleTime: 5 * 60_000 },
      { queryKey: labKeys.samplesSummary, queryFn: () => labApi.samples.summary() },
      { queryKey: labKeys.samples(filtros), queryFn: () => labApi.samples.list(filtros) },
    ],
  });

  const errores = [kindsQ.error, summaryQ.error, listQ.error].filter(Boolean);
  React.useEffect(() => {
    if (errores.length > 0) toast.error(`Error cargando muestras: ${labError(errores[0])}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [errores.length > 0 ? labError(errores[0]) : null]);

  const kinds = kindsQ.data ?? [];
  const resumen = summaryQ.data;
  const items = listQ.data?.items ?? [];
  const total = listQ.data?.total ?? 0;
  const aviso = listQ.data?.warning;

  const hayFiltros = Boolean(filtros.q || filtros.site || filtros.kindId || filtros.from || filtros.to);
  const limpiar = () => {
    setTexto("");
    setFiltros({ pageSize: PAGE_SIZE });
  };

  const cerrarForm = React.useCallback(() => {
    setFormAbierto(false);
    setEditando(null);
  }, []);
  const cerrarDetalle = React.useCallback(() => setDetalle(null), []);

  return (
    <div className="space-y-4">
      {/* ─── Encabezado + acción principal ─────────────────────────────── */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-base font-semibold">Registro de muestras</h2>
          <p className="text-[12px] text-muted-foreground mt-0.5 max-w-prose">
            Registrá la muestra una vez, obtené su accesión y tipeá solo ese número en el equipo.
            Todos los análisis quedan enlazados a esta ficha.
          </p>
        </div>
        {puedeEscribir && (
          <Button
            size="sm"
            className="h-8"
            onClick={() => setFormAbierto(true)}
            disabled={kindsQ.isPending || kinds.length === 0}
            title={kinds.length === 0 && !kindsQ.isPending ? "No hay tipos de muestra configurados" : undefined}
          >
            <Plus size={14} className="mr-1.5" />
            Nueva muestra
          </Button>
        )}
      </div>

      {/* ─── Indicadores ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {summaryQ.isPending ? (
          <LabKpiSkeletons count={3} />
        ) : (
          <>
            <KpiCard label="Muestras hoy" value={fmtInt(resumen?.today)} tone="blue" />
            <KpiCard label="Últimos 7 días" value={fmtInt(resumen?.last7d)} />
            <KpiCard
              label="Total registradas"
              value={fmtInt(resumen?.total)}
              hint={
                resumen
                  ? `Molino ${fmtInt(resumen.bySite.MOLINO ?? 0)} · Acopio ${fmtInt(resumen.bySite.ACOPIO ?? 0)}`
                  : undefined
              }
            />
          </>
        )}
      </div>

      {/* ─── Filtros ──────────────────────────────────────────────────── */}
      <div className="border border-border bg-card rounded-lg overflow-hidden">
        <LabProgressBar active={listQ.isFetching} />
        <div className="flex flex-wrap items-center gap-2 px-3 py-2 bg-muted/20">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Accesión (M-0012-4) o texto: Tapera, empresa, silo…"
              className={`${CLASE_CONTROL} w-full pl-8`}
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
            />
          </div>
          <select
            className={CLASE_CONTROL}
            value={filtros.site ?? ""}
            onChange={(e) =>
              setFiltros((f) => ({
                ...f,
                site: (e.target.value || undefined) as LabSite | undefined,
                pageSize: PAGE_SIZE,
              }))
            }
            aria-label="Laboratorio"
          >
            <option value="">Todos los laboratorios</option>
            {SITES.map((s) => (
              <option key={s} value={s}>
                {SITE_LABEL[s]}
              </option>
            ))}
          </select>
          <select
            className={CLASE_CONTROL}
            value={filtros.kindId ?? ""}
            onChange={(e) =>
              setFiltros((f) => ({ ...f, kindId: e.target.value || undefined, pageSize: PAGE_SIZE }))
            }
            aria-label="Tipo de muestra"
          >
            <option value="">Todos los tipos</option>
            {kinds.map((k) => (
              <option key={k.id} value={k.id}>
                {k.name}
              </option>
            ))}
          </select>
          <label className="flex items-center gap-1.5 text-[11.5px] text-muted-foreground">
            Desde
            <input
              type="date"
              className={CLASE_CONTROL}
              value={filtros.from ?? ""}
              onChange={(e) =>
                setFiltros((f) => ({ ...f, from: e.target.value || undefined, pageSize: PAGE_SIZE }))
              }
            />
          </label>
          <label className="flex items-center gap-1.5 text-[11.5px] text-muted-foreground">
            Hasta
            <input
              type="date"
              className={CLASE_CONTROL}
              value={filtros.to ?? ""}
              onChange={(e) =>
                setFiltros((f) => ({ ...f, to: e.target.value || undefined, pageSize: PAGE_SIZE }))
              }
            />
          </label>
          {hayFiltros && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-[11.5px] text-muted-foreground"
              onClick={limpiar}
            >
              <X size={12} className="mr-1" />
              Limpiar
            </Button>
          )}
          <div className="ml-auto">
            <LabFetchingHint active={listQ.isFetching && !listQ.isPending} />
          </div>
        </div>
        {aviso && (
          <div className="flex items-center gap-2 px-3 py-1.5 border-t border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/30 text-[12px] text-amber-800 dark:text-amber-200">
            <AlertTriangle size={13} className="shrink-0" />
            {aviso}
          </div>
        )}
      </div>

      {/* ─── Tabla ────────────────────────────────────────────────────── */}
      <div className="border border-border bg-card rounded-lg overflow-hidden">
        <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-border">
          <div className="flex items-center gap-2 min-w-0">
            <h3 className="text-sm font-semibold shrink-0">Muestras</h3>
            <span className="text-[11.5px] text-muted-foreground tabular-nums">
              {items.length} de {fmtInt(total)}
            </span>
          </div>
          <ExportButton
            onClick={() => {
              exportarCsv(items, CSV, "muestras");
              toast.success(`${items.length} muestras exportadas`);
            }}
            disabled={items.length === 0}
            title={
              items.length < total
                ? `Exporta las ${items.length} cargadas. Usá "Mostrar más" para el resto.`
                : "Descargar en CSV"
            }
          />
        </div>

        {listQ.isPending ? (
          <LabTableSkeleton rows={6} cols={5} />
        ) : items.length === 0 ? (
          <div className="px-4 py-12 text-center text-sm text-muted-foreground">
            {hayFiltros
              ? "Sin muestras para el filtro aplicado"
              : puedeEscribir
                ? "Todavía no hay muestras registradas. Empezá con “Nueva muestra”."
                : "Todavía no hay muestras registradas."}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto max-h-[560px] overflow-y-auto">
              <table className="w-full text-left">
                <thead className="sticky top-0 z-10">
                  <tr className="text-[10.5px] uppercase tracking-wider text-muted-foreground border-b border-border bg-muted/40 backdrop-blur">
                    <th className="font-medium pl-4 pr-2 py-2 whitespace-nowrap">Accesión</th>
                    <th className="font-medium px-2 py-2">Nombre</th>
                    <th className="font-medium px-2 py-2 whitespace-nowrap">Tipo</th>
                    <th className="font-medium px-2 py-2 whitespace-nowrap">Laboratorio</th>
                    <th className="font-medium px-2 py-2 whitespace-nowrap">Toma</th>
                    <th className="font-medium px-2 pr-4 py-2 whitespace-nowrap">Registró</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((s) => (
                    <tr
                      key={s.id}
                      className="border-b border-border/60 hover:bg-muted/40 transition-colors cursor-pointer"
                      onClick={() => setDetalle(s)}
                      title="Ver ficha"
                    >
                      <td className="py-2.5 pl-4 pr-2 whitespace-nowrap font-mono text-[12.5px] font-semibold tracking-wide">
                        {s.accession}
                      </td>
                      <td className="px-2 py-2.5 text-[12.5px] min-w-[200px]">{s.displayName}</td>
                      <td className="px-2 py-2.5 text-[12px] text-muted-foreground whitespace-nowrap">
                        {s.kind.name}
                      </td>
                      <td className="px-2 py-2.5 text-[12px] whitespace-nowrap">{SITE_LABEL[s.site]}</td>
                      <td className="px-2 py-2.5 text-[12.5px] tabular-nums whitespace-nowrap">
                        {fmtDateTime(s.sampledAt)}
                      </td>
                      <td className="px-2 pr-4 py-2.5 text-[12px] text-muted-foreground whitespace-nowrap">
                        {s.createdBy.name}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {items.length < total && (
              <div className="px-3 py-2 border-t border-border bg-muted/20 text-center">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 px-3 text-[11.5px]"
                  onClick={() =>
                    setFiltros((f) => ({ ...f, pageSize: (f.pageSize ?? PAGE_SIZE) + PAGE_SIZE }))
                  }
                  disabled={listQ.isFetching}
                >
                  {listQ.isFetching ? "Cargando…" : `Mostrar más (${fmtInt(total - items.length)} restantes)`}
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      {/* ─── Modales ──────────────────────────────────────────────────── */}
      {(formAbierto || editando) && kinds.length > 0 && (
        <SampleFormModal kinds={kinds} editing={editando} onClose={cerrarForm} />
      )}
      {detalle && !editando && (
        <SampleDetailModal
          sample={detalle}
          kinds={kinds}
          canEdit={puedeEscribir}
          onEdit={(s) => {
            setDetalle(null);
            setEditando(s);
          }}
          onClose={cerrarDetalle}
        />
      )}
    </div>
  );
};

export default LabSamplesPage;
