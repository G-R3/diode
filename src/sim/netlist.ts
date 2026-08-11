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
 * becomes a node, plus one node per battery terminal. Permanently paired
 * button legs share a node. Wires and closed button contacts remain tiny
 * resistances so their current stays measurable.
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
  | {
      kind: "led";
      id: ComponentId;
      vf: number;
      rd: number;
      n1: number;
      n2: number;
    }
  | {
      kind: "button";
      id: ComponentId;
      closed: boolean;
      r: number;
      n1: number;
      n2: number;
    };

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
  const pairedStripParent = new Map<StripId, StripId>();
  let nodeCount = 2; // 0 = battery minus (ground), 1 = battery plus

  function stripOfHoleId(id: HoleId): StripId | null {
    const hole = parseHoleId(id);
    return hole ? stripOfHole(hole) : null;
  }

  function rootOfStrip(strip: StripId): StripId {
    const parent = pairedStripParent.get(strip);
    if (!parent) return strip;
    const root = rootOfStrip(parent);
    pairedStripParent.set(strip, root);
    return root;
  }

  function pairStrips(first: HoleId, second: HoleId): void {
    const firstStrip = stripOfHoleId(first);
    const secondStrip = stripOfHoleId(second);
    if (!firstStrip || !secondStrip) return;
    const firstRoot = rootOfStrip(firstStrip);
    const secondRoot = rootOfStrip(secondStrip);
    if (firstRoot !== secondRoot) pairedStripParent.set(secondRoot, firstRoot);
  }

  for (const component of components) {
    if (component.kind !== "button") continue;
    pairStrips(component.holeA1, component.holeA2);
    pairStrips(component.holeB1, component.holeB2);
  }

  function nodeOfHole(id: HoleId): number {
    const strip = stripOfHoleId(id);
    if (!strip) return 0;
    const root = rootOfStrip(strip);
    let node = nodeOfStrip.get(root);
    if (node === undefined) {
      node = nodeCount++;
      nodeOfStrip.set(root, node);
    }
    nodeOfStrip.set(strip, node);
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
    switch (comp.kind) {
      case "resistor": {
        const nodeA = nodeOfHole(comp.holeA);
        const nodeB = nodeOfHole(comp.holeB);
        branches.push({
          kind: "resistor",
          id: comp.id,
          r: comp.ohms,
          n1: nodeA,
          n2: nodeB,
        });
        break;
      }
      case "led": {
        const nodeA = nodeOfHole(comp.holeA);
        const nodeB = nodeOfHole(comp.holeB);
        // Conducts anode (+) → cathode (−) = holeB → holeA.
        branches.push({
          kind: "led",
          id: comp.id,
          vf: comp.vf,
          rd: LED_RD,
          n1: nodeB,
          n2: nodeA,
        });
        break;
      }
      case "button": {
        const nodeA1 = nodeOfHole(comp.holeA1);
        const nodeB1 = nodeOfHole(comp.holeB1);
        // Register every physical strip in nodeOfStrip for voltage labels.
        nodeOfHole(comp.holeA2);
        nodeOfHole(comp.holeB2);
        branches.push({
          kind: "button",
          id: comp.id,
          closed: comp.pressed,
          r: BUTTON_R,
          n1: nodeA1,
          n2: nodeB1,
        });
        break;
      }
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
