import {
  AlertTriangle,
  BatteryWarning,
  CircleOff,
  RadioTower,
} from "lucide-react";
import { getAgentHealth, type AgentDevice } from "../types";

interface FleetMetricsProps {
  items: AgentDevice[];
  total?: number;
}

export function FleetMetrics({ items, total }: FleetMetricsProps) {
  const online = items.filter(
    (device) => device.isActive && device.state === "ONLINE",
  ).length;
  const offline = items.filter(
    (device) => !device.isActive || device.state === "OFFLINE",
  ).length;
  const degraded = items.filter(
    (device) => getAgentHealth(device) === "DEGRADED",
  ).length;
  const lowBattery = items.filter(
    (device) =>
      device.isActive &&
      device.batteryPct != null &&
      device.batteryPct < 20 &&
      !device.batteryCharging,
  ).length;
  const metrics = [
    { label: "Online", value: online, icon: RadioTower, tone: "online" },
    { label: "Offline", value: offline, icon: CircleOff, tone: "offline" },
    {
      label: "Degradados",
      value: degraded,
      icon: AlertTriangle,
      tone: "warning",
    },
    {
      label: "Batería baja",
      value: lowBattery,
      icon: BatteryWarning,
      tone: "battery",
    },
  ] as const;
  return (
    <div
      className="live-metrics"
      aria-label={`Estado de ${total ?? items.length} equipos`}
    >
      {metrics.map(({ label, value, icon: Icon, tone }) => (
        <article key={label} data-tone={tone}>
          <Icon size={18} aria-hidden="true" />
          <span>{label}</span>
          <strong>{value.toLocaleString("es-AR")}</strong>
          <small>
            {total != null && total > items.length
              ? "sobre los primeros 100"
              : "equipos"}
          </small>
        </article>
      ))}
    </div>
  );
}
