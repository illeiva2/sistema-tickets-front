import { useCallback, useState, type ChangeEvent, type FormEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  Database,
  History,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Wrench,
  X,
} from "lucide-react";
import toast from "react-hot-toast";
import {
  getMaintenanceErrorCode,
  getMaintenanceErrorInfo,
} from "@/features/it/maintenance/api";
import { assetKeys } from "@/features/it/inventory/useAssets";
import { MaintenanceEditorPanel } from "@/features/it/maintenance/components/MaintenanceEditorPanel";
import { MaintenanceMetrics } from "@/features/it/maintenance/components/MaintenanceMetrics";
import { MaintenanceTable } from "@/features/it/maintenance/components/MaintenanceTable";
import {
  MAINTENANCE_STATUSES,
  MAINTENANCE_STATUS_LABELS,
  MAINTENANCE_TYPES,
  MAINTENANCE_TYPE_LABELS,
  type ItMaintenance,
  type MaintenanceListQuery,
  type MaintenanceSaveCommand,
  type MaintenanceStatus,
  type MaintenanceType,
} from "@/features/it/maintenance/types";
import {
  maintenanceKeys,
  useMaintenanceDetail,
  useMaintenanceLookups,
  useMaintenances,
  useSaveMaintenance,
} from "@/features/it/maintenance/useMaintenance";
import "@/features/it/maintenance/maintenance.css";

type EditorState =
  | { mode: "create" }
  | { mode: "edit"; maintenanceId: string }
  | null;

const INITIAL_FILTERS: MaintenanceListQuery = {
  q: "",
  type: "",
  status: "",
  assetId: "",
  supplierId: "",
  scheduledFrom: "",
  scheduledTo: "",
  page: 1,
  pageSize: 10,
};

const STALE_MAINTENANCE_CODES = new Set([
  "ASSET_MAINTENANCE_IN_PROGRESS",
  "ASSET_ALREADY_IN_REPAIR",
  "ASSET_MAINTENANCE_STATE_CONFLICT",
  "MAINTENANCE_STATUS_TRANSITION_INVALID",
]);

