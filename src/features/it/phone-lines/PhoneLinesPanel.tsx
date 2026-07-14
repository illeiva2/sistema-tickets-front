import { useState, type ChangeEvent, type FormEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Signal,
  Smartphone,
  UserCheck,
  X,
} from "lucide-react";
import toast from "react-hot-toast";
import { fetchPhoneLine, getPhoneLineErrorInfo } from "./api";
import { PhoneLineDetailPanel } from "./components/PhoneLineDetailPanel";
import { PhoneLineEditorPanel } from "./components/PhoneLineEditorPanel";
import { PhoneLineTable } from "./components/PhoneLineTable";
import {
  PHONE_CARRIERS,
  PHONE_CARRIER_LABELS,
  PHONE_LINE_STATUSES,
  PHONE_LINE_STATUS_LABELS,
  type PhoneCarrier,
  type PhoneLine,
  type PhoneLineListQuery,
  type PhoneLineSaveCommand,
  type PhoneLineStatus,
} from "./types";
import {
  phoneLineKeys,
  usePhoneLines,
  useSavePhoneLine,
} from "./usePhoneLines";
import "./phone-lines.css";

type EditorState =
  | { mode: "create" }
  | { mode: "edit"; line: PhoneLine; conflictNotice?: string }
  | null;

const INITIAL_FILTERS: PhoneLineListQuery = {
  q: "",
  status: "",
  carrier: "",
  page: 1,
  pageSize: 10,
};

