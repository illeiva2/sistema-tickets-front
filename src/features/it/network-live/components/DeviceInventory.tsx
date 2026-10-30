import type { LiveDevice } from "../types";
import { AssetLink } from "./AssetLink";

export type DeviceAssetMode = "link" | "create";

/**
 * Fila "Inventario" al pie de un router, switch o AP: su ficha (vinculada a mano o por número de
 * serie), o cómo vincularle una existente o darlo de alta.
 */
export function DeviceInventory({
  device,
  onOpen,
}: {
  device: LiveDevice;
  onOpen: (deviceId: string, mode: DeviceAssetMode) => void;
}) {
  const { asset } = device;
  return (
    <div className="netlive-node__meta-wide netlive-node__inventory">
      <dt>Inventario</dt>
      <dd>
        {asset ? (
          <>
            <strong>{asset.assetTag}</strong>
            {device.assetLink === "serial" ? (
              <small title="Reconocida por el número de serie: no está vinculada a mano">por serie</small>
            ) : null}
            <AssetLink asset={asset} />
            <button
              type="button"
              className="netlive-inline-button nodrag nopan"
              title="Vincular otra ficha del inventario o desvincular esta"
              onClick={() => onOpen(device.id, "link")}
            >
              Cambiar
            </button>
          </>
        ) : (
          <>
            <span>Sin ficha</span>
            <button
              type="button"
              className="netlive-inline-button nodrag nopan"
              onClick={() => onOpen(device.id, "create")}
            >
              Dar de alta
            </button>
            <button
              type="button"
              className="netlive-inline-button nodrag nopan"
              title="Vincular una ficha que ya está en el inventario"
              onClick={() => onOpen(device.id, "link")}
            >
              Vincular…
            </button>
          </>
        )}
      </dd>
    </div>
  );
}
