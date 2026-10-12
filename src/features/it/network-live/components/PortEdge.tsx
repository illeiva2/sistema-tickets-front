import {
  BaseEdge,
  EdgeLabelRenderer,
  Position,
  getSmoothStepPath,
  type Edge,
  type EdgeProps,
} from "@xyflow/react";

export interface PortEdgeData extends Record<string, unknown> {
  label?: string;
}

export type PortFlowEdge = Edge<PortEdgeData, "port">;

/**
 * Enlace en escalón con la etiqueta de puertos pegada al equipo de destino: en el centro se
 * encimarían todas sobre la línea común que baja del núcleo.
 */
export function PortEdge({
  id,
  sourceX,
  sourceY,
  sourcePosition,
  targetX,
  targetY,
  targetPosition,
  style,
  data,
}: EdgeProps<PortFlowEdge>) {
  const [path] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    borderRadius: 6,
  });
  const fromLeft = targetPosition === Position.Left;
  const transform = fromLeft
    ? `translate(-100%, -50%) translate(${targetX - 6}px, ${targetY}px)`
    : `translate(-50%, -100%) translate(${targetX}px, ${targetY - 6}px)`;

  return (
    <>
      <BaseEdge id={id} path={path} style={style} />
      {data?.label ? (
        <EdgeLabelRenderer>
          <div className="netlive-edge-label" style={{ transform }}>
            {data.label}
          </div>
        </EdgeLabelRenderer>
      ) : null}
    </>
  );
}

export const edgeTypes = { port: PortEdge };
