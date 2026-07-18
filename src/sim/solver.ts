import type {
  Battery,
  ComponentId,
  PlacedComponent,
  StripId,
  Wire,
  WireId,
} from "@/lib/types";
import { buildNetlist, LEAK_G, type Branch, type Netlist } from "./netlist";

/** Above this, the battery is considered short-circuited. */
const SHORT_CURRENT = 1.0;
/** Below this a branch is considered to carry no current. */
const MIN_CURRENT = 1e-6;
/** LED current that maps to full rendered brightness. */
const LED_FULL_BRIGHT = 0.02;
const LED_OVERCURRENT = 0.03;

export type ComponentStatus =
  /** Conducting normally. */
  | "ok"
  /** Conducting, but current is dangerously high (LED without a resistor). */
  | "overcurrent"
  /** LED is connected backwards for the way current would flow. */
  | "reversed"
  /** Not part of any complete loop back to the battery. */
  | "no-path"
  /** Wired into a loop but no current flows (open button or off LED in series, or V < Vf). */
  | "off"
  /** Both legs landed on the same strip, so the component does nothing. */
  | "bypassed"
  /** Push button that is not pressed. */
  | "open";

export interface ComponentReading {
  /** Amps, signed from holeA to holeB. */
  current: number;
  /** V(holeA) - V(holeB). */
  voltageDrop: number;
  status: ComponentStatus;
  /** 0..1, LEDs only. */
  brightness: number;
}

export interface SimWarning {
  severity: "error" | "warning";
  message: string;
  componentId?: ComponentId;
}

export interface SimResult {
  stripVoltage: Map<StripId, number>;
  /** Amps flowing out of the battery + terminal. */
  batteryCurrent: number;
  /** Voltage at the + post (the - post is ground, 0V). */
  batteryPlusVoltage: number;
  shorted: boolean;
  components: Map<ComponentId, ComponentReading>;
  /** Amps, signed from wire end a to end b. */
  wireCurrent: Map<WireId, number>;
  warnings: SimWarning[];
}

export const EMPTY_SIM: SimResult = {
  stripVoltage: new Map(),
  batteryCurrent: 0,
  batteryPlusVoltage: 0,
  shorted: false,
  components: new Map(),
  wireCurrent: new Map(),
  warnings: [],
};

/** Solve A x = b in place with partial pivoting. Returns null if singular. */
function gaussSolve(a: number[][], b: number[]): number[] | null {
  const n = b.length;
  for (let col = 0; col < n; col++) {
    let pivot = col;
    for (let row = col + 1; row < n; row++) {
      if (Math.abs(a[row][col]) > Math.abs(a[pivot][col])) pivot = row;
    }
    if (Math.abs(a[pivot][col]) < 1e-15) return null;
    if (pivot !== col) {
      [a[pivot], a[col]] = [a[col], a[pivot]];
      [b[pivot], b[col]] = [b[col], b[pivot]];
    }
    for (let row = col + 1; row < n; row++) {
      const f = a[row][col] / a[col][col];
      if (f === 0) continue;
      for (let k = col; k < n; k++) a[row][k] -= f * a[col][k];
      b[row] -= f * b[col];
    }
  }
  const x = new Array<number>(n).fill(0);
  for (let row = n - 1; row >= 0; row--) {
    let sum = b[row];
    for (let k = row + 1; k < n; k++) sum -= a[row][k] * x[k];
    x[row] = sum / a[row][row];
  }
  return x;
}

/**
 * One nodal-analysis pass with fixed LED on/off states.
 * Voltage sources are stamped as Norton equivalents (current source V/R in
 * parallel with R), so the system stays a pure conductance matrix.
 * Returns node voltages (node 0 = ground = 0V).
 */
