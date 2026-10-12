import { endpointTitle } from "./endpoints";
import { formatSpeed, linkPortLabel } from "./ports";
import type { LiveDevice, LiveEvent, LiveEventKind } from "./types";

/** good = volvió algo; bad = se cayó algo de la red; off = un puerto sin enlace (una PC que se apaga); warn; info. */
export type EventTone = "good" | "bad" | "off" | "warn" | "info";

export interface DescribedEvent {
  tone: EventTone;
  title: string;
  place: string | null;
  /** A dónde lleva tocarlo en el diagrama. */
  deviceId: string | null;
  portKey: string | null;
  mac: string | null;
}

export type EventGroup = "all" | "network" | "ports" | "endpoints";

export const EVENT_GROUPS: { id: EventGroup; label: string; kinds: LiveEventKind[] | undefined }[] = [
  { id: "all", label: "Todo", kinds: undefined },
  {
    id: "network",
    label: "Equipos de red",
    kinds: ["device_new", "device_down", "device_up", "device_restart", "link_new", "collector_silent", "collector_back"],
  },
  { id: "ports", label: "Puertos", kinds: ["port_down", "port_up", "port_speed"] },
  { id: "endpoints", label: "Equipos conectados", kinds: ["endpoint_new", "endpoint_moved"] },
];

const text = (value: unknown) => (typeof value === "string" && value ? value : null);
const number = (value: unknown) => (typeof value === "number" ? value : null);

function deviceName(devices: Map<string, LiveDevice>, id: string | null) {
  return (id && devices.get(id)?.name) || "un equipo que ya no informa";
}

function portName(devices: Map<string, LiveDevice>, deviceId: string | null, key: string | null, detail: LiveEvent["detail"]) {
  const named = text(detail?.name);
  if (named) return named;
  if (!key) return "?";
  const device = deviceId ? devices.get(deviceId) : undefined;
  return key.split("+").map((part) => linkPortLabel(device, part)).join("+");
}

/** "SWITCH · puerto 12", o "Wi-Fi por AP-010" si es un cliente inalámbrico. */
function placeOf(devices: Map<string, LiveDevice>, deviceId: string | null, portKey: string | null, viaDeviceId: unknown) {
  const via = typeof viaDeviceId === "string" ? devices.get(viaDeviceId) : undefined;
  if (via) return `Wi-Fi por ${via.name}`;
  return `${deviceName(devices, deviceId)} · puerto ${portName(devices, deviceId, portKey, null)}`;
}

/** Cada evento en castellano, con su tono y a dónde lleva en el diagrama. */
export function describeEvent(event: LiveEvent, devices: Map<string, LiveDevice>): DescribedEvent {
  const name = deviceName(devices, event.deviceId);
  const device = event.deviceId ? devices.get(event.deviceId) : undefined;
  const detail = event.detail;
  const base = { deviceId: event.deviceId, portKey: event.portKey, mac: event.macAddress };
  const endpoint = event.macAddress
    ? endpointTitle({
        agent: event.endpoint?.agent ?? null,
        hostname: event.endpoint?.hostname ?? null,
        ip: event.endpoint?.ip ?? null,
        mac: event.macAddress,
      })
    : null;

  switch (event.kind) {
    case "device_new":
      return { ...base, portKey: null, tone: "info", title: `${name}: equipo de red nuevo`, place: null };
    case "device_down":
      return {
        ...base,
        portKey: null,
        tone: "bad",
        title: device?.role === "ap" ? `${name} se desconectó del controlador` : `${name} dejó de responder`,
        place: text(detail?.error),
      };
    case "device_up":
      return {
        ...base,
        portKey: null,
        tone: "good",
        title: `${name} volvió a responder${detail?.restarted ? " (se reinició)" : ""}`,
        place: null,
      };
    case "device_restart":
      return { ...base, portKey: null, tone: "warn", title: `${name} se reinició`, place: null };
    case "port_down":
      return {
        ...base,
        tone: "off",
        title: `Puerto ${portName(devices, event.deviceId, event.portKey, detail)} sin enlace`,
        place: name,
      };
    case "port_up": {
      const speed = number(detail?.speedMbps);
      return {
        ...base,
        tone: "good",
        title: `Puerto ${portName(devices, event.deviceId, event.portKey, detail)} con enlace${speed ? ` a ${formatSpeed(speed)}` : ""}`,
        place: name,
      };
    }
    case "port_speed": {
      const from = number(detail?.from);
      const to = number(detail?.to);
      return {
        ...base,
        tone: to !== null && to < 1000 ? "warn" : "info",
        title: `Puerto ${portName(devices, event.deviceId, event.portKey, detail)}: de ${formatSpeed(from)} a ${formatSpeed(to)}`,
        place: name,
      };
    }
    case "link_new":
      return {
        ...base,
        portKey: null,
        tone: "info",
        title: `Conexión nueva: ${name} (${portName(devices, event.deviceId, event.portKey, null)}) ↔ ${deviceName(devices, event.peerDeviceId)} (${portName(devices, event.peerDeviceId, event.peerPortKey, null)})`,
        place: detail?.source === "lldp" ? "confirmada por LLDP" : "deducida de las tablas MAC",
      };
    case "endpoint_new":
      return {
        ...base,
        tone: "info",
        title: `Equipo nuevo en la red: ${endpoint}`,
        place: placeOf(devices, event.deviceId, event.portKey, detail?.viaDeviceId),
      };
    case "endpoint_moved":
      return {
        ...base,
        tone: "info",
        title: `${endpoint} cambió de lugar`,
        place: `de ${placeOf(devices, event.peerDeviceId, event.peerPortKey, null)} a ${placeOf(devices, event.deviceId, event.portKey, detail?.viaDeviceId)}`,
      };
    case "collector_silent":
      return { ...base, deviceId: null, portKey: null, tone: "bad", title: "El colector dejó de mandar datos", place: null };
    case "collector_back": {
      const minutes = number(detail?.silentMinutes);
      return {
        ...base,
        deviceId: null,
        portKey: null,
        tone: "good",
        title: "El colector volvió a mandar datos",
        place: minutes ? `estuvo ${minutes} min sin mandar` : null,
      };
    }
    default:
      return { ...base, tone: "info", title: `${name}: ${event.kind}`, place: null };
  }
}

/** "Hoy", "Ayer" o la fecha, para agrupar el historial por día. */
export function dayLabel(iso: string, now = new Date()) {
  const day = new Date(iso);
  const start = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const diff = Math.round((start(now) - start(day)) / 86_400_000);
  if (diff === 0) return "Hoy";
  if (diff === 1) return "Ayer";
  return new Intl.DateTimeFormat("es-AR", { weekday: "long", day: "numeric", month: "numeric" }).format(day);
}

/** Hora en 24 h ("18:50"): en es-AR la de 12 h ("06:50 p. m.") no entra en la columna. */
export function timeLabel(iso: string) {
  return new Intl.DateTimeFormat("es-AR", { hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(iso));
}

/** Eventos agrupados por día, en el orden en que llegan (lo más nuevo primero). */
export function groupByDay(events: LiveEvent[], now = new Date()) {
  const groups: { day: string; events: LiveEvent[] }[] = [];
  for (const event of events) {
    const day = dayLabel(event.at, now);
    const last = groups[groups.length - 1];
    if (last && last.day === day) last.events.push(event);
    else groups.push({ day, events: [event] });
  }
  return groups;
}
