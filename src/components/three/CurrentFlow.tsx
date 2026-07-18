import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { useCircuitStore } from "@/store/circuitStore";
import { componentCurve, wireCurve } from "./paths";

/** Currents below this aren't worth animating (0.1mA). */
const MIN_VISIBLE_CURRENT = 1e-4;
const PARTICLE_SPACING = 0.9;
const MAX_PARTICLES = 1000;

interface FlowSegment {
  curve: THREE.Curve<THREE.Vector3>;
  current: number;
  length: number;
  particles: number;
}

function useFlowSegments(): FlowSegment[] {
  const components = useCircuitStore((s) => s.components);
  const wires = useCircuitStore((s) => s.wires);
  const sim = useCircuitStore((s) => s.sim);

  return useMemo(() => {
    const segments: FlowSegment[] = [];
    const add = (curve: THREE.Curve<THREE.Vector3>, current: number) => {
      const length = curve.getLength();
      segments.push({
        curve,
        current,
        length,
        particles: THREE.MathUtils.clamp(Math.round(length / PARTICLE_SPACING), 2, 30),
      });
    };
    for (const wire of wires) {
      const i = sim.wireCurrent.get(wire.id) ?? 0;
      if (Math.abs(i) >= MIN_VISIBLE_CURRENT) add(wireCurve(wire), i);
    }
    for (const comp of components) {
      const i = sim.components.get(comp.id)?.current ?? 0;
      if (Math.abs(i) >= MIN_VISIBLE_CURRENT) add(componentCurve(comp), i);
    }
    return segments;
  }, [components, wires, sim]);
}

/** Speed in world units/sec; saturates so big currents don't blur into noise. */
function flowSpeed(current: number): number {
  const abs = Math.abs(current);
  return THREE.MathUtils.clamp((8 * abs) / (abs + 0.025), 0.4, 8);
}

/**
 * One instanced mesh animates every current-carrying path. Particle direction
 * follows conventional current; no particles means no current, which makes
 * open circuits visually obvious.
 */
export function CurrentFlow() {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const segments = useFlowSegments();
  const dummy = useMemo(() => new THREE.Object3D(), []);

  useFrame(({ clock }) => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const t = clock.elapsedTime;
    let idx = 0;
    for (const seg of segments) {
      const speed = flowSpeed(seg.current);
      const travel = (t * speed) / seg.length;
      for (let k = 0; k < seg.particles && idx < MAX_PARTICLES; k++) {
        let phase = (travel + k / seg.particles) % 1;
        if (seg.current < 0) phase = 1 - phase;
        const p = seg.curve.getPointAt(phase);
        dummy.position.copy(p);
        dummy.scale.setScalar(1);
        dummy.updateMatrix();
        mesh.setMatrixAt(idx, dummy.matrix);
        idx += 1;
      }
    }
    mesh.count = idx;
    mesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, MAX_PARTICLES]}
      raycast={() => null}
      frustumCulled={false}
    >
      <sphereGeometry args={[0.1, 8, 6]} />
      <meshBasicMaterial color="#ffb020" toneMapped={false} />
    </instancedMesh>
  );
}