function solvePass(net: Netlist, ledOn: Map<ComponentId, boolean>): number[] {
  const n = net.nodeCount - 1; // unknowns exclude ground
  if (n <= 0) return [0];
  const a: number[][] = Array.from({ length: n }, () => new Array<number>(n).fill(0));
  const b = new Array<number>(n).fill(0);

  function stampConductance(n1: number, n2: number, g: number) {
    if (n1 > 0) a[n1 - 1][n1 - 1] += g;
    if (n2 > 0) a[n2 - 1][n2 - 1] += g;
    if (n1 > 0 && n2 > 0) {
      a[n1 - 1][n2 - 1] -= g;
      a[n2 - 1][n1 - 1] -= g;
    }
  }

  function stampCurrent(node: number, amps: number) {
    if (node > 0) b[node - 1] += amps;
  }

  for (let node = 1; node < net.nodeCount; node++) {
    a[node - 1][node - 1] += LEAK_G;
  }

  for (const br of net.branches) {
    switch (br.kind) {
      case "battery": {
        const g = 1 / br.r;
        stampConductance(br.n1, br.n2, g);
        stampCurrent(br.n1, br.volts * g);
        stampCurrent(br.n2, -br.volts * g);
        break;
      }
      case "wire":
      case "resistor":
        stampConductance(br.n1, br.n2, 1 / Math.max(br.r, 1e-6));
        break;
      case "button":
        if (br.closed) stampConductance(br.n1, br.n2, 1 / br.r);
        break;
      case "led": {
        if (ledOn.get(br.id)) {
          const g = 1 / br.rd;
          stampConductance(br.n1, br.n2, g);
          stampCurrent(br.n1, br.vf * g);
          stampCurrent(br.n2, -br.vf * g);
        }
        break;
      }
      default: {
        const _exhaustive: never = br;
        void _exhaustive;
      }
    }
  }

  const x = gaussSolve(a, b);
  const v = new Array<number>(net.nodeCount).fill(0);
  if (x) for (let i = 1; i < net.nodeCount; i++) v[i] = x[i - 1];
  return v;
}

function branchCurrent(br: Branch, v: number[], ledOn: Map<ComponentId, boolean>): number {
  const vd = v[br.n1] - v[br.n2];
  switch (br.kind) {
    case "battery":
      return (br.volts - vd) / br.r;
    case "wire":
    case "resistor":
      return vd / Math.max(br.r, 1e-6);
    case "button":
      return br.closed ? vd / br.r : 0;
    case "led":
      return ledOn.get(br.id) ? (vd - br.vf) / br.rd : 0;
    default: {
      const _exhaustive: never = br;
      return _exhaustive;
    }
  }
}

/**
 * Can a branch conduct as far as wiring topology is concerned?
 * Off LEDs count (they are wired in even when blocking); open buttons don't.
 */
function isTopologicalConductor(br: Branch): boolean {
  return br.kind !== "button" || br.closed;
}

/**
 * True when `br` lies on some battery + -> - path, i.e. with `br` removed,
 * one end is reachable from + and the other from - (either orientation).
 */
function inBatteryLoop(net: Netlist, br: Branch): boolean {
  const reach = (start: number): Set<number> => {
    const seen = new Set<number>([start]);
    const queue = [start];
    while (queue.length > 0) {
      const node = queue.pop()!;
      for (const other of net.branches) {
        if (other === br || other.kind === "battery" || !isTopologicalConductor(other)) {
          continue;
        }
        const next =
          other.n1 === node ? other.n2 : other.n2 === node ? other.n1 : null;
        if (next !== null && !seen.has(next)) {
          seen.add(next);
          queue.push(next);
        }
      }
    }
    return seen;
  };
  const fromPlus = reach(net.batteryPlusNode);
  const fromMinus = reach(net.batteryMinusNode);
  return (
    (fromPlus.has(br.n1) && fromMinus.has(br.n2)) ||
    (fromPlus.has(br.n2) && fromMinus.has(br.n1))
  );
}

