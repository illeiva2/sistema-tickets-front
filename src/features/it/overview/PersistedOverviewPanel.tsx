import {
  Activity,
  AlertTriangle,
  Camera,
  HardDrive,
  Monitor,
  Network,
  RefreshCw,
  Smartphone,
  Users,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { useItOverview } from "./useItOverview";

interface PersistedMetric {
  id: string;
  label: string;
  value: string;
  note: string;
  icon: LucideIcon;
  tone: "cyan" | "amber" | "neutral";
}

const LOADING_CARDS = Array.from({ length: 10 }, (_, index) => index);

const formatCount = (value: number) => value.toLocaleString("es-AR");

const formatGeneratedAt = (value: string) =>
  new Intl.DateTimeFormat("es-AR", {
    dateStyle: "short",
    timeStyle: "medium",
  }).format(new Date(value));

export function PersistedOverviewPanel() {
  const { data, isLoading, isError, isFetching, refetch } = useItOverview();

  const metrics: PersistedMetric[] = data
    ? [
        {
          id: "managed-total",
          label: "Dispositivos gestionados",
          value: formatCount(data.counts.managedDevices.total),
          note: "Suma disjunta de puestos, celulares, red y cámaras",
          icon: HardDrive,
          tone: "cyan",
        },
        {
          id: "workstations",
          label: "Puestos de trabajo",
          value: formatCount(data.counts.managedDevices.workstations),
          note: "Desktops y notebooks del inventario",
          icon: Monitor,
          tone: "cyan",
        },
        {
          id: "phones",
          label: "Celulares",
          value: formatCount(data.counts.managedDevices.phones),
          note: "Terminales PHONE del inventario",
          icon: Smartphone,
          tone: "cyan",
        },
        {
          id: "network-infrastructure",
          label: "Infraestructura de red",
          value: formatCount(data.counts.managedDevices.networkInfrastructure),
          note: "Dispositivos operativos, sin incluir cámaras",
          icon: Network,
          tone: "cyan",
        },
        {
          id: "cameras",
          label: "Cámaras",
          value: formatCount(data.counts.managedDevices.cameras),
          note: "Inventario CCTV con cobertura básica",
          icon: Camera,
          tone: "amber",
        },
        {
          id: "people-active",
          label: "Personas activas",
          value: formatCount(data.counts.people.active),
          note: `${formatCount(data.counts.people.total)} personas persistidas`,
          icon: Users,
          tone: "neutral",
        },
        {
          id: "agents-online",
          label: "Agentes online",
          value: `${formatCount(data.counts.agentDevices.online)}/${formatCount(data.counts.agentDevices.total)}`,
          note: "Online sobre agentes registrados",
          icon: Activity,
          tone: "cyan",
        },
        {
          id: "phone-lines",
          label: "Líneas asignadas",
          value: `${formatCount(data.counts.phoneLines.inUse)}/${formatCount(data.counts.phoneLines.total)}`,
          note: "En uso sobre líneas corporativas registradas",
          icon: Smartphone,
          tone: "cyan",
        },
        {
          id: "maintenance-open",
          label: "Mantenimientos abiertos",
          value: formatCount(data.counts.maintenances.open),
          note: "Programados o en progreso",
          icon: Wrench,
          tone: "amber",
        },
        {
          id: "purchases-pending",
          label: "Compras pendientes",
          value: formatCount(data.counts.purchases.pendingApproval),
          note: "Solicitudes a la espera de autorización",
          icon: HardDrive,
          tone: "amber",
        },
      ]
    : [];

  return (
    <section className="ops-live-panel" aria-labelledby="ops-live-title">
      <div className="ops-live-panel__heading">
        <div>
          <span className="ops-section__index">01 / ESTADO REAL</span>
          <h2 id="ops-live-title">Lectura operativa real</h2>
          <p>
            Conteos actuales del sistema. El total suma categorías disjuntas: un
            activo patrimonial vinculado a red no se vuelve a contar.
          </p>
        </div>

        <button
          className="ops-refresh-button"
          type="button"
          onClick={() => void refetch()}
          disabled={isFetching}
        >
          <RefreshCw
            size={14}
            className={isFetching ? "ops-refresh-button__icon--active" : ""}
            aria-hidden="true"
          />
          {isFetching ? "Actualizando" : "Actualizar"}
        </button>
      </div>

      {isLoading ? (
        <div
          className="ops-live-grid"
          aria-label="Cargando datos persistidos"
          aria-live="polite"
        >
          {LOADING_CARDS.map((card) => (
            <div
              key={card}
              className="ops-live-card ops-live-card--loading"
              aria-hidden="true"
            />
          ))}
        </div>
      ) : null}

      {isError ? (
        <div className="ops-live-error" role="alert">
          <AlertTriangle size={18} aria-hidden="true" />
          <div>
            <strong>No se pudo leer el estado persistido</strong>
            <p>
              Reintentá la consulta a `/api/it/overview` para recuperar la
              lectura operativa.
            </p>
          </div>
          <button type="button" onClick={() => void refetch()}>
            Reintentar
          </button>
        </div>
      ) : null}

      {data ? (
        <>
          <dl className="ops-live-grid" aria-live="polite">
            {metrics.map(({ id, label, value, note, icon: Icon, tone }) => (
              <div key={id} className="ops-live-card" data-tone={tone}>
                <dt>
                  <Icon size={16} strokeWidth={1.6} aria-hidden="true" />
                  {label}
                </dt>
                <dd>{value}</dd>
                <span>{note}</span>
              </div>
            ))}
          </dl>
          <div className="ops-live-panel__source">
            <span>Fuente: API GRF · {data.schemaVersion}</span>
            <span>
              Generado:{" "}
              <time dateTime={data.generatedAt}>
                {formatGeneratedAt(data.generatedAt)}
              </time>
            </span>
          </div>
        </>
      ) : null}
    </section>
  );
}
