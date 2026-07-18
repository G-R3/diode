import { create } from "zustand";
import { holeId, type Dir } from "@/lib/breadboard";
import {
  COMPONENT_SPAN,
  isPlacementFree,
  occupiedHoles,
  placementTarget,
} from "@/lib/placement";
import {
  LED_DEFAULT_VF,
  newComponentId,
  newWireId,
  type Battery,
  type ComponentId,
  type ComponentKind,
  type Hole,
  type HoleId,
  type LedColor,
  type PlacedComponent,
  type Project,
  type Wire,
  type WireColor,
  type WireEnd,
  type WireId,
} from "@/lib/types";
import { EMPTY_SIM, solveCircuit, type SimResult } from "@/sim/solver";

export type Tool =
  | { kind: "select" }
  | { kind: "place"; component: ComponentKind; dir: Dir }
  | { kind: "wire"; color: WireColor };

export type Selection =
  | { kind: "component"; id: ComponentId }
  | { kind: "wire"; id: WireId }
  | { kind: "battery" };

interface CircuitState {
  projectName: string;
  components: PlacedComponent[];
  wires: Wire[];
  battery: Battery;
  sim: SimResult;

  tool: Tool;
  selection: Selection | null;
  /** First endpoint of an in-progress wire. */
  wireStart: WireEnd | null;
  hoverHole: HoleId | null;
  showVoltage: boolean;
  showCurrent: boolean;

  setTool: (tool: Tool) => void;
  rotatePlacement: () => void;
  setHoverHole: (hole: HoleId | null) => void;
  /** Commit the active place tool at an anchor hole. */
  placeAt: (anchor: Hole) => void;
  /** Wire tool click: start a wire or finish the pending one. */
  wireClick: (end: WireEnd) => void;
  select: (selection: Selection | null) => void;
  deleteSelection: () => void;
  /** Esc: cancel pending wire, then active tool, then selection. */
  cancel: () => void;
  setButtonPressed: (id: ComponentId, pressed: boolean) => void;
  setResistorOhms: (id: ComponentId, ohms: number) => void;
  setLedColor: (id: ComponentId, color: LedColor) => void;
  setLedVf: (id: ComponentId, vf: number) => void;
  setWireColor: (id: WireId, color: WireColor) => void;
  setBatteryVolts: (volts: number) => void;
  setProjectName: (name: string) => void;
  setShowVoltage: (show: boolean) => void;
  setShowCurrent: (show: boolean) => void;
  clearBoard: () => void;
  loadProject: (project: Project) => void;
}

const DEFAULT_BATTERY: Battery = { volts: 5 };

function resolve(
  components: PlacedComponent[],
  wires: Wire[],
  battery: Battery,
): SimResult {
  return solveCircuit(components, wires, battery);
}

