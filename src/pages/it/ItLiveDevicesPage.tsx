import { useCallback, useState, type FormEvent } from "react";
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Database,
  KeyRound,
  Loader2,
  Pause,
  Play,
  Radar,
  RefreshCw,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "@/contexts/AuthContext";
import { getAgentErrorInfo } from "@/features/it/live/api";
import { AgentDetailPanel } from "@/features/it/live/components/AgentDetailPanel";
import { AgentAssetOnboardingPanel } from "@/features/it/live/components/AgentAssetOnboardingPanel";
import type { AgentAssetOnboardingSubmission } from "@/features/it/live/agentAssetOnboarding";
import { EnrollmentPanel } from "@/features/it/live/components/EnrollmentPanel";
import { FleetMetrics } from "@/features/it/live/components/FleetMetrics";
import { LiveDeviceTable } from "@/features/it/live/components/LiveDeviceTable";
import type {
  AgentDevice,
  AgentDeviceListQuery,
  EnrollmentTokenPayload,
  RemoteProtocol,
  RemoteSession,
} from "@/features/it/live/types";
import {
  useAgentDeviceDetail,
  useAgentDevices,
  useAgentFleet,
  useAgentLookups,
  useAgentMetrics,
  useAgentSnapshots,
  useCloseRemoteSession,
  useCreateEnrollmentToken,
  useEnrollmentTokens,
  useRevokeEnrollmentToken,
  useRegisterAgentAsset,
  useStartRemoteSession,
  useTransitionAgentDevice,
  useUpdateAgentAsset,
} from "@/features/it/live/useLiveDevices";
import { useCustodyLookups } from "@/features/it/inventory/custody/useCustody";
import "@/features/it/live/live.css";

const INITIAL_FILTERS: AgentDeviceListQuery = {
  q: "",
  state: "",
  isActive: "true",
  page: 1,
  pageSize: 10,
};

