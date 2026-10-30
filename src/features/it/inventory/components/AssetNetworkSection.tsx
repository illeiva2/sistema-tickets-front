import { Waypoints } from "lucide-react";
import { Link } from "react-router-dom";
import { formatHeartbeat } from "@/features/it/live/format";
import type { AssetSighting } from "@/features/it/network-live/types";
import { useAssetNetworkLocation } from "@/features/it/network-live/useNetworkLive";

/** Dónde está en palabras: el switch y el puerto, o el AP y la red si va por Wi-Fi. */
function place(sighting: AssetSighting): string {
  if (sighting.via) {
    const network = sighting.wifi?.ssid ? ` (${sighting.wifi.ssid})` : "";
    return `Wi-Fi por ${sighting.via.name}${network}`;
  }
  return `${sighting.device.name} · puerto ${sighting.portKey}`;
}

/**
 * Ficha del inventario: dónde está conectado el equipo según Red en vivo, o dónde se lo vio por
 * última vez. Se lo reconoce por su agente o porque la etiqueta es su nombre de host.
 */
export function AssetNetworkSection({ assetId }: { assetId: string }) {
  const location = useAssetNetworkLocation(assetId);
  const [current, ...others] = location.data?.sightings ?? [];

  return (
    <fieldset>
      <legend>En la red</legend>
      {location.isLoading ? (
        <p className="inventory-form__readonly-note" role="status">
          Buscando en Red en vivo…
        </p>
      ) : location.isError ? (
        <p className="inventory-form__readonly-note" role="alert">
          No se pudo consultar Red en vivo.
        </p>
      ) : !current ? (
        <p className="inventory-form__readonly-note">
          No aparece en Red en vivo. Se lo reconoce por su agente o porque la
          etiqueta coincide con el nombre de host del equipo.
        </p>
      ) : (
        <>
          <dl className="inventory-form__readonly">
            <div>
              <dt>
                {current.online ? "Conectado ahora" : "Visto por última vez"}
              </dt>
              <dd>{place(current)}</dd>
            </div>
            <div>
              <dt>Estado</dt>
              <dd>
                {current.online
                  ? "En línea"
                  : `No se ve desde ${formatHeartbeat(current.lastSeenAt)}`}
              </dd>
            </div>
            <div>
              <dt>IP</dt>
              <dd>
                {current.ip ?? "Sin informar"}
                {current.vlan ? ` · VLAN ${current.vlan}` : ""}
              </dd>
            </div>
            <div>
              <dt>MAC</dt>
              <dd>{current.mac}</dd>
            </div>
            {current.wifi?.signal !== null &&
            current.wifi?.signal !== undefined ? (
              <div>
                <dt>Señal Wi-Fi</dt>
                <dd>{current.wifi.signal} dBm</dd>
              </div>
            ) : null}
          </dl>
          {others.length ? (
            <small className="inventory-form__readonly-note">
              También se lo vio en {others.map(place).join(", ")}.
            </small>
          ) : null}
          <div className="inventory-network__footer">
            <small className="inventory-form__readonly-note">
              Reconocido por{" "}
              {current.matchedBy === "agent"
                ? "su agente"
                : "el nombre de host"}
              .
            </small>
            <Link
              className="inventory-button inventory-button--ghost"
              to={`/it/network-live?buscar=${encodeURIComponent(current.mac)}`}
            >
              <Waypoints size={15} aria-hidden="true" />
              Ver en Red en vivo
            </Link>
          </div>
        </>
      )}
    </fieldset>
  );
}