function ItMaintenancePage() {
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<MaintenanceListQuery>(INITIAL_FILTERS);
  const [searchDraft, setSearchDraft] = useState("");
  const [editor, setEditor] = useState<EditorState>(null);

  const maintenancesQuery = useMaintenances(filters);
  const lookupsQuery = useMaintenanceLookups();
  const editingId = editor?.mode === "edit" ? editor.maintenanceId : null;
  const detailQuery = useMaintenanceDetail(editingId);
  const saveMaintenance = useSaveMaintenance();

  const closeEditor = useCallback(() => setEditor(null), []);

  const openCreate = () => {
    saveMaintenance.reset();
    setEditor({ mode: "create" });
  };

  const openEdit = (maintenance: ItMaintenance) => {
    saveMaintenance.reset();
    setEditor({ mode: "edit", maintenanceId: maintenance.id });
  };

  const handleSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFilters((current) => ({
      ...current,
      q: searchDraft.trim(),
      page: 1,
    }));
  };

  const handleTypeChange = (event: ChangeEvent<HTMLSelectElement>) => {
    setFilters((current) => ({
      ...current,
      type: event.target.value as MaintenanceType | "",
      page: 1,
    }));
  };

  const handleStatusChange = (event: ChangeEvent<HTMLSelectElement>) => {
    setFilters((current) => ({
      ...current,
      status: event.target.value as MaintenanceStatus | "",
      page: 1,
    }));
  };

  const clearFilters = () => {
    setSearchDraft("");
    setFilters(INITIAL_FILTERS);
  };

  const handleSave = async (command: MaintenanceSaveCommand) => {
    try {
      await saveMaintenance.mutateAsync(command);
      toast.success(
        command.mode === "edit"
          ? "Mantenimiento actualizado"
          : "Mantenimiento registrado",
      );
      closeEditor();
    } catch (error) {
      const code = getMaintenanceErrorCode(error);
      if (code && STALE_MAINTENANCE_CODES.has(code)) {
        void queryClient.invalidateQueries({ queryKey: assetKeys.all });
        void queryClient.invalidateQueries({ queryKey: ["it", "overview"] });
        void queryClient.invalidateQueries({ queryKey: maintenanceKeys.all });

        if (command.mode === "edit") {
          const refreshed = await detailQuery.refetch();
          if (refreshed.isSuccess && refreshed.data) {
            toast.error(
              "El flujo cambió y la intervención fue recargada. Revisá su estado actual.",
            );
          } else {
            queryClient.removeQueries({
              queryKey: maintenanceKeys.detail(command.id),
              exact: true,
            });
            closeEditor();
            toast.error(
              "El flujo cambió, pero no pudo recargarse. Abrí nuevamente la intervención.",
            );
          }
        }
      }
      throw error;
    }
  };

  const reloadCurrentMaintenance = async (): Promise<boolean> => {
    if (!editingId) return false;
    const result = await detailQuery.refetch();
    if (result.isError || !result.data) {
      queryClient.removeQueries({
        queryKey: maintenanceKeys.detail(editingId),
        exact: true,
      });
      setEditor(null);
      saveMaintenance.reset();
      toast.error(
        "La intervención no pudo recargarse y se cerró para evitar sobrescribir datos.",
      );
      return false;
    }
    return true;
  };

  const hasActiveFilters = Boolean(
    filters.q ||
    filters.type ||
    filters.status ||
    filters.supplierId ||
    filters.scheduledFrom ||
    filters.scheduledTo,
  );
  const items = maintenancesQuery.data?.items ?? [];
  const pagination = maintenancesQuery.data?.pagination;
  const totalPages = Math.max(pagination?.totalPages ?? 1, 1);
  const lookups = lookupsQuery.data ?? {
    performers: [],
    suppliers: [],
    tickets: [],
  };
  const lookupsError = lookupsQuery.isError
    ? getMaintenanceErrorInfo(lookupsQuery.error).message
    : undefined;

  return (
    <section className="it-maintenance" aria-labelledby="maintenance-title">
      <div className="maintenance-commandbar">
        <span className="maintenance-wordmark">GRF//OPS</span>
        <span className="maintenance-commandbar__path">
          CMDB / ACTIVOS / MANTENIMIENTO
        </span>
        <span className="maintenance-commandbar__sync" aria-live="polite">
          <Database size={13} aria-hidden="true" />
          {maintenancesQuery.isFetching && !maintenancesQuery.isLoading
            ? "Sincronizando"
            : "API / IT-MNT"}
        </span>
      </div>

      <header className="maintenance-header">
        <div>
          <p className="maintenance-eyebrow">Bitácora técnica / Control 03</p>
          <h1 id="maintenance-title">Mantenimientos</h1>
          <p>
            Agenda e historial de preventivos, correctivos y upgrades con
            trazabilidad de responsables, proveedores, costos y repuestos.
          </p>
        </div>
        <div className="maintenance-header__actions">
          <button
            type="button"
            className="maintenance-icon-button"
            aria-label="Actualizar mantenimientos"
            disabled={maintenancesQuery.isFetching}
            onClick={() => void maintenancesQuery.refetch()}
          >
            <RefreshCw
              size={17}
              className={
                maintenancesQuery.isFetching ? "maintenance-spin" : undefined
              }
              aria-hidden="true"
            />
          </button>
          <button
            type="button"
            className="maintenance-button maintenance-button--primary"
            onClick={openCreate}
          >
            <Plus size={16} aria-hidden="true" /> Nuevo mantenimiento
          </button>
        </div>
      </header>

      <div className="maintenance-content">
        <div className="maintenance-quickviews" aria-label="Vistas rápidas">
          <button
            type="button"
            aria-pressed={filters.status === "SCHEDULED"}
            onClick={() =>
              setFilters((current) => ({
                ...current,
                status: "SCHEDULED",
                page: 1,
              }))
            }
          >
            <CalendarClock size={16} aria-hidden="true" /> Agenda
            <small>Programados</small>
          </button>
          <button
            type="button"
            aria-pressed={filters.status === "COMPLETED"}
            onClick={() =>
              setFilters((current) => ({
                ...current,
                status: "COMPLETED",
                page: 1,
              }))
            }
          >
            <History size={16} aria-hidden="true" /> Historial
            <small>Completados</small>
          </button>
          <button
            type="button"
            aria-pressed={filters.status === ""}
            onClick={() =>
              setFilters((current) => ({ ...current, status: "", page: 1 }))
            }
          >
            <Wrench size={16} aria-hidden="true" /> Todos
            <small>Flujo completo</small>
          </button>
        </div>

        {maintenancesQuery.isLoading ? (
          <div
            className="maintenance-metrics maintenance-metrics--loading"
            aria-hidden="true"
          >
            {Array.from({ length: 4 }, (_, index) => (
              <span key={index} />
            ))}
          </div>
        ) : (
          <MaintenanceMetrics items={items} pagination={pagination} />
        )}

        <form
          className="maintenance-filters"
          aria-label="Buscar y filtrar mantenimientos"
          onSubmit={handleSearch}
        >
          <div className="maintenance-search-field">
            <label htmlFor="maintenance-search">Buscar</label>
            <div>
              <Search size={16} aria-hidden="true" />
              <input
                id="maintenance-search"
                type="search"
                value={searchDraft}
                placeholder="Activo, descripción o ticket"
                onChange={(event) => setSearchDraft(event.target.value)}
              />
              <button type="submit">Buscar</button>
            </div>
          </div>
          <div className="maintenance-filter-field">
            <label htmlFor="maintenance-type">Tipo</label>
            <select
              id="maintenance-type"
              value={filters.type}
              onChange={handleTypeChange}
            >
              <option value="">Todos</option>
              {MAINTENANCE_TYPES.map((type) => (
                <option key={type} value={type}>
                  {MAINTENANCE_TYPE_LABELS[type]}
                </option>
              ))}
            </select>
          </div>
          <div className="maintenance-filter-field">
            <label htmlFor="maintenance-status">Estado</label>
            <select
              id="maintenance-status"
              value={filters.status}
              onChange={handleStatusChange}
            >
              <option value="">Todos</option>
              {MAINTENANCE_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {MAINTENANCE_STATUS_LABELS[status]}
                </option>
              ))}
            </select>
          </div>
          <div className="maintenance-filter-field">
            <label htmlFor="maintenance-supplier">Proveedor</label>
            <select
              id="maintenance-supplier"
              value={filters.supplierId}
              disabled={lookupsQuery.isLoading || lookupsQuery.isError}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  supplierId: event.target.value,
                  page: 1,
                }))
              }
            >
              <option value="">
                {lookupsQuery.isLoading
                  ? "Cargando"
                  : lookupsQuery.isError
                    ? "No disponible"
                    : "Todos"}
              </option>
              {lookups.suppliers.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>
                  {supplier.name}
                </option>
              ))}
            </select>
          </div>
          <div className="maintenance-filter-field">
            <label htmlFor="maintenance-from">Programado desde</label>
            <input
              id="maintenance-from"
              type="date"
              value={filters.scheduledFrom}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  scheduledFrom: event.target.value,
                  page: 1,
                }))
              }
            />
          </div>
          <div className="maintenance-filter-field">
            <label htmlFor="maintenance-to">Hasta</label>
            <input
              id="maintenance-to"
              type="date"
              min={filters.scheduledFrom || undefined}
              value={filters.scheduledTo}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  scheduledTo: event.target.value,
                  page: 1,
                }))
              }
            />
          </div>
          <div className="maintenance-filter-field maintenance-filter-field--rows">
            <label htmlFor="maintenance-page-size">Filas</label>
            <select
              id="maintenance-page-size"
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
          {hasActiveFilters ? (
            <button
              type="button"
              className="maintenance-button maintenance-button--clear"
              onClick={clearFilters}
            >
              <X size={14} aria-hidden="true" /> Limpiar
            </button>
          ) : null}
        </form>

        {lookupsError ? (
          <div className="maintenance-reference-banner" role="alert">
            <AlertTriangle size={17} aria-hidden="true" />
            <div>
              <strong>Referencias parcialmente fuera de línea</strong>
              <p>{lookupsError}</p>
            </div>
            <button
              type="button"
              className="maintenance-button maintenance-button--ghost"
              disabled={lookupsQuery.isFetching}
              onClick={() => void lookupsQuery.refetch()}
            >
              <RefreshCw size={15} aria-hidden="true" /> Reintentar
            </button>
          </div>
        ) : null}

        <div className="maintenance-results-bar">
          <div>
            <SlidersHorizontal size={15} aria-hidden="true" />
            <span aria-live="polite">
              {pagination
                ? `${pagination.total.toLocaleString("es-AR")} intervenciones encontradas`
                : "Esperando respuesta de la bitácora"}
            </span>
          </div>
          {filters.q ? <span>Búsqueda: “{filters.q}”</span> : null}
        </div>

        {maintenancesQuery.isLoading ? (
          <div className="maintenance-state" role="status">
            <Loader2
              size={26}
              className="maintenance-spin"
              aria-hidden="true"
            />
            <strong>Sincronizando bitácora</strong>
            <p>Consultando agenda e historial técnico.</p>
          </div>
        ) : maintenancesQuery.isError ? (
          <div
            className="maintenance-state maintenance-state--error"
            role="alert"
          >
            <AlertTriangle size={28} aria-hidden="true" />
            <strong>No se pudieron cargar los mantenimientos</strong>
            <p>{getMaintenanceErrorInfo(maintenancesQuery.error).message}</p>
            <button
              type="button"
              className="maintenance-button maintenance-button--ghost"
              onClick={() => void maintenancesQuery.refetch()}
            >
              <RefreshCw size={15} aria-hidden="true" /> Reintentar
            </button>
          </div>
        ) : items.length === 0 ? (
          <div className="maintenance-state">
            <Wrench size={30} aria-hidden="true" />
            <strong>
              {hasActiveFilters
                ? "Sin intervenciones para estos filtros"
                : "Todavía no hay mantenimientos registrados"}
            </strong>
            <p>
              {hasActiveFilters
                ? "Ajustá la búsqueda o limpiá los filtros para ampliar el resultado."
                : "Registrá la primera intervención para iniciar la bitácora técnica."}
            </p>
            <button
              type="button"
              className="maintenance-button maintenance-button--ghost"
              onClick={hasActiveFilters ? clearFilters : openCreate}
            >
              {hasActiveFilters ? (
                <X size={15} aria-hidden="true" />
              ) : (
                <Plus size={15} aria-hidden="true" />
              )}
              {hasActiveFilters ? "Limpiar filtros" : "Registrar mantenimiento"}
            </button>
          </div>
        ) : (
          <MaintenanceTable
            items={items}
            openingId={detailQuery.isFetching ? editingId : null}
            onEdit={openEdit}
          />
        )}

        {pagination && pagination.totalPages > 1 ? (
          <nav
            className="maintenance-pagination"
            aria-label="Paginación de mantenimientos"
          >
            <button
              type="button"
              className="maintenance-icon-button"
              aria-label="Página anterior"
              disabled={filters.page <= 1 || maintenancesQuery.isFetching}
              onClick={() =>
                setFilters((current) => ({
                  ...current,
                  page: Math.max(current.page - 1, 1),
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
              className="maintenance-icon-button"
              aria-label="Página siguiente"
              disabled={
                filters.page >= totalPages || maintenancesQuery.isFetching
              }
              onClick={() =>
                setFilters((current) => ({
                  ...current,
                  page: Math.min(current.page + 1, totalPages),
                }))
              }
            >
              <ChevronRight size={17} aria-hidden="true" />
            </button>
          </nav>
        ) : null}
      </div>

      {editor ? (
        <MaintenanceEditorPanel
          key={
            editor.mode === "create"
              ? "create"
              : detailQuery.data
                ? `${detailQuery.data.id}-${detailQuery.data.updatedAt}`
                : `loading-${editor.maintenanceId}`
          }
          mode={editor.mode}
          maintenance={
            editor.mode === "edit" ? (detailQuery.data ?? null) : null
          }
          lookups={lookups}
          lookupsLoading={lookupsQuery.isLoading}
          lookupsError={lookupsError}
          isLoading={editor.mode === "edit" && detailQuery.isPending}
          isSaving={saveMaintenance.isPending}
          loadError={
            editor.mode === "edit" && detailQuery.isError
              ? getMaintenanceErrorInfo(detailQuery.error).message
              : undefined
          }
          onClose={closeEditor}
          onRetry={() => void detailQuery.refetch()}
          onRetryLookups={() => void lookupsQuery.refetch()}
          onReload={reloadCurrentMaintenance}
          onSave={handleSave}
        />
      ) : null}
    </section>
  );
}

export default ItMaintenancePage;
