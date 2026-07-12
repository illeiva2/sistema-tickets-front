import {
  Activity,
  AlertTriangle,
  Camera,
  Database,
  HardDrive,
  Monitor,
  Network,
  ShoppingCart,
  Smartphone,
  Users,
  Wrench,
} from "lucide-react";
import { BaselineMetricCard } from "./components/BaselineMetricCard";
import { ModulePreviewCard } from "./components/ModulePreviewCard";
import "./it-ops.css";

const BASELINE_METRICS = [
  {
    id: "pcs",
    code: "INV.PC",
    label: "PCs",
    note: "Equipos de puesto declarados",
    value: 60,
    icon: Monitor,
    tone: "cyan",
  },
  {
    id: "mobiles",
    code: "INV.CEL",
    label: "Celulares",
    note: "Líneas y terminales declaradas",
    value: 100,
    icon: Smartphone,
    tone: "cyan",
  },
  {
    id: "network",
    code: "INV.NET",
    label: "Dispositivos de red",
    note: "Nodos de infraestructura declarados",
    value: 25,
    icon: Network,
    tone: "amber",
  },
  {
    id: "cameras",
    code: "INV.CCTV",
    label: "Cámaras",
    note: "Puntos CCTV declarados",
    value: 40,
    icon: Camera,
    tone: "amber",
  },
  {
    id: "people",
    code: "ORG.USR",
    label: "Personas",
    note: "Dotación pendiente de vinculación",
    value: 90,
    icon: Users,
    tone: "neutral",
  },
] as const;

const UPCOMING_MODULES = [
  {
    code: "MOD-01",
    title: "Activos",
    description:
      "Asignación, custodia, ciclo de vida y trazabilidad del inventario.",
    icon: HardDrive,
    href: "/it/inventory",
  },
  {
    code: "MOD-02",
    title: "Personas",
    description:
      "Sectores, responsables y activos vinculados a cada integrante.",
    icon: Users,
    href: "/it/staff",
  },
  {
    code: "MOD-03",
    title: "Mantenimiento",
    description: "Intervenciones, repuestos, responsables y evidencia técnica.",
    icon: Wrench,
    href: "/it/maintenance",
  },
  {
    code: "MOD-04",
    title: "Compras",
    description:
      "Proveedores, precios, autorizaciones y motivo de cada decisión.",
    icon: ShoppingCart,
    href: "/it/purchases",
  },
  {
    code: "MOD-05",
    title: "Red",
    description:
      "Nodos, enlaces, direccionamiento y representación de topología.",
    icon: Network,
    href: "/it/network",
  },
  {
    code: "MOD-06",
    title: "Cámaras",
    description: "Inventario CCTV, ubicación, grabación y cobertura declarada.",
    icon: Camera,
    href: "/it/network",
  },
  {
    code: "MOD-07",
    title: "Monitoreo",
    description: "Salud, batería, uptime, IP y hostname cuando exista agente.",
    icon: Activity,
    href: "/it/live",
  },
] as const;

const INTEGRATION_STATUS = [
  { label: "Inventario", value: "Baseline declarado", tone: "amber" },
  { label: "Telemetría", value: "No conectada", tone: "muted" },
  { label: "Agente GRF", value: "Sin despliegue", tone: "muted" },
  { label: "Salud operativa", value: "No calculada", tone: "muted" },
] as const;

export function ItOpsDashboardPage() {
  return (
    <section className="ops-shell" aria-labelledby="ops-title">
      <header className="ops-hero">
        <div className="ops-command-bar">
          <span className="ops-wordmark">GRF//OPS</span>
          <span className="ops-command-bar__descriptor">
            Control de infraestructura · corte 00
          </span>
          <span className="ops-source-badge">
            <Database size={13} aria-hidden="true" />
            Baseline manual
          </span>
        </div>

        <div className="ops-hero__grid">
          <div className="ops-hero__copy">
            <p className="ops-eyebrow">Matriz operativa / Estado inicial</p>
            <h1 id="ops-title">Mapa operativo inicial</h1>
            <p className="ops-hero__lede">
              Primer corte visual para ordenar activos, personas y operación IT
              en una sola consola. Los valores actuales son una línea base
              cargada manualmente: todavía no representan telemetría ni salud en
              tiempo real.
            </p>
            <ul className="ops-hero__tags" aria-label="Alcance de este corte">
              <li>Inventario declarado</li>
              <li>Sin agentes conectados</li>
              <li>Sin sesiones remotas</li>
            </ul>
          </div>

          <aside
            className="ops-readout"
            aria-label="Resumen del baseline de activos"
          >
            <span className="ops-readout__label">Activos declarados</span>
            <strong>225</strong>
            <span className="ops-readout__unit">PC + CEL + NET + CCTV</span>
            <dl>
              <div>
                <dt>Personas</dt>
                <dd>90</dd>
              </div>
              <div>
                <dt>Origen</dt>
                <dd>Manual</dd>
              </div>
              <div>
                <dt>Señal</dt>
                <dd>No conectada</dd>
              </div>
            </dl>
          </aside>
        </div>
      </header>

      <section className="ops-section" aria-labelledby="ops-baseline-title">
        <div className="ops-section__heading">
          <div>
            <span className="ops-section__index">01 / BASELINE</span>
            <h2 id="ops-baseline-title">Superficie declarada</h2>
          </div>
          <p>
            Cantidades de referencia para iniciar la carga y validación del
            inventario.
          </p>
        </div>
        <div className="ops-metrics" role="list">
          {BASELINE_METRICS.map((metric) => (
            <BaselineMetricCard key={metric.id} {...metric} />
          ))}
        </div>
      </section>

      <section className="ops-status-panel" aria-labelledby="ops-status-title">
        <div className="ops-status-panel__copy">
          <span className="ops-section__index">02 / INTEGRACIÓN</span>
          <h2 id="ops-status-title">Estado del sistema</h2>
          <p>
            Esta vista separa datos conocidos de señales todavía inexistentes
            para no convertir un estimado en una falsa lectura operativa.
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
            <span className="ops-section__index">03 / EXPANSIÓN</span>
            <h2 id="ops-modules-title">Próximos módulos</h2>
          </div>
          <p>
            Accesos a la estructura inicial. Cada módulo indica con claridad qué
            está disponible y qué continúa en preparación.
          </p>
        </div>
        <div className="ops-modules">
          {UPCOMING_MODULES.map((module) => (
            <ModulePreviewCard key={module.code} {...module} />
          ))}
        </div>
      </section>

      <footer className="ops-disclaimer" role="note">
        <AlertTriangle size={18} aria-hidden="true" />
        <div>
          <strong>Lectura controlada</strong>
          <p>
            Estos datos son baseline manual. IP, hostname, batería, uptime,
            disponibilidad y salud permanecerán sin estado hasta conectar y
            validar el agente de monitoreo.
          </p>
        </div>
      </footer>
    </section>
  );
}
