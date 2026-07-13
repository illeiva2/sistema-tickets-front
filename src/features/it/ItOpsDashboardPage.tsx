import {
  Activity,
  AlertTriangle,
  Camera,
  Database,
  HardDrive,
  Network,
  ShoppingCart,
  Smartphone,
  Users,
  Wrench,
} from "lucide-react";
import { ModulePreviewCard } from "./components/ModulePreviewCard";
import { PersistedOverviewPanel } from "./overview/PersistedOverviewPanel";
import "./it-ops.css";

const MODULES = [
  {
    code: "MOD-01",
    title: "Activos",
    description:
      "Asignación, custodia, ciclo de vida y trazabilidad del inventario.",
    icon: HardDrive,
    href: "/it/inventory",
    status: "available",
  },
  {
    code: "MOD-02",
    title: "Personas",
    description:
      "Sectores, responsables y activos vinculados a cada integrante.",
    icon: Users,
    href: "/it/staff",
    status: "available",
  },
  {
    code: "MOD-03",
    title: "Mantenimiento",
    description: "Intervenciones, repuestos, responsables y evidencia técnica.",
    icon: Wrench,
    href: "/it/maintenance",
    status: "available",
  },
  {
    code: "MOD-04",
    title: "Compras",
    description:
      "Proveedores, precios, autorizaciones y motivo de cada decisión.",
    icon: ShoppingCart,
    href: "/it/purchases",
    status: "available",
  },
  {
    code: "MOD-05",
    title: "Red",
    description:
      "Nodos, enlaces, direccionamiento y representación de topología.",
    icon: Network,
    href: "/it/network",
    status: "available",
  },
  {
    code: "MOD-06",
    title: "Cámaras",
    description: "Inventario CCTV, ubicación, grabación y cobertura declarada.",
    icon: Camera,
    href: "/it/network",
    status: "limited",
  },
  {
    code: "MOD-07",
    title: "Monitoreo",
    description: "Salud, batería, uptime, IP y hostname cuando exista agente.",
    icon: Activity,
    href: "/it/live",
    status: "available",
  },
  {
    code: "MOD-08",
    title: "Líneas",
    description:
      "Números, operadoras, planes y trazabilidad de asignaciones de SIM.",
    icon: Smartphone,
    href: "/it/staff",
    status: "preparing",
  },
] as const;

const INTEGRATION_STATUS = [
  { label: "Persistencia", value: "Datos operativos reales", tone: "cyan" },
  { label: "Telemetría", value: "Agentes en vivo", tone: "cyan" },
  { label: "Control remoto", value: "Directo por LAN/VPN", tone: "cyan" },
  { label: "Líneas", value: "En preparación", tone: "amber" },
] as const;

export function ItOpsDashboardPage() {
  return (
    <section className="ops-shell" aria-labelledby="ops-title">
      <header className="ops-hero">
        <div className="ops-command-bar">
          <span className="ops-wordmark">GRF//OPS</span>
          <span className="ops-command-bar__descriptor">
            Control de infraestructura · estado operativo
          </span>
          <span className="ops-source-badge">
            <Database size={13} aria-hidden="true" />
            Persistencia + telemetría
          </span>
        </div>

        <div className="ops-hero__grid">
          <div className="ops-hero__copy">
            <p className="ops-eyebrow">Matriz operativa / Estado actual</p>
            <h1 id="ops-title">Consola operativa IT</h1>
            <p className="ops-hero__lede">
              Activos, personas, red y monitoreo en una lectura única basada en
              registros persistidos y telemetría reportada por los agentes.
            </p>
            <ul className="ops-hero__tags" aria-label="Capacidades operativas">
              <li>Conteos persistidos</li>
              <li>Telemetría real</li>
              <li>Remoto directo LAN/VPN</li>
            </ul>
          </div>

          <aside
            className="ops-readout"
            aria-label="Origen de la lectura operativa"
          >
            <span className="ops-readout__label">Fuente operativa</span>
            <strong>REAL</strong>
            <span className="ops-readout__unit">API + agentes instalados</span>
            <dl>
              <div>
                <dt>Persistencia</dt>
                <dd>Conectada</dd>
              </div>
              <div>
                <dt>Telemetría</dt>
                <dd>Disponible</dd>
              </div>
              <div>
                <dt>Remoto</dt>
                <dd>LAN / VPN</dd>
              </div>
            </dl>
          </aside>
        </div>
      </header>

      <PersistedOverviewPanel />

      <section className="ops-status-panel" aria-labelledby="ops-status-title">
        <div className="ops-status-panel__copy">
          <span className="ops-section__index">02 / INTEGRACIÓN</span>
          <h2 id="ops-status-title">Estado del sistema</h2>
          <p>
            Capacidades disponibles hoy y límites explícitos de la operación.
          </p>
        </div>
        <dl className="ops-status-grid">
          {INTEGRATION_STATUS.map((status) => (
            <div key={status.label} data-tone={status.tone}>
              <dt>{status.label}</dt>
              <dd>{status.value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="ops-section" aria-labelledby="ops-modules-title">
        <div className="ops-section__heading">
          <div>
            <span className="ops-section__index">03 / MÓDULOS</span>
            <h2 id="ops-modules-title">Superficie de módulos</h2>
          </div>
          <p>
            Accesos a cada dominio. Cámaras tiene cobertura básica dentro de Red
            y Líneas continúa en preparación.
          </p>
        </div>
        <div className="ops-modules">
          {MODULES.map((module) => (
            <ModulePreviewCard key={module.code} {...module} />
          ))}
        </div>
      </section>

      <footer className="ops-disclaimer" role="note">
        <AlertTriangle size={18} aria-hidden="true" />
        <div>
          <strong>Alcance de la lectura</strong>
          <p>
            Los conteos excluyen bajas lógicas. La telemetría refleja el último
            estado reportado; el acceso remoto funciona de forma directa cuando
            existe alcance por LAN o VPN.
          </p>
        </div>
      </footer>
    </section>
  );
}