export const useCircuitStore = create<CircuitState>()((set, get) => ({
  projectName: "Untitled circuit",
  components: [],
  wires: [],
  battery: DEFAULT_BATTERY,
  sim: EMPTY_SIM,

  tool: { kind: "select" },
  selection: null,
  wireStart: null,
  hoverHole: null,
  showVoltage: true,
  showCurrent: true,

  setTool: (tool) => set({ tool, wireStart: null, selection: null }),

  rotatePlacement: () =>
    set((s) => {
      if (s.tool.kind !== "place") return s;
      return { tool: { ...s.tool, dir: (((s.tool.dir as number) + 1) % 4) as Dir } };
    }),

  setHoverHole: (hoverHole) =>
    set((s) => (s.hoverHole === hoverHole ? s : { hoverHole })),

  placeAt: (anchor) => {
    const s = get();
    if (s.tool.kind !== "place") return;
    const target = placementTarget(anchor, s.tool.component, s.tool.dir);
    if (!target) return;
    if (!isPlacementFree(target, occupiedHoles(s.components, s.wires))) return;

    const holeA = holeId(target.a);
    const holeB = holeId(target.b);
    const id = newComponentId();
    let component: PlacedComponent;
    switch (s.tool.component) {
      case "resistor":
        component = { id, kind: "resistor", holeA, holeB, ohms: 220 };
        break;
      case "led":
        component = { id, kind: "led", holeA, holeB, color: "red", vf: LED_DEFAULT_VF.red };
        break;
      case "button":
        component = { id, kind: "button", holeA, holeB, pressed: false };
        break;
      default: {
        const _exhaustive: never = s.tool.component;
        return _exhaustive;
      }
    }
    const components = [...s.components, component];
    set({
      components,
      sim: resolve(components, s.wires, s.battery),
      selection: { kind: "component", id },
    });
  },

  wireClick: (end) => {
    const s = get();
    if (s.tool.kind !== "wire") return;

    if (end.kind === "hole" && occupiedHoles(s.components, s.wires).has(end.hole)) {
      return;
    }

    if (!s.wireStart) {
      set({ wireStart: end });
      return;
    }

    const start = s.wireStart;
    const samePoint =
      (start.kind === "hole" && end.kind === "hole" && start.hole === end.hole) ||
      (start.kind === "battery" &&
        end.kind === "battery" &&
        start.terminal === end.terminal);
    if (samePoint) {
      set({ wireStart: null });
      return;
    }

    const wire: Wire = {
      id: newWireId(),
      a: start,
      b: end,
      color: s.tool.color,
    };
    const wires = [...s.wires, wire];
    set({
      wires,
      wireStart: null,
      sim: resolve(s.components, wires, s.battery),
    });
  },

  select: (selection) => set({ selection }),

  deleteSelection: () => {
    const s = get();
    if (!s.selection) return;
    if (s.selection.kind === "component") {
      const id = s.selection.id;
      const components = s.components.filter((c) => c.id !== id);
      set({
        components,
        selection: null,
        sim: resolve(components, s.wires, s.battery),
      });
    } else if (s.selection.kind === "wire") {
      const id = s.selection.id;
      const wires = s.wires.filter((w) => w.id !== id);
      set({
        wires,
        selection: null,
        sim: resolve(s.components, wires, s.battery),
      });
    }
    // battery is not deletable
  },

  cancel: () => {
    const s = get();
    if (s.wireStart) {
      set({ wireStart: null });
    } else if (s.tool.kind !== "select") {
      set({ tool: { kind: "select" } });
    } else if (s.selection) {
      set({ selection: null });
    }
  },

  setButtonPressed: (id, pressed) =>
    set((s) => {
      const components = s.components.map((c) =>
        c.id === id && c.kind === "button" ? { ...c, pressed } : c,
      );
      return { components, sim: resolve(components, s.wires, s.battery) };
    }),

  setResistorOhms: (id, ohms) =>
    set((s) => {
      const components = s.components.map((c) =>
        c.id === id && c.kind === "resistor"
          ? { ...c, ohms: Math.max(0.1, ohms) }
          : c,
      );
      return { components, sim: resolve(components, s.wires, s.battery) };
    }),

  setLedColor: (id, color) =>
    set((s) => {
      const components = s.components.map((c) =>
        c.id === id && c.kind === "led"
          ? { ...c, color, vf: LED_DEFAULT_VF[color] }
          : c,
      );
      return { components, sim: resolve(components, s.wires, s.battery) };
    }),

  setLedVf: (id, vf) =>
    set((s) => {
      const components = s.components.map((c) =>
        c.id === id && c.kind === "led"
          ? { ...c, vf: Math.min(Math.max(vf, 0.5), 5) }
          : c,
      );
      return { components, sim: resolve(components, s.wires, s.battery) };
    }),

  setWireColor: (id, color) =>
    set((s) => ({
      wires: s.wires.map((w) => (w.id === id ? { ...w, color } : w)),
    })),

  setBatteryVolts: (volts) =>
    set((s) => {
      const battery = { volts: Math.min(Math.max(volts, 0), 24) };
      return { battery, sim: resolve(s.components, s.wires, battery) };
    }),

  setProjectName: (projectName) => set({ projectName }),
  setShowVoltage: (showVoltage) => set({ showVoltage }),
  setShowCurrent: (showCurrent) => set({ showCurrent }),

  clearBoard: () =>
    set((s) => ({
      components: [],
      wires: [],
      selection: null,
      wireStart: null,
      sim: resolve([], [], s.battery),
    })),

  loadProject: (project) =>
    set({
      projectName: project.name,
      components: project.components,
      wires: project.wires,
      battery: project.battery,
      selection: null,
      wireStart: null,
      tool: { kind: "select" },
      sim: resolve(project.components, project.wires, project.battery),
    }),
}));

export { COMPONENT_SPAN };
