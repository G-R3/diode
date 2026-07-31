import { useMemo } from "react";
import * as THREE from "three";
import type { ThreeEvent } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import {
  BOARD_DEPTH,
  BOARD_WIDTH,
  holeId,
  holePosition,
  nearestHole,
  parseHoleId,
} from "@/lib/breadboard";
import type { HoleId } from "@/lib/types";
import { useCircuitStore } from "@/store/circuitStore";

const MODEL_URL = "/models/breadboard.glb";

const HOLE_HOVER = "#fbbf24";
const HOLE_WIRE_START = "#22c55e";

/** Colored plug marker inside a hole (hover / pending wire). */
function HoleMarker({ id, color }: { id: HoleId; color: string }) {
  const hole = parseHoleId(id);
  if (!hole) return null;
  const [x, , z] = holePosition(hole);
  return (
    <mesh position={[x, -0.4, z]} raycast={() => null}>
      <boxGeometry args={[0.52, 0.5, 0.52]} />
      <meshStandardMaterial color={color} roughness={0.9} metalness={0} />
    </mesh>
  );
}

function prepareBoardScene(source: THREE.Object3D): THREE.Object3D {
  const root = source.clone(true);
  root.traverse((obj) => {
    if (!(obj instanceof THREE.Mesh)) return;
    // Hole tools use the interaction plane; GLB meshes stay visual-only.
    obj.raycast = () => null;

    // TODO(board-select): show hitbox and re-enable its raycast when
    // board select and dragging exists
    // if (obj.userData?.role === "hitbox") {
    //   const cloned = Array.isArray(obj.material)
    //     ? obj.material.map((m) => m.clone())
    //     : obj.material.clone();
    //   for (const m of Array.isArray(cloned) ? cloned : [cloned]) {
    //     m.transparent = true;
    //     m.opacity = 0;
    //     m.depthWrite = false;
    //   }
    //   obj.material = cloned;
    // }
  });
  return root;
}

export function Breadboard() {
  const { scene } = useGLTF(MODEL_URL);
  const board = useMemo(() => prepareBoardScene(scene), [scene]);

  const hoverHole = useCircuitStore((s) => s.hoverHole);
  const wireStart = useCircuitStore((s) => s.wireStart);
  const setHoverHole = useCircuitStore((s) => s.setHoverHole);
  const placeAt = useCircuitStore((s) => s.placeAt);
  const wireClick = useCircuitStore((s) => s.wireClick);
  const select = useCircuitStore((s) => s.select);

  const onPointerMove = (e: ThreeEvent<PointerEvent>) => {
    const hole = nearestHole(e.point.x, e.point.z);
    setHoverHole(hole ? holeId(hole) : null);
  };

  const onClick = (e: ThreeEvent<MouseEvent>) => {
    if (e.delta > 4) return; // orbit drag, not a click
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

  const wireStartHole =
    wireStart?.kind === "hole" && wireStart.hole !== hoverHole
      ? wireStart.hole
      : null;

  return (
    <group>
      <primitive object={board} />
      {wireStartHole && (
        <HoleMarker id={wireStartHole} color={HOLE_WIRE_START} />
      )}
      {hoverHole && <HoleMarker id={hoverHole} color={HOLE_HOVER} />}
      {/* Pointer interaction surface — keeps nearestHole tools unchanged */}
      <mesh
        position={[0, 0.12, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        onPointerMove={onPointerMove}
        onPointerOut={() => setHoverHole(null)}
        onClick={onClick}
      >
        <planeGeometry args={[BOARD_WIDTH, BOARD_DEPTH]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
    </group>
  );
}

useGLTF.preload(MODEL_URL);
