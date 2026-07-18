import { useMemo } from "react";
import * as THREE from "three";
import type { Vec3 } from "@/lib/breadboard";
import { highlightProps, type Highlight } from "./highlight";
import { Cyl } from "./util";

const BAND_COLORS = [
  "#0a0a0a", // 0 black
  "#7c4a03", // 1 brown
  "#dc2626", // 2 red
  "#f97316", // 3 orange
  "#eab308", // 4 yellow
  "#16a34a", // 5 green
  "#2563eb", // 6 blue
  "#7c3aed", // 7 violet
  "#6b7280", // 8 grey
  "#fafaf9", // 9 white
];

/** Standard 4-band code: two significant digits + multiplier (+ gold tolerance). */
function resistorBands(ohms: number): [string, string, string] {
  if (ohms < 1) return [BAND_COLORS[0], BAND_COLORS[0], BAND_COLORS[0]];
  const exp = Math.max(Math.floor(Math.log10(ohms)) - 1, 0);
  const sig = Math.min(Math.round(ohms / 10 ** exp), 99);
  return [
    BAND_COLORS[Math.floor(sig / 10) % 10],
    BAND_COLORS[sig % 10],
    BAND_COLORS[Math.min(exp, 9)],
  ];
}

const Y_AXIS = new THREE.Vector3(0, 1, 0);
const BODY_Y = 1.0;

interface ResistorModelProps {
  a: Vec3;
  b: Vec3;
  ohms: number;
  highlight: Highlight;
}

export function ResistorModel({ a, b, ohms, highlight }: ResistorModelProps) {
  const { mid, quaternion, bodyLen, endA, endB, bandOffsets } = useMemo(() => {
    const va = new THREE.Vector3(a[0], BODY_Y, a[2]);
    const vb = new THREE.Vector3(b[0], BODY_Y, b[2]);
    const dist = va.distanceTo(vb);
    const dirN = vb.clone().sub(va).normalize();
    const mid = va.clone().add(vb).multiplyScalar(0.5);
    const bodyLen = THREE.MathUtils.clamp(dist - 1.6, 1.4, 3.0);
    const endA = mid.clone().addScaledVector(dirN, -bodyLen / 2);
    const endB = mid.clone().addScaledVector(dirN, bodyLen / 2);
    const quaternion = new THREE.Quaternion().setFromUnitVectors(Y_AXIS, dirN);
    const bandOffsets = [-0.3, -0.12, 0.08, 0.3].map((t) =>
      mid.clone().addScaledVector(dirN, t * bodyLen),
    );
    return { mid, quaternion, bodyLen, endA, endB, bandOffsets };
  }, [a, b]);

  const bands = useMemo(() => {
    const [d1, d2, mult] = resistorBands(ohms);
    return [d1, d2, mult, "#d4af37"];
  }, [ohms]);

  return (
    <group>
      <Cyl from={a} to={[endA.x, endA.y, endA.z]} radius={0.09} color="#b9bdc4" />
      <Cyl from={b} to={[endB.x, endB.y, endB.z]} radius={0.09} color="#b9bdc4" />
      <mesh position={mid} quaternion={quaternion}>
        <cylinderGeometry args={[0.34, 0.34, bodyLen, 16]} />
        <meshStandardMaterial color="#e8d5a3" roughness={0.6} {...highlightProps(highlight)} />
      </mesh>
      {bandOffsets.map((p, i) => (
        <mesh key={i} position={p} quaternion={quaternion} raycast={() => null}>
          <cylinderGeometry args={[0.36, 0.36, 0.14, 16]} />
          <meshStandardMaterial color={bands[i]} roughness={0.5} />
        </mesh>
      ))}
    </group>
  );
}
