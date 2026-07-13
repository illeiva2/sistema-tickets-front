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
  Loader2,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Smartphone,
  Users,
  X,
} from "lucide-react";
import toast from "react-hot-toast";
import { getStaffErrorInfo } from "@/features/it/staff/api";
import { PersonEditorPanel } from "@/features/it/staff/components/PersonEditorPanel";
import { StaffMetrics } from "@/features/it/staff/components/StaffMetrics";
import { StaffTable } from "@/features/it/staff/components/StaffTable";
import {
  EMPLOYMENT_STATUSES,
  EMPLOYMENT_STATUS_LABELS,
  type EmploymentStatus,
  type StaffListQuery,
  type StaffPerson,
  type StaffSaveCommand,
} from "@/features/it/staff/types";
import {
  staffKeys,
  usePeople,
  usePersonDetail,
  useSavePerson,
  useStaffDepartments,
} from "@/features/it/staff/useStaff";
import "@/features/it/staff/staff.css";

type StaffTab = "people" | "lines";
type EditorState =
  | { mode: "create" }
  | { mode: "edit"; personId: string }
  | null;

const INITIAL_FILTERS: StaffListQuery = {
  q: "",
  status: "",
  departmentId: "",
  page: 1,
  pageSize: 10,
};

function ItStaffPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<StaffTab>("people");
  const [filters, setFilters] = useState<StaffListQuery>(INITIAL_FILTERS);
  const [searchDraft, setSearchDraft] = useState("");
  const [editor, setEditor] = useState<EditorState>(null);
  const peopleTabRef = useRef<HTMLButtonElement>(null);
  const linesTabRef = useRef<HTMLButtonElement>(null);

  const peopleQuery = usePeople(filters);
  const departmentsQuery = useStaffDepartments();
  const editingPersonId = editor?.mode === "edit" ? editor.personId : null;
  const personDetail = usePersonDetail(editingPersonId);
  const savePerson = useSavePerson();

  const closeEditor = useCallback(() => {
    setEditor(null);
  }, []);

  const openCreate = () => {
    savePerson.reset();
    setEditor({ mode: "create" });
  };

  const openEdit = (person: StaffPerson) => {
    savePerson.reset();
    setEditor({ mode: "edit", personId: person.id });
  };

  const handleSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFilters((current) => ({
      ...current,
      q: searchDraft.trim(),
      page: 1,
    }));
  };

  const handleStatusChange = (event: ChangeEvent<HTMLSelectElement>) => {
    setFilters((current) => ({
      ...current,
      status: event.target.value as EmploymentStatus | "",
      page: 1,
    }));
  };

  const clearFilters = () => {
    setSearchDraft("");
    setFilters(INITIAL_FILTERS);
  };

  const handleTabKeyDown = (
    event: KeyboardEvent<HTMLButtonElement>,
    currentTab: StaffTab,
  ) => {
    let nextTab: StaffTab | null = null;
    if (event.key === "Home") nextTab = "people";
    else if (event.key === "End") nextTab = "lines";
    else if (event.key === "ArrowRight") {
      nextTab = currentTab === "people" ? "lines" : "people";
    } else if (event.key === "ArrowLeft") {
      nextTab = currentTab === "people" ? "lines" : "people";
    }

    if (!nextTab) return;
    event.preventDefault();
    setActiveTab(nextTab);
    (nextTab === "people" ? peopleTabRef : linesTabRef).current?.focus();
  };

  const handleSave = async (command: StaffSaveCommand) => {
    await savePerson.mutateAsync(command);
    toast.success(
      command.mode === "edit" ? "Persona actualizada" : "Persona registrada",
    );
    closeEditor();
  };

  const reloadCurrentPerson = async (): Promise<boolean> => {
    if (!editingPersonId) return false;
    const result = await personDetail.refetch();
    if (result.isError) {
      queryClient.removeQueries({
        queryKey: staffKeys.detail(editingPersonId),
      });
      setEditor(null);
      savePerson.reset();
      toast.error(
        "La ficha no pudo recargarse y se cerró para evitar sobrescribir datos.",
      );
      return false;
    }
    return true;
  };

  const hasActiveFilters = Boolean(
    filters.q || filters.status || filters.departmentId,
  );
  const people = peopleQuery.data?.items ?? [];
  const pagination = peopleQuery.data?.pagination;
  const totalPages = Math.max(pagination?.totalPages ?? 1, 1);
  const departments = departmentsQuery.data ?? [];
  const departmentsError = departmentsQuery.isError
    ? getStaffErrorInfo(departmentsQuery.error).message
    : undefined;

  return (
    <section className="it-staff" aria-labelledby="staff-title">
      <div className="staff-commandbar">
        <span className="staff-wordmark">GRF//OPS</span>
        <span className="staff-commandbar__path">
          ORG / PERSONAL / CUSTODIA
        </span>
        <span className="staff-commandbar__sync" aria-live="polite">
          <Database size={13} aria-hidden="true" />
          {peopleQuery.isFetching && !peopleQuery.isLoading
            ? "Sincronizando"
            : "API / IT-PEOPLE"}
        </span>
      </div>

      <header className="staff-header">
        <div>
          <p className="staff-eyebrow">Padrón laboral / Control 02</p>
          <h1 id="staff-title">Personal y líneas</h1>
          <p>
            Personas, estado laboral y sector para sostener la custodia de
            activos. El padrón almacena sólo información de trabajo.
          </p>
        </div>
        {activeTab === "people" && (
          <div className="staff-header__actions">
            <button
              type="button"
              className="staff-icon-button"
              aria-label="Actualizar personal"
              disabled={peopleQuery.isFetching}
              onClick={() => void peopleQuery.refetch()}
            >
              <RefreshCw
                size={17}
                className={peopleQuery.isFetching ? "staff-spin" : undefined}
                aria-hidden="true"
              />
            </button>
            <button
              type="button"
              className="staff-button staff-button--primary"
              onClick={openCreate}
            >
              <Plus size={16} aria-hidden="true" />
              Nueva persona
            </button>
          </div>
        )}
      </header>

      <div className="staff-tabs" role="tablist" aria-label="Personal y líneas">
        <button
          ref={peopleTabRef}
          id="staff-tab-people"
          type="button"
          role="tab"
          aria-selected={activeTab === "people"}
          aria-controls="staff-panel-people"
          tabIndex={activeTab === "people" ? 0 : -1}
          onKeyDown={(event) => handleTabKeyDown(event, "people")}
          onClick={() => setActiveTab("people")}
        >
          <Users size={16} aria-hidden="true" />
          Personal
          <span>Operativo</span>
        </button>
        <button
          ref={linesTabRef}
          id="staff-tab-lines"
          type="button"
          role="tab"
          aria-selected={activeTab === "lines"}
          aria-controls="staff-panel-lines"
          tabIndex={activeTab === "lines" ? 0 : -1}
          onKeyDown={(event) => handleTabKeyDown(event, "lines")}
          onClick={() => setActiveTab("lines")}
        >
          <Smartphone size={16} aria-hidden="true" />
          Líneas
          <span data-state="pending">En preparación</span>
        </button>
      </div>

      {activeTab === "lines" ? (
        <div
          id="staff-panel-lines"
          className="staff-lines-panel"
          role="tabpanel"
          aria-labelledby="staff-tab-lines"
          tabIndex={0}
        >
          <Smartphone size={34} aria-hidden="true" />
          <span>PRÓXIMO MÓDULO / LÍNEAS</span>
          <h2>Gestión de líneas en preparación</h2>
          <p>
            Operadora, plan, costo e historial de tenencia se incorporarán en un
            corte posterior. Esta vista todavía no muestra ni solicita números
            de línea.
          </p>
        </div>
      ) : (
        <div
          id="staff-panel-people"
          className="staff-content"
          role="tabpanel"
          aria-labelledby="staff-tab-people"
          tabIndex={0}
        >
          <div className="staff-privacy-banner" role="note">
            <ShieldCheck size={18} aria-hidden="true" />
            <p>
              <strong>Datos laborales únicamente.</strong> No registrar DNI,
              domicilio, contacto personal, salud ni información sensible.
            </p>
          </div>

          {peopleQuery.isLoading ? (
            <div
              className="staff-metrics staff-metrics--loading"
              aria-hidden="true"
            >
              {Array.from({ length: 4 }, (_, index) => (
                <span key={index} />
              ))}
            </div>
          ) : (
            <StaffMetrics people={people} pagination={pagination} />
          )}

          <form
            className="staff-filters"
            aria-label="Buscar y filtrar personal"
            onSubmit={handleSearch}
          >
            <div className="staff-search-field">
              <label htmlFor="staff-search">Buscar persona</label>
              <div>
                <Search size={16} aria-hidden="true" />
                <input
                  id="staff-search"
                  type="search"
                  value={searchDraft}
                  placeholder="Legajo, nombre, email o puesto"
                  onChange={(event) => setSearchDraft(event.target.value)}
                />
                <button type="submit">Buscar</button>
              </div>
            </div>

            <div className="staff-filter-field">
              <label htmlFor="staff-status">Estado</label>
              <select
                id="staff-status"
                value={filters.status}
                onChange={handleStatusChange}
              >
                <option value="">Todos los estados</option>
                {EMPLOYMENT_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {EMPLOYMENT_STATUS_LABELS[status]}
                  </option>
                ))}
              </select>
            </div>

            <div className="staff-filter-field">
              <label htmlFor="staff-department">Sector</label>
              <select
                id="staff-department"
                value={filters.departmentId}
                disabled={
                  departmentsQuery.isLoading || departmentsQuery.isError
                }
                onChange={(event) =>
                  setFilters((current) => ({
                    ...current,
                    departmentId: event.target.value,
                    page: 1,
                  }))
                }
              >
                <option value="">
                  {departmentsQuery.isLoading
                    ? "Cargando sectores"
                    : departmentsQuery.isError
                      ? "Sectores no disponibles"
                      : "Todos los sectores"}
                </option>
                {departments.map((department) => (
                  <option key={department.id} value={department.id}>
                    {department.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="staff-filter-field staff-filter-field--page-size">
              <label htmlFor="staff-page-size">Filas</label>
              <select
                id="staff-page-size"
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

          {departmentsError && (
            <div className="staff-reference-error" role="alert">
              <AlertTriangle size={17} aria-hidden="true" />
              <div>
                <strong>No se pudieron cargar los sectores</strong>
                <p>{departmentsError}</p>
              </div>
              <button
                type="button"
                className="staff-button staff-button--ghost"
                disabled={departmentsQuery.isFetching}
                onClick={() => void departmentsQuery.refetch()}
              >
                <RefreshCw
                  size={15}
                  className={
                    departmentsQuery.isFetching ? "staff-spin" : undefined
                  }
                  aria-hidden="true"
                />
                Reintentar sectores
              </button>
            </div>
          )}

          <div className="staff-results-bar" aria-live="polite">
            {pagination
              ? `${pagination.total.toLocaleString("es-AR")} personas encontradas`
              : "Esperando respuesta del padrón"}
            {filters.q && <span>Búsqueda: “{filters.q}”</span>}
          </div>

          {peopleQuery.isLoading ? (
            <div className="staff-state" role="status">
              <Loader2 size={26} className="staff-spin" aria-hidden="true" />
              <strong>Sincronizando personal</strong>
              <p>Consultando padrón y sectores.</p>
            </div>
          ) : peopleQuery.isError ? (
            <div className="staff-state staff-state--error" role="alert">
              <AlertTriangle size={28} aria-hidden="true" />
              <strong>No se pudo cargar el personal</strong>
              <p>{getStaffErrorInfo(peopleQuery.error).message}</p>
              <button
                type="button"
                className="staff-button staff-button--ghost"
                onClick={() => void peopleQuery.refetch()}
              >
                <RefreshCw size={15} aria-hidden="true" />
                Reintentar
              </button>
            </div>
          ) : people.length === 0 ? (
            <div className="staff-state">
              <Users size={30} aria-hidden="true" />
              <strong>
                {hasActiveFilters
                  ? "Sin coincidencias para estos filtros"
                  : "Todavía no hay personas registradas"}
              </strong>
              <p>
                {hasActiveFilters
                  ? "Ajustá la búsqueda o limpiá los filtros para ampliar el resultado."
                  : "Registrá la primera persona para iniciar la trazabilidad de custodia."}
              </p>
              <button
                type="button"
                className="staff-button staff-button--ghost"
                onClick={hasActiveFilters ? clearFilters : openCreate}
              >
                {hasActiveFilters ? (
                  <X size={15} aria-hidden="true" />
                ) : (
                  <Plus size={15} aria-hidden="true" />
                )}
                {hasActiveFilters ? "Limpiar filtros" : "Registrar persona"}
              </button>
            </div>
          ) : (
            <StaffTable
              people={people}
              openingPersonId={personDetail.isFetching ? editingPersonId : null}
              onEdit={openEdit}
            />
          )}

          {pagination && pagination.totalPages > 1 && (
            <nav
              className="staff-pagination"
              aria-label="Paginación del personal"
            >
              <button
                type="button"
                className="staff-icon-button"
                aria-label="Página anterior"
                disabled={filters.page <= 1 || peopleQuery.isFetching}
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
                className="staff-icon-button"
                aria-label="Página siguiente"
                disabled={filters.page >= totalPages || peopleQuery.isFetching}
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
      )}

      {editor && (
        <PersonEditorPanel
          key={
            editor.mode === "create"
              ? "create"
              : personDetail.data
                ? `${personDetail.data.id}-${personDetail.data.updatedAt}`
                : `loading-${editor.personId}`
          }
          mode={editor.mode}
          person={editor.mode === "edit" ? (personDetail.data ?? null) : null}
          departments={departments}
          isDepartmentsLoading={departmentsQuery.isLoading}
          departmentsError={departmentsError}
          isLoading={editor.mode === "edit" && personDetail.isPending}
          isSaving={savePerson.isPending}
          loadError={
            editor.mode === "edit" && personDetail.isError
              ? getStaffErrorInfo(personDetail.error).message
              : undefined
          }
          onClose={closeEditor}
          onRetryDepartments={() => void departmentsQuery.refetch()}
          onRetry={() => void personDetail.refetch()}
          onReload={reloadCurrentPerson}
          onSave={handleSave}
        />
      )}
    </section>
  );
}

export default ItStaffPage;
