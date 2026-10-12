import type { TreeEdge } from "../topology";
import type { LivePort } from "../types";
import {
  PORT_TONE_LABELS,
  formatSpeed,
  portBlocks,
  portLabel,
  portTone,
} from "../ports";

interface PortPanelProps {
  ports: LivePort[];
  linkedPorts: Map<string, TreeEdge>;
  selectedPort: string | null;
  onSelect: (key: string | null) => void;
}

/** Frente del equipo: un botón por puerto físico, coloreado por estado y velocidad. */
export function PortPanel({ ports, linkedPorts, selectedPort, onSelect }: PortPanelProps) {
  const blocks = portBlocks(ports);
  if (!blocks.length) {
    return <p className="netlive-hint">El equipo no informó puertos físicos.</p>;
  }

  return (
    <div className="netlive-ports">
      {blocks.map((block) => (
        <div key={block.id} className="netlive-ports__block">
          <span className="netlive-ports__label">{block.label}</span>
          <div className="netlive-ports__grid" data-rows={block.rows}>
            {block.ports.map((port) => {
              const tone = portTone(port);
              const selected = selectedPort === port.key;
              const label = portLabel(port);
              return (
                <button
                  key={port.key}
                  type="button"
                  className="netlive-port nodrag nopan"
                  data-tone={tone}
                  data-uplink={linkedPorts.has(port.key) || undefined}
                  data-neighbor={port.neighbors.length > 0 || undefined}
                  aria-pressed={selected}
                  aria-label={`Puerto ${port.name}: ${PORT_TONE_LABELS[tone]}${port.linkUp ? `, ${formatSpeed(port.speedMbps)}` : ""}`}
                  title={`${port.name}${port.description ? ` · ${port.description}` : ""}`}
                  onClick={(event) => {
                    event.stopPropagation();
                    onSelect(selected ? null : port.key);
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
