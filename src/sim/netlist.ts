import { parseHoleId, stripOfHole } from "@/lib/breadboard";
import type {
  Battery,
  ComponentId,
  HoleId,
  PlacedComponent,
  StripId,
  Wire,
  WireEnd,
  WireId,
} from "@/lib/types";

/**
 * Electrical network extracted from the board.
 *
 * Every electrically continuous breadboard strip that is actually used
 * becomes a node, plus one node per battery terminal. Wires and closed
 * buttons are modeled as tiny resistances (not node merges) so each one
 * carries a well-defined current we can visualize.
 */

export const WIRE_R = 0.005;
export const BUTTON_R = 0.005;
export const BATTERY_R = 0.1;
/** Dynamic resistance of a conducting LED. */
export const LED_RD = 1;
/** Leak conductance to ground keeps floating nodes from making the matrix singular. */
export const LEAK_G = 1e-9;

export type Branch =
  | { kind: "battery"; volts: number; r: number; n1: number; n2: number }
  | { kind: "wire"; id: WireId; r: number; n1: number; n2: number }
  | { kind: "resistor"; id: ComponentId; r: number; n1: number; n2: number }
  | { kind: "led"; id: ComponentId; vf: number; rd: number; n1: number; n2: number }
  | { kind: "button"; id: ComponentId; closed: boolean; r: number; n1: number; n2: number };

export interface Netlist {
  /** Total node count. Node 0 is ground (battery minus). */
  nodeCount: number;
  batteryPlusNode: number;
  batteryMinusNode: number;
  nodeOfStrip: Map<StripId, number>;
  branches: Branch[];
}

export function buildNetlist(
  components: readonly PlacedComponent[],
  wires: readonly Wire[],
  battery: Battery,
): Netlist {
  const nodeOfStrip = new Map<StripId, number>();
  let nodeCount = 2; // 0 = battery minus (ground), 1 = battery plus

  function nodeOfHole(id: HoleId): number {
    const hole = parseHoleId(id);
    if (!hole) return 0;
    const strip = stripOfHole(hole);
    let node = nodeOfStrip.get(strip);
    if (node === undefined) {
      node = nodeCount++;
      nodeOfStrip.set(strip, node);
    }
    return node;
  }

  function nodeOfEnd(end: WireEnd): number {
    if (end.kind === "battery") return end.terminal === "+" ? 1 : 0;
    return nodeOfHole(end.hole);
  }

  const branches: Branch[] = [
    { kind: "battery", volts: battery.volts, r: BATTERY_R, n1: 1, n2: 0 },
  ];

  for (const wire of wires) {
    branches.push({
      kind: "wire",
      id: wire.id,
      r: WIRE_R,
      n1: nodeOfEnd(wire.a),
      n2: nodeOfEnd(wire.b),
    });
  }

  for (const comp of components) {
    const n1 = nodeOfHole(comp.holeA);
    const n2 = nodeOfHole(comp.holeB);
    switch (comp.kind) {
      case "resistor":
        branches.push({ kind: "resistor", id: comp.id, r: comp.ohms, n1, n2 });
        break;
      case "led":
        branches.push({ kind: "led", id: comp.id, vf: comp.vf, rd: LED_RD, n1, n2 });
        break;
      case "button":
        branches.push({
          kind: "button",
          id: comp.id,
          closed: comp.pressed,
          r: BUTTON_R,
          n1,
          n2,
        });
        break;
      default: {
        const _exhaustive: never = comp;
        void _exhaustive;
      }
    }
  }

  return {
    nodeCount,
    batteryPlusNode: 1,
    batteryMinusNode: 0,
    nodeOfStrip,
    branches,
  };
}
