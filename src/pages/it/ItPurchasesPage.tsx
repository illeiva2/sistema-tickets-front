import {
  useCallback,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Database,
  Factory,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  ShoppingCart,
  SlidersHorizontal,
  Truck,
  X,
} from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "@/contexts/AuthContext";
import { getProcurementErrorInfo } from "@/features/it/procurement/api";
import { PurchaseEditorPanel } from "@/features/it/procurement/components/PurchaseEditorPanel";
import { PurchaseMetrics } from "@/features/it/procurement/components/PurchaseMetrics";
import { PurchaseTable } from "@/features/it/procurement/components/PurchaseTable";
import { SupplierEditorPanel } from "@/features/it/procurement/components/SupplierEditorPanel";
import { SupplierTable } from "@/features/it/procurement/components/SupplierTable";
import {
  PURCHASE_CURRENCIES,
  PURCHASE_STATUSES,
  PURCHASE_STATUS_LABELS,
  type Purchase,
  type PurchaseCurrency,
  type PurchaseListQuery,
  type PurchaseSaveCommand,
  type PurchaseStatus,
  type PurchaseTransition,
  type Supplier,
  type SupplierListQuery,
  type SupplierSaveCommand,
} from "@/features/it/procurement/types";
import {
  procurementKeys,
  useProcurementLookups,
  usePurchaseDetail,
  usePurchases,
  useSavePurchase,
  useSaveSupplier,
  useSupplierDetail,
  useSuppliers,
  useTransitionPurchase,
} from "@/features/it/procurement/useProcurement";
import "@/features/it/procurement/procurement.css";

type ActiveTab = "purchases" | "suppliers";
type PurchaseEditor =
  | { mode: "create" }
  | { mode: "edit"; id: string; revision: number }
  | null;
type SupplierEditor =
  | { mode: "create" }
  | { mode: "edit"; id: string; revision: number }
  | null;

const INITIAL_PURCHASE_FILTERS: PurchaseListQuery = {
  q: "",
  status: "",
  supplierId: "",
  currency: "",
  page: 1,
  pageSize: 10,
};

const INITIAL_SUPPLIER_FILTERS: SupplierListQuery = {
  q: "",
  category: "",
  isActive: "true",
  page: 1,
  pageSize: 10,
};

function ItPurchasesPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<ActiveTab>("purchases");
  const [purchaseFilters, setPurchaseFilters] = useState(
    INITIAL_PURCHASE_FILTERS,
  );
  const [purchaseSearch, setPurchaseSearch] = useState("");
  const [supplierFilters, setSupplierFilters] = useState(
    INITIAL_SUPPLIER_FILTERS,
  );
  const [supplierSearch, setSupplierSearch] = useState("");
  const [purchaseEditor, setPurchaseEditor] = useState<PurchaseEditor>(null);
  const [supplierEditor, setSupplierEditor] = useState<SupplierEditor>(null);
  const purchaseTabRef = useRef<HTMLButtonElement>(null);
  const supplierTabRef = useRef<HTMLButtonElement>(null);

  const purchasesQuery = usePurchases(purchaseFilters);
  const suppliersQuery = useSuppliers(supplierFilters);
  const lookupsQuery = useProcurementLookups();
  const purchaseId = purchaseEditor?.mode === "edit" ? purchaseEditor.id : null;
  const supplierId = supplierEditor?.mode === "edit" ? supplierEditor.id : null;
  const purchaseDetail = usePurchaseDetail(purchaseId);
  const supplierDetail = useSupplierDetail(supplierId);
  const savePurchase = useSavePurchase();
  const transitionPurchase = useTransitionPurchase();
  const saveSupplier = useSaveSupplier();

  const closePurchase = useCallback(() => setPurchaseEditor(null), []);
  const closeSupplier = useCallback(() => setSupplierEditor(null), []);

  const selectTab = (tab: ActiveTab) => {
    setActiveTab(tab);
    if (tab === "purchases") purchaseTabRef.current?.focus();
    else supplierTabRef.current?.focus();
  };

  const handleTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (
      event.key !== "ArrowLeft" &&
      event.key !== "ArrowRight" &&
      event.key !== "Home" &&
      event.key !== "End"
    )
      return;
    event.preventDefault();
    if (event.key === "Home") selectTab("purchases");
    else if (event.key === "End") selectTab("suppliers");
    else selectTab(activeTab === "purchases" ? "suppliers" : "purchases");
  };

  const openPurchase = (purchase: Purchase) => {
    savePurchase.reset();
    transitionPurchase.reset();
    setPurchaseEditor({ mode: "edit", id: purchase.id, revision: 0 });
  };

  const openSupplier = (supplier: Supplier) => {
    saveSupplier.reset();
    setSupplierEditor({ mode: "edit", id: supplier.id, revision: 0 });
  };

  const savePurchaseCommand = async (command: PurchaseSaveCommand) => {
    await savePurchase.mutateAsync(command);
    toast.success(
      command.mode === "create"
        ? "Solicitud de compra creada"
        : "Orden actualizada",
    );
    closePurchase();
  };

  const transitionPurchaseCommand = async (
    transition: PurchaseTransition,
    expectedUpdatedAt: string,
    reason?: string,
  ) => {
    if (!purchaseId) return;
    await transitionPurchase.mutateAsync({
      id: purchaseId,
      transition,
      expectedUpdatedAt,
      reason,
    });
    const messages: Record<PurchaseTransition, string> = {
      approve: "Compra autorizada",
      order: "Orden marcada como pedida",
      receive: "Recepción confirmada",
      cancel: "Orden cancelada",
    };
    toast.success(messages[transition]);
    closePurchase();
  };

  const saveSupplierCommand = async (command: SupplierSaveCommand) => {
    await saveSupplier.mutateAsync(command);
    toast.success(
      command.mode === "create" ? "Proveedor creado" : "Proveedor actualizado",
    );
    closeSupplier();
  };

  const reloadPurchase = async () => {
    if (!purchaseId) return null;
    const result = await purchaseDetail.refetch();
    if (result.isError || !result.data) {
      queryClient.removeQueries({
        queryKey: procurementKeys.purchaseDetail(purchaseId),
        exact: true,
      });
      closePurchase();
      toast.error(
        "La orden no pudo recargarse y se cerró para evitar sobrescribir datos.",
      );
      return null;
    }
    return result.data;
  };

  const reloadSupplier = async () => {
    if (!supplierId) return null;
    const result = await supplierDetail.refetch();
    if (result.isError || !result.data) {
      queryClient.removeQueries({
        queryKey: procurementKeys.supplierDetail(supplierId),
        exact: true,
      });
      closeSupplier();
      toast.error(
        "El proveedor no pudo recargarse y se cerró para evitar sobrescribir datos.",
      );
      return null;
    }
    return result.data;
  };

  const submitPurchaseSearch = (event: FormEvent) => {
    event.preventDefault();
    setPurchaseFilters((current) => ({
      ...current,
      q: purchaseSearch.trim(),
      page: 1,
    }));
  };

  const submitSupplierSearch = (event: FormEvent) => {
    event.preventDefault();
    setSupplierFilters((current) => ({
      ...current,
      q: supplierSearch.trim(),
      page: 1,
    }));
  };

  const purchaseItems = purchasesQuery.data?.items ?? [];
  const supplierItems = suppliersQuery.data?.items ?? [];
  const purchasePagination = purchasesQuery.data?.pagination;
  const supplierPagination = suppliersQuery.data?.pagination;
  const lookups = lookupsQuery.data ?? { suppliers: [] };
  const lookupError = lookupsQuery.isError
    ? getProcurementErrorInfo(lookupsQuery.error).message
    : undefined;
  const purchaseFiltersActive = Boolean(
    purchaseFilters.q ||
    purchaseFilters.status ||
    purchaseFilters.supplierId ||
    purchaseFilters.currency,
  );
  const supplierFiltersActive = Boolean(
    supplierFilters.q ||
    supplierFilters.category ||
    supplierFilters.isActive !== "true",
  );
  const currentQuery =
    activeTab === "purchases" ? purchasesQuery : suppliersQuery;

  return (
    <section className="it-procurement" aria-labelledby="procurement-title">
      <div className="procurement-commandbar">
        <span className="procurement-wordmark">GRF//SUPPLY</span>
        <span className="procurement-commandbar__path">
          IT / ABASTECIMIENTO / CONTROL
        </span>
        <span className="procurement-commandbar__sync" aria-live="polite">
          <Database size={13} aria-hidden="true" />
          {currentQuery.isFetching && !currentQuery.isLoading
            ? "Sincronizando"
            : "API / IT-PRC"}
        </span>
      </div>
      <header className="procurement-header">
        <div>
          <p className="procurement-eyebrow">
            Cadena de suministro / Control 04
          </p>
          <h1 id="procurement-title">Compras y proveedores</h1>
          <p>
            Decisiones, costos y autorizaciones trazables desde la solicitud
            hasta el alta manual de cada activo recibido.
          </p>
        </div>
        <div className="procurement-header__actions">
          <button
            type="button"
            className="procurement-icon-button"
            aria-label="Actualizar vista"
            disabled={currentQuery.isFetching}
            onClick={() => void currentQuery.refetch()}
          >
            <RefreshCw
              size={17}
              className={
                currentQuery.isFetching ? "procurement-spin" : undefined
              }
              aria-hidden="true"
            />
          </button>
          <button
            type="button"
            className="procurement-button procurement-button--primary"
            onClick={() =>
              activeTab === "purchases"
                ? setPurchaseEditor({ mode: "create" })
                : setSupplierEditor({ mode: "create" })
            }
          >
            <Plus size={16} aria-hidden="true" />
            {activeTab === "purchases" ? "Nueva orden" : "Nuevo proveedor"}
          </button>
        </div>
      </header>

      <div
        className="procurement-tabs"
        role="tablist"
        aria-label="Compras y proveedores"
      >
        <button
          ref={purchaseTabRef}
          id="purchase-tab"
          type="button"
          role="tab"
          aria-selected={activeTab === "purchases"}
          aria-controls="purchase-panel"
          tabIndex={activeTab === "purchases" ? 0 : -1}
          onKeyDown={handleTabKeyDown}
          onClick={() => setActiveTab("purchases")}
        >
          <ShoppingCart size={17} aria-hidden="true" />
          <span>Órdenes</span>
          <small>Solicitud → recepción</small>
        </button>
        <button
          ref={supplierTabRef}
          id="supplier-tab"
          type="button"
          role="tab"
          aria-selected={activeTab === "suppliers"}
          aria-controls="supplier-panel"
          tabIndex={activeTab === "suppliers" ? 0 : -1}
          onKeyDown={handleTabKeyDown}
          onClick={() => setActiveTab("suppliers")}
        >
          <Truck size={17} aria-hidden="true" />
          <span>Proveedores</span>
          <small>Padrón empresarial</small>
        </button>
      </div>

      {activeTab === "purchases" ? (
        <div
          id="purchase-panel"
          className="procurement-content"
          role="tabpanel"
          aria-labelledby="purchase-tab"
        >
          {purchasesQuery.isLoading ? (
            <div
              className="procurement-metrics procurement-metrics--loading"
              aria-hidden="true"
            >
              {Array.from({ length: 4 }, (_, index) => (
                <span key={index} />
              ))}
            </div>
          ) : (
            <PurchaseMetrics
              items={purchaseItems}
              pagination={purchasePagination}
            />
          )}
          <form
            className="procurement-filters"
            aria-label="Buscar y filtrar compras"
            onSubmit={submitPurchaseSearch}
          >
            <div className="procurement-search-field">
              <label htmlFor="purchase-search">Buscar</label>
              <div>
                <Search size={16} aria-hidden="true" />
                <input
                  id="purchase-search"
                  type="search"
                  value={purchaseSearch}
                  placeholder="OC, motivo, factura o proveedor"
                  onChange={(event) => setPurchaseSearch(event.target.value)}
                />
                <button type="submit">Buscar</button>
              </div>
            </div>
            <div className="procurement-filter-field">
              <label htmlFor="purchase-status">Estado</label>
              <select
                id="purchase-status"
                value={purchaseFilters.status}
                onChange={(event: ChangeEvent<HTMLSelectElement>) =>
                  setPurchaseFilters((current) => ({
                    ...current,
                    status: event.target.value as PurchaseStatus | "",
                    page: 1,
                  }))
                }
              >
                <option value="">Todos</option>
                {PURCHASE_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {PURCHASE_STATUS_LABELS[status]}
                  </option>
                ))}
              </select>
            </div>
            <div className="procurement-filter-field">
              <label htmlFor="purchase-supplier">Proveedor</label>
              <select
                id="purchase-supplier"
                disabled={lookupsQuery.isLoading || Boolean(lookupError)}
                value={purchaseFilters.supplierId}
                onChange={(event) =>
                  setPurchaseFilters((current) => ({
                    ...current,
                    supplierId: event.target.value,
                    page: 1,
                  }))
                }
              >
                <option value="">Todos</option>
                {lookups.suppliers.map((supplier) => (
                  <option key={supplier.id} value={supplier.id}>
                    {supplier.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="procurement-filter-field">
              <label htmlFor="purchase-currency">Moneda</label>
              <select
                id="purchase-currency"
                value={purchaseFilters.currency}
                onChange={(event) =>
                  setPurchaseFilters((current) => ({
                    ...current,
                    currency: event.target.value as PurchaseCurrency | "",
                    page: 1,
                  }))
                }
              >
                <option value="">Todas</option>
                {PURCHASE_CURRENCIES.map((currency) => (
                  <option key={currency}>{currency}</option>
                ))}
              </select>
            </div>
            <div className="procurement-filter-field procurement-filter-field--rows">
              <label htmlFor="purchase-rows">Filas</label>
              <select
                id="purchase-rows"
                value={purchaseFilters.pageSize}
                onChange={(event) =>
                  setPurchaseFilters((current) => ({
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
            {purchaseFiltersActive ? (
              <button
                type="button"
                className="procurement-button procurement-button--clear"
                onClick={() => {
                  setPurchaseSearch("");
                  setPurchaseFilters(INITIAL_PURCHASE_FILTERS);
                }}
              >
                <X size={14} aria-hidden="true" /> Limpiar
              </button>
            ) : null}
          </form>
          {lookupError ? (
            <div className="procurement-reference-banner" role="alert">
              <AlertTriangle size={17} aria-hidden="true" />
              <div>
                <strong>Proveedores temporalmente fuera de línea</strong>
                <p>{lookupError}</p>
              </div>
              <button
                type="button"
                className="procurement-button procurement-button--ghost"
                onClick={() => void lookupsQuery.refetch()}
              >
                Reintentar
              </button>
            </div>
          ) : null}
          <div className="procurement-results-bar">
            <div>
              <SlidersHorizontal size={15} aria-hidden="true" />
              <span aria-live="polite">
                {purchasePagination
                  ? `${purchasePagination.total.toLocaleString("es-AR")} órdenes encontradas`
                  : "Esperando respuesta"}
              </span>
            </div>
            {purchaseFilters.q ? (
              <span>Búsqueda: “{purchaseFilters.q}”</span>
            ) : null}
          </div>
          {purchasesQuery.isLoading ? (
            <LoadingState label="Sincronizando órdenes" />
          ) : purchasesQuery.isError ? (
            <ErrorState
              title="No se pudieron cargar las órdenes"
              error={purchasesQuery.error}
              onRetry={() => void purchasesQuery.refetch()}
            />
          ) : purchaseItems.length === 0 ? (
            <EmptyState
              icon="purchase"
              filtered={purchaseFiltersActive}
              onAction={() =>
                purchaseFiltersActive
                  ? (setPurchaseSearch(""),
                    setPurchaseFilters(INITIAL_PURCHASE_FILTERS))
                  : setPurchaseEditor({ mode: "create" })
              }
            />
          ) : (
            <PurchaseTable
              items={purchaseItems}
              openingId={purchaseDetail.isFetching ? purchaseId : null}
              onOpen={openPurchase}
            />
          )}
          <Pagination
            current={purchaseFilters.page}
            pagination={purchasePagination}
            fetching={purchasesQuery.isFetching}
            onPage={(page) =>
              setPurchaseFilters((current) => ({ ...current, page }))
            }
            label="Paginación de órdenes"
          />
        </div>
      ) : (
        <div
          id="supplier-panel"
          className="procurement-content"
          role="tabpanel"
          aria-labelledby="supplier-tab"
        >
          <div className="procurement-privacy-banner" role="note">
            <Factory size={18} aria-hidden="true" />
            <div>
              <strong>Directorio exclusivamente empresarial</strong>
              <p>
                Contactos comerciales y canales laborales. Sin datos
                particulares, bancarios ni credenciales.
              </p>
            </div>
          </div>
          <form
            className="procurement-filters procurement-filters--suppliers"
            aria-label="Buscar y filtrar proveedores"
            onSubmit={submitSupplierSearch}
          >
            <div className="procurement-search-field">
              <label htmlFor="supplier-search">Buscar</label>
              <div>
                <Search size={16} aria-hidden="true" />
                <input
                  id="supplier-search"
                  type="search"
                  value={supplierSearch}
                  placeholder="Nombre, CUIT o categoría"
                  onChange={(event) => setSupplierSearch(event.target.value)}
                />
                <button type="submit">Buscar</button>
              </div>
            </div>
            <div className="procurement-filter-field">
              <label htmlFor="supplier-category">Categoría</label>
              <input
                id="supplier-category"
                value={supplierFilters.category}
                placeholder="hardware"
                onChange={(event) =>
                  setSupplierFilters((current) => ({
                    ...current,
                    category: event.target.value,
                    page: 1,
                  }))
                }
              />
            </div>
            <div className="procurement-filter-field">
              <label htmlFor="supplier-status">Estado</label>
              <select
                id="supplier-status"
                value={supplierFilters.isActive}
                onChange={(event) =>
                  setSupplierFilters((current) => ({
                    ...current,
                    isActive: event.target
                      .value as SupplierListQuery["isActive"],
                    page: 1,
                  }))
                }
              >
                <option value="">Todos</option>
                <option value="true">Activos</option>
                <option value="false">Inactivos</option>
              </select>
            </div>
            <div className="procurement-filter-field procurement-filter-field--rows">
              <label htmlFor="supplier-rows">Filas</label>
              <select
                id="supplier-rows"
                value={supplierFilters.pageSize}
                onChange={(event) =>
                  setSupplierFilters((current) => ({
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
            {supplierFiltersActive ? (
              <button
                type="button"
                className="procurement-button procurement-button--clear"
                onClick={() => {
                  setSupplierSearch("");
                  setSupplierFilters(INITIAL_SUPPLIER_FILTERS);
                }}
              >
                <X size={14} aria-hidden="true" /> Limpiar
              </button>
            ) : null}
          </form>
          <div className="procurement-results-bar">
            <div>
              <SlidersHorizontal size={15} aria-hidden="true" />
              <span aria-live="polite">
                {supplierPagination
                  ? `${supplierPagination.total.toLocaleString("es-AR")} proveedores encontrados`
                  : "Esperando respuesta"}
              </span>
            </div>
            {supplierFilters.q ? (
              <span>Búsqueda: “{supplierFilters.q}”</span>
            ) : null}
          </div>
          {suppliersQuery.isLoading ? (
            <LoadingState label="Sincronizando proveedores" />
          ) : suppliersQuery.isError ? (
            <ErrorState
              title="No se pudieron cargar los proveedores"
              error={suppliersQuery.error}
              onRetry={() => void suppliersQuery.refetch()}
            />
          ) : supplierItems.length === 0 ? (
            <EmptyState
              icon="supplier"
              filtered={supplierFiltersActive}
              onAction={() =>
                supplierFiltersActive
                  ? (setSupplierSearch(""),
                    setSupplierFilters(INITIAL_SUPPLIER_FILTERS))
                  : setSupplierEditor({ mode: "create" })
              }
            />
          ) : (
            <SupplierTable
              items={supplierItems}
              openingId={supplierDetail.isFetching ? supplierId : null}
              onEdit={openSupplier}
            />
          )}
          <Pagination
            current={supplierFilters.page}
            pagination={supplierPagination}
            fetching={suppliersQuery.isFetching}
            onPage={(page) =>
              setSupplierFilters((current) => ({ ...current, page }))
            }
            label="Paginación de proveedores"
          />
        </div>
      )}

      {purchaseEditor ? (
        <PurchaseEditorPanel
          key={
            purchaseEditor.mode === "create"
              ? "purchase-create"
              : `purchase-${purchaseEditor.id}-${purchaseEditor.revision}`
          }
          mode={purchaseEditor.mode}
          purchase={
            purchaseEditor.mode === "edit"
              ? (purchaseDetail.data ?? null)
              : null
          }
          lookups={lookups}
          isLoading={purchaseEditor.mode === "edit" && purchaseDetail.isPending}
          isSaving={savePurchase.isPending}
          isTransitioning={transitionPurchase.isPending}
          loadError={
            purchaseEditor.mode === "edit" && purchaseDetail.isError
              ? getProcurementErrorInfo(purchaseDetail.error).message
              : undefined
          }
          lookupError={lookupError}
          currentUserId={user?.id}
          isAdmin={user?.role === "ADMIN"}
          onClose={closePurchase}
          onRetry={() => void purchaseDetail.refetch()}
          onRetryLookups={() => void lookupsQuery.refetch()}
          onReload={reloadPurchase}
          onSave={savePurchaseCommand}
          onTransition={transitionPurchaseCommand}
        />
      ) : null}
      {supplierEditor ? (
        <SupplierEditorPanel
          key={
            supplierEditor.mode === "create"
              ? "supplier-create"
              : `supplier-${supplierEditor.id}-${supplierEditor.revision}`
          }
          mode={supplierEditor.mode}
          supplier={
            supplierEditor.mode === "edit"
              ? (supplierDetail.data ?? null)
              : null
          }
          isLoading={supplierEditor.mode === "edit" && supplierDetail.isPending}
          isSaving={saveSupplier.isPending}
          loadError={
            supplierEditor.mode === "edit" && supplierDetail.isError
              ? getProcurementErrorInfo(supplierDetail.error).message
              : undefined
          }
          onClose={closeSupplier}
          onRetry={() => void supplierDetail.refetch()}
          onReload={reloadSupplier}
          onSave={saveSupplierCommand}
        />
      ) : null}
    </section>
  );
}

interface StateProps {
  label?: string;
  title?: string;
  error?: unknown;
  onRetry?: () => void;
}
function LoadingState({ label }: StateProps) {
  return (
    <div className="procurement-state" role="status">
      <Loader2 className="procurement-spin" aria-hidden="true" />
      <strong>{label}</strong>
      <p>Consultando el circuito de abastecimiento.</p>
    </div>
  );
}
function ErrorState({ title, error, onRetry }: StateProps) {
  return (
    <div className="procurement-state procurement-state--error" role="alert">
      <AlertTriangle aria-hidden="true" />
      <strong>{title}</strong>
      <p>{getProcurementErrorInfo(error).message}</p>
      <button
        type="button"
        className="procurement-button procurement-button--ghost"
        onClick={onRetry}
      >
        Reintentar
      </button>
    </div>
  );
}

interface EmptyStateProps {
  icon: "purchase" | "supplier";
  filtered: boolean;
  onAction: () => void;
}
function EmptyState({ icon, filtered, onAction }: EmptyStateProps) {
  const Icon = icon === "purchase" ? ShoppingCart : Truck;
  return (
    <div className="procurement-state">
      <Icon aria-hidden="true" />
      <strong>
        {filtered
          ? "Sin resultados para estos filtros"
          : icon === "purchase"
            ? "Todavía no hay órdenes registradas"
            : "Todavía no hay proveedores registrados"}
      </strong>
      <p>
        {filtered
          ? "Ajustá la búsqueda o limpiá los filtros."
          : "Creá el primer registro para iniciar el circuito."}
      </p>
      <button
        type="button"
        className="procurement-button procurement-button--ghost"
        onClick={onAction}
      >
        {filtered ? (
          <X size={15} aria-hidden="true" />
        ) : (
          <Plus size={15} aria-hidden="true" />
        )}
        {filtered
          ? "Limpiar filtros"
          : icon === "purchase"
            ? "Crear solicitud"
            : "Crear proveedor"}
      </button>
    </div>
  );
}

interface PaginationProps {
  current: number;
  pagination?: { totalPages: number; page: number };
  fetching: boolean;
  onPage: (page: number) => void;
  label: string;
}
function Pagination({
  current,
  pagination,
  fetching,
  onPage,
  label,
}: PaginationProps) {
  if (!pagination || pagination.totalPages <= 1) return null;
  return (
    <nav className="procurement-pagination" aria-label={label}>
      <button
        type="button"
        className="procurement-icon-button"
        aria-label="Página anterior"
        disabled={current <= 1 || fetching}
        onClick={() => onPage(Math.max(1, current - 1))}
      >
        <ChevronLeft size={17} aria-hidden="true" />
      </button>
      <span>
        Página <strong>{pagination.page}</strong> de {pagination.totalPages}
      </span>
      <button
        type="button"
        className="procurement-icon-button"
        aria-label="Página siguiente"
        disabled={current >= pagination.totalPages || fetching}
        onClick={() => onPage(Math.min(pagination.totalPages, current + 1))}
      >
        <ChevronRight size={17} aria-hidden="true" />
      </button>
    </nav>
  );
}

export default ItPurchasesPage;
