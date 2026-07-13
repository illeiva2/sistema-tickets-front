import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
} from "react";
import {
  AlertTriangle,
  Grid3X3,
  Loader2,
  Move,
  RefreshCw,
  Save,
} from "lucide-react";
import { getNetworkErrorInfo } from "../api";
import {
  DEVICE_TYPE_LABELS,
  type NetworkDeviceSummary,
  type TopologyNodePosition,
  type TopologyView,
} from "../types";

interface TopologyCanvasProps {
  view: TopologyView;
  canWrite: boolean;
  isSaving: boolean;
  onSave: (
    expectedUpdatedAt: string,
    nodes: TopologyNodePosition[],
  ) => Promise<TopologyView>;
  onReload: () => Promise<TopologyView | null>;
  onDirtyChange: (dirty: boolean) => void;
}

interface Point {
  x: number;
  y: number;
}

const NODE_WIDTH = 154;
const NODE_HEIGHT = 68;

function getDevices(view: TopologyView): NetworkDeviceSummary[] {
  if (view.devices?.length) return view.devices;
  return (view.nodes ?? []).flatMap((node) =>
    node.device ? [node.device] : [],
  );
}

function initialPositions(
  view: TopologyView,
  devices: NetworkDeviceSummary[],
): Record<string, Point> {
  const stored = new Map(
    (view.nodes ?? []).map((node) => [node.deviceId, { x: node.x, y: node.y }]),
  );
  return Object.fromEntries(
    devices.map((device, index) => [
      device.id,
      stored.get(device.id) ?? {
        x: 38 + (index % 4) * 190,
        y: 42 + Math.floor(index / 4) * 126,
      },
    ]),
  );
}