function ItLiveDevicesPage() {
  const { user } = useAuth();
  const canManage = user?.role === "ADMIN" || user?.role === "AGENT";
  const [filters, setFilters] = useState(INITIAL_FILTERS);
  const [searchDraft, setSearchDraft] = useState("");
  const [paused, setPaused] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tokensOpen, setTokensOpen] = useState(false);
  const [onboardingOpen, setOnboardingOpen] = useState(false);

  const devicesQuery = useAgentDevices(filters, paused);
  const fleetQuery = useAgentFleet(paused);
  const detailQuery = useAgentDeviceDetail(selectedId, paused);
  const metricsQuery = useAgentMetrics(selectedId, paused);
  const snapshotsQuery = useAgentSnapshots(selectedId);
  const lookupsQuery = useAgentLookups();
  const tokensQuery = useEnrollmentTokens(tokensOpen && canManage);
  const custodyLookups = useCustodyLookups(onboardingOpen && canManage);
  const updateAsset = useUpdateAgentAsset();
  const registerAsset = useRegisterAgentAsset();
  const transitionDevice = useTransitionAgentDevice();
  const createToken = useCreateEnrollmentToken();
  const revokeToken = useRevokeEnrollmentToken();
  const startSession = useStartRemoteSession();
  const closeSession = useCloseRemoteSession();

  const closeDetail = useCallback(() => {
    setOnboardingOpen(false);
    setSelectedId(null);
  }, []);
  const closeTokens = useCallback(() => setTokensOpen(false), []);

  const submitSearch = (event: FormEvent) => {
    event.preventDefault();
    setFilters((current) => ({ ...current, q: searchDraft.trim(), page: 1 }));
  };

  const refresh = async () => {
    const results = await Promise.all([
      devicesQuery.refetch(),
      fleetQuery.refetch(),
      ...(selectedId ? [detailQuery.refetch(), metricsQuery.refetch()] : []),
    ]);
    if (results.some((result) => result.isError)) {
      toast.error("La actualización terminó con datos incompletos");
      return;
    }
    toast.success("Telemetría actualizada");
  };

  const reloadDetail = async () => {
    const result = await detailQuery.refetch();
    if (result.isError || !result.data) {
      toast.error(
        "No se pudo recargar el equipo. El panel conserva el estado local.",
      );
      return null;
    }
    return result.data;
  };

  const linkAsset = async (
    expectedUpdatedAt: string,
    assetId: string | null,
  ) => {
    if (!selectedId) throw new Error("No hay equipo seleccionado");
    const device = await updateAsset.mutateAsync({
      id: selectedId,
      expectedUpdatedAt,
      assetId,
    });
    toast.success(assetId ? "Activo vinculado" : "Activo desvinculado");
    return device;
  };

  const registerAssetFromAgent = async (
    submission: AgentAssetOnboardingSubmission,
  ) => {
    if (!selectedId || !detailQuery.data) {
      throw new Error("No hay un equipo listo para registrar.");
    }
    const refreshed = await detailQuery.refetch();
    if (refreshed.isError || !refreshed.data) {
      throw new Error(
        "No se pudo confirmar la versión actual del equipo. Reintentá el alta.",
      );
    }
    await registerAsset.mutateAsync({
      deviceId: selectedId,
      payload: {
        expectedUpdatedAt: refreshed.data.updatedAt,
        ...submission,
      },
    });
    toast.success(
      submission.custody
        ? "Activo creado, vinculado y asignado"
        : "Activo creado y vinculado",
    );
    setOnboardingOpen(false);
  };

  const transition = async (
    action: "activate" | "revoke",
    expectedUpdatedAt: string,
  ) => {
    if (!selectedId) throw new Error("No hay equipo seleccionado");
    const device = await transitionDevice.mutateAsync({
      id: selectedId,
      action,
      expectedUpdatedAt,
    });
    toast.success(
      action === "activate" ? "Agente reactivado" : "Agente revocado",
    );
    return device;
  };

  const beginSession = async (protocol: RemoteProtocol) => {
    if (!selectedId) throw new Error("No hay equipo seleccionado");
    const result = await startSession.mutateAsync({
      deviceId: selectedId,
      protocol,
    });
    toast.success(`Registro ${protocol} iniciado`);
    return result;
  };

  const finishSession = async (session: RemoteSession) => {
    if (!selectedId) return;
    await closeSession.mutateAsync({
      sessionId: session.id,
      deviceId: selectedId,
    });
    toast.success("Registro de sesión cerrado");
  };

  const generateToken = async (payload: EnrollmentTokenPayload) =>
    createToken.mutateAsync(payload);
  const removeToken = async (id: string) => {
    await revokeToken.mutateAsync(id);
    toast.success("Token revocado");
  };

  const items = devicesQuery.data?.items ?? [];
  const fleetItems = fleetQuery.data?.items ?? items;
  const pagination = devicesQuery.data?.pagination;
  const filtersActive = Boolean(
    filters.q || filters.state || filters.isActive !== "true",
  );
  const clearFilters = () => {
    setSearchDraft("");
    setFilters(INITIAL_FILTERS);
  };

  return (
    <section className="it-live" aria-labelledby="live-title">
      <div className="live-commandbar">
        <span>GRF//PULSE</span>
        <span>IT / ENDPOINTS / TELEMETRÍA</span>
        <span aria-live="polite">
          <Database size={13} />
          {paused
            ? "POLLING PAUSADO"
            : devicesQuery.isFetching && !devicesQuery.isLoading
              ? "SINCRONIZANDO"
              : "API / IT-AGT"}
        </span>
      </div>
      <header className="live-header">
        <div>
          <p>Centro de señales / Control 06</p>
          <h1 id="live-title">Dispositivos en vivo</h1>
          <span>
            Salud de endpoints Windows, último heartbeat y acceso remoto directo
            con registro auditable.
          </span>
        </div>
        <div className="live-header-actions">
          <button
            type="button"
            className="live-button live-button--ghost"
            aria-pressed={paused}
            onClick={() => setPaused((current) => !current)}
          >
            {paused ? <Play size={15} /> : <Pause size={15} />}
            {paused ? "Reanudar" : "Pausar actualización"}
          </button>
          <button
            type="button"
            className="live-icon-button"
            aria-label="Actualizar telemetría ahora"
            disabled={devicesQuery.isFetching}
            onClick={() => void refresh()}
          >
            <RefreshCw
              size={17}
              className={devicesQuery.isFetching ? "live-spin" : undefined}
            />
          </button>
          {canManage ? (
            <button
              type="button"
              className="live-button live-button--primary"
              onClick={() => setTokensOpen(true)}
            >
              <KeyRound size={15} />
              Enrolar equipos
            </button>
          ) : null}
        </div>
      </header>
      <div className="live-content">
        {fleetQuery.isLoading ? (
          <div
            className="live-metrics live-metrics--loading"
            aria-hidden="true"
          >
            {Array.from({ length: 4 }, (_, index) => (
              <span key={index} />
            ))}
          </div>
        ) : (
          <FleetMetrics
            items={fleetItems}
            total={fleetQuery.data?.pagination.total}
          />
        )}
        {fleetQuery.isError ? (
          <div className="live-reference-warning" role="alert">
            <AlertTriangle size={15} />
            El resumen global no está disponible; se muestran métricas de la
            página actual.
          </div>
        ) : null}

        <form
          className="live-filters"
          aria-label="Buscar y filtrar dispositivos"
          onSubmit={submitSearch}
        >
          <div className="live-search">
            <label htmlFor="live-search">Buscar</label>
            <div>
              <Search size={16} />
              <input
                id="live-search"
                type="search"
                value={searchDraft}
                placeholder="Hostname, usuario, IP, MAC o activo"
                onChange={(event) => setSearchDraft(event.target.value)}
              />
              <button type="submit">Buscar</button>
            </div>
          </div>
          <label>
            Señal
            <select
              value={filters.state}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  state: event.target.value as AgentDeviceListQuery["state"],
                  page: 1,
                }))
              }
            >
              <option value="">Todas</option>
              <option value="ONLINE">Online</option>
              <option value="STALE">Degradada / atrasada</option>
              <option value="OFFLINE">Offline</option>
            </select>
          </label>
          <label>
            Agente
            <select
              value={filters.isActive}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  isActive: event.target
                    .value as AgentDeviceListQuery["isActive"],
                  page: 1,
                }))
              }
            >
              <option value="">Todos</option>
              <option value="true">Activos</option>
              <option value="false">Revocados</option>
            </select>
          </label>
          <label>
            Filas
            <select
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
          </label>
          {filtersActive ? (
            <button
              type="button"
              className="live-button live-button--clear"
              onClick={clearFilters}
            >
              <X size={14} />
              Limpiar
            </button>
          ) : null}
        </form>
        <div className="live-results">
          <div>
            <SlidersHorizontal size={15} />
            <span aria-live="polite">
              {pagination
                ? `${pagination.total.toLocaleString("es-AR")} equipos encontrados`
                : "Esperando señal"}
            </span>
          </div>
          <span>
            {paused
              ? "Actualización automática pausada"
              : "Actualización automática cada 30 segundos"}
          </span>
        </div>

        {devicesQuery.isLoading ? (
          <div className="live-state" role="status">
            <Loader2 className="live-spin" />
            <strong>Escuchando endpoints</strong>
            <p>Consultando el último estado conocido.</p>
          </div>
        ) : devicesQuery.isError ? (
          <div className="live-state live-state--error" role="alert">
            <AlertTriangle />
            <strong>No se pudieron cargar los equipos</strong>
            <p>{getAgentErrorInfo(devicesQuery.error).message}</p>
            <button
              type="button"
              className="live-button live-button--ghost"
              onClick={() => void devicesQuery.refetch()}
            >
              <RefreshCw size={14} />
              Reintentar
            </button>
          </div>
        ) : !items.length ? (
          <div className="live-state">
            <Radar size={30} />
            <strong>
              {filtersActive
                ? "Sin coincidencias"
                : "Ningún agente reportó todavía"}
            </strong>
            <p>
              {filtersActive
                ? "Ajustá o limpiá los filtros."
                : "Generá un token e instalá manualmente el agente en una PC Windows."}
            </p>
            {filtersActive ? (
              <button
                type="button"
                className="live-button live-button--ghost"
                onClick={clearFilters}
              >
                <X size={14} />
                Limpiar filtros
              </button>
            ) : canManage ? (
              <button
                type="button"
                className="live-button live-button--ghost"
                onClick={() => setTokensOpen(true)}
              >
                <KeyRound size={14} />
                Generar token
              </button>
            ) : null}
          </div>
        ) : (
          <LiveDeviceTable
            items={items}
            openingId={detailQuery.isFetching ? selectedId : null}
            onOpen={(device: AgentDevice) => setSelectedId(device.id)}
          />
        )}

        {pagination && pagination.totalPages > 1 ? (
          <nav
            className="live-pagination"
            aria-label="Paginación de dispositivos"
          >
            <button
              type="button"
              className="live-icon-button"
              aria-label="Página anterior"
              disabled={filters.page <= 1 || devicesQuery.isFetching}
              onClick={() =>
                setFilters((current) => ({
                  ...current,
                  page: current.page - 1,
                }))
              }
            >
              <ChevronLeft size={17} />
            </button>
            <span>
              Página <strong>{pagination.page}</strong> de{" "}
              {pagination.totalPages}
            </span>
            <button
              type="button"
              className="live-icon-button"
              aria-label="Página siguiente"
              disabled={
                filters.page >= pagination.totalPages || devicesQuery.isFetching
              }
              onClick={() =>
                setFilters((current) => ({
                  ...current,
                  page: current.page + 1,
                }))
              }
            >
              <ChevronRight size={17} />
            </button>
          </nav>
        ) : null}
      </div>

      {selectedId && !onboardingOpen ? (
        <AgentDetailPanel
          key={selectedId}
          device={detailQuery.data ?? null}
          metrics={metricsQuery.data ?? []}
          snapshots={snapshotsQuery.data?.items ?? []}
          lookups={lookupsQuery.data ?? { assets: [] }}
          lookupsLoading={lookupsQuery.isLoading}
          canManage={canManage}
          isLoading={detailQuery.isLoading}
          isSaving={updateAsset.isPending || transitionDevice.isPending}
          isStartingSession={startSession.isPending}
          closingSessionId={
            closeSession.isPending
              ? (closeSession.variables?.sessionId ?? null)
              : null
          }
          loadError={
            detailQuery.isError
              ? getAgentErrorInfo(detailQuery.error).message
              : undefined
          }
          metricsError={
            metricsQuery.isError
              ? getAgentErrorInfo(metricsQuery.error).message
              : undefined
          }
          snapshotsError={
            snapshotsQuery.isError
              ? getAgentErrorInfo(snapshotsQuery.error).message
              : undefined
          }
          lookupsError={
            lookupsQuery.isError
              ? getAgentErrorInfo(lookupsQuery.error).message
              : undefined
          }
          onClose={closeDetail}
          onRetry={() => void detailQuery.refetch()}
          onRetryLookups={() => void lookupsQuery.refetch()}
          onReload={reloadDetail}
          onLinkAsset={linkAsset}
          onRegisterAsset={() => {
            registerAsset.reset();
            setOnboardingOpen(true);
          }}
          onTransition={transition}
          onStartSession={beginSession}
          onCloseSession={finishSession}
        />
      ) : null}
      {selectedId && onboardingOpen && detailQuery.data ? (
        <AgentAssetOnboardingPanel
          key={`${selectedId}-${snapshotsQuery.data?.items[0]?.id ?? "no-snapshot"}`}
          device={detailQuery.data}
          latestSnapshotPayload={snapshotsQuery.data?.items[0]?.payload ?? null}
          people={custodyLookups.people.data?.items ?? []}
          departments={custodyLookups.departments.data ?? []}
          canSetAssetTag={user?.role === "ADMIN"}
          isLoading={
            snapshotsQuery.isLoading ||
            custodyLookups.people.isLoading ||
            custodyLookups.departments.isLoading
          }
          isSaving={registerAsset.isPending}
          loadError={
            snapshotsQuery.isError
              ? getAgentErrorInfo(snapshotsQuery.error).message
              : undefined
          }
          lookupsError={
            custodyLookups.people.isError || custodyLookups.departments.isError
              ? getAgentErrorInfo(
                  custodyLookups.people.error ??
                    custodyLookups.departments.error,
                ).message
              : undefined
          }
          saveError={
            registerAsset.isError
              ? getAgentErrorInfo(registerAsset.error).message
              : undefined
          }
          onSubmit={registerAssetFromAgent}
          onClose={() => setOnboardingOpen(false)}
        />
      ) : null}
      {tokensOpen && canManage ? (
        <EnrollmentPanel
          items={tokensQuery.data ?? []}
          isLoading={tokensQuery.isLoading}
          isCreating={createToken.isPending}
          revokingId={
            revokeToken.isPending ? (revokeToken.variables ?? null) : null
          }
          loadError={
            tokensQuery.isError
              ? getAgentErrorInfo(tokensQuery.error).message
              : undefined
          }
          onClose={closeTokens}
          onRetry={() => void tokensQuery.refetch()}
          onCreate={generateToken}
          onRevoke={removeToken}
        />
      ) : null}
    </section>
  );
}

export default ItLiveDevicesPage;
