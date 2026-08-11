import * as THREE from "three";
import { holePosition, parseHoleId } from "@/lib/breadboard";
import type {
  BatteryTerminalPositions,
  PlacedComponent,
  Vec3,
  Wire,
} from "@/lib/types";
import { WIRE_CONNECTOR_HEIGHT, wireEndPosition } from "@/lib/wire-geometry";

const WIRE_VERTICAL_EXIT = 0.55;
const WIRE_SHORT_ARCH_LIFT = 1.4;
const WIRE_LONG_ARCH_LIFT = 1.4;
const WIRE_ARCH_TRANSITION_START = 2;
const WIRE_ARCH_TRANSITION_END = 24;
const WIRE_LANE_SPACING = 0.32;
const WIRE_MAX_SHOULDER_REACH = 12;

/** Arc between two points, lifted in the middle like a real jumper wire. */
export function arcCurve(
  a: Vec3,
  b: Vec3,
  liftScale = 0.3,
  minLift = 1.4,
): THREE.QuadraticBezierCurve3 {
  const pa = new THREE.Vector3(...a);
  const pb = new THREE.Vector3(...b);
  const mid = pa.clone().add(pb).multiplyScalar(0.5);
  mid.y =
    Math.max(pa.y, pb.y) + Math.max(minLift, pa.distanceTo(pb) * liftScale);
  return new THREE.QuadraticBezierCurve3(pa, mid, pb);
}

export function wireCurve(
  wire: Wire,
  batteryTerminals: BatteryTerminalPositions,
): THREE.CatmullRomCurve3 {
  return jumperCurve(
    wireEndPosition(wire.a, batteryTerminals),
    wireEndPosition(wire.b, batteryTerminals),
  );
}

/**
 * Product-style jumper path with upright exits and broad rounded shoulders.
 * Logical endpoints stay at their electrical anchors; the visible cable begins
 * at the top of the connector housing that sits on each anchor.
 */
export function jumperCurve(a: Vec3, b: Vec3): THREE.CatmullRomCurve3 {
  const start = new THREE.Vector3(a[0], a[1] + WIRE_CONNECTOR_HEIGHT, a[2]);
  const end = new THREE.Vector3(b[0], b[1] + WIRE_CONNECTOR_HEIGHT, b[2]);
  const direction = new THREE.Vector3(end.x - start.x, 0, end.z - start.z);
  const horizontalDistance = direction.length();
  const distanceProgress = THREE.MathUtils.smoothstep(
    horizontalDistance,
    WIRE_ARCH_TRANSITION_START,
    WIRE_ARCH_TRANSITION_END,
  );
  // Stable endpoint-based lanes separate long crossings without varying short loops.
  const routeLane =
    Math.abs(
      Math.round(
        (start.x + end.x) * 17 +
          (start.z + end.z) * 31 +
          horizontalDistance * 13,
      ),
    ) % 3;
  const archY =
    Math.max(start.y, end.y) +
    THREE.MathUtils.lerp(
      WIRE_SHORT_ARCH_LIFT,
      WIRE_LONG_ARCH_LIFT,
      distanceProgress,
    ) +
    routeLane * WIRE_LANE_SPACING * distanceProgress;
  const shoulderReach = Math.min(
    horizontalDistance * 0.24,
    WIRE_MAX_SHOULDER_REACH,
  );

  if (horizontalDistance > 0) direction.normalize();

  return new THREE.CatmullRomCurve3(
    [
      start,
      start.clone().setY(start.y + WIRE_VERTICAL_EXIT),
      start.clone().addScaledVector(direction, shoulderReach).setY(archY),
      end.clone().addScaledVector(direction, -shoulderReach).setY(archY),
      end.clone().setY(end.y + WIRE_VERTICAL_EXIT),
      end,
    ],
    false,
    "centripetal",
  );
}

/** Add detail only where cable length needs it, keeping short jumpers cheap. */
export function wireTubularSegments(curve: THREE.Curve<THREE.Vector3>): number {
  return THREE.MathUtils.clamp(Math.ceil(curve.getLength() * 1.5), 32, 96);
}

export function componentEndpoints(comp: PlacedComponent): {
  a: Vec3;
  b: Vec3;
} {
  const ha = parseHoleId(comp.kind === "button" ? comp.holeA1 : comp.holeA);
  const hb = parseHoleId(comp.kind === "button" ? comp.holeB1 : comp.holeB);
  return {
    a: ha ? holePosition(ha) : [0, 0, 0],
    b: hb ? holePosition(hb) : [0, 0, 0],
  };
}

/** Path current particles take through a component (in one leg, over the body, out the other). */
export function componentCurve(
  comp: PlacedComponent,
): THREE.QuadraticBezierCurve3 {
  const { a, b } = componentEndpoints(comp);
  // LEDs: follow anode → cathode (holeB → holeA) to match branch current sign.
  return comp.kind === "led"
    ? arcCurve(b, a, 0.2, 1.0)
    : arcCurve(a, b, 0.2, 1.0);
}