export function TopologyCanvas({
  view,
  canWrite,
  isSaving,
  onSave,
  onReload,
  onDirtyChange,
}: TopologyCanvasProps) {
  const [snapshot, setSnapshot] = useState(view);
  const devices = getDevices(snapshot);
  const [positions, setPositions] = useState(() =>
    initialPositions(view, getDevices(view)),
  );
  const [expectedUpdatedAt, setExpectedUpdatedAt] = useState(view.updatedAt);
  const [dirty, setDirty] = useState(false);
  const [message, setMessage] = useState("Posiciones cargadas");
  const [error, setError] = useState<string>();
  const [conflict, setConflict] = useState(false);
  const [isReloading, setIsReloading] = useState(false);
  const boardRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    id: string;
    clientX: number;
    clientY: number;
    origin: Point;
  } | null>(null);

  useEffect(() => {
    onDirtyChange(dirty);
  }, [dirty, onDirtyChange]);

  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (!dirty) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  useEffect(() => {
    const move = (event: globalThis.PointerEvent) => {
      const drag = dragRef.current;
      if (!drag || !boardRef.current) return;
      const bounds = boardRef.current.getBoundingClientRect();
      const maxX =
        bounds.width > NODE_WIDTH + 16
          ? bounds.width - NODE_WIDTH - 8
          : Number.POSITIVE_INFINITY;
      const maxY =
        bounds.height > NODE_HEIGHT + 16
          ? bounds.height - NODE_HEIGHT - 8
          : Number.POSITIVE_INFINITY;
      const x = Math.max(
        8,
        Math.min(maxX, drag.origin.x + event.clientX - drag.clientX),
      );
      const y = Math.max(
        8,
        Math.min(maxY, drag.origin.y + event.clientY - drag.clientY),
      );
      setPositions((current) => ({ ...current, [drag.id]: { x, y } }));
      setDirty(true);
    };
    const up = () => {
      dragRef.current = null;
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
  }, []);

  const startDrag = (
    event: PointerEvent<HTMLButtonElement>,
    deviceId: string,
  ) => {
    if (!canWrite) return;
    const origin = positions[deviceId];
    if (!origin) return;
    dragRef.current = {
      id: deviceId,
      clientX: event.clientX,
      clientY: event.clientY,
      origin,
    };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };

  const moveWithKeyboard = (
    event: KeyboardEvent<HTMLButtonElement>,
    deviceId: string,
  ) => {
    if (
      !canWrite ||
      !["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.key)
    )
      return;
    event.preventDefault();
    const delta = event.shiftKey ? 36 : 12;
    const direction = {
      ArrowUp: [0, -delta],
      ArrowDown: [0, delta],
      ArrowLeft: [-delta, 0],
      ArrowRight: [delta, 0],
    }[event.key] ?? [0, 0];
    setPositions((current) => {
      const point = current[deviceId];
      const bounds = boardRef.current?.getBoundingClientRect();
      const maxX =
        bounds && bounds.width > NODE_WIDTH + 16
          ? bounds.width - NODE_WIDTH - 8
          : Number.POSITIVE_INFINITY;
      const maxY =
        bounds && bounds.height > NODE_HEIGHT + 16
          ? bounds.height - NODE_HEIGHT - 8
          : Number.POSITIVE_INFINITY;
      return {
        ...current,
        [deviceId]: {
          x: Math.max(8, Math.min(maxX, point.x + direction[0])),
          y: Math.max(8, Math.min(maxY, point.y + direction[1])),
        },
      };
    });
    setDirty(true);
    setMessage(
      `${devices.find((device) => device.id === deviceId)?.name} movido`,
    );
  };

  const autoLayout = () => {
    const columns = Math.max(
      1,
      Math.min(4, Math.ceil(Math.sqrt(devices.length))),
    );
    setPositions(
      Object.fromEntries(
        devices.map((device, index) => [
          device.id,
          {
            x: 38 + (index % columns) * 190,
            y: 42 + Math.floor(index / columns) * 126,
          },
        ]),
      ),
    );
    setDirty(true);
    setMessage("Distribución automática aplicada localmente");
  };

  const save = async () => {
    setError(undefined);
    setConflict(false);
    try {
      const saved = await onSave(
        expectedUpdatedAt,
        devices.map((device) => ({
          deviceId: device.id,
          ...positions[device.id],
        })),
      );
      setSnapshot((current) => ({
        ...current,
        ...saved,
        devices: saved.devices ?? current.devices,
        links: saved.links ?? current.links,
      }));
      if (saved.devices?.length)
        setPositions(initialPositions(saved, saved.devices));
      setExpectedUpdatedAt(saved.updatedAt);
      setDirty(false);
      setMessage("Layout guardado en el servidor");
    } catch (caught) {
      const info = getNetworkErrorInfo(caught);
      setConflict(info.isConflict);
      setError(info.message);
    }
  };

  const reload = async () => {
    setIsReloading(true);
    const current = await onReload();
    if (current) {
      const currentDevices = getDevices(current);
      setSnapshot(current);
      setPositions(initialPositions(current, currentDevices));
      setExpectedUpdatedAt(current.updatedAt);
      setDirty(false);
      setConflict(false);
      setError(undefined);
      setMessage("Versión del servidor recargada");
    }
    setIsReloading(false);
  };

  return (
    <div className="topology-workspace">
      <div className="topology-toolbar">
        <div>
          <strong>{snapshot.name}</strong>
          <span>
            {snapshot.site?.name || "Mapa global"} · {devices.length} nodos ·{" "}
            {(snapshot.links ?? []).length} enlaces
          </span>
        </div>
        <div>
          {canWrite ? (
            <button
              type="button"
              className="network-button network-button--ghost"
              onClick={autoLayout}
            >
              <Grid3X3 size={15} />
              Autoordenar
            </button>
          ) : null}
          {canWrite ? (
            <button
              type="button"
              className="network-button network-button--primary"
              disabled={!dirty || isSaving || conflict}
              onClick={() => void save()}
            >
              {isSaving ? (
                <Loader2 size={15} className="network-spin" />
              ) : (
                <Save size={15} />
              )}
              Guardar layout
            </button>
          ) : null}
        </div>
      </div>
      <p className="topology-instructions">
        <Move size={14} />
        Arrastrá los nodos o usá las flechas del teclado. Shift + flecha mueve
        más rápido. Los cambios permanecen locales hasta guardar.
      </p>
      {devices.length ? (
        <div ref={boardRef} className="topology-board" data-dirty={dirty}>
          <svg className="topology-edges" aria-hidden="true">
            {(snapshot.links ?? []).map((link) => {
              const from = positions[link.deviceAId];
              const to = positions[link.deviceBId];
              if (!from || !to) return null;
              return (
                <line
                  key={link.id}
                  x1={from.x + NODE_WIDTH / 2}
                  y1={from.y + NODE_HEIGHT / 2}
                  x2={to.x + NODE_WIDTH / 2}
                  y2={to.y + NODE_HEIGHT / 2}
                  data-type={link.type}
                />
              );
            })}
          </svg>
          {devices.map((device) => {
            const point = positions[device.id];
            return (
              <button
                key={device.id}
                type="button"
                className="topology-node"
                data-type={device.type}
                data-status={device.status}
                style={{ transform: `translate(${point.x}px, ${point.y}px)` }}
                aria-label={`${device.name}, ${DEVICE_TYPE_LABELS[device.type]}, ${device.managementIp || "sin IP"}`}
                onPointerDown={(event) => startDrag(event, device.id)}
                onKeyDown={(event) => moveWithKeyboard(event, device.id)}
              >
                <span>{DEVICE_TYPE_LABELS[device.type]}</span>
                <strong>{device.name}</strong>
                <small>{device.managementIp || "IP —"}</small>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="network-empty network-empty--inline">
          <Grid3X3 size={28} />
          <strong>La vista todavía no tiene nodos</strong>
          <p>
            Cargá dispositivos en el sitio seleccionado para construir el mapa.
          </p>
        </div>
      )}
      <span className="topology-live" aria-live="polite">
        {message}
        {dirty ? ". Cambios sin guardar" : ""}
      </span>
      {error ? (
        <div
          className={conflict ? "network-conflict" : "network-error"}
          role="alert"
        >
          <AlertTriangle size={17} />
          <div>
            <strong>
              {conflict
                ? "Existe un layout más reciente"
                : "No se pudo guardar"}
            </strong>
            <p>{error}</p>
            {conflict ? (
              <button
                type="button"
                className="network-button network-button--ghost"
                disabled={isReloading}
                onClick={() => void reload()}
              >
                <RefreshCw size={14} />
                Recargar y descartar cambios locales
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
