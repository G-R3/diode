import type { ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import type { Vec3 } from "@/lib/types";
import { WIRE_CONNECTOR_HEIGHT } from "@/lib/wire-geometry";

const CONNECTOR_WIDTH = 0.38;
const CONNECTOR_GEOMETRY = new THREE.BoxGeometry(
  CONNECTOR_WIDTH,
  WIRE_CONNECTOR_HEIGHT,
  CONNECTOR_WIDTH,
);
const CONNECTOR_MATERIAL = new THREE.MeshStandardMaterial({
  color: "#111114",
  roughness: 0.72,
  metalness: 0.02,
});

/** Upright strain-relief housing centered on a logical wire endpoint. */
export function WireConnector({
  position,
  onClick,
}: {
  position: Vec3;
  onClick?: (event: ThreeEvent<MouseEvent>) => void;
}) {
  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: This is a Three.js mesh, not a DOM element.
    <mesh
      dispose={null}
      geometry={CONNECTOR_GEOMETRY}
      material={CONNECTOR_MATERIAL}
      onClick={onClick}
      position={[
        position[0],
        position[1] + WIRE_CONNECTOR_HEIGHT / 2,
        position[2],
      ]}
      raycast={onClick ? undefined : () => null}
    />
  );
}