export function solveCircuit(
  components: readonly PlacedComponent[],
  wires: readonly Wire[],
  battery: Battery,
): SimResult {
  const net = buildNetlist(components, wires, battery);

  // Piecewise-linear LED iteration: start optimistic (all on), flip states
  // until stable.
  const ledOn = new Map<ComponentId, boolean>();
  for (const c of components) if (c.kind === "led") ledOn.set(c.id, true);

  let v = solvePass(net, ledOn);
  for (let iter = 0; iter < 50; iter++) {
    let changed = false;
    for (const br of net.branches) {
      if (br.kind !== "led") continue;
      const vd = v[br.n1] - v[br.n2];
      const on = ledOn.get(br.id) ?? false;
      if (on && (vd - br.vf) / br.rd < -1e-9) {
        ledOn.set(br.id, false);
        changed = true;
      } else if (!on && vd > br.vf + 1e-9) {
        ledOn.set(br.id, true);
        changed = true;
      }
    }
    if (!changed) break;
    v = solvePass(net, ledOn);
  }

  const warnings: SimWarning[] = [];
  const componentReadings = new Map<ComponentId, ComponentReading>();
  const wireCurrent = new Map<WireId, number>();

  let batteryCurrent = 0;
  for (const br of net.branches) {
    if (br.kind === "battery") batteryCurrent = branchCurrent(br, v, ledOn);
    if (br.kind === "wire") wireCurrent.set(br.id, branchCurrent(br, v, ledOn));
  }

  const shorted = Math.abs(batteryCurrent) > SHORT_CURRENT;
  if (shorted) {
    warnings.push({
      severity: "error",
      message: `Short circuit: ${batteryCurrent.toFixed(1)}A is flowing straight through the battery. Check for a wire path with no resistance between + and -.`,
    });
  }

  const compById = new Map(components.map((c) => [c.id, c]));

  for (const br of net.branches) {
    if (br.kind === "battery" || br.kind === "wire") continue;
    const comp = compById.get(br.id);
    if (!comp) continue;

    const current = branchCurrent(br, v, ledOn);
    const voltageDrop = v[br.n1] - v[br.n2];
    const conducting = Math.abs(current) > MIN_CURRENT;
    let status: ComponentStatus;
    let brightness = 0;

    if (br.kind === "led") {
      if (conducting && current > 0) {
        brightness = Math.min(current / LED_FULL_BRIGHT, 1);
        status = current > LED_OVERCURRENT ? "overcurrent" : "ok";
        if (status === "overcurrent") {
          warnings.push({
            severity: "error",
            message: `LED current is ${(current * 1000).toFixed(0)}mA — far above the ~20mA limit. Add a series resistor before it burns out.`,
            componentId: br.id,
          });
        }
      } else if (br.n1 === br.n2) {
        status = "bypassed";
      } else if (!inBatteryLoop(net, br)) {
        status = "no-path";
        warnings.push({
          severity: "warning",
          message: "LED is not part of a complete loop back to the battery.",
          componentId: br.id,
        });
      } else if (voltageDrop < -0.05) {
        status = "reversed";
        warnings.push({
          severity: "warning",
          message:
            "LED is reversed: current can only flow from anode (+) to cathode (-). Flip it around.",
          componentId: br.id,
        });
      } else {
        status = "off";
      }
    } else if (br.kind === "button") {
      if (!br.closed) {
        status = "open";
      } else if (conducting) {
        status = "ok";
      } else {
        status = br.n1 === br.n2 ? "bypassed" : inBatteryLoop(net, br) ? "off" : "no-path";
      }
    } else {
      if (conducting) {
        status = "ok";
      } else if (br.n1 === br.n2) {
        status = "bypassed";
        warnings.push({
          severity: "warning",
          message:
            "Both resistor legs are on the same strip, so it does nothing. Move one leg to a different row.",
          componentId: br.id,
        });
      } else if (!inBatteryLoop(net, br)) {
        status = "no-path";
        warnings.push({
          severity: "warning",
          message: "Resistor is not part of a complete loop back to the battery.",
          componentId: br.id,
        });
      } else {
        status = "off";
      }
    }

    componentReadings.set(br.id, { current, voltageDrop, status, brightness });
  }

  const stripVoltage = new Map<StripId, number>();
  for (const [strip, node] of net.nodeOfStrip) {
    stripVoltage.set(strip, v[node]);
  }

  return {
    stripVoltage,
    batteryCurrent,
    batteryPlusVoltage: v[net.batteryPlusNode],
    shorted,
    components: componentReadings,
    wireCurrent,
    warnings,
  };
}
