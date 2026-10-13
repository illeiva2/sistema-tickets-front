import { endpointTitle } from "./endpoints";
import type { LiveWifiClient } from "./types";

export type SignalTone = "good" | "ok" | "warn" | "bad";

/**
 * Calidad de la señal según los dBm que informa el AP. Las referencias habituales: -67 dBm es el
 * mínimo para voz y video sin cortes; por debajo de -75 la conexión se vuelve lenta e inestable.
 */
export function signalQuality(dbm: number | null): { label: string; tone: SignalTone; bars: number } | null {
  if (dbm === null) return null;
  if (dbm >= -55) return { label: "excelente", tone: "good", bars: 4 };
  if (dbm >= -67) return { label: "buena", tone: "ok", bars: 3 };
  if (dbm >= -75) return { label: "regular", tone: "warn", bars: 2 };
  return { label: "débil", tone: "bad", bars: 1 };
}

export const isWeak = (client: Pick<LiveWifiClient, "signal">) => client.signal !== null && client.signal < -75;

export function bandLabel(band: string | null) {
  if (!band) return null;
  return `${band.replace(".", ",")} GHz`;
}

/** 866700 kbps → "867 Mb/s". */
export function rateLabel(kbps: number | null) {
  if (kbps === null) return null;
  const mbps = kbps / 1000;
  return `${mbps >= 100 ? Math.round(mbps) : mbps.toLocaleString("es-AR", { maximumFractionDigits: 1 })} Mb/s`;
}

/** "GRF_Privado · 5 GHz · canal 44". */
export function wifiNetwork(client: Pick<LiveWifiClient, "ssid" | "band" | "channel">) {
  return [client.ssid, bandLabel(client.band), client.channel ? `canal ${client.channel}` : null].filter(Boolean).join(" · ");
}

export function wifiTitle(client: LiveWifiClient) {
  return endpointTitle({ agent: client.agent, hostname: client.hostname, ip: client.ip, mac: client.mac });
}

/** Clientes por AP (de mejor a peor señal) y por MAC. */
export function indexWifi(clients: LiveWifiClient[]) {
  const byAp = new Map<string, LiveWifiClient[]>();
  const byMac = new Map<string, LiveWifiClient>();
  for (const client of clients) {
    byMac.set(client.mac, client);
    const list = byAp.get(client.apDeviceId);
    if (list) list.push(client);
    else byAp.set(client.apDeviceId, [client]);
  }
  for (const list of byAp.values()) {
    list.sort((a, b) => (b.signal ?? -999) - (a.signal ?? -999) || wifiTitle(a).localeCompare(wifiTitle(b), "es"));
  }
  return { byAp, byMac };
}

/** "hace 2 h" a partir de los segundos asociado. */
export function connectedFor(seconds: number | null) {
  if (seconds === null) return null;
  if (seconds < 3600) return `${Math.max(1, Math.round(seconds / 60))} min`;
  if (seconds < 86_400) return `${Math.round(seconds / 3600)} h`;
  return `${Math.round(seconds / 86_400)} días`;
}
