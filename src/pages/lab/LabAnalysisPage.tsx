import React from "react";
import { useQueries, useQuery } from "@tanstack/react-query";
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronDown,
  ChevronRight,
  Columns3,
  Search,
  X,
} from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui";
import { useModules } from "@/contexts/ModulesContext";
import { labApi, labError, labKeys } from "@/features/lab/api";
import { exportarCsv, type ColumnaCsv } from "@/features/lab/export";
import { fmtInt, toDateInput } from "@/features/lab/format";
import { SITES, SITE_LABEL } from "@/features/lab/samples";
import { ExportButton } from "@/features/lab/components/LabLayout";
import { LabFetchingHint, LabProgressBar, LabTableSkeleton } from "@/features/lab/components/Loading";
import { AnalisisPorEquipo, SampleDetailModal } from "@/features/lab/components/SampleDetailModal";
import { GridColumnsPanel } from "@/features/lab/components/GridColumnsPanel";
import {
  VIEW_KEY,
  VISTA_SUGERIDA,
  claveAnalisis,
  construirColumnas,
  sanearVista,
  type ColumnaGrid,
} from "@/features/lab/grid";
import { useSavedView } from "@/lib/uiPreferences";
import type { GridFilters, GridSampleDto, LabSite } from "@/features/lab/types";

/**
 * Análisis por muestra: la vista de consulta para comercio de granos.
 *
 * Una fila por muestra con la ficha (empresa, camión, CTG…) y un valor por
 * análisis; cada usuario elige qué columnas ve, en qué orden y cómo ordena, y
 * la vista queda guardada en su perfil. Los datos llegan enteros (el filtro,
 * hasta un tope) y el ordenamiento es local: con decenas de muestras por día
 * es instantáneo y evita paginar por columnas calculadas en el servidor.
 *
 * En pantallas angostas la tabla se vuelve tarjetas con las primeras columnas
 * elegidas: la configuración es la misma, cambia cuánto entra.
 */

const CLASE_CONTROL =
  "px-2 py-1 text-[12.5px] border border-border rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-primary";

/** Ventana inicial: los últimos 30 días. Comercio mira lo reciente; el histórico se pide con fechas. */
const DIAS_INICIALES = 30;
const desdeInicial = () => toDateInput(new Date(Date.now() - DIAS_INICIALES * 24 * 60 * 60 * 1000));

