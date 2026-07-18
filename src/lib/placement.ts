import { holeId, offsetHole, type Dir } from "./breadboard";
import type {
  ComponentKind,
  Hole,
  HoleId,
  PlacedComponent,
  Wire,
} from "./types";

/** How many holes apart a component's two legs sit. */
export const COMPONENT_SPAN: Record<ComponentKind, number> = {
  resistor: 4,
  led: 1,
  button: 2,
};

export interface PlacementTarget {
  a: Hole;
  b: Hole;
}

/** Both legs for placing `kind` anchored at `anchor` facing `dir`, or null if off-board. */
export function placementTarget(
  anchor: Hole,
  kind: ComponentKind,
  dir: Dir,
): PlacementTarget | null {
  const b = offsetHole(anchor, dir, COMPONENT_SPAN[kind]);
  return b ? { a: anchor, b } : null;
}

/** Holes already taken by a component leg or a wire end (one thing per hole). */
export function occupiedHoles(
  components: readonly PlacedComponent[],
  wires: readonly Wire[],
): Set<HoleId> {
  const occupied = new Set<HoleId>();
  for (const c of components) {
    occupied.add(c.holeA);
    occupied.add(c.holeB);
  }
  for (const w of wires) {
    if (w.a.kind === "hole") occupied.add(w.a.hole);
    if (w.b.kind === "hole") occupied.add(w.b.hole);
  }
  return occupied;
}

export function isPlacementFree(
  target: PlacementTarget,
  occupied: ReadonlySet<HoleId>,
): boolean {
  return !occupied.has(holeId(target.a)) && !occupied.has(holeId(target.b));
}
