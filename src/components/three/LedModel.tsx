import { useMemo } from "react";
import type { Vec3 } from "@/lib/breadboard";
import type { LedColor } from "@/lib/types";
import { Cyl } from "./util";
import { HIGHLIGHT_EMISSIVE, type Highlight } from "./highlight";

const LED_TINT: Record<LedColor, string> = {
  red: "#ef4444",
  green: "#22c55e",
  blue: "#3b82f6",
  yellow: "#eab308",
  white: "#f5f5f4",
};

const LED_GLOW: Record<LedColor, string> = {
  red: "#ff4d4d",
  green: "#4dff7a",
  blue: "#4d8bff",
  yellow: "#ffe14d",
  white: "#ffffff",
};

interface LedModelProps {
  a: Vec3; // anode
  b: Vec3; // cathode
  color: LedColor;
  /** 0..1 from the simulation. */
  brightness: number;
  highlight: Highlight;
}

export function LedModel({ a, b, color, brightness, highlight }: LedModelProps) {
  const mid = useMemo<Vec3>(
    () => [(a[0] + b[0]) / 2, 0, (a[2] + b[2]) / 2],
    [a, b],
  );

  const lit = brightness > 0.01;
  // Highlights take priority over glow so warnings stay readable.
  const emissive = highlight ? HIGHLIGHT_EMISSIVE[highlight] : LED_GLOW[color];
  const emissiveIntensity = highlight ? 0.5 : 0.06 + brightness * 2.4;

  return (
    <group>
      <Cyl from={a} to={[mid[0] - 0.18, 0.62, mid[2]]} radius={0.08} color="#b9bdc4" />
      <Cyl from={b} to={[mid[0] + 0.18, 0.62, mid[2]]} radius={0.08} color="#b9bdc4" />
      <group position={[mid[0], 0.95, mid[2]]}>
        <mesh>
          <cylinderGeometry args={[0.48, 0.52, 0.7, 20]} />
          <meshStandardMaterial
            color={LED_TINT[color]}
            transparent
            opacity={0.85}
            roughness={0.25}
            emissive={emissive}
            emissiveIntensity={emissiveIntensity}
          />
        </mesh>
        <mesh position={[0, 0.35, 0]} raycast={() => null}>
          <sphereGeometry args={[0.48, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial
            color={LED_TINT[color]}
            transparent
            opacity={0.85}
            roughness={0.25}
            emissive={emissive}
            emissiveIntensity={emissiveIntensity}
          />
        </mesh>
        {lit && (
          <pointLight
            color={LED_GLOW[color]}
            intensity={brightness * 6}
            distance={7}
            position={[0, 0.5, 0]}
          />
        )}
      </group>
    </group>
  );
}
