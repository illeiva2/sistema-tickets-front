import type { LiveWifiClient } from "../types";
import { connectedFor, rateLabel, signalQuality, wifiNetwork, wifiTitle } from "../wifi";

/** Barras de señal (1 a 4) con su calidad en texto para lectores de pantalla. */
export function SignalBars({ dbm }: { dbm: number | null }) {
  const quality = signalQuality(dbm);
  if (!quality) return null;
  return (
    <span className="netlive-signal" data-tone={quality.tone} title={`${dbm} dBm: señal ${quality.label}`}>
      <span className="netlive-signal__bars" aria-hidden="true">
        {[1, 2, 3, 4].map((bar) => (
          <i key={bar} data-on={bar <= quality.bars || undefined} />
        ))}
      </span>
      <span>
        {dbm} dBm · {quality.label}
      </span>
    </span>
  );
}

interface WifiClientsProps {
  clients: LiveWifiClient[];
  /** Lo que informa UniFi en total (incluye invitados, que no se listan). */
  total: number | null;
  highlightMac: string | null;
}

/** Clientes Wi-Fi de un AP, de mejor a peor señal. */
export function WifiClients({ clients, total, highlightMac }: WifiClientsProps) {
  const hidden = total !== null ? Math.max(0, total - clients.length) : 0;
  if (!clients.length) {
    return (
      <p className="netlive-hint">
        {hidden ? `Sin clientes para mostrar (${hidden} invitado${hidden === 1 ? "" : "s"} no se listan).` : "Sin clientes Wi-Fi ahora."}
      </p>
    );
  }

  return (
    <div className="netlive-wifi">
      <p className="netlive-recent__title">
        Clientes Wi-Fi ({clients.length})
        {hidden ? ` · ${hidden} invitado${hidden === 1 ? "" : "s"} más, sin detalle` : ""}
      </p>
      <ul>
        {clients.map((client) => (
          <li key={client.mac} data-highlighted={client.mac === highlightMac || undefined}>
            <strong>{wifiTitle(client)}</strong>
            <span>{wifiNetwork(client)}</span>
            <SignalBars dbm={client.signal} />
            <small>
              {[
                client.agent?.loggedInUser ? `usuario ${client.agent.loggedInUser}` : null,
                // La velocidad negociada del enlace (la mayor de los dos sentidos): dice si anda a 6 o a 866 Mb/s.
                client.rxKbps !== null || client.txKbps !== null
                  ? `enlace a ${rateLabel(Math.max(client.rxKbps ?? 0, client.txKbps ?? 0))}`
                  : null,
                connectedFor(client.uptimeSeconds) ? `conectado hace ${connectedFor(client.uptimeSeconds)}` : null,
              ]
                .filter(Boolean)
                .join(" · ")}
            </small>
          </li>
        ))}
      </ul>
    </div>
  );
}
