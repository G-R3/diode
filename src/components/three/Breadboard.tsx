import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import type { ThreeEvent } from "@react-three/fiber";
import {
  ALL_HOLES,
  BOARD_DEPTH,
  BOARD_THICKNESS,
  BOARD_WIDTH,
  HOLE_INDEX,
  holeId,
  holePosition,
  nearestHole,
} from "@/lib/breadboard";
import { useCircuitStore } from "@/store/circuitStore";

const HOLE_BASE = new THREE.Color("#2a2a2e");
const HOLE_HOVER = new THREE.Color("#fbbf24");
const HOLE_WIRE_START = new THREE.Color("#22c55e");

/** Red/blue rail stripes painted on the board. */
function RailStripes() {
  const stripes: { z: number; color: string }[] = [
    { z: -9.1, color: "#dc2626" }, // top + (outer)
    { z: -6.8, color: "#2563eb" }, // top - (inner)
    { z: 6.8, color: "#dc2626" }, // bottom + (inner)
    { z: 9.1, color: "#2563eb" }, // bottom - (outer)
  ];
  return (
    <>
      {stripes.map((s) => (
        <mesh key={s.z} position={[0, 0.012, s.z]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[60, 0.18]} />
          <meshStandardMaterial color={s.color} roughness={0.8} />
        </mesh>
      ))}
    </>
  );
}

export function Breadboard() {
  const holesRef = useRef<THREE.InstancedMesh>(null);
  const hoverHole = useCircuitStore((s) => s.hoverHole);
  const wireStart = useCircuitStore((s) => s.wireStart);
  const setHoverHole = useCircuitStore((s) => s.setHoverHole);
  const placeAt = useCircuitStore((s) => s.placeAt);
  const wireClick = useCircuitStore((s) => s.wireClick);
  const select = useCircuitStore((s) => s.select);

  // Static instance transforms.
  useEffect(() => {
    const mesh = holesRef.current;
    if (!mesh) return;
    const m = new THREE.Matrix4();
    ALL_HOLES.forEach((hole, i) => {
      const [x, , z] = holePosition(hole);
      m.setPosition(x, 0.02, z);
      mesh.setMatrixAt(i, m);
      mesh.setColorAt(i, HOLE_BASE);
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, []);

  // Hover / pending-wire highlights.
  const prevHighlights = useRef<number[]>([]);
  useEffect(() => {
    const mesh = holesRef.current;
    if (!mesh) return;
    for (const i of prevHighlights.current) mesh.setColorAt(i, HOLE_BASE);
    prevHighlights.current = [];

    if (wireStart?.kind === "hole") {
      const i = HOLE_INDEX.get(wireStart.hole);
      if (i !== undefined) {
        mesh.setColorAt(i, HOLE_WIRE_START);
        prevHighlights.current.push(i);
      }
    }
    if (hoverHole) {
      const i = HOLE_INDEX.get(hoverHole);
      if (i !== undefined) {
        mesh.setColorAt(i, HOLE_HOVER);
        prevHighlights.current.push(i);
      }
    }
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [hoverHole, wireStart]);

  const onPointerMove = (e: ThreeEvent<PointerEvent>) => {
    const hole = nearestHole(e.point.x, e.point.z);
    setHoverHole(hole ? holeId(hole) : null);
  };

  const onClick = (e: ThreeEvent<MouseEvent>) => {
    if (e.delta > 4) return; // it was an orbit drag, not a click
    const s = useCircuitStore.getState();
    const hole = nearestHole(e.point.x, e.point.z);
    if (s.tool.kind === "place") {
      if (hole) placeAt(hole);
    } else if (s.tool.kind === "wire") {
      if (hole) wireClick({ kind: "hole", hole: holeId(hole) });
    } else {
      select(null);
    }
  };

  const holeGeometry = useMemo(() => new THREE.BoxGeometry(0.46, 0.1, 0.46), []);

  return (
    <group>
      {/* Board body */}
      <mesh position={[0, -BOARD_THICKNESS / 2, 0]}>
        <boxGeometry args={[BOARD_WIDTH, BOARD_THICKNESS, BOARD_DEPTH]} />
        <meshStandardMaterial color="#f1efe9" roughness={0.55} />
      </mesh>
      {/* Center channel */}
      <mesh position={[0, 0.008, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[BOARD_WIDTH, 0.9]} />
        <meshStandardMaterial color="#d9d6cd" roughness={0.8} />
      </mesh>
      <RailStripes />
      {/* Holes */}
      <instancedMesh
        ref={holesRef}
        args={[holeGeometry, undefined, ALL_HOLES.length]}
        raycast={() => null}
      >
        <meshStandardMaterial roughness={0.9} metalness={0} />
      </instancedMesh>
      {/* Pointer interaction surface */}
      <mesh
        position={[0, 0.05, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        visible={false}
        onPointerMove={onPointerMove}
        onPointerOut={() => setHoverHole(null)}
        onClick={onClick}
      >
        <planeGeometry args={[BOARD_WIDTH, BOARD_DEPTH]} />
      </mesh>
    </group>
  );
}
