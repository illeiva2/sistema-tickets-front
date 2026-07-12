import {
  Activity,
  AlertTriangle,
  HardDrive,
  Network,
  RefreshCw,
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

const LOADING_CARDS = Array.from({ length: 7 }, (_, index) => index);

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
          id: "assets-total",
          label: "Activos registrados",
          value: formatCount(data.counts.assets.total),
          note: "Registros persistidos en inventario",
          icon: HardDrive,
          tone: "cyan",
        },
        {
          id: "assets-assigned",
          label: "Activos asignados",
          value: formatCount(data.counts.assets.assigned),
          note: "Estado ASSIGNED y activos",
          icon: HardDrive,
          tone: "cyan",
        },
        {
          id: "assets-repair",
          label: "En reparación",
          value: formatCount(data.counts.assets.inRepair),
          note: "Estado IN_REPAIR y activos",
          icon: Wrench,
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
          id: "network-active",
          label: "Red activa",
          value: `${formatCount(data.counts.networkDevices.active)}/${formatCount(data.counts.networkDevices.total)}`,
          note: "Activos sobre dispositivos registrados",
          icon: Network,
          tone: "cyan",
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
          id: "maintenance-open",
          label: "Mantenimientos abiertos",
          value: formatCount(data.counts.maintenances.open),
          note: "Programados o en progreso",
          icon: Wrench,
          tone: "amber",
        },
      ]
    : [];

  return (
    <section className="ops-live-panel" aria-labelledby="ops-live-title">
      <div className="ops-live-panel__heading">
        <div>
          <span className="ops-section__index">02 / PERSISTENCIA</span>
          <h2 id="ops-live-title">Lectura operativa real</h2>
          <p>
            Conteos actuales almacenados por el sistema. No reemplazan el
            baseline: permiten medir cuánto de esa referencia ya fue cargado.
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
              El baseline sigue disponible. Reintentá la consulta a
              `/api/it/overview`.
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
