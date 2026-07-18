import * as THREE from "three";
import { parseHoleId, wireEndPosition, holePosition, type Vec3 } from "@/lib/breadboard";
import type { PlacedComponent, Wire } from "@/lib/types";

/** Arc between two points, lifted in the middle like a real jumper wire. */
export function arcCurve(a: Vec3, b: Vec3, liftScale = 0.3, minLift = 1.4): THREE.QuadraticBezierCurve3 {
  const pa = new THREE.Vector3(...a);
  const pb = new THREE.Vector3(...b);
  const mid = pa.clone().add(pb).multiplyScalar(0.5);
  mid.y = Math.max(pa.y, pb.y) + Math.max(minLift, pa.distanceTo(pb) * liftScale);
  return new THREE.QuadraticBezierCurve3(pa, mid, pb);
}

export function wireCurve(wire: Wire): THREE.QuadraticBezierCurve3 {
  return arcCurve(wireEndPosition(wire.a), wireEndPosition(wire.b));
}

export function componentEndpoints(comp: PlacedComponent): { a: Vec3; b: Vec3 } {
  const ha = parseHoleId(comp.holeA);
  const hb = parseHoleId(comp.holeB);
  return {
    a: ha ? holePosition(ha) : [0, 0, 0],
    b: hb ? holePosition(hb) : [0, 0, 0],
  };
}

/** Path current particles take through a component (in one leg, over the body, out the other). */
export function componentCurve(comp: PlacedComponent): THREE.QuadraticBezierCurve3 {
  const { a, b } = componentEndpoints(comp);
  return arcCurve(a, b, 0.2, 1.0);
}