export const LabAnalysisPage: React.FC = () => {
  const { levelOf } = useModules();
  const nivel = levelOf("glutenlab");
  const puedeEditar = nivel === "QC" || nivel === "MANAGEMENT";

  const [filtros, setFiltros] = React.useState<GridFilters>({ from: desdeInicial() });
  const [texto, setTexto] = React.useState("");
  const [panelColumnas, setPanelColumnas] = React.useState(false);
  const [expandidas, setExpandidas] = React.useState<Set<string>>(new Set());
  const [ficha, setFicha] = React.useState<string | null>(null);

  React.useEffect(() => {
    const t = window.setTimeout(() => {
      const limpio = texto.trim();
      setFiltros((f) => ((f.q ?? "") === limpio ? f : { ...f, q: limpio || undefined }));
    }, 300);
    return () => window.clearTimeout(t);
  }, [texto]);

  const [kindsQ, gridQ] = useQueries({
    queries: [
      { queryKey: labKeys.samplesKinds, queryFn: () => labApi.samples.kinds(), staleTime: 5 * 60_000 },
      { queryKey: labKeys.samplesGrid(filtros), queryFn: () => labApi.samples.grid(filtros) },
    ],
  });

  const errores = [kindsQ.error, gridQ.error].filter(Boolean);
  React.useEffect(() => {
    if (errores.length > 0) toast.error(`Error cargando análisis: ${labError(errores[0])}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [errores.length > 0 ? labError(errores[0]) : null]);

  const kinds = kindsQ.data ?? [];
  const items = gridQ.data?.items ?? [];
  const columnasAnalisis = gridQ.data?.columns;

  // El catálogo de columnas se congela con la primera respuesta que traiga
  // columnas: si el filtro deja la grilla vacía, el selector no se vacía.
  const ultimasColumnas = React.useRef(columnasAnalisis);
  if (columnasAnalisis && columnasAnalisis.length > 0) ultimasColumnas.current = columnasAnalisis;
  const disponibles = React.useMemo(
    () => construirColumnas(kinds, ultimasColumnas.current ?? []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [kinds, ultimasColumnas.current],
  );
  const porId = React.useMemo(() => new Map(disponibles.map((c) => [c.id, c])), [disponibles]);

  const vistaGuardada = useSavedView(VIEW_KEY, VISTA_SUGERIDA);
  const vista = React.useMemo(
    () => sanearVista(vistaGuardada.config, disponibles),
    [vistaGuardada.config, disponibles],
  );
  const sorting: SortingState = vista.sort ?? [];

  const columnDefs = React.useMemo<ColumnDef<GridSampleDto>[]>(
    () =>
      vista.columns
        .map((id) => porId.get(id))
        .filter((c): c is ColumnaGrid => !!c)
        .map((c) => ({
          id: c.id,
          accessorFn: (r) => c.valor(r),
          header: () => <Encabezado c={c} />,
          cell: ({ row }) => <Celda c={c} r={row.original} expandida={expandidas.has(row.original.id)} />,
          // "basic" compara con < y >: sirve para números y para fechas ISO. "text" ignora mayúsculas.
          sortingFn: c.tipo === "texto" ? "text" : "basic",
          sortUndefined: "last",
          enableSorting: true,
        })),
    [vista.columns, porId, expandidas],
  );

  const table = useReactTable({
    data: items,
    columns: columnDefs,
    state: { sorting },
    onSortingChange: (updater) => {
      const next = typeof updater === "function" ? updater(sorting) : updater;
      vistaGuardada.guardar({ ...vista, sort: next.slice(0, 3) });
    },
    enableMultiSort: true,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getRowId: (r) => r.id,
  });

  const filas = table.getRowModel().rows;
  const cambiarColumnas = (ids: string[]) => vistaGuardada.guardar({ ...vista, columns: ids });
  const alternar = (id: string) =>
    setExpandidas((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const hayFiltros = Boolean(filtros.q || filtros.site || filtros.kindId || filtros.to || filtros.from !== desdeInicial());
  const limpiar = () => {
    setTexto("");
    setFiltros({ from: desdeInicial() });
  };

  const exportar = () => {
    const columnas: ColumnaCsv<GridSampleDto>[] = vista.columns
      .map((id) => porId.get(id))
      .filter((c): c is ColumnaGrid => !!c)
      .map((c) => ({
        header: c.unit ? `${c.label} (${c.unit})` : c.label,
        value: (r) => (c.tipo === "numero" ? c.valor(r) : c.texto(r)),
        decimals: c.decimals ?? 2,
      }));
    exportarCsv(
      filas.map((f) => f.original),
      columnas,
      "analisis",
    );
    toast.success(`${filas.length} muestras exportadas`);
  };

  return (
    <div className="space-y-4">
      {/* ─── Encabezado ───────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-base font-semibold">Análisis por muestra</h2>
          <p className="text-[12px] text-muted-foreground mt-0.5 max-w-prose">
            Una fila por muestra con su ficha y sus análisis. Elegí las columnas y el orden que
            necesitás: la vista queda guardada en tu perfil.
          </p>
        </div>
        <div className="relative flex items-center gap-2 shrink-0">
          <EstadoVista estado={vistaGuardada.estado} personalizada={vistaGuardada.personalizada} />
          <Button
            size="sm"
            variant="outline"
            className="h-8"
            onClick={() => setPanelColumnas((v) => !v)}
            aria-expanded={panelColumnas}
            aria-haspopup="dialog"
          >
            <Columns3 size={14} className="mr-1.5" />
            Columnas
            <span className="ml-1.5 text-muted-foreground tabular-nums">{vista.columns.length}</span>
          </Button>
          {panelColumnas && (
            <GridColumnsPanel
              disponibles={disponibles}
              visibles={vista.columns}
              personalizada={vistaGuardada.personalizada}
              onChange={cambiarColumnas}
              onRestablecer={() => {
                void vistaGuardada.restablecer();
                toast.success("Vista sugerida restablecida");
              }}
              onClose={() => setPanelColumnas(false)}
            />
          )}
        </div>
      </div>

      {/* ─── Filtros ──────────────────────────────────────────────────── */}
      <div className="border border-border bg-card rounded-lg overflow-hidden">
        <LabProgressBar active={gridQ.isFetching} />
        <div className="flex flex-wrap items-center gap-2 px-3 py-2 bg-muted/20">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Accesión (A-0012-2) o texto: empresa, patente, silo…"
              className={`${CLASE_CONTROL} w-full pl-8`}
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
            />
          </div>
          <select
            className={CLASE_CONTROL}
            value={filtros.site ?? ""}
            onChange={(e) =>
              setFiltros((f) => ({ ...f, site: (e.target.value || undefined) as LabSite | undefined }))
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
            onChange={(e) => setFiltros((f) => ({ ...f, kindId: e.target.value || undefined }))}
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
              onChange={(e) => setFiltros((f) => ({ ...f, from: e.target.value || undefined }))}
            />
          </label>
          <label className="flex items-center gap-1.5 text-[11.5px] text-muted-foreground">
            Hasta
            <input
              type="date"
              className={CLASE_CONTROL}
              value={filtros.to ?? ""}
              onChange={(e) => setFiltros((f) => ({ ...f, to: e.target.value || undefined }))}
            />
          </label>
          {hayFiltros && (
            <Button variant="ghost" size="sm" className="h-7 px-2 text-[11.5px] text-muted-foreground" onClick={limpiar}>
              <X size={12} className="mr-1" />
              Limpiar
            </Button>
          )}
          <div className="ml-auto">
            <LabFetchingHint active={gridQ.isFetching && !gridQ.isPending} />
          </div>
        </div>
        {gridQ.data?.warning && (
          <Aviso>{gridQ.data.warning}</Aviso>
        )}
        {gridQ.data?.truncated && (
          <Aviso>
            Se muestran las {fmtInt(gridQ.data.limit)} muestras más recientes de {fmtInt(gridQ.data.total)} que
            cumplen el filtro. Acotá las fechas para ver el resto.
          </Aviso>
        )}
      </div>

      {/* ─── Grilla ───────────────────────────────────────────────────── */}
      <div className="border border-border bg-card rounded-lg overflow-hidden">
        <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-border">
          <div className="flex items-center gap-2 min-w-0">
            <h3 className="text-sm font-semibold shrink-0">Muestras</h3>
            <span className="text-[11.5px] text-muted-foreground tabular-nums">
              {fmtInt(filas.length)}
              {sorting.length > 0 && (
                <>
                  {" · ordenado por "}
                  {sorting.map((s) => `${porId.get(s.id)?.label ?? s.id} ${s.desc ? "↓" : "↑"}`).join(", ")}
                </>
              )}
            </span>
          </div>
          <ExportButton onClick={exportar} disabled={filas.length === 0} title="Descargar las columnas visibles en CSV" />
        </div>

        {gridQ.isPending || vistaGuardada.cargando ? (
          <LabTableSkeleton rows={6} cols={6} />
        ) : filas.length === 0 ? (
          <div className="px-4 py-12 text-center text-sm text-muted-foreground">
            {hayFiltros ? "Sin muestras para el filtro aplicado" : "Sin muestras en los últimos 30 días."}
          </div>
        ) : (
          <>
            {/* Tabla: de md en adelante. Scroll horizontal con la accesión fija a la izquierda. */}
            <div className="hidden md:block overflow-x-auto max-h-[640px] overflow-y-auto">
              <table className="w-full text-left border-separate border-spacing-0">
                <thead className="sticky top-0 z-10">
                  {table.getHeaderGroups().map((hg) => (
                    <tr key={hg.id} className="text-[10.5px] uppercase tracking-wider text-muted-foreground">
                      {hg.headers.map((h, i) => {
                        const orden = h.column.getIsSorted();
                        return (
                          <th
                            key={h.id}
                            className={`font-medium px-2 py-2 whitespace-nowrap border-b border-border bg-muted/40 backdrop-blur select-none ${
                              i === 0 ? "sticky left-0 z-20 pl-4 bg-card border-r border-border/60" : ""
                            } ${h.column.getCanSort() ? "cursor-pointer hover:text-foreground" : ""}`}
                            onClick={h.column.getToggleSortingHandler()}
                            title={h.column.getCanSort() ? "Clic para ordenar · Shift + clic para agregar criterio" : undefined}
                            aria-sort={orden === "asc" ? "ascending" : orden === "desc" ? "descending" : "none"}
                          >
                            <span className="inline-flex items-center gap-1">
                              {flexRender(h.column.columnDef.header, h.getContext())}
                              {orden === "asc" ? (
                                <ArrowUp size={11} className="text-foreground" />
                              ) : orden === "desc" ? (
                                <ArrowDown size={11} className="text-foreground" />
                              ) : (
                                <ArrowUpDown size={11} className="opacity-30" />
                              )}
                            </span>
                          </th>
                        );
                      })}
                    </tr>
                  ))}
                </thead>
                <tbody>
                  {filas.map((row) => {
                    const abierta = expandidas.has(row.original.id);
                    return (
                      <React.Fragment key={row.id}>
                        <tr
                          className="hover:bg-muted/40 transition-colors cursor-pointer"
                          onClick={() => alternar(row.original.id)}
                          aria-expanded={abierta}
                        >
                          {row.getVisibleCells().map((cell, i) => (
                            <td
                              key={cell.id}
                              className={`px-2 py-2 text-[12.5px] whitespace-nowrap border-b border-border/60 align-top ${
                                i === 0 ? "sticky left-0 z-[1] pl-4 bg-card border-r border-border/60" : ""
                              }`}
                            >
                              {flexRender(cell.column.columnDef.cell, cell.getContext())}
                            </td>
                          ))}
                        </tr>
                        {abierta && (
                          <tr>
                            <td colSpan={columnDefs.length} className="px-4 py-3 bg-muted/20 border-b border-border">
                              <FilaExpandida accession={row.original.accession} onFicha={() => setFicha(row.original.accession)} />
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Tarjetas: pantallas angostas. Mismas columnas elegidas, las primeras que entran. */}
            <ul className="md:hidden divide-y divide-border/60">
              {filas.map((row) => (
                <Tarjeta
                  key={row.id}
                  r={row.original}
                  columnas={vista.columns.map((id) => porId.get(id)).filter((c): c is ColumnaGrid => !!c)}
                  abierta={expandidas.has(row.original.id)}
                  onToggle={() => alternar(row.original.id)}
                  onFicha={() => setFicha(row.original.accession)}
                />
              ))}
            </ul>
          </>
        )}
      </div>

      {ficha && (
        <SampleDetailModal
          accession={ficha}
          kinds={kinds}
          canEdit={false}
          onEdit={() => undefined}
          onClose={() => setFicha(null)}
        />
      )}
      {/* puedeEditar se reserva para cuando la grilla permita editar la ficha desde acá. */}
      {puedeEditar && null}
    </div>
  );
};

// ─── Piezas ──────────────────────────────────────────────────────────────────

const Aviso: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="flex items-center gap-2 px-3 py-1.5 border-t border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/30 text-[12px] text-amber-800 dark:text-amber-200">
    <AlertTriangle size={13} className="shrink-0" />
    <span>{children}</span>
  </div>
);

const Encabezado: React.FC<{ c: ColumnaGrid }> = ({ c }) => (
  <span className="inline-flex flex-col leading-tight">
    <span>{c.label}</span>
    {c.unit && <span className="text-[9.5px] normal-case tracking-normal opacity-70">{c.unit}</span>}
  </span>
);

/** La accesión lleva el chevrón de expandir y la advertencia de alteración; los números, la marca de "dudoso". */
const Celda: React.FC<{ c: ColumnaGrid; r: GridSampleDto; expandida: boolean }> = ({ c, r, expandida }) => {
  if (c.id === "accession") {
    return (
      <span className="inline-flex items-center gap-1.5 font-mono font-semibold tracking-wide">
        {expandida ? (
          <ChevronDown size={13} className="text-muted-foreground" />
        ) : (
          <ChevronRight size={13} className="text-muted-foreground" />
        )}
        {r.accession}
        {r.conditions && r.conditions.length > 0 && (
          <span
            className="text-amber-600"
            title={`Muestra con alteración: ${r.conditions.join(" · ")}`}
            aria-label={`Muestra con alteración: ${r.conditions.join(", ")}`}
          >
            <AlertTriangle size={13} />
          </span>
        )}
      </span>
    );
  }
  if (c.tipo === "numero") {
    const clave = claveAnalisis(c.id);
    const dudoso = !!clave && r.implausible?.includes(clave);
    const v = c.valor(r);
    return (
      <span
        className={`block text-right tabular-nums ${v === undefined ? "text-muted-foreground" : ""} ${
          dudoso ? "text-amber-700 dark:text-amber-300" : ""
        }`}
        title={dudoso ? "Fuera del rango de calibración del equipo" : undefined}
      >
        {c.texto(r)}
        {dudoso && <AlertTriangle size={11} className="inline ml-1 -mt-0.5 text-amber-600" />}
      </span>
    );
  }
  if (c.id === "conditions") {
    const t = c.texto(r);
    return t ? <span className="text-amber-800 dark:text-amber-200">{t}</span> : <span className="text-muted-foreground">—</span>;
  }
  const t = c.texto(r);
  return t ? (
    <span className={c.id === "displayName" || c.id === "notes" ? "whitespace-normal min-w-[220px] block" : ""}>{t}</span>
  ) : (
    <span className="text-muted-foreground">—</span>
  );
};

/** Al expandir se piden los análisis crudos de esa muestra: la grilla solo trae el valor por columna. */
const FilaExpandida: React.FC<{ accession: string; onFicha: () => void }> = ({ accession, onFicha }) => {
  const q = useQuery({ queryKey: labKeys.sample(accession), queryFn: () => labApi.samples.get(accession) });
  return (
    <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
      {q.isPending && <LabTableSkeleton rows={2} cols={3} />}
      {q.error && <p className="text-[12.5px] text-red-700 dark:text-red-300">{labError(q.error)}</p>}
      {q.data && <AnalisisPorEquipo sample={q.data} />}
      <div className="text-right">
        <Button variant="ghost" size="sm" className="h-7 px-2 text-[11.5px]" onClick={onFicha}>
          Abrir ficha completa
        </Button>
      </div>
    </div>
  );
};

/** Versión angosta de la fila: accesión y nombre arriba, las primeras columnas elegidas abajo. */
const Tarjeta: React.FC<{
  r: GridSampleDto;
  columnas: ColumnaGrid[];
  abierta: boolean;
  onToggle: () => void;
  onFicha: () => void;
}> = ({ r, columnas, abierta, onToggle, onFicha }) => {
  const datos = columnas.filter((c) => !["accession", "displayName", "conditions", "notes"].includes(c.id)).slice(0, 6);
  return (
    <li className="px-3 py-2.5">
      <button type="button" className="w-full text-left" onClick={onToggle} aria-expanded={abierta}>
        <div className="flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 font-mono font-semibold tracking-wide text-[13px]">
            {abierta ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
            {r.accession}
            {r.conditions && r.conditions.length > 0 && <AlertTriangle size={13} className="text-amber-600" />}
          </span>
          <span className="text-[11px] text-muted-foreground">{SITE_LABEL[r.site]}</span>
        </div>
        <p className="text-[12.5px] mt-0.5 text-muted-foreground">{r.displayName}</p>
        <dl className="grid grid-cols-2 gap-x-3 gap-y-1 mt-1.5">
          {datos.map((c) => (
            <div key={c.id} className="min-w-0">
              <dt className="text-[10px] uppercase tracking-wider text-muted-foreground truncate">
                {c.label}
                {c.unit ? ` (${c.unit})` : ""}
              </dt>
              <dd className={`text-[12.5px] ${c.tipo === "numero" ? "tabular-nums" : ""} truncate`}>
                <Celda c={c} r={r} expandida={false} />
              </dd>
            </div>
          ))}
        </dl>
      </button>
      {abierta && (
        <div className="mt-2 pt-2 border-t border-border/60">
          <FilaExpandida accession={r.accession} onFicha={onFicha} />
        </div>
      )}
    </li>
  );
};

/** Estado del guardado en el perfil. Chico y a un costado: informa, no interrumpe. */
const EstadoVista: React.FC<{ estado: ReturnType<typeof useSavedView>["estado"]; personalizada: boolean }> = ({
  estado,
  personalizada,
}) => {
  const texto =
    estado === "guardando"
      ? "Guardando…"
      : estado === "error"
        ? "No se pudo guardar"
        : estado === "guardado"
          ? "Vista guardada en tu perfil"
          : personalizada
            ? "Vista personalizada"
            : "Vista sugerida";
  return (
    <span className={`hidden sm:inline text-[11px] ${estado === "error" ? "text-red-600" : "text-muted-foreground"}`}>
      {texto}
    </span>
  );
};

export default LabAnalysisPage;
