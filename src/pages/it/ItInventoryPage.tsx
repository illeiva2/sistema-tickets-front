import { useCallback, useState, type ChangeEvent, type FormEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Database,
  Loader2,
  PackageOpen,
  Plus,
  RefreshCw,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "@/hooks";
import {
  getInventoryErrorCode,
  getInventoryErrorMessage,
} from "@/features/it/inventory/api";
import { AssetEditorPanel } from "@/features/it/inventory/components/AssetEditorPanel";
import { AssetMetrics } from "@/features/it/inventory/components/AssetMetrics";
import { AssetTable } from "@/features/it/inventory/components/AssetTable";
import { CustodyPanel } from "@/features/it/inventory/custody/CustodyPanel";
import type {
  AssignAssetPayload,
  ReturnAssetPayload,
} from "@/features/it/inventory/custody/types";
import {
  useAssignAssetCustody,
  useCustodyLookups,
  useReturnAssetCustody,
} from "@/features/it/inventory/custody/useCustody";
import {
  ASSET_STATUSES,
  ASSET_STATUS_LABELS,
  ASSET_TYPES,
  ASSET_TYPE_LABELS,
  type AssetListQuery,
  type AssetStatus,
  type AssetType,
  type AssetSaveCommand,
  type ItAsset,
} from "@/features/it/inventory/types";
import {
  assetKeys,
  useAssetDetail,
  useAssets,
  useSaveAsset,
} from "@/features/it/inventory/useAssets";
import "@/features/it/inventory/inventory.css";

type EditorState =
  | { mode: "create" }
  | { mode: "edit"; assetId: string }
  | null;

const INITIAL_FILTERS: AssetListQuery = {
  q: "",
  type: "",
  status: "",
  page: 1,
  pageSize: 10,
};

function ItInventoryPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<AssetListQuery>(INITIAL_FILTERS);
  const [searchDraft, setSearchDraft] = useState("");
  const [editor, setEditor] = useState<EditorState>(null);
  const [custodyAssetId, setCustodyAssetId] = useState<string | null>(null);

  const assetsQuery = useAssets(filters);
  const editingAssetId = editor?.mode === "edit" ? editor.assetId : null;
  const assetDetail = useAssetDetail(editingAssetId);
  const custodyDetail = useAssetDetail(custodyAssetId);
  const custodyLookups = useCustodyLookups(
    Boolean(custodyAssetId && custodyDetail.data?.status === "IN_STOCK"),
  );
  const saveAsset = useSaveAsset();
  const assignCustody = useAssignAssetCustody();
  const returnCustody = useReturnAssetCustody();

  const closeEditor = useCallback(() => {
    setEditor(null);
  }, []);

  const openCreate = () => {
    saveAsset.reset();
    setEditor({ mode: "create" });
  };

  const openEdit = (asset: ItAsset) => {
    saveAsset.reset();
    setEditor({ mode: "edit", assetId: asset.id });
  };

  const closeCustody = useCallback(() => {
    setCustodyAssetId(null);
  }, []);

  const openCustody = (asset: ItAsset) => {
    setCustodyAssetId(asset.id);
  };

  const handleAssignCustody = async (payload: AssignAssetPayload) => {
    if (!custodyAssetId) throw new Error("No se pudo identificar el activo.");
    await assignCustody.mutateAsync({ assetId: custodyAssetId, payload });
    toast.success("Custodia asignada");
    closeCustody();
  };

  const handleReturnCustody = async (payload: ReturnAssetPayload) => {
    if (!custodyAssetId) throw new Error("No se pudo identificar el activo.");
    await returnCustody.mutateAsync({ assetId: custodyAssetId, payload });
    toast.success("Devolución registrada");
    closeCustody();
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
      type: event.target.value as AssetType | "",
      page: 1,
    }));
  };

  const handleStatusChange = (event: ChangeEvent<HTMLSelectElement>) => {
    setFilters((current) => ({
      ...current,
      status: event.target.value as AssetStatus | "",
      page: 1,
    }));
  };

  const clearFilters = () => {
    setSearchDraft("");
    setFilters(INITIAL_FILTERS);
  };

  const handleSave = async (command: AssetSaveCommand) => {
    try {
      await saveAsset.mutateAsync(command);
      toast.success(
        command.mode === "edit" ? "Activo actualizado" : "Activo registrado",
      );
      closeEditor();
    } catch (error) {
      if (
        command.mode === "edit" &&
        getInventoryErrorCode(error) === "ASSET_VERSION_CONFLICT"
      ) {
        const refreshed = await assetDetail.refetch();
        if (refreshed.isSuccess && refreshed.data) {
          toast.error(
            "La ficha cambió y fue recargada. Revisá la versión nueva antes de guardar.",
          );
        } else {
          queryClient.removeQueries({
            queryKey: assetKeys.detail(command.id),
            exact: true,
          });
          closeEditor();
          toast.error(
            "La ficha cambió, pero no pudo recargarse. Abrila nuevamente antes de editar.",
          );
        }
      }
      throw error;
    }
  };

  const hasActiveFilters = Boolean(filters.q || filters.type || filters.status);
  const assets = assetsQuery.data?.items ?? [];
  const pagination = assetsQuery.data?.pagination;
  const totalPages = Math.max(pagination?.totalPages ?? 1, 1);

  return (
    <section className="it-inventory" aria-labelledby="inventory-title">
      <div className="inventory-commandbar">
        <span className="inventory-wordmark">GRF//OPS</span>
        <span className="inventory-commandbar__path">
          CMDB / INVENTARIO / ACTIVOS
        </span>
        <span className="inventory-commandbar__sync" aria-live="polite">
          <Database size={13} aria-hidden="true" />
          {assetsQuery.isFetching && !assetsQuery.isLoading
            ? "Sincronizando"
            : "API / IT-ASSETS"}
        </span>
      </div>

      <header className="inventory-header">
        <div>
          <p className="inventory-eyebrow">Registro patrimonial / Control 01</p>
          <h1 id="inventory-title">Inventario de activos</h1>
          <p>
            Equipamiento físico, estado, ubicación y especificaciones técnicas.
            Las asignaciones se administran por su flujo de custodia y no desde
            esta ficha.
          </p>
        </div>
        <div className="inventory-header__actions">
          <button
            type="button"
            className="inventory-icon-button"
            aria-label="Actualizar inventario"
            disabled={assetsQuery.isFetching}
            onClick={() => void assetsQuery.refetch()}
          >
            <RefreshCw
              size={17}
              className={assetsQuery.isFetching ? "inventory-spin" : undefined}
              aria-hidden="true"
            />
          </button>
          <button
            type="button"
            className="inventory-button inventory-button--primary"
            onClick={openCreate}
          >
            <Plus size={16} aria-hidden="true" />
            Nuevo activo
          </button>
        </div>
      </header>

      <div className="inventory-content">
        {assetsQuery.isLoading ? (
          <div
            className="inventory-metrics inventory-metrics--loading"
            aria-hidden="true"
          >
            {Array.from({ length: 4 }, (_, index) => (
              <span key={index} />
            ))}
          </div>
        ) : (
          <AssetMetrics assets={assets} pagination={pagination} />
        )}

        <form
          className="inventory-filters"
          aria-label="Buscar y filtrar inventario"
          onSubmit={handleSearch}
        >
          <div className="inventory-search-field">
            <label htmlFor="inventory-search">Buscar activo</label>
            <div>
              <Search size={16} aria-hidden="true" />
              <input
                id="inventory-search"
                type="search"
                value={searchDraft}
                placeholder="Etiqueta, serie, marca o modelo"
                onChange={(event) => setSearchDraft(event.target.value)}
              />
              <button type="submit">Buscar</button>
            </div>
          </div>

          <div className="inventory-filter-field">
            <label htmlFor="inventory-type">Tipo</label>
            <select
              id="inventory-type"
              value={filters.type}
              onChange={handleTypeChange}
            >
              <option value="">Todos los tipos</option>
              {ASSET_TYPES.map((type) => (
                <option key={type} value={type}>
                  {ASSET_TYPE_LABELS[type]}
                </option>
              ))}
            </select>
          </div>

          <div className="inventory-filter-field">
            <label htmlFor="inventory-status">Estado</label>
            <select
              id="inventory-status"
              value={filters.status}
              onChange={handleStatusChange}
            >
              <option value="">Todos los estados</option>
              {ASSET_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {ASSET_STATUS_LABELS[status]}
                </option>
              ))}
            </select>
          </div>

          <div className="inventory-filter-field inventory-filter-field--page-size">
            <label htmlFor="inventory-page-size">Filas</label>
            <select
              id="inventory-page-size"
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
              className="inventory-button inventory-button--clear"
              onClick={clearFilters}
            >
              <X size={14} aria-hidden="true" />
              Limpiar
            </button>
          )}
        </form>

        <div className="inventory-results-bar">
          <div>
            <SlidersHorizontal size={15} aria-hidden="true" />
            <span aria-live="polite">
              {pagination
                ? `${pagination.total.toLocaleString("es-AR")} activos encontrados`
                : "Esperando respuesta del inventario"}
            </span>
          </div>
          {filters.q && <span>Búsqueda: “{filters.q}”</span>}
        </div>

        {assetsQuery.isLoading ? (
          <div className="inventory-state" role="status">
            <Loader2 size={26} className="inventory-spin" aria-hidden="true" />
            <strong>Sincronizando inventario</strong>
            <p>Consultando activos y estado patrimonial.</p>
          </div>
        ) : assetsQuery.isError ? (
          <div className="inventory-state inventory-state--error" role="alert">
            <AlertTriangle size={28} aria-hidden="true" />
            <strong>No se pudo cargar el inventario</strong>
            <p>{getInventoryErrorMessage(assetsQuery.error)}</p>
            <button
              type="button"
              className="inventory-button inventory-button--ghost"
              onClick={() => void assetsQuery.refetch()}
            >
              <RefreshCw size={15} aria-hidden="true" />
              Reintentar
            </button>
          </div>
        ) : assets.length === 0 ? (
          <div className="inventory-state">
            <PackageOpen size={30} aria-hidden="true" />
            <strong>
              {hasActiveFilters
                ? "Sin coincidencias para estos filtros"
                : "Todavía no hay activos registrados"}
            </strong>
            <p>
              {hasActiveFilters
                ? "Ajustá la búsqueda o limpiá los filtros para ampliar el resultado."
                : "Registrá el primer activo para iniciar la trazabilidad patrimonial."}
            </p>
            <button
              type="button"
              className="inventory-button inventory-button--ghost"
              onClick={hasActiveFilters ? clearFilters : openCreate}
            >
              {hasActiveFilters ? (
                <X size={15} aria-hidden="true" />
              ) : (
                <Plus size={15} aria-hidden="true" />
              )}
              {hasActiveFilters ? "Limpiar filtros" : "Registrar activo"}
            </button>
          </div>
        ) : (
          <AssetTable
            assets={assets}
            openingAssetId={assetDetail.isFetching ? editingAssetId : null}
            openingCustodyId={custodyDetail.isFetching ? custodyAssetId : null}
            onEdit={openEdit}
            onCustody={openCustody}
          />
        )}

        {pagination && pagination.totalPages > 1 && (
          <nav
            className="inventory-pagination"
            aria-label="Paginación del inventario"
          >
            <button
              type="button"
              className="inventory-icon-button"
              aria-label="Página anterior"
              disabled={filters.page <= 1 || assetsQuery.isFetching}
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
              className="inventory-icon-button"
              aria-label="Página siguiente"
              disabled={filters.page >= totalPages || assetsQuery.isFetching}
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
        )}
      </div>

      {editor && (
        <AssetEditorPanel
          key={
            editor.mode === "create"
              ? "create"
              : assetDetail.data
                ? `${assetDetail.data.id}-${assetDetail.data.updatedAt}`
                : `loading-${editor.assetId}`
          }
          mode={editor.mode}
          asset={editor.mode === "edit" ? (assetDetail.data ?? null) : null}
          canEditAssetTag={user?.role === "ADMIN"}
          isLoading={editor.mode === "edit" && assetDetail.isPending}
          isSaving={saveAsset.isPending}
          loadError={
            editor.mode === "edit" && assetDetail.isError
              ? getInventoryErrorMessage(assetDetail.error)
              : undefined
          }
          onClose={closeEditor}
          onRetry={() => void assetDetail.refetch()}
          onSave={handleSave}
        />
      )}

      {custodyAssetId ? (
        <CustodyPanel
          key={
            custodyDetail.data
              ? `${custodyDetail.data.id}-${custodyDetail.data.updatedAt}-custody`
              : `loading-${custodyAssetId}-custody`
          }
          asset={custodyDetail.data ?? null}
          isLoading={custodyDetail.isPending}
          loadError={
            custodyDetail.isError
              ? getInventoryErrorMessage(custodyDetail.error)
              : undefined
          }
          people={custodyLookups.people.data?.items ?? []}
          departments={custodyLookups.departments.data ?? []}
          lookupsLoading={
            custodyLookups.people.isPending ||
            custodyLookups.departments.isPending
          }
          lookupsError={
            custodyLookups.people.isError || custodyLookups.departments.isError
              ? getInventoryErrorMessage(
                  custodyLookups.people.error ??
                    custodyLookups.departments.error,
                )
              : undefined
          }
          isSubmitting={assignCustody.isPending || returnCustody.isPending}
          onClose={closeCustody}
          onRetryAsset={() => void custodyDetail.refetch()}
          onRetryLookups={() => {
            void custodyLookups.people.refetch();
            void custodyLookups.departments.refetch();
          }}
          onAssign={handleAssignCustody}
          onReturn={handleReturnCustody}
        />
      ) : null}
    </section>
  );
}

export default ItInventoryPage;
