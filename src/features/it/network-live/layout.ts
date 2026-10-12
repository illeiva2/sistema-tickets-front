import type { Topology } from "./topology";

export interface NodeSize {
  width: number;
  height: number;
}

export interface Point {
  x: number;
  y: number;
}

export interface LayoutOptions {
  horizontalGap: number;
  verticalGap: number;
  /** Sangría de los hijos apilados respecto del borde izquierdo del padre (de ahí baja la línea). */
  stackIndent: number;
  stackGap: number;
}

export const DEFAULT_LAYOUT: LayoutOptions = {
  horizontalGap: 28,
  verticalGap: 56,
  stackIndent: 30,
  stackGap: 12,
};

/** Distancia desde el borde izquierdo del padre a la que sale la línea hacia los hijos apilados. */
export const STACK_HANDLE_OFFSET = 12;

export interface TopologyLayout {
  positions: Map<string, Point>;
  /** Hijos que van apilados en columna (hojas de un mismo switch): se conectan por el costado. */
  stacked: Set<string>;
  width: number;
  height: number;
}

/**
 * Árbol ordenado por capas: WAN arriba, después el router, el núcleo y los switches. Cuando todos
 * los hijos de un equipo son hojas (los APs de un switch) van apilados en columna debajo de él en
 * vez de en fila: así el diagrama no se vuelve una tira de miles de píxeles de ancho.
 */
export function layoutTopology(
  topology: Topology,
  sizeOf: (id: string) => NodeSize,
  options: LayoutOptions = DEFAULT_LAYOUT,
): TopologyLayout {
  const positions = new Map<string, Point>();
  const stacked = new Set<string>();
  const childrenOf = (id: string) => topology.children.get(id) ?? [];
  const isLeaf = (id: string) => childrenOf(id).length === 0;
  const stacksChildren = (id: string) => {
    const kids = childrenOf(id);
    return kids.length >= 2 && kids.every(isLeaf);
  };

  // Ancho que ocupa cada subárbol.
  const widths = new Map<string, number>();
  const measure = (id: string): number => {
    const own = sizeOf(id).width;
    const kids = childrenOf(id);
    let width = own;
    if (kids.length && stacksChildren(id)) {
      const column = Math.max(...kids.map((kid) => sizeOf(kid).width));
      width = Math.max(own, options.stackIndent + column);
    } else if (kids.length) {
      const row = kids.reduce((sum, kid) => sum + measure(kid), 0) + options.horizontalGap * (kids.length - 1);
      width = Math.max(own, row);
    }
    widths.set(id, width);
    return width;
  };

  // Alto de cada capa: el nodo más alto de esa profundidad (una columna apilada cuenta entera).
  const rowHeights: number[] = [];
  const depthOf = new Map<string, number>();
  const visitDepth = (id: string, depth: number) => {
    depthOf.set(id, depth);
    const kids = childrenOf(id);
    if (kids.length && stacksChildren(id)) {
      const column = kids.reduce((sum, kid) => sum + sizeOf(kid).height, 0) + options.stackGap * (kids.length - 1);
      rowHeights[depth + 1] = Math.max(rowHeights[depth + 1] ?? 0, column);
      kids.forEach((kid) => depthOf.set(kid, depth + 1));
    } else {
      kids.forEach((kid) => visitDepth(kid, depth + 1));
    }
    rowHeights[depth] = Math.max(rowHeights[depth] ?? 0, sizeOf(id).height);
  };

  const wanHeight = topology.wans.length ? Math.max(...topology.wans.map((wan) => sizeOf(wan.id).height)) : 0;
  const top = topology.wans.length ? wanHeight + options.verticalGap : 0;
  topology.rootIds.forEach((root) => {
    measure(root);
    visitDepth(root, 0);
  });
  const rowTop = (depth: number) => {
    let y = top;
    for (let index = 0; index < depth; index++) y += (rowHeights[index] ?? 0) + options.verticalGap;
    return y;
  };

  const place = (id: string, left: number) => {
    const size = sizeOf(id);
    const width = widths.get(id) ?? size.width;
    const depth = depthOf.get(id) ?? 0;
    const kids = childrenOf(id);
    const stack = kids.length > 0 && stacksChildren(id);
    // Con hijos apilados el padre va a la izquierda de su columna; si no, centrado sobre su fila.
    const x = stack ? left : left + (width - size.width) / 2;
    positions.set(id, { x, y: rowTop(depth) });
    if (!kids.length) return;
    if (stack) {
      let y = rowTop(depth + 1);
      const columnLeft = x + options.stackIndent;
      for (const kid of kids) {
        positions.set(kid, { x: columnLeft, y });
        stacked.add(kid);
        y += sizeOf(kid).height + options.stackGap;
      }
      return;
    }
    const row = kids.reduce((sum, kid) => sum + (widths.get(kid) ?? 0), 0) + options.horizontalGap * (kids.length - 1);
    let cursor = left + (width - row) / 2;
    for (const kid of kids) {
      place(kid, cursor);
      cursor += (widths.get(kid) ?? 0) + options.horizontalGap;
    }
  };

  let cursor = 0;
  for (const root of topology.rootIds) {
    place(root, cursor);
    cursor += (widths.get(root) ?? 0) + options.horizontalGap * 3;
  }
  let width = Math.max(0, cursor - options.horizontalGap * 3);

  // WAN: en fila sobre su router.
  const wansByRouter = new Map<string, string[]>();
  topology.wans.forEach((wan) => wansByRouter.set(wan.deviceId, [...(wansByRouter.get(wan.deviceId) ?? []), wan.id]));
  for (const [routerId, wanIds] of wansByRouter) {
    const router = positions.get(routerId);
    if (!router) continue;
    const row = wanIds.reduce((sum, id) => sum + sizeOf(id).width, 0) + options.horizontalGap * (wanIds.length - 1);
    let x = router.x + sizeOf(routerId).width / 2 - row / 2;
    for (const id of wanIds) {
      positions.set(id, { x, y: 0 });
      x += sizeOf(id).width + options.horizontalGap;
    }
  }

  // Lo que no cuelga de nada, en una fila aparte al final.
  let height = rowTop(rowHeights.length);
  if (topology.unplaced.length) {
    let x = 0;
    for (const id of topology.unplaced) {
      positions.set(id, { x, y: height });
      x += sizeOf(id).width + options.horizontalGap;
    }
    width = Math.max(width, x - options.horizontalGap);
    height += Math.max(...topology.unplaced.map((id) => sizeOf(id).height));
  }

  return { positions, stacked, width, height };
}
