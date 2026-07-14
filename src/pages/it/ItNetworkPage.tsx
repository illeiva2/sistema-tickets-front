import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Database,
  GitBranch,
  Grid3X3,
  Loader2,
  MapPin,
  Network,
  Plus,
  RefreshCw,
  Router,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "@/contexts/AuthContext";
import { getNetworkErrorInfo } from "@/features/it/network/api";
import { DeviceEditorPanel } from "@/features/it/network/components/DeviceEditorPanel";
import { DeviceTable } from "@/features/it/network/components/DeviceTable";
import { LinkEditorPanel } from "@/features/it/network/components/LinkEditorPanel";
import { LinkTable } from "@/features/it/network/components/LinkTable";
import { SiteEditorPanel } from "@/features/it/network/components/SiteEditorPanel";
import { TopologyCanvas } from "@/features/it/network/components/TopologyCanvas";
import { TopologyViewEditorPanel } from "@/features/it/network/components/TopologyViewEditorPanel";
import {
  DEVICE_STATUS_LABELS,
  DEVICE_TYPE_LABELS,
  LINK_TYPE_LABELS,
  NETWORK_DEVICE_STATUSES,
  NETWORK_DEVICE_TYPES,
  NETWORK_LINK_TYPES,
  type DeviceListQuery,
  type DevicePayload,
  type LinkListQuery,
  type LinkPayload,
  type NetworkLink,
  type NetworkSite,
  type SaveCommand,
  type SitePayload,
  type TopologyNodePosition,
  type TopologyView,
  type TopologyViewPayload,
} from "@/features/it/network/types";
import {
  networkKeys,
  useDeviceDetail,
  useDevices,
  useLinkDetail,
  useLinks,
  useNetworkLookups,
  useRemoveLink,
  useSaveDevice,
  useSaveLink,
  useSaveSite,
  useSaveTopologyLayout,
  useSaveTopologyView,
  useSiteDetail,
  useSites,
  useTopologyView,
  useTopologyViews,
} from "@/features/it/network/useNetwork";
import "@/features/it/network/network.css";

type ActiveTab = "devices" | "links" | "topology";
type DeviceEditor = { mode: "create" } | { mode: "edit"; id: string } | null;
type LinkEditor = { mode: "create" } | { mode: "edit"; id: string } | null;

const INITIAL_DEVICE_FILTERS: DeviceListQuery = {
  q: "",
  siteId: "",
  type: "",
  status: "",
  page: 1,
  pageSize: 10,
};
const INITIAL_LINK_FILTERS: LinkListQuery = {
  q: "",
  siteId: "",
  type: "",
  page: 1,
  pageSize: 10,
};
const TABS: ActiveTab[] = ["devices", "links", "topology"];

function ItNetworkPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const canWrite = user?.role === "ADMIN" || user?.role === "AGENT";
  const [activeTab, setActiveTab] = useState<ActiveTab>("devices");
  const [deviceFilters, setDeviceFilters] = useState(INITIAL_DEVICE_FILTERS);
  const [deviceSearch, setDeviceSearch] = useState("");
  const [linkFilters, setLinkFilters] = useState(INITIAL_LINK_FILTERS);
  const [linkSearch, setLinkSearch] = useState("");
  const [deviceEditor, setDeviceEditor] = useState<DeviceEditor>(null);
  const [linkEditor, setLinkEditor] = useState<LinkEditor>(null);
  const [siteEditor, setSiteEditor] = useState<NetworkSite | "create" | null>(
    null,
  );
  const [viewEditor, setViewEditor] = useState<TopologyView | "create" | null>(
    null,
  );
  const [selectedViewId, setSelectedViewId] = useState<string | null>(null);
  const [topologyRevision, setTopologyRevision] = useState(0);
  const [topologyDirty, setTopologyDirty] = useState(false);
  const tabRefs = useRef<Record<ActiveTab, HTMLButtonElement | null>>({
    devices: null,
    links: null,
    topology: null,
  });

  const devicesQuery = useDevices(deviceFilters);
  const linksQuery = useLinks(linkFilters);
  const sitesQuery = useSites();
  const lookupsQuery = useNetworkLookups();
  const viewsQuery = useTopologyViews();
  const deviceId = deviceEditor?.mode === "edit" ? deviceEditor.id : null;
  const linkId = linkEditor?.mode === "edit" ? linkEditor.id : null;
  const siteId = siteEditor && siteEditor !== "create" ? siteEditor.id : null;
  const deviceDetail = useDeviceDetail(deviceId);
  const linkDetail = useLinkDetail(linkId);
  const siteDetail = useSiteDetail(siteId);
  const topologyDetail = useTopologyView(selectedViewId);
  const saveDeviceMutation = useSaveDevice();
  const saveLinkMutation = useSaveLink();
  const removeLinkMutation = useRemoveLink();
  const saveSiteMutation = useSaveSite();
  const saveViewMutation = useSaveTopologyView();
  const saveLayoutMutation = useSaveTopologyLayout();

  useEffect(() => {
    if (selectedViewId || !viewsQuery.data?.items.length) return;
    const preferred =
      viewsQuery.data.items.find((view) => view.isDefault) ??
      viewsQuery.data.items[0];
    setSelectedViewId(preferred.id);
  }, [selectedViewId, viewsQuery.data?.items]);

  useEffect(() => {
    if (!topologyDirty) return;
    const guardInternalNavigation = (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target : null;
      const anchor = target?.closest<HTMLAnchorElement>("a[href]");
      if (
        !anchor ||
        anchor.target === "_blank" ||
        event.defaultPrevented ||
        event.button !== 0 ||
        event.ctrlKey ||
        event.metaKey ||
        event.shiftKey ||
        event.altKey
      )
        return;
      const destination = new URL(anchor.href, window.location.href);
      if (destination.origin !== window.location.origin) return;
      if (
        destination.pathname === window.location.pathname &&
        destination.search === window.location.search &&
        destination.hash === window.location.hash
      )
        return;
      if (
        !window.confirm(
          "Hay posiciones sin guardar. El borrador local se conservará. ¿Salir?",
        )
      ) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        return;
      }
      setTopologyDirty(false);
    };
    document.addEventListener("click", guardInternalNavigation, true);
    return () =>
      document.removeEventListener("click", guardInternalNavigation, true);
  }, [topologyDirty]);

  const closeDevice = useCallback(() => setDeviceEditor(null), []);
  const closeLink = useCallback(() => setLinkEditor(null), []);
  const closeSite = useCallback(() => setSiteEditor(null), []);
  const closeView = useCallback(() => setViewEditor(null), []);

  const selectTab = (tab: ActiveTab) => {
    if (
      activeTab === "topology" &&
      tab !== "topology" &&
      topologyDirty &&
      !window.confirm(
        "Hay posiciones sin guardar. El borrador local se conservará. ¿Cambiar de sección?",
      )
    )
      return;
    if (tab !== "topology") setTopologyDirty(false);
    setActiveTab(tab);
    tabRefs.current[tab]?.focus();
  };
  const handleTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const current = TABS.indexOf(activeTab);
    if (event.key === "Home") selectTab(TABS[0]);
    else if (event.key === "End") selectTab(TABS[TABS.length - 1]);
    else if (event.key === "ArrowRight")
      selectTab(TABS[(current + 1) % TABS.length]);
    else selectTab(TABS[(current - 1 + TABS.length) % TABS.length]);
  };

  const saveDevice = async (command: SaveCommand<DevicePayload>) => {
    await saveDeviceMutation.mutateAsync(command);
    toast.success(
      command.mode === "create"
        ? "Dispositivo registrado"
        : "Ficha actualizada",
    );
    closeDevice();
  };
  const saveLink = async (command: SaveCommand<LinkPayload>) => {
    await saveLinkMutation.mutateAsync(command);
    toast.success(
      command.mode === "create" ? "Enlace creado" : "Enlace actualizado",
    );
    closeLink();
  };
  const saveSite = async (command: SaveCommand<SitePayload>) => {
    await saveSiteMutation.mutateAsync(command);
    toast.success(
      command.mode === "create" ? "Sitio creado" : "Sitio actualizado",
    );
    closeSite();
  };
  const saveView = async (command: SaveCommand<TopologyViewPayload>) => {
    const saved = await saveViewMutation.mutateAsync(command);
    setSelectedViewId(saved.id);
    setTopologyRevision((revision) => revision + 1);
    closeView();
    toast.success(
      command.mode === "create" ? "Vista creada" : "Vista actualizada",
    );
  };

  const reloadDevice = async () => {
    if (!deviceId) return null;
    const result = await deviceDetail.refetch();
    if (result.isError || !result.data) {
      queryClient.removeQueries({
        queryKey: networkKeys.deviceDetail(deviceId),
        exact: true,
      });
      closeDevice();
      toast.error(
        "La ficha no pudo recargarse y se cerró para proteger el borrador.",
      );
      return null;
    }
    return result.data;
  };
  const reloadLink = async () => {
    if (!linkId) return null;
    const result = await linkDetail.refetch();
    if (result.isError || !result.data) {
      queryClient.removeQueries({
        queryKey: networkKeys.linkDetail(linkId),
        exact: true,
      });
      closeLink();
      toast.error(
        "El enlace no pudo recargarse y se cerró para evitar sobrescrituras.",
      );
      return null;
    }
    return result.data;
  };
  const reloadSite = async () => {
    if (!siteId) return null;
    const result = await siteDetail.refetch();
    if (result.isError || !result.data) {
      toast.error(
        "El sitio no pudo recargarse. El borrador local sigue protegido.",
      );
      return null;
    }
    return result.data;
  };
  const reloadTopology = async () => {
    const result = await topologyDetail.refetch();
    if (result.isError || !result.data) return null;
    return result.data;
  };

  const removeLink = async (link: NetworkLink) => {
    if (
      !window.confirm(
        `¿Eliminar el enlace ${link.deviceA.name} ↔ ${link.deviceB.name}?`,
      )
    )
      return;
    try {
      await removeLinkMutation.mutateAsync({
        id: link.id,
        expectedUpdatedAt: link.updatedAt,
      });
      toast.success("Enlace eliminado");
    } catch (error) {
      toast.error(getNetworkErrorInfo(error).message);
    }
  };

  const currentQuery =
    activeTab === "devices"
      ? devicesQuery
      : activeTab === "links"
        ? linksQuery
        : topologyDetail;
  const sites = Array.from(
    new Map(
      [...(sitesQuery.data ?? []), ...(lookupsQuery.data?.sites ?? [])].map(
        (site) => [site.id, site],
      ),
    ).values(),
  );
  const devices = devicesQuery.data?.items ?? [];
  const links = linksQuery.data?.items ?? [];
  const lookups = lookupsQuery.data ?? { sites: [], devices: [], assets: [] };
  const deviceFiltersActive = Boolean(
    deviceFilters.q ||
    deviceFilters.siteId ||
    deviceFilters.type ||
    deviceFilters.status,
  );
  const linkFiltersActive = Boolean(
    linkFilters.q || linkFilters.siteId || linkFilters.type,
  );

  return (
    <section className="it-network" aria-labelledby="network-title">
      <div className="network-commandbar">
        <span className="network-wordmark">GRF//NEXUS</span>
        <span>IT / INFRAESTRUCTURA / MAPA LÓGICO</span>
        <span aria-live="polite">
          <Database size={13} />
          {currentQuery.isFetching && !currentQuery.isLoading
            ? "Sincronizando"
            : "API / IT-NET"}
        </span>
      </div>
      <header className="network-header">
        <div>
          <p>Plano de red / Control 05</p>
          <h1 id="network-title">Red y topología</h1>
          <span>
            Inventario operativo, enlaces físicos y mapa editable de la
            infraestructura empresarial.
          </span>
        </div>
        <div className="network-header__actions">
          <button
            type="button"
            className="network-icon-button"
            aria-label="Actualizar vista"
            disabled={currentQuery.isFetching}
            onClick={() => void currentQuery.refetch()}
          >
            <RefreshCw
              size={17}
              className={currentQuery.isFetching ? "network-spin" : undefined}
            />
          </button>
          {canWrite ? (
            <button
              type="button"
              className="network-button network-button--primary"
              disabled={activeTab === "topology" && topologyDirty}
              title={
                activeTab === "topology" && topologyDirty
                  ? "Guardá o descartá las posiciones antes de crear otra vista"
                  : undefined
              }
              onClick={() =>
                activeTab === "devices"
                  ? setDeviceEditor({ mode: "create" })
                  : activeTab === "links"
                    ? setLinkEditor({ mode: "create" })
                    : setViewEditor("create")
              }
            >
              <Plus size={16} />
              {activeTab === "devices"
                ? "Nuevo nodo"
                : activeTab === "links"
                  ? "Nuevo enlace"
                  : "Nueva vista"}
            </button>
          ) : null}
        </div>
      </header>

      <div className="network-tabs" role="tablist" aria-label="Red y topología">
        <button
          ref={(node) => {
            tabRefs.current.devices = node;
          }}
          id="network-devices-tab"
          type="button"
          role="tab"
          aria-selected={activeTab === "devices"}
          aria-controls="network-devices-panel"
          tabIndex={activeTab === "devices" ? 0 : -1}
          onKeyDown={handleTabKeyDown}
          onClick={() => selectTab("devices")}
        >
          <Router size={17} />
          <span>Dispositivos</span>
          <small>Nodos e IPs</small>
        </button>
        <button
          ref={(node) => {
            tabRefs.current.links = node;
          }}
          id="network-links-tab"
          type="button"
          role="tab"
          aria-selected={activeTab === "links"}
          aria-controls="network-links-panel"
          tabIndex={activeTab === "links" ? 0 : -1}
          onKeyDown={handleTabKeyDown}
          onClick={() => selectTab("links")}
        >
          <GitBranch size={17} />
          <span>Enlaces</span>
          <small>Puertos y medios</small>
        </button>
        <button
          ref={(node) => {
            tabRefs.current.topology = node;
          }}
          id="network-topology-tab"
          type="button"
          role="tab"
          aria-selected={activeTab === "topology"}
          aria-controls="network-topology-panel"
          tabIndex={activeTab === "topology" ? 0 : -1}
          onKeyDown={handleTabKeyDown}
          onClick={() => selectTab("topology")}
        >
          <Grid3X3 size={17} />
          <span>Topología</span>
          <small>Mapa persistente</small>
        </button>
      </div>

      {activeTab === "devices" ? (
        <div
          id="network-devices-panel"
          role="tabpanel"
          aria-labelledby="network-devices-tab"
          className="network-content"
        >
          <div className="network-sites-header">
            <div>
              <MapPin size={16} />
              <strong>Sitios físicos</strong>
              <span>{sites.length} registrados</span>
            </div>
            {canWrite ? (
              <button
                type="button"
                className="network-button network-button--ghost"
                onClick={() => setSiteEditor("create")}
              >
                <Plus size={14} />
                Agregar sitio
              </button>
            ) : null}
          </div>
          {sitesQuery.isError ? (
            <ErrorState
              title="No se pudieron cargar los sitios"
              error={sitesQuery.error}
              onRetry={() => void sitesQuery.refetch()}
            />
          ) : (
            <div className="network-sites">
              {sites.map((site) => (
                <button
                  key={site.id}
                  type="button"
                  className="network-site-card"
                  aria-label={`${canWrite ? "Editar" : "Filtrar por"} sitio ${site.name}`}
                  onClick={() =>
                    canWrite
                      ? setSiteEditor(site)
                      : setDeviceFilters((current) => ({
                          ...current,
                          siteId: site.id,
                          page: 1,
                        }))
                  }
                >
                  <span>{site.slug || "SITE"}</span>
                  <strong>{site.name}</strong>
                  <small>{site.address || "Dirección no informada"}</small>
                  <b>{site.devicesCount ?? "—"} nodos</b>
                </button>
              ))}
            </div>
          )}
          <form
            className="network-filters"
            aria-label="Buscar y filtrar dispositivos"
            onSubmit={(event: FormEvent) => {
              event.preventDefault();
              setDeviceFilters((current) => ({
                ...current,
                q: deviceSearch.trim(),
                page: 1,
              }));
            }}
          >
            <SearchField
              id="device-search"
              value={deviceSearch}
              placeholder="Hostname, IP, MAC o ubicación"
              onChange={setDeviceSearch}
            />
            <label>
              Sitio
              <select
                value={deviceFilters.siteId}
                onChange={(event) =>
                  setDeviceFilters((current) => ({
                    ...current,
                    siteId: event.target.value,
                    page: 1,
                  }))
                }
              >
                <option value="">Todos</option>
                {sites.map((site) => (
                  <option key={site.id} value={site.id}>
                    {site.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Tipo
              <select
                value={deviceFilters.type}
                onChange={(event) =>
                  setDeviceFilters((current) => ({
                    ...current,
                    type: event.target.value as DeviceListQuery["type"],
                    page: 1,
                  }))
                }
              >
                <option value="">Todos</option>
                {NETWORK_DEVICE_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {DEVICE_TYPE_LABELS[type]}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Estado
              <select
                value={deviceFilters.status}
                onChange={(event) =>
                  setDeviceFilters((current) => ({
                    ...current,
                    status: event.target.value as DeviceListQuery["status"],
                    page: 1,
                  }))
                }
              >
                <option value="">Todos</option>
                {NETWORK_DEVICE_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {DEVICE_STATUS_LABELS[status]}
                  </option>
                ))}
              </select>
            </label>
            {deviceFiltersActive ? (
              <button
                type="button"
                className="network-button network-button--clear"
                onClick={() => {
                  setDeviceSearch("");
                  setDeviceFilters(INITIAL_DEVICE_FILTERS);
                }}
              >
                <X size={14} />
                Limpiar
              </button>
            ) : null}
          </form>
          <ResultsBar
            total={devicesQuery.data?.pagination.total}
            query={deviceFilters.q}
          />
          {devicesQuery.isLoading ? (
            <LoadingState label="Escaneando inventario de red" />
          ) : devicesQuery.isError ? (
            <ErrorState
              title="No se pudieron cargar los dispositivos"
              error={devicesQuery.error}
              onRetry={() => void devicesQuery.refetch()}
            />
          ) : devices.length === 0 ? (
            <EmptyState
              title={
                deviceFiltersActive
                  ? "No hay coincidencias"
                  : "No hay dispositivos registrados"
              }
              description={
                deviceFiltersActive
                  ? "Revisá los filtros aplicados."
                  : "Registrá el primer router, switch, AP o cámara."
              }
            />
          ) : (
            <DeviceTable
              items={devices}
              openingId={deviceDetail.isFetching ? deviceId : null}
              canWrite={canWrite}
              onOpen={(device) =>
                setDeviceEditor({ mode: "edit", id: device.id })
              }
            />
          )}
          <Pagination
            page={devicesQuery.data?.pagination.page}
            totalPages={devicesQuery.data?.pagination.totalPages}
            onPage={(page) =>
              setDeviceFilters((current) => ({ ...current, page }))
            }
          />
        </div>
      ) : activeTab === "links" ? (
        <div
          id="network-links-panel"
          role="tabpanel"
          aria-labelledby="network-links-tab"
          className="network-content"
        >
          <form
            className="network-filters"
            aria-label="Buscar y filtrar enlaces"
            onSubmit={(event: FormEvent) => {
              event.preventDefault();
              setLinkFilters((current) => ({
                ...current,
                q: linkSearch.trim(),
                page: 1,
              }));
            }}
          >
            <SearchField
              id="link-search"
              value={linkSearch}
              placeholder="Dispositivo, puerto o VLAN"
              onChange={setLinkSearch}
            />
            <label>
              Sitio
              <select
                value={linkFilters.siteId}
                onChange={(event) =>
                  setLinkFilters((current) => ({
                    ...current,
                    siteId: event.target.value,
                    page: 1,
                  }))
                }
              >
                <option value="">Todos</option>
                {sites.map((site) => (
                  <option key={site.id} value={site.id}>
                    {site.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Medio
              <select
                value={linkFilters.type}
                onChange={(event) =>
                  setLinkFilters((current) => ({
                    ...current,
                    type: event.target.value as LinkListQuery["type"],
                    page: 1,
                  }))
                }
              >
                <option value="">Todos</option>
                {NETWORK_LINK_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {LINK_TYPE_LABELS[type]}
                  </option>
                ))}
              </select>
            </label>
            {linkFiltersActive ? (
              <button
                type="button"
                className="network-button network-button--clear"
                onClick={() => {
                  setLinkSearch("");
                  setLinkFilters(INITIAL_LINK_FILTERS);
                }}
              >
                <X size={14} />
                Limpiar
              </button>
            ) : null}
          </form>
          <ResultsBar
            total={linksQuery.data?.pagination.total}
            query={linkFilters.q}
          />
          {linksQuery.isLoading ? (
            <LoadingState label="Trazando conexiones" />
          ) : linksQuery.isError ? (
            <ErrorState
              title="No se pudieron cargar los enlaces"
              error={linksQuery.error}
              onRetry={() => void linksQuery.refetch()}
            />
          ) : links.length === 0 ? (
            <EmptyState
              title={
                linkFiltersActive
                  ? "No hay coincidencias"
                  : "No hay enlaces documentados"
              }
              description="Conectá dos nodos indicando puertos, medio, VLANs y velocidad."
            />
          ) : (
            <LinkTable
              items={links}
              canWrite={canWrite}
              busyId={
                removeLinkMutation.isPending
                  ? (removeLinkMutation.variables?.id ?? null)
                  : null
              }
              onOpen={(link) => setLinkEditor({ mode: "edit", id: link.id })}
              onRemove={(link) => void removeLink(link)}
            />
          )}
          <Pagination
            page={linksQuery.data?.pagination.page}
            totalPages={linksQuery.data?.pagination.totalPages}
            onPage={(page) =>
              setLinkFilters((current) => ({ ...current, page }))
            }
          />
        </div>
      ) : (
        <div
          id="network-topology-panel"
          role="tabpanel"
          aria-labelledby="network-topology-tab"
          className="network-content network-topology-panel"
        >
          {viewsQuery.isLoading ? (
            <LoadingState label="Cargando vistas de topología" />
          ) : viewsQuery.isError ? (
            <ErrorState
              title="No se pudieron cargar las vistas"
              error={viewsQuery.error}
              onRetry={() => void viewsQuery.refetch()}
            />
          ) : !viewsQuery.data?.items.length ? (
            <EmptyState
              title="No hay vistas de topología"
              description="Creá una vista global o por sitio para ubicar los nodos."
            />
          ) : (
            <>
              <div className="topology-viewbar">
                <label>
                  Vista activa
                  <select
                    value={selectedViewId ?? ""}
                    onChange={(event) => {
                      if (
                        topologyDirty &&
                        !window.confirm(
                          "Hay posiciones sin guardar. El borrador local se conservará. ¿Cambiar de vista?",
                        )
                      )
                        return;
                      setTopologyDirty(false);
                      setSelectedViewId(event.target.value);
                      setTopologyRevision((revision) => revision + 1);
                    }}
                  >
                    {viewsQuery.data.items.map((view) => (
                      <option key={view.id} value={view.id}>
                        {view.name}
                        {view.isDefault ? " · predeterminada" : ""}
                      </option>
                    ))}
                  </select>
                </label>
                {canWrite && selectedViewId ? (
                  <button
                    type="button"
                    className="network-button network-button--ghost"
                    disabled={topologyDirty}
                    title={
                      topologyDirty
                        ? "Guardá o descartá las posiciones antes de configurar"
                        : undefined
                    }
                    onClick={() => {
                      const current = viewsQuery.data.items.find(
                        (view) => view.id === selectedViewId,
                      );
                      if (current) setViewEditor(current);
                    }}
                  >
                    Configurar vista
                  </button>
                ) : null}
              </div>
              {topologyDetail.isLoading ? (
                <LoadingState label="Construyendo mapa" />
              ) : topologyDetail.isError ? (
                <ErrorState
                  title="No se pudo cargar el mapa"
                  error={topologyDetail.error}
                  onRetry={() => void topologyDetail.refetch()}
                />
              ) : topologyDetail.data ? (
                <TopologyCanvas
                  key={`${selectedViewId}-${topologyRevision}`}
                  view={topologyDetail.data}
                  canWrite={canWrite}
                  isSaving={saveLayoutMutation.isPending}
                  onSave={(
                    expectedUpdatedAt: string,
                    nodes: TopologyNodePosition[],
                  ) =>
                    saveLayoutMutation.mutateAsync({
                      id: topologyDetail.data.id,
                      payload: {
                        expectedUpdatedAt,
                        nodes,
                        ...(topologyDetail.data.viewport
                          ? { viewport: topologyDetail.data.viewport }
                          : {}),
                      },
                    })
                  }
                  onReload={reloadTopology}
                  onDirtyChange={setTopologyDirty}
                />
              ) : null}
            </>
          )}
        </div>
      )}

      {deviceEditor ? (
        <DeviceEditorPanel
          key={deviceEditor.mode === "edit" ? deviceEditor.id : "new-device"}
          mode={deviceEditor.mode}
          device={
            deviceEditor.mode === "edit" ? (deviceDetail.data ?? null) : null
          }
          sites={lookups.sites.length ? lookups.sites : sites}
          assets={lookups.assets}
          canWrite={canWrite}
          isLoading={deviceEditor.mode === "edit" && deviceDetail.isLoading}
          isSaving={saveDeviceMutation.isPending}
          loadError={
            deviceDetail.isError
              ? getNetworkErrorInfo(deviceDetail.error).message
              : undefined
          }
          onClose={closeDevice}
          onRetry={() => void deviceDetail.refetch()}
          onReload={reloadDevice}
          onSave={saveDevice}
        />
      ) : null}
      {linkEditor ? (
        <LinkEditorPanel
          key={linkEditor.mode === "edit" ? linkEditor.id : "new-link"}
          mode={linkEditor.mode}
          link={linkEditor.mode === "edit" ? (linkDetail.data ?? null) : null}
          devices={lookups.devices}
          canWrite={canWrite}
          isLoading={linkEditor.mode === "edit" && linkDetail.isLoading}
          isSaving={saveLinkMutation.isPending}
          loadError={
            linkDetail.isError
              ? getNetworkErrorInfo(linkDetail.error).message
              : undefined
          }
          onClose={closeLink}
          onRetry={() => void linkDetail.refetch()}
          onReload={reloadLink}
          onSave={saveLink}
        />
      ) : null}
      {siteEditor ? (
        <SiteEditorPanel
          key={siteEditor === "create" ? "new-site" : siteEditor.id}
          site={siteEditor === "create" ? null : siteEditor}
          isSaving={saveSiteMutation.isPending}
          onClose={closeSite}
          onReload={reloadSite}
          onSave={saveSite}
        />
      ) : null}
      {viewEditor ? (
        <TopologyViewEditorPanel
          key={viewEditor === "create" ? "new-view" : viewEditor.id}
          view={viewEditor === "create" ? null : viewEditor}
          sites={sites}
          isSaving={saveViewMutation.isPending}
          onClose={closeView}
          onReload={reloadTopology}
          onSave={saveView}
        />
      ) : null}
    </section>
  );
}

interface SearchFieldProps {
  id: string;
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
}
function SearchField({ id, value, placeholder, onChange }: SearchFieldProps) {
  return (
    <div className="network-search-field">
      <label htmlFor={id}>Buscar</label>
      <div>
        <Search size={16} />
        <input
          id={id}
          type="search"
          value={value}
          placeholder={placeholder}
          onChange={(event) => onChange(event.target.value)}
        />
        <button type="submit">Buscar</button>
      </div>
    </div>
  );
}

function ResultsBar({ total, query }: { total?: number; query: string }) {
  return (
    <div className="network-results-bar">
      <div>
        <SlidersHorizontal size={15} />
        <span aria-live="polite">
          {total === undefined
            ? "Esperando respuesta"
            : `${total.toLocaleString("es-AR")} registros encontrados`}
        </span>
      </div>
      {query ? <span>Búsqueda: “{query}”</span> : null}
    </div>
  );
}

function LoadingState({ label }: { label: string }) {
  return (
    <div className="network-state" aria-live="polite">
      <Loader2 className="network-spin" />
      <strong>{label}</strong>
      <p>Consultando el plano operativo…</p>
    </div>
  );
}
function ErrorState({
  title,
  error,
  onRetry,
}: {
  title: string;
  error: unknown;
  onRetry: () => void;
}) {
  return (
    <div className="network-state network-state--error" role="alert">
      <AlertTriangle />
      <strong>{title}</strong>
      <p>{getNetworkErrorInfo(error).message}</p>
      <button
        type="button"
        className="network-button network-button--ghost"
        onClick={onRetry}
      >
        Reintentar
      </button>
    </div>
  );
}
function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="network-empty">
      <Network size={34} />
      <strong>{title}</strong>
      <p>{description}</p>
    </div>
  );
}
function Pagination({
  page,
  totalPages,
  onPage,
}: {
  page?: number;
  totalPages?: number;
  onPage: (page: number) => void;
}) {
  if (!page || !totalPages || totalPages <= 1) return null;
  return (
    <nav className="network-pagination" aria-label="Paginación">
      <button
        type="button"
        className="network-icon-button"
        aria-label="Página anterior"
        disabled={page <= 1}
        onClick={() => onPage(page - 1)}
      >
        <ChevronLeft size={17} />
      </button>
      <span>
        Página <strong>{page}</strong> de {totalPages}
      </span>
      <button
        type="button"
        className="network-icon-button"
        aria-label="Página siguiente"
        disabled={page >= totalPages}
        onClick={() => onPage(page + 1)}
      >
        <ChevronRight size={17} />
      </button>
    </nav>
  );
}

export default ItNetworkPage;
