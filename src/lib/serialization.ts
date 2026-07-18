import { parseHoleId } from "./breadboard";
import type {
  HoleId,
  LedColor,
  PlacedComponent,
  Project,
  Wire,
  WireColor,
  WireEnd,
} from "./types";

/**
 * Versioned JSON export/import. Everything arriving here is untrusted
 * (a user-picked file), so each field is validated before it touches the store.
 */

export function serializeProject(project: Project): string {
  return JSON.stringify(project, null, 2);
}

class ImportError extends Error {}

function fail(message: string): never {
  throw new ImportError(message);
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function asFiniteNumber(v: unknown, label: string): number {
  if (typeof v !== "number" || !Number.isFinite(v)) fail(`${label} must be a number`);
  return v;
}

function asHoleId(v: unknown, label: string): HoleId {
  if (typeof v !== "string" || !parseHoleId(v)) fail(`${label} is not a valid hole`);
  return v as HoleId;
}

const LED_COLORS: readonly LedColor[] = ["red", "green", "blue", "yellow", "white"];
const WIRE_COLORS: readonly WireColor[] = ["red", "black", "green", "blue", "yellow"];

function isLedColor(v: unknown): v is LedColor {
  return typeof v === "string" && (LED_COLORS as readonly string[]).includes(v);
}

function isWireColor(v: unknown): v is WireColor {
  return typeof v === "string" && (WIRE_COLORS as readonly string[]).includes(v);
}

function parseComponent(v: unknown, i: number): PlacedComponent {
  if (!isRecord(v)) fail(`component #${i + 1} is malformed`);
  if (typeof v.id !== "string" || v.id.length === 0) fail(`component #${i + 1} has no id`);
  const id = v.id as PlacedComponent["id"];
  const holeA = asHoleId(v.holeA, `component #${i + 1} holeA`);
  const holeB = asHoleId(v.holeB, `component #${i + 1} holeB`);
  switch (v.kind) {
    case "resistor": {
      const ohms = asFiniteNumber(v.ohms, `resistor #${i + 1} ohms`);
      if (ohms <= 0) fail(`resistor #${i + 1} ohms must be positive`);
      return { id, kind: "resistor", holeA, holeB, ohms };
    }
    case "led": {
      if (!isLedColor(v.color)) fail(`LED #${i + 1} has an unknown color`);
      const vf = asFiniteNumber(v.vf, `LED #${i + 1} vf`);
      if (vf <= 0 || vf > 6) fail(`LED #${i + 1} vf is out of range`);
      return { id, kind: "led", holeA, holeB, color: v.color, vf };
    }
    case "button":
      return { id, kind: "button", holeA, holeB, pressed: false };
    default:
      fail(`component #${i + 1} has unknown kind "${String(v.kind)}"`);
  }
}

function parseWireEnd(v: unknown, label: string): WireEnd {
  if (!isRecord(v)) fail(`${label} is malformed`);
  if (v.kind === "hole") {
    return { kind: "hole", hole: asHoleId(v.hole, label) };
  }
  if (v.kind === "battery") {
    if (v.terminal !== "+" && v.terminal !== "-") fail(`${label} has a bad terminal`);
    return { kind: "battery", terminal: v.terminal };
  }
  fail(`${label} has unknown kind`);
}

function parseWire(v: unknown, i: number): Wire {
  if (!isRecord(v)) fail(`wire #${i + 1} is malformed`);
  if (typeof v.id !== "string" || v.id.length === 0) fail(`wire #${i + 1} has no id`);
  return {
    id: v.id as Wire["id"],
    a: parseWireEnd(v.a, `wire #${i + 1} end a`),
    b: parseWireEnd(v.b, `wire #${i + 1} end b`),
    color: isWireColor(v.color) ? v.color : "red",
  };
}

/** Parse and validate exported JSON. Throws Error with a user-readable message. */
export function parseProject(json: string): Project {
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    fail("File is not valid JSON");
  }
  if (!isRecord(raw)) fail("File is not a Diode project");
  if (raw.version !== 1) fail(`Unsupported project version ${String(raw.version)}`);
  if (!isRecord(raw.battery)) fail("Project has no battery");
  const volts = asFiniteNumber(raw.battery.volts, "battery volts");
  if (!Array.isArray(raw.components)) fail("Project has no components list");
  if (!Array.isArray(raw.wires)) fail("Project has no wires list");

  const components = raw.components.map(parseComponent);
  const wires = raw.wires.map(parseWire);

  // Reject duplicate ids so the store never renders colliding keys.
  const ids = new Set<string>();
  for (const x of [...components.map((c) => c.id), ...wires.map((w) => w.id)]) {
    if (ids.has(x)) fail(`Duplicate id "${x}" in project file`);
    ids.add(x);
  }

  return {
    version: 1,
    name: typeof raw.name === "string" && raw.name.trim() ? raw.name : "Imported circuit",
    battery: { volts: Math.min(Math.max(volts, 0), 24) },
    components,
    wires,
  };
}

export function downloadProject(project: Project): void {
  const blob = new Blob([serializeProject(project)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${project.name.replace(/[^a-z0-9-_ ]/gi, "").trim() || "circuit"}.diode.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function pickProjectFile(): Promise<Project | null> {
  return new Promise((resolve, reject) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json,application/json";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) {
        resolve(null);
        return;
      }
      try {
        resolve(parseProject(await file.text()));
      } catch (err) {
        reject(err instanceof Error ? err : new Error("Could not read file"));
      }
    };
    input.oncancel = () => resolve(null);
    input.click();
  });
}
