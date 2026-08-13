import { describe, expect, it } from "vitest";
import { holeId, stripOfHole } from "@/lib/breadboard";
import type { ComponentId, PlacedComponent, Wire, WireId } from "@/lib/types";
import { BATTERY_R, BUTTON_R, buildNetlist, LED_RD, WIRE_R } from "./netlist";

describe("buildNetlist", () => {
  it("preserves breadboard strip boundaries and fixed battery nodes", () => {
    const topA = { kind: "main", row: 0, col: 10 } as const;
    const topE = { kind: "main", row: 4, col: 10 } as const;
    const bottomF = { kind: "main", row: 5, col: 10 } as const;
    const railLeft = { kind: "rail", rail: "tp", index: 24 } as const;
    const railRightStart = { kind: "rail", rail: "tp", index: 25 } as const;
    const railRightEnd = { kind: "rail", rail: "tp", index: 49 } as const;
    const wires: Wire[] = [
      {
        id: "wire-plus" as WireId,
        a: { kind: "battery", terminal: "+" },
        b: { kind: "hole", hole: holeId(topA) },
        color: "red",
      },
      {
        id: "wire-top" as WireId,
        a: { kind: "hole", hole: holeId(topE) },
        b: { kind: "hole", hole: holeId(bottomF) },
        color: "green",
      },
      {
        id: "wire-minus" as WireId,
        a: { kind: "battery", terminal: "-" },
        b: { kind: "hole", hole: holeId(railLeft) },
        color: "black",
      },
      {
        id: "wire-rail" as WireId,
        a: { kind: "hole", hole: holeId(railRightStart) },
        b: { kind: "hole", hole: holeId(railRightEnd) },
        color: "blue",
      },
    ];

    const netlist = buildNetlist([], wires, { volts: 9 });
    const node = (hole: Parameters<typeof stripOfHole>[0]) =>
      netlist.nodeOfStrip.get(stripOfHole(hole));

    expect(netlist.batteryMinusNode).toBe(0);
    expect(netlist.batteryPlusNode).toBe(1);
    expect(netlist.branches[0]).toEqual({
      kind: "battery",
      volts: 9,
      r: BATTERY_R,
      n1: 1,
      n2: 0,
    });
    expect(node(topA)).toBe(node(topE));
    expect(node(topA)).not.toBe(node(bottomF));
    expect(node(railLeft)).not.toBe(node(railRightStart));
    expect(node(railRightStart)).toBe(node(railRightEnd));
    expect(netlist.branches[1]).toMatchObject({
      kind: "wire",
      id: wires[0].id,
      r: WIRE_R,
      n1: 1,
      n2: node(topA),
    });
    expect(netlist.branches[3]).toMatchObject({
      kind: "wire",
      id: wires[2].id,
      r: WIRE_R,
      n1: 0,
      n2: node(railLeft),
    });
  });

  it("keeps component values and models LED current from anode to cathode", () => {
    const resistor: PlacedComponent = {
      id: "resistor" as ComponentId,
      kind: "resistor",
      holeA: holeId({ kind: "main", row: 0, col: 0 }),
      holeB: holeId({ kind: "main", row: 5, col: 0 }),
      ohms: 470,
    };
    const led: PlacedComponent = {
      id: "led" as ComponentId,
      kind: "led",
      holeA: holeId({ kind: "main", row: 0, col: 1 }),
      holeB: holeId({ kind: "main", row: 5, col: 1 }),
      color: "green",
      vf: 2.2,
    };

    const netlist = buildNetlist([resistor, led], [], { volts: 5 });
    const resistorBranch = netlist.branches.find(
      (branch) => branch.kind === "resistor",
    );
    const ledBranch = netlist.branches.find((branch) => branch.kind === "led");

    expect(resistorBranch).toMatchObject({
      id: resistor.id,
      r: 470,
      n1: netlist.nodeOfStrip.get(
        stripOfHole({ kind: "main", row: 0, col: 0 }),
      ),
      n2: netlist.nodeOfStrip.get(
        stripOfHole({ kind: "main", row: 5, col: 0 }),
      ),
    });
    expect(ledBranch).toMatchObject({
      id: led.id,
      vf: 2.2,
      rd: LED_RD,
      n1: netlist.nodeOfStrip.get(
        stripOfHole({ kind: "main", row: 5, col: 1 }),
      ),
      n2: netlist.nodeOfStrip.get(
        stripOfHole({ kind: "main", row: 0, col: 1 }),
      ),
    });
  });

  it("pairs each button terminal without joining the switched contacts", () => {
    const button: PlacedComponent = {
      id: "button" as ComponentId,
      kind: "button",
      holeA1: holeId({ kind: "main", row: 0, col: 0 }),
      holeA2: holeId({ kind: "main", row: 0, col: 1 }),
      holeB1: holeId({ kind: "main", row: 5, col: 0 }),
      holeB2: holeId({ kind: "main", row: 5, col: 1 }),
      pressed: true,
    };

    const netlist = buildNetlist([button], [], { volts: 5 });
    const nodeA1 = netlist.nodeOfStrip.get(
      stripOfHole({ kind: "main", row: 0, col: 0 }),
    );
    const nodeA2 = netlist.nodeOfStrip.get(
      stripOfHole({ kind: "main", row: 0, col: 1 }),
    );
    const nodeB1 = netlist.nodeOfStrip.get(
      stripOfHole({ kind: "main", row: 5, col: 0 }),
    );
    const nodeB2 = netlist.nodeOfStrip.get(
      stripOfHole({ kind: "main", row: 5, col: 1 }),
    );

    expect(nodeA1).toBe(nodeA2);
    expect(nodeB1).toBe(nodeB2);
    expect(nodeA1).not.toBe(nodeB1);
    expect(netlist.branches[1]).toEqual({
      kind: "button",
      id: button.id,
      closed: true,
      r: BUTTON_R,
      n1: nodeA1,
      n2: nodeB1,
    });
  });
});
