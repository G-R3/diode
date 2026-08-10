import { useMemo } from "react";
import { holePosition, parseHoleId } from "@/lib/breadboard";
import {
  isPlacementFree,
  occupiedHoles,
  placementTarget,
} from "@/lib/placement";
import type { BatteryTerminalPositions, Vec3 } from "@/lib/types";
import { WIRE_CABLE_RADIUS, wireEndPosition } from "@/lib/wire-geometry";
import { WIRE_COLORS } from "@/lib/wireColors";
import { useCircuitStore } from "@/store/circuitStore";
import { LedGhost } from "./led-model";
import { jumperCurve, wireTubularSegments } from "./paths";
import { ResistorGhost } from "./resistor-model";
import { WireConnector } from "./wire-connector";

const VALID_COLOR = "#22c55e";
const INVALID_COLOR = "#ef4444";

function GhostBody({ a, b, valid }: { a: Vec3; b: Vec3; valid: boolean }) {
  const mid: Vec3 = [(a[0] + b[0]) / 2, 0.9, (a[2] + b[2]) / 2];
  const len = Math.hypot(b[0] - a[0], b[2] - a[2]);
  const angle = -Math.atan2(b[2] - a[2], b[0] - a[0]);
  const color = valid ? VALID_COLOR : INVALID_COLOR;
  return (
    <group>
      <group position={mid} rotation={[0, angle, Math.PI / 2]}>
        <mesh raycast={() => null}>
          <cylinderGeometry args={[0.4, 0.4, Math.max(len * 0.6, 0.9), 12]} />
          <meshStandardMaterial color={color} transparent opacity={0.55} />
        </mesh>
      </group>
      {(
        [
          ["a", a],
          ["b", b],
        ] as const
      ).map(([key, p]) => (
        <mesh key={key} position={[p[0], 0.25, p[2]]} raycast={() => null}>
          <cylinderGeometry args={[0.18, 0.18, 0.5, 10]} />
          <meshStandardMaterial color={color} transparent opacity={0.7} />
        </mesh>
      ))}
    </group>
  );
}

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
    const target = placementTarget(anchor, tool.component, tool.dir);
    if (!target) {
      const p = holePosition(anchor);
      return <GhostBody a={p} b={p} valid={false} />;
    }
    const valid = isPlacementFree(target, occupied);
    const a = holePosition(target.a);
    const b = holePosition(target.b);
    if (tool.component === "resistor") {
      return <ResistorGhost a={a} b={b} valid={valid} />;
    }
    if (tool.component === "led") {
      return <LedGhost a={a} b={b} valid={valid} />;
    }
    return <GhostBody a={a} b={b} valid={valid} />;
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
