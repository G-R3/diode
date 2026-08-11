import { type Dir, holeId, offsetHoleByDistance } from "./breadboard";
import type {
  ComponentKind,
  Hole,
  HoleId,
  PlacedComponent,
  Wire,
} from "./types";

/** Nominal pin distance in breadboard-pitch world units. */
export const COMPONENT_SPAN: Record<ComponentKind, number> = {
  resistor: 3,
  led: 1,
  button: 2,
};

export type PlacementTarget =
  | {
      kind: "resistor" | "led";
      a: Hole;
      b: Hole;
      holes: readonly [Hole, Hole];
    }
  | {
      kind: "button";
      /** A1 and B1 are the authored model anchors used to orient the asset. */
      a: Hole;
      b: Hole;
      a2: Hole;
      b2: Hole;
      holes: readonly [Hole, Hole, Hole, Hole];
    };

/** Physical leg footprint anchored at `anchor`, or null when any leg is off-board. */
export function placementTarget(
  anchor: Hole,
  kind: ComponentKind,
  dir: Dir,
): PlacementTarget | null {
  const far = offsetHoleByDistance(anchor, dir, COMPONENT_SPAN[kind]);
  if (!far) return null;
  if (kind !== "button") {
    return { kind, a: anchor, b: far, holes: [anchor, far] };
  }

  // `dir` follows the rail-facing leg axis. Each terminal's permanently paired
  // legs occupy that axis; the opposite terminal sits on the parallel column.
  const pairDir = ((dir + 3) % 4) as Dir;
  const b = offsetHoleByDistance(anchor, pairDir, COMPONENT_SPAN.button);
  if (!b) return null;
  const b2 = offsetHoleByDistance(b, dir, COMPONENT_SPAN.button);
  return b2
    ? { kind, a: anchor, b, a2: far, b2, holes: [anchor, far, b, b2] }
    : null;
}

/** Every physical hole occupied by a component leg. */
export function componentHoleIds(
  component: PlacedComponent,
): readonly HoleId[] {
  if (component.kind !== "button") {
    return [component.holeA, component.holeB];
  }
  return [
    component.holeA1,
    component.holeA2,
    component.holeB1,
    component.holeB2,
  ];
}

/** Holes already taken by a component leg or a wire end (one thing per hole). */
export function occupiedHoles(
  components: readonly PlacedComponent[],
  wires: readonly Wire[],
): Set<HoleId> {
  const occupied = new Set<HoleId>();
  for (const c of components) {
    componentHoleIds(c).forEach((hole) => {
      occupied.add(hole);
    });
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
  return target.holes.every((hole) => !occupied.has(holeId(hole)));
}
