import { useMemo } from "react";
import * as THREE from "three";
import type { Vec3 } from "@/lib/breadboard";

const UP = new THREE.Vector3(0, 1, 0);

interface CylProps {
  from: Vec3;
  to: Vec3;
  radius: number;
  color: string;
  metalness?: number;
  roughness?: number;
  emissive?: string;
  emissiveIntensity?: number;
}

/** A cylinder stretched between two world-space points. Used for legs, leads, posts. */
export function Cyl({
  from,
  to,
  radius,
  color,
  metalness = 0.7,
  roughness = 0.35,
  emissive = "#000000",
  emissiveIntensity = 0,
}: CylProps) {
  const { position, quaternion, length } = useMemo(() => {
    const f = new THREE.Vector3(...from);
    const t = new THREE.Vector3(...to);
    const dir = t.clone().sub(f);
    const length = Math.max(dir.length(), 1e-4);
    return {
      position: f.clone().add(t).multiplyScalar(0.5),
      quaternion: new THREE.Quaternion().setFromUnitVectors(UP, dir.normalize()),
      length,
    };
  }, [from, to]);

  return (
    <mesh position={position} quaternion={quaternion}>
      <cylinderGeometry args={[radius, radius, length, 10]} />
      <meshStandardMaterial
        color={color}
        metalness={metalness}
        roughness={roughness}
        emissive={emissive}
        emissiveIntensity={emissiveIntensity}
      />
    </mesh>
  );
}
