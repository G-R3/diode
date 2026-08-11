import { useMemo } from "react";
import { holePosition, parseHoleId } from "@/lib/breadboard";
import {
  COMPONENT_SPAN,
  isPlacementFree,
  occupiedHoles,
  placementTarget,
} from "@/lib/placement";
import type { BatteryTerminalPositions, Vec3 } from "@/lib/types";
import { WIRE_CABLE_RADIUS, wireEndPosition } from "@/lib/wire-geometry";
import { WIRE_COLORS } from "@/lib/wireColors";
import { useCircuitStore } from "@/store/circuitStore";
import { ButtonGhost } from "./button-model";
import { LedGhost } from "./led-model";
import { jumperCurve, wireTubularSegments } from "./paths";
import { ResistorGhost } from "./resistor-model";
import { WireConnector } from "./wire-connector";

const INVALID_COLOR = "#ef4444";
const COMPONENT_GHOSTS = {
  resistor: ResistorGhost,
  led: LedGhost,
  button: ButtonGhost,
};

/** Translucent preview of the pending placement or wire under the cursor. */
export function GhostPreview({
  batteryTerminals,
}: {
  batteryTerminals: BatteryTerminalPositions;
}) {
  const tool = useCircuitStore((s) => s.tool);
  const hoverHole = useCircuitStore((s) => s.hoverHole);
  const wireStart = useCircuitStore((s) => s.wireStart);
  const components = useCircuitStore((s) => s.components);
  const wires = useCircuitStore((s) => s.wires);

  const occupied = useMemo(
    () => occupiedHoles(components, wires),
    [components, wires],
  );

  if (tool.kind === "place" && hoverHole) {
    const anchor = parseHoleId(hoverHole);
    if (!anchor) return null;
    const Ghost = COMPONENT_GHOSTS[tool.component];
    const target = placementTarget(anchor, tool.component, tool.dir);
    if (!target) {
      const p = holePosition(anchor);
      const span = COMPONENT_SPAN[tool.component];
      const b: Vec3 = [
        p[0] + (tool.dir === 0 ? span : tool.dir === 2 ? -span : 0),
        p[1],
        p[2] + (tool.dir === 1 ? span : tool.dir === 3 ? -span : 0),
      ];
      return <Ghost a={p} b={b} valid={false} />;
    }
    const valid = isPlacementFree(target, occupied);
    const a = holePosition(target.a);
    const b = holePosition(target.b);
    return <Ghost a={a} b={b} valid={valid} />;
  }

  if (tool.kind === "wire" && wireStart && hoverHole) {
    const hover = parseHoleId(hoverHole);
    if (!hover) return null;
    const from = wireEndPosition(wireStart, batteryTerminals);
    const to = holePosition(hover);
    const free = !occupied.has(hoverHole);
    const curve = jumperCurve(from, to);
    return (
      <group>
        <mesh raycast={() => null}>
          <tubeGeometry
            args={[
              curve,
              wireTubularSegments(curve),
              WIRE_CABLE_RADIUS,
              8,
              false,
            ]}
          />
          <meshStandardMaterial
            color={free ? WIRE_COLORS[tool.color] : INVALID_COLOR}
            transparent
            opacity={0.55}
          />
        </mesh>
        <WireConnector position={from} />
        <WireConnector position={to} />
      </group>
    );
  }

  return null;
}
