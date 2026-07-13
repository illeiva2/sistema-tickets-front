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

export interface TopologyPoint {
  x: number;
  y: number;
}

interface TopologyDraft {
  expectedUpdatedAt: string;
  positions: Record<string, TopologyPoint>;
}

const NODE_WIDTH = 154;
const NODE_HEIGHT = 68;
const NODE_COLUMN_GAP = 190;
const NODE_ROW_GAP = 126;

function draftKey(viewId: string) {
  return `it-network-topology-draft:${viewId}`;
}

function readDraft(viewId: string): TopologyDraft | null {
  try {
    const raw = window.sessionStorage.getItem(draftKey(viewId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<TopologyDraft>;
    if (!parsed.expectedUpdatedAt || !parsed.positions) return null;
    return {
      expectedUpdatedAt: parsed.expectedUpdatedAt,
      positions: parsed.positions,
    };
  } catch {
    return null;
  }
}

function gridColumns(total: number) {
  return Math.max(1, Math.min(8, Math.ceil(Math.sqrt(total))));
}

export function calculateTopologyPlaneSize(points: TopologyPoint[]) {
  const maxX = points.reduce((maximum, point) => Math.max(maximum, point.x), 0);
  const maxY = points.reduce((maximum, point) => Math.max(maximum, point.y), 0);
  return {
    width: Math.max(900, Math.ceil(maxX + NODE_WIDTH + 42)),
    height: Math.max(550, Math.ceil(maxY + NODE_HEIGHT + 42)),
  };
}

function getDevices(view: TopologyView): NetworkDeviceSummary[] {
  if (view.devices?.length) return view.devices;
  return (view.nodes ?? []).flatMap((node) =>
    node.device ? [node.device] : [],
  );
}

function initialPositions(
  view: TopologyView,
  devices: NetworkDeviceSummary[],
): Record<string, TopologyPoint> {
  const columns = gridColumns(devices.length);
  const stored = new Map(
    (view.nodes ?? []).map((node) => [node.deviceId, { x: node.x, y: node.y }]),
  );
  return Object.fromEntries(
    devices.map((device, index) => [
      device.id,
      stored.get(device.id) ?? {
        x: 38 + (index % columns) * NODE_COLUMN_GAP,
        y: 42 + Math.floor(index / columns) * NODE_ROW_GAP,
      },
    ]),
  );
}

function positionsWithDraft(
  view: TopologyView,
  devices: NetworkDeviceSummary[],
  draft: TopologyDraft | null,
) {
  const base = initialPositions(view, devices);
  if (!draft) return base;
  return Object.fromEntries(
    devices.map((device) => {
      const saved = draft.positions[device.id];
      const valid =
        saved &&
        Number.isFinite(saved.x) &&
        Number.isFinite(saved.y) &&
        saved.x >= 0 &&
        saved.y >= 0 &&
        saved.x <= 1_000_000 &&
        saved.y <= 1_000_000;
      return [device.id, valid ? saved : base[device.id]];
    }),
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
  const initialDraftRef = useRef(readDraft(view.id));
  const [snapshot, setSnapshot] = useState(view);
  const devices = getDevices(snapshot);
  const [positions, setPositions] = useState(() =>
    positionsWithDraft(view, getDevices(view), initialDraftRef.current),
  );
  const [expectedUpdatedAt, setExpectedUpdatedAt] = useState(
    initialDraftRef.current?.expectedUpdatedAt ?? view.updatedAt,
  );
  const [dirty, setDirty] = useState(Boolean(initialDraftRef.current));
  const [message, setMessage] = useState(
    initialDraftRef.current
      ? "Borrador local de posiciones restaurado"
      : "Posiciones cargadas",
  );
  const [error, setError] = useState<string>();
  const [conflict, setConflict] = useState(false);
  const [isReloading, setIsReloading] = useState(false);
  const boardRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    id: string;
    clientX: number;
    clientY: number;
    origin: TopologyPoint;
  } | null>(null);
  const planeSize = calculateTopologyPlaneSize(Object.values(positions));

  useEffect(() => {
    onDirtyChange(dirty);
  }, [dirty, onDirtyChange]);

  useEffect(() => {
    try {
      if (dirty) {
        window.sessionStorage.setItem(
          draftKey(view.id),
          JSON.stringify({ expectedUpdatedAt, positions }),
        );
      } else {
        window.sessionStorage.removeItem(draftKey(view.id));
      }
    } catch {
      // El editor sigue funcionando aunque el navegador bloquee storage.
    }
  }, [dirty, expectedUpdatedAt, positions, view.id]);

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
    const columns = gridColumns(devices.length);
    setPositions(
      Object.fromEntries(
        devices.map((device, index) => [
          device.id,
          {
            x: 38 + (index % columns) * NODE_COLUMN_GAP,
            y: 42 + Math.floor(index / columns) * NODE_ROW_GAP,
          },
        ]),
      ),
    );
    setDirty(true);
    setMessage("Distribución automática aplicada localmente");
  };

  const discardDraft = () => {
    setPositions(initialPositions(snapshot, devices));
    setExpectedUpdatedAt(snapshot.updatedAt);
    setDirty(false);
    setConflict(false);
    setError(undefined);
    setMessage("Borrador local descartado");
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
              disabled={!dirty || isSaving}
              onClick={discardDraft}
            >
              Descartar
            </button>
          ) : null}
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
        <div
          className="topology-board-scroll"
          role="region"
          tabIndex={0}
          aria-label="Plano desplazable de topología"
        >
          <div
            ref={boardRef}
            className="topology-board"
            data-dirty={dirty}
            style={planeSize}
          >
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
