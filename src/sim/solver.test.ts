import { describe, expect, it } from "vitest";
import { holeId } from "@/lib/breadboard";
import type {
  ComponentId,
  HoleId,
  PlacedComponent,
  Wire,
  WireEnd,
  WireId,
} from "@/lib/types";
import { solveCircuit } from "./solver";

const BATTERY = { volts: 5 };

function mainHole(row: number, col: number): HoleId {
  return holeId({ kind: "main", row, col });
}

function wire(id: string, a: WireEnd, b: WireEnd): Wire {
  return { id: id as WireId, a, b, color: "red" };
}

describe("solveCircuit", () => {
  it("solves a complete resistor loop", () => {
    const resistor: PlacedComponent = {
      id: "resistor" as ComponentId,
      kind: "resistor",
      holeA: mainHole(0, 0),
      holeB: mainHole(5, 0),
      ohms: 220,
    };
    const wires = [
      wire(
        "plus",
        { kind: "battery", terminal: "+" },
        { kind: "hole", hole: mainHole(1, 0) },
      ),
      wire(
        "minus",
        { kind: "hole", hole: mainHole(6, 0) },
        { kind: "battery", terminal: "-" },
      ),
    ];

    const result = solveCircuit([resistor], wires, BATTERY);
    const expectedCurrent = 5 / 220.11;

    expect(result.batteryCurrent).toBeCloseTo(expectedCurrent, 6);
    expect(result.components.get(resistor.id)).toMatchObject({
      current: expect.closeTo(expectedCurrent, 6),
      voltageDrop: expect.closeTo(expectedCurrent * 220, 6),
      status: "ok",
      brightness: 0,
    });
    expect(result.wireCurrent.get(wires[0].id)).toBeCloseTo(expectedCurrent, 6);
    expect(result.shorted).toBe(false);
    expect(result.warnings).toEqual([]);
  });

  it("detects a direct short across the battery", () => {
    const short = wire(
      "short",
      { kind: "battery", terminal: "+" },
      { kind: "battery", terminal: "-" },
    );

    const result = solveCircuit([], [short], BATTERY);

    expect(result.batteryCurrent).toBeGreaterThan(1);
    expect(result.shorted).toBe(true);
    expect(result.warnings).toEqual([
      expect.objectContaining({ severity: "error" }),
    ]);
  });

  it("distinguishes a disconnected resistor from one bypassed by a strip", () => {
    const disconnected: PlacedComponent = {
      id: "disconnected" as ComponentId,
      kind: "resistor",
      holeA: mainHole(0, 0),
      holeB: mainHole(5, 0),
      ohms: 220,
    };
    const bypassed: PlacedComponent = {
      id: "bypassed" as ComponentId,
      kind: "resistor",
      holeA: mainHole(0, 1),
      holeB: mainHole(4, 1),
      ohms: 220,
    };

    const result = solveCircuit([disconnected, bypassed], [], BATTERY);

    expect(result.components.get(disconnected.id)?.status).toBe("no-path");
    expect(result.components.get(bypassed.id)?.status).toBe("bypassed");
    expect(result.warnings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ componentId: disconnected.id }),
        expect.objectContaining({ componentId: bypassed.id }),
      ]),
    );
    expect(result.warnings).toHaveLength(2);
  });

  it("solves a forward-biased LED with its series resistor", () => {
    const led: PlacedComponent = {
      id: "led" as ComponentId,
      kind: "led",
      holeA: mainHole(0, 1),
      holeB: mainHole(0, 0),
      color: "red",
      vf: 2,
    };
    const resistor: PlacedComponent = {
      id: "resistor" as ComponentId,
      kind: "resistor",
      holeA: mainHole(1, 1),
      holeB: mainHole(5, 1),
      ohms: 220,
    };
    const wires = [
      wire(
        "plus",
        { kind: "battery", terminal: "+" },
        { kind: "hole", hole: mainHole(1, 0) },
      ),
      wire(
        "minus",
        { kind: "hole", hole: mainHole(6, 1) },
        { kind: "battery", terminal: "-" },
      ),
    ];

    const result = solveCircuit([led, resistor], wires, BATTERY);
    const expectedCurrent = 3 / 221.11;
    const reading = result.components.get(led.id);

    expect(reading?.status).toBe("ok");
    expect(reading?.current).toBeCloseTo(expectedCurrent, 6);
    expect(reading?.voltageDrop).toBeCloseTo(2 + expectedCurrent, 6);
    expect(reading?.brightness).toBeCloseTo(expectedCurrent / 0.02, 6);
    expect(result.warnings).toEqual([]);
  });

  it("reports a reversed LED in an otherwise complete loop", () => {
    const led: PlacedComponent = {
      id: "led" as ComponentId,
      kind: "led",
      holeA: mainHole(0, 0),
      holeB: mainHole(0, 1),
      color: "red",
      vf: 2,
    };
    const resistor: PlacedComponent = {
      id: "resistor" as ComponentId,
      kind: "resistor",
      holeA: mainHole(1, 1),
      holeB: mainHole(5, 1),
      ohms: 220,
    };
    const wires = [
      wire(
        "plus",
        { kind: "battery", terminal: "+" },
        { kind: "hole", hole: mainHole(1, 0) },
      ),
      wire(
        "minus",
        { kind: "hole", hole: mainHole(6, 1) },
        { kind: "battery", terminal: "-" },
      ),
    ];

    const result = solveCircuit([led, resistor], wires, BATTERY);

    expect(result.components.get(led.id)).toMatchObject({
      current: 0,
      status: "reversed",
      brightness: 0,
    });
    expect(result.warnings).toEqual([
      expect.objectContaining({ severity: "warning", componentId: led.id }),
    ]);
  });

  it("reports LED overcurrent when no current-limiting resistor is present", () => {
    const led: PlacedComponent = {
      id: "led" as ComponentId,
      kind: "led",
      holeA: mainHole(5, 0),
      holeB: mainHole(0, 0),
      color: "red",
      vf: 2,
    };
    const wires = [
      wire(
        "plus",
        { kind: "battery", terminal: "+" },
        { kind: "hole", hole: mainHole(1, 0) },
      ),
      wire(
        "minus",
        { kind: "hole", hole: mainHole(6, 0) },
        { kind: "battery", terminal: "-" },
      ),
    ];

    const result = solveCircuit([led], wires, BATTERY);

    expect(result.components.get(led.id)).toMatchObject({
      status: "overcurrent",
      brightness: 1,
    });
    expect(result.warnings).toContainEqual(
      expect.objectContaining({ severity: "error", componentId: led.id }),
    );
  });

  it("opens and closes a loop through the button's paired legs", () => {
    const button: PlacedComponent = {
      id: "button" as ComponentId,
      kind: "button",
      holeA1: mainHole(0, 0),
      holeA2: mainHole(0, 1),
      holeB1: mainHole(5, 0),
      holeB2: mainHole(5, 1),
      pressed: false,
    };
    const resistor: PlacedComponent = {
      id: "resistor" as ComponentId,
      kind: "resistor",
      holeA: mainHole(6, 1),
      holeB: mainHole(0, 2),
      ohms: 220,
    };
    const wires = [
      wire(
        "plus",
        { kind: "battery", terminal: "+" },
        { kind: "hole", hole: mainHole(1, 1) },
      ),
      wire(
        "minus",
        { kind: "hole", hole: mainHole(1, 2) },
        { kind: "battery", terminal: "-" },
      ),
    ];

    const open = solveCircuit([button, resistor], wires, BATTERY);
    const closed = solveCircuit(
      [{ ...button, pressed: true }, resistor],
      wires,
      BATTERY,
    );

    expect(open.batteryCurrent).toBeLessThan(1e-6);
    expect(open.components.get(button.id)?.status).toBe("open");
    expect(closed.components.get(button.id)?.status).toBe("ok");
    expect(closed.components.get(button.id)?.current).toBeGreaterThan(0);
    expect(closed.components.get(resistor.id)?.status).toBe("ok");
  });
});
