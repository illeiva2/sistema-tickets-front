import { Activity } from "lucide-react";
import { formatDate } from "../format";
import type { AgentMetricSample } from "../types";

interface MetricSeriesProps {
  samples: AgentMetricSample[];
  ramTotalMb?: number | null;
}

interface MetricTrack {
  key: "cpu" | "ram" | "disk" | "battery";
  label: string;
  color: string;
  value: (sample: AgentMetricSample) => number | null;
}

function sparklinePath(values: Array<number | null>) {
  const valid = values
    .map((value, index) => ({ value, index }))
    .filter(
      (entry): entry is { value: number; index: number } => entry.value != null,
    );
  if (!valid.length) return "";
  const denominator = Math.max(values.length - 1, 1);
  return valid
    .map(
      ({ value, index }, position) =>
        `${position ? "L" : "M"} ${(index / denominator) * 240} ${50 - Math.max(0, Math.min(100, value)) * 0.48}`,
    )
    .join(" ");
}

export function MetricSeries({ samples, ramTotalMb }: MetricSeriesProps) {
  const tracks: MetricTrack[] = [
    {
      key: "cpu",
      label: "CPU",
      color: "#5dffcf",
      value: (sample) => sample.cpuPct ?? null,
    },
    {
      key: "ram",
      label: "RAM",
      color: "#54d8ff",
      value: (sample) =>
        sample.ramUsedMb != null && ramTotalMb
          ? (sample.ramUsedMb / ramTotalMb) * 100
          : null,
    },
    {
      key: "disk",
      label: "Disco",
      color: "#c78cff",
      value: (sample) => sample.diskUsedPct ?? null,
    },
    {
      key: "battery",
      label: "Batería",
      color: "#ffd45d",
      value: (sample) => sample.batteryPct ?? null,
    },
  ];
  const visible = samples.slice(-48);
  if (!samples.length)
    return (
      <div className="live-inline-empty">
        <Activity size={22} />
        <strong>Sin serie temporal</strong>
        <p>El agente todavía no acumuló muestras downsampleadas.</p>
      </div>
    );
  return (
    <section className="live-series" aria-labelledby="live-series-title">
      <div className="live-section-title">
        <Activity size={16} />
        <div>
          <h3 id="live-series-title">Serie de métricas</h3>
          <p>Últimas {visible.length} muestras disponibles.</p>
        </div>
      </div>
      <div className="live-series-grid">
        {tracks.map((track) => {
          const values = visible.map(track.value);
          const last = [...values].reverse().find((value) => value != null);
          return (
            <figure key={track.key}>
              <figcaption>
                <span>{track.label}</span>
                <strong>{last == null ? "—" : `${Math.round(last)}%`}</strong>
              </figcaption>
              <svg
                viewBox="0 0 240 52"
                role="img"
                aria-label={`${track.label}: ${last == null ? "sin datos" : `${Math.round(last)} por ciento`}`}
                preserveAspectRatio="none"
              >
                <line x1="0" y1="26" x2="240" y2="26" />
                <path
                  d={sparklinePath(values)}
                  style={{ stroke: track.color }}
                />
              </svg>
            </figure>
          );
        })}
      </div>
      <details className="live-series-values">
        <summary>Ver valores de la serie</summary>
        <div>
          <table>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>CPU</th>
                <th>RAM usada</th>
                <th>Disco</th>
                <th>Batería</th>
              </tr>
            </thead>
            <tbody>
              {samples
                .slice(-25)
                .reverse()
                .map((sample) => (
                  <tr key={sample.id ?? sample.sampledAt}>
                    <td>{formatDate(sample.sampledAt)}</td>
                    <td>
                      {sample.cpuPct == null
                        ? "—"
                        : `${Math.round(sample.cpuPct)}%`}
                    </td>
                    <td>
                      {sample.ramUsedMb == null
                        ? "—"
                        : `${Math.round(sample.ramUsedMb / 1024)} GB`}
                    </td>
                    <td>
                      {sample.diskUsedPct == null
                        ? "—"
                        : `${Math.round(sample.diskUsedPct)}%`}
                    </td>
                    <td>
                      {sample.batteryPct == null
                        ? "—"
                        : `${sample.batteryPct}%`}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </details>
    </section>
  );
}
