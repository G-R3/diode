import { useMemo } from "react";
import {
  holePosition,
  parseHoleId,
  wireEndPosition,
  type Vec3,
} from "@/lib/breadboard";
import { isPlacementFree, occupiedHoles, placementTarget } from "@/lib/placement";
import { useCircuitStore } from "@/store/circuitStore";
import { arcCurve } from "./paths";
import { WIRE_COLORS } from "@/lib/wireColors";

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
      {[a, b].map((p, i) => (
        <mesh key={i} position={[p[0], 0.25, p[2]]} raycast={() => null}>
          <cylinderGeometry args={[0.18, 0.18, 0.5, 10]} />
          <meshStandardMaterial color={color} transparent opacity={0.7} />
        </mesh>
      ))}
    </group>
  );
}

/** Translucent preview of the pending placement or wire under the cursor. */
export function GhostPreview() {
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
    return (
      <GhostBody
        a={holePosition(target.a)}
        b={holePosition(target.b)}
        valid={valid}
      />
    );
  }

  if (tool.kind === "wire" && wireStart && hoverHole) {
    const hover = parseHoleId(hoverHole);
    if (!hover) return null;
    const from = wireEndPosition(wireStart);
    const to = holePosition(hover);
    const free = !occupied.has(hoverHole);
    const curve = arcCurve(from, to);
    return (
      <mesh raycast={() => null}>
        <tubeGeometry args={[curve, 24, 0.13, 8, false]} />
        <meshStandardMaterial
          color={free ? WIRE_COLORS[tool.color] : INVALID_COLOR}
          transparent
          opacity={0.55}
        />
      </mesh>
    );
  }

  return null;
}
