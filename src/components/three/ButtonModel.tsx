import { useMemo } from "react";
import type { ThreeEvent } from "@react-three/fiber";
import type { Vec3 } from "@/lib/breadboard";
import { highlightProps, type Highlight } from "./highlight";
import { Cyl } from "./util";

interface ButtonModelProps {
  a: Vec3;
  b: Vec3;
  pressed: boolean;
  highlight: Highlight;
  onPress: (down: boolean) => void;
}

export function ButtonModel({ a, b, pressed, highlight, onPress }: ButtonModelProps) {
  const { mid, angle, baseLen } = useMemo(() => {
    const dx = b[0] - a[0];
    const dz = b[2] - a[2];
    const baseLen = Math.hypot(dx, dz) + 1.2;
    return {
      mid: [(a[0] + b[0]) / 2, 0, (a[2] + b[2]) / 2] as Vec3,
      angle: -Math.atan2(dz, dx),
      baseLen,
    };
  }, [a, b]);

  const capY = pressed ? 0.78 : 0.98;

  const down = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    onPress(true);
  };
  const up = () => onPress(false);

  return (
    <group>
      <Cyl from={a} to={[mid[0] - 0.5, 0.35, mid[2]]} radius={0.08} color="#b9bdc4" />
      <Cyl from={b} to={[mid[0] + 0.5, 0.35, mid[2]]} radius={0.08} color="#b9bdc4" />
      <group position={[mid[0], 0, mid[2]]} rotation={[0, angle, 0]}>
        <mesh position={[0, 0.4, 0]}>
          <boxGeometry args={[baseLen, 0.7, 1.9]} />
          <meshStandardMaterial color="#3f3f46" roughness={0.6} {...highlightProps(highlight)} />
        </mesh>
        <mesh
          position={[0, capY, 0]}
          onPointerDown={down}
          onPointerUp={up}
          onPointerOut={up}
        >
          <cylinderGeometry args={[0.55, 0.55, 0.55, 18]} />
          <meshStandardMaterial
            color={pressed ? "#b91c1c" : "#ef4444"}
            roughness={0.4}
            emissive={pressed ? "#7f1d1d" : "#000000"}
            emissiveIntensity={pressed ? 0.4 : 0}
          />
        </mesh>
      </group>
    </group>
  );
}