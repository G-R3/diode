/** Branded ids so holes, strips, components, and wires can't be mixed up. */
export type HoleId = string & { readonly __brand: "HoleId" };
export type StripId = string & { readonly __brand: "StripId" };
export type ComponentId = string & { readonly __brand: "ComponentId" };
export type WireId = string & { readonly __brand: "WireId" };

export type RailId = "tp" | "tm" | "bp" | "bm";

/** A physical breadboard hole. Main grid rows 0..9 (a..j), cols 0..62. Rail index 0..49. */
export type Hole =
  | { kind: "main"; row: number; col: number }
  | { kind: "rail"; rail: RailId; index: number };

export type BatteryTerminal = "+" | "-";

export type Vec3 = readonly [number, number, number];

export type BatteryTerminalPositions = Readonly<Record<BatteryTerminal, Vec3>>;

/** Where a jumper wire ends: a breadboard hole or a battery terminal. */
export type WireEnd =
  | { kind: "hole"; hole: HoleId }
  | { kind: "battery"; terminal: BatteryTerminal };

export type WireColor = "red" | "black" | "green" | "blue" | "yellow";

export interface Wire {
  id: WireId;
  a: WireEnd;
  b: WireEnd;
  color: WireColor;
}

export type LedColor = "red" | "green" | "blue" | "yellow" | "white";

export type ComponentKind = "resistor" | "led" | "button";

interface ComponentIdentity {
  id: ComponentId;
}

interface TwoTerminalComponent extends ComponentIdentity {
  /** First terminal (placement anchor). For LEDs this is the cathode (−). */
  holeA: HoleId;
  /** Second terminal (placement far end). For LEDs this is the anode (+). */
  holeB: HoleId;
}

export type PlacedComponent =
  | (TwoTerminalComponent & { kind: "resistor"; ohms: number })
  | (TwoTerminalComponent & { kind: "led"; color: LedColor; vf: number })
  | (ComponentIdentity & {
      kind: "button";
      /** The two permanently paired legs on terminal A. */
      holeA1: HoleId;
      holeA2: HoleId;
      /** The two permanently paired legs on terminal B. */
      holeB1: HoleId;
      holeB2: HoleId;
      pressed: boolean;
    });

export interface Battery {
  volts: number;
}

/** Serializable project shape; also the JSON export format (versioned). */
export interface Project {
  version: 1;
  name: string;
  battery: Battery;
  components: PlacedComponent[];
  wires: Wire[];
}

export const LED_DEFAULT_VF: Record<LedColor, number> = {
  red: 2.0,
  yellow: 2.1,
  green: 2.2,
  blue: 3.0,
  white: 3.2,
};

let idCounter = 0;
function nextId(prefix: string): string {
  idCounter += 1;
  return `${prefix}_${Date.now().toString(36)}_${idCounter.toString(36)}`;
}

export function newComponentId(): ComponentId {
  return nextId("c") as ComponentId;
}

export function newWireId(): WireId {
  return nextId("w") as WireId;
}