export function PhoneLinesPanel() {
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<PhoneLineListQuery>(INITIAL_FILTERS);
  const [searchDraft, setSearchDraft] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editor, setEditor] = useState<EditorState>(null);
  const linesQuery = usePhoneLines(filters);
  const saveLine = useSavePhoneLine();
  const lines = linesQuery.data?.items ?? [];
  const pagination = linesQuery.data?.pagination;
  const totalPages = Math.max(pagination?.totalPages ?? 1, 1);
  const hasActiveFilters = Boolean(
    filters.q || filters.status || filters.carrier,
  );
  const assignedVisible = lines.filter((line) => Boolean(line.holder)).length;
  const availableVisible = lines.filter(
    (line) => line.status === "AVAILABLE",
  ).length;
  const withDataVisible = lines.filter(
    (line) =>
      line.dataAllowanceGb !== null && line.dataAllowanceGb !== undefined,
  ).length;

  const handleSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFilters((current) => ({
      ...current,
      q: searchDraft.trim(),
      page: 1,
    }));
  };

  const clearFilters = () => {
    setSearchDraft("");
    setFilters(INITIAL_FILTERS);
  };

  const handleStatusChange = (event: ChangeEvent<HTMLSelectElement>) => {
    setFilters((current) => ({
      ...current,
      status: event.target.value as PhoneLineStatus | "",
      page: 1,
    }));
  };

  const handleSave = async (command: PhoneLineSaveCommand) => {
    try {
      await saveLine.mutateAsync(command);
      toast.success(
        command.mode === "edit" ? "Línea actualizada" : "Línea registrada",
      );
      setEditor(null);
    } catch (error) {
      const info = getPhoneLineErrorInfo(error);
      if (command.mode === "edit" && info.isConflict) {
        try {
          const refreshed = await fetchPhoneLine(command.id);
          queryClient.setQueryData(phoneLineKeys.detail(command.id), refreshed);
          await queryClient.invalidateQueries({
            queryKey: phoneLineKeys.all,
          });
          setEditor({
            mode: "edit",
            line: refreshed,
            conflictNotice:
              "La línea cambió en el servidor. Cargamos la versión actual: revisá los datos y volvé a guardar.",
          });
          toast.error("Se cargó la versión más reciente de la línea");
        } catch {
          toast.error(
            "La línea cambió y no pudimos recargarla. Cerrá el panel y reintentá.",
          );
        }
      }
      throw error;
    }
  };

  const openEdit = (line: PhoneLine) => {
    setSelectedId(null);
    saveLine.reset();
    setEditor({ mode: "edit", line });
  };

  return (
    <div
      id="staff-panel-lines"
      className="staff-content phone-lines-panel"
      role="tabpanel"
      aria-labelledby="staff-tab-lines"
      tabIndex={0}
    >
      <div className="phone-lines-toolbar">
        <div>
          <span>TELECOM / INVENTARIO 08</span>
          <h2>Gestión de líneas</h2>
          <p>Números, planes, custodias y cambios de chip con trazabilidad.</p>
        </div>
        <div>
          <button
            type="button"
            className="staff-icon-button"
            aria-label="Actualizar líneas"
            disabled={linesQuery.isFetching}
            onClick={() => void linesQuery.refetch()}
          >
            <RefreshCw
              size={17}
              className={linesQuery.isFetching ? "staff-spin" : undefined}
              aria-hidden="true"
            />
          </button>
          <button
            type="button"
            className="staff-button staff-button--primary"
            onClick={() => {
              saveLine.reset();
              setEditor({ mode: "create" });
            }}
          >
            <Plus size={16} aria-hidden="true" />
            Nueva línea
          </button>
        </div>
      </div>

      {linesQuery.isLoading ? (
        <div
          className="phone-lines-metrics phone-lines-metrics--loading"
          aria-hidden="true"
        >
          {Array.from({ length: 4 }, (_, index) => (
            <span key={index} />
          ))}
        </div>
      ) : (
        <div className="phone-lines-metrics">
          <article>
            <div>
              <Signal size={15} aria-hidden="true" />
              Total
            </div>
            <strong>{pagination?.total ?? 0}</strong>
            <p>Líneas según filtros actuales</p>
          </article>
          <article data-tone="cyan">
            <div>
              <UserCheck size={15} aria-hidden="true" />
              Asignadas
            </div>
            <strong>{assignedVisible}</strong>
            <p>Visibles en esta página</p>
          </article>
          <article data-tone="amber">
            <div>
              <Smartphone size={15} aria-hidden="true" />
              Disponibles
            </div>
            <strong>{availableVisible}</strong>
            <p>Visibles en esta página</p>
          </article>
          <article>
            <div>
              <Signal size={15} aria-hidden="true" />
              Plan de datos
            </div>
            <strong>{withDataVisible}</strong>
            <p>Con gigas informados en página</p>
          </article>
        </div>
      )}

      <form
        className="phone-lines-filters"
        aria-label="Buscar y filtrar líneas"
        onSubmit={handleSearch}
      >
        <div className="phone-lines-search-field">
          <label htmlFor="phone-lines-search">Buscar línea</label>
          <div>
            <Search size={16} aria-hidden="true" />
            <input
              id="phone-lines-search"
              type="search"
              value={searchDraft}
              placeholder="Número, ICCID, plan o titular"
              onChange={(event) => setSearchDraft(event.target.value)}
            />
            <button type="submit">Buscar</button>
          </div>
        </div>
        <div className="phone-lines-filter-field">
          <label htmlFor="phone-lines-status">Estado</label>
          <select
            id="phone-lines-status"
            value={filters.status}
            onChange={handleStatusChange}
          >
            <option value="">Todos</option>
            {PHONE_LINE_STATUSES.map((status) => (
              <option key={status} value={status}>
                {PHONE_LINE_STATUS_LABELS[status]}
              </option>
            ))}
          </select>
        </div>
        <div className="phone-lines-filter-field">
          <label htmlFor="phone-lines-carrier">Operadora</label>
          <select
            id="phone-lines-carrier"
            value={filters.carrier}
            onChange={(event) =>
              setFilters((current) => ({
                ...current,
                carrier: event.target.value as PhoneCarrier | "",
                page: 1,
              }))
            }
          >
            <option value="">Todas</option>
            {PHONE_CARRIERS.map((carrier) => (
              <option key={carrier} value={carrier}>
                {PHONE_CARRIER_LABELS[carrier]}
              </option>
            ))}
          </select>
        </div>
        <div className="phone-lines-filter-field">
          <label htmlFor="phone-lines-page-size">Filas</label>
          <select
            id="phone-lines-page-size"
            value={filters.pageSize}
            onChange={(event) =>
              setFilters((current) => ({
                ...current,
                pageSize: Number(event.target.value),
                page: 1,
              }))
            }
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
          </select>
        </div>
        {hasActiveFilters && (
          <button
            type="button"
            className="staff-button staff-button--clear"
            onClick={clearFilters}
          >
            <X size={14} aria-hidden="true" />
            Limpiar
          </button>
        )}
      </form>

      <div className="staff-results-bar" aria-live="polite">
        {pagination
          ? `${pagination.total.toLocaleString("es-AR")} líneas encontradas`
          : "Esperando respuesta del inventario"}
        {filters.q && <span>Búsqueda: “{filters.q}”</span>}
      </div>

      {linesQuery.isLoading ? (
        <div className="staff-state" role="status">
          <Loader2 size={26} className="staff-spin" aria-hidden="true" />
          <strong>Sincronizando líneas</strong>
          <p>Consultando números, planes y custodias.</p>
        </div>
      ) : linesQuery.isError ? (
        <div className="staff-state staff-state--error" role="alert">
          <AlertTriangle size={28} aria-hidden="true" />
          <strong>No se pudieron cargar las líneas</strong>
          <p>{getPhoneLineErrorInfo(linesQuery.error).message}</p>
          <button
            type="button"
            className="staff-button staff-button--ghost"
            onClick={() => void linesQuery.refetch()}
          >
            <RefreshCw size={15} aria-hidden="true" />
            Reintentar
          </button>
        </div>
      ) : lines.length === 0 ? (
        <div className="staff-state">
          <Smartphone size={30} aria-hidden="true" />
          <strong>
            {hasActiveFilters
              ? "Sin coincidencias"
              : "Todavía no hay líneas registradas"}
          </strong>
          <p>
            {hasActiveFilters
              ? "Ajustá la búsqueda o limpiá los filtros para ampliar el resultado."
              : "Registrá la primera línea corporativa para iniciar su trazabilidad."}
          </p>
          <button
            type="button"
            className="staff-button staff-button--ghost"
            onClick={
              hasActiveFilters
                ? clearFilters
                : () => setEditor({ mode: "create" })
            }
          >
            {hasActiveFilters ? (
              <X size={15} aria-hidden="true" />
            ) : (
              <Plus size={15} aria-hidden="true" />
            )}
            {hasActiveFilters ? "Limpiar filtros" : "Registrar línea"}
          </button>
        </div>
      ) : (
        <PhoneLineTable
          lines={lines}
          openingId={selectedId}
          onOpen={(line) => setSelectedId(line.id)}
        />
      )}

      {pagination && pagination.totalPages > 1 && (
        <nav className="staff-pagination" aria-label="Paginación de líneas">
          <button
            type="button"
            className="staff-icon-button"
            aria-label="Página anterior"
            disabled={filters.page <= 1 || linesQuery.isFetching}
            onClick={() =>
              setFilters((current) => ({
                ...current,
                page: Math.max(1, current.page - 1),
              }))
            }
          >
            <ChevronLeft size={17} aria-hidden="true" />
          </button>
          <span>
            Página <strong>{pagination.page}</strong> de {totalPages}
          </span>
          <button
            type="button"
            className="staff-icon-button"
            aria-label="Página siguiente"
            disabled={filters.page >= totalPages || linesQuery.isFetching}
            onClick={() =>
              setFilters((current) => ({
                ...current,
                page: Math.min(totalPages, current.page + 1),
              }))
            }
          >
            <ChevronRight size={17} aria-hidden="true" />
          </button>
        </nav>
      )}

      {selectedId && (
        <PhoneLineDetailPanel
          lineId={selectedId}
          onClose={() => setSelectedId(null)}
          onEdit={openEdit}
          onDeleted={() => setSelectedId(null)}
        />
      )}

      {editor && (
        <PhoneLineEditorPanel
          key={
            editor.mode === "create"
              ? "new-line"
              : `${editor.line.id}-${editor.line.updatedAt}`
          }
          mode={editor.mode}
          line={editor.mode === "edit" ? editor.line : null}
          conflictNotice={
            editor.mode === "edit" ? editor.conflictNotice : undefined
          }
          isSaving={saveLine.isPending}
          onClose={() => setEditor(null)}
          onSave={handleSave}
        />
      )}
    </div>
  );
}
