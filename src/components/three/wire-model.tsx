import type { ThreeEvent } from "@react-three/fiber";
import { useMemo } from "react";
import type { BatteryTerminalPositions, Wire } from "@/lib/types";
import { WIRE_CABLE_RADIUS, wireEndPosition } from "@/lib/wire-geometry";
import { WIRE_COLORS } from "@/lib/wireColors";
import { useCircuitStore } from "@/store/circuitStore";
import { HIGHLIGHT_EMISSIVE } from "./highlight";
import { wireCurve, wireTubularSegments } from "./paths";
import { WireConnector } from "./wire-connector";

const HIT_TARGET_RADIUS = 0.3;

export function WireModel({
  wire,
  batteryTerminals,
}: {
  wire: Wire;
  batteryTerminals: BatteryTerminalPositions;
}) {
  const select = useCircuitStore((s) => s.select);
  const selected = useCircuitStore(
    (s) => s.selection?.kind === "wire" && s.selection.id === wire.id,
  );

  const curve = useMemo(
    () => wireCurve(wire, batteryTerminals),
    [batteryTerminals, wire],
  );
  const endpoints = useMemo(
    () => ({
      a: wireEndPosition(wire.a, batteryTerminals),
      b: wireEndPosition(wire.b, batteryTerminals),
    }),
    [batteryTerminals, wire],
  );
  const tubularSegments = useMemo(() => wireTubularSegments(curve), [curve]);
  const onClick = (e: ThreeEvent<MouseEvent>) => {
    if (e.delta > 4) return;
    const s = useCircuitStore.getState();
    if (s.tool.kind !== "select") return;
    e.stopPropagation();
    select({ kind: "wire", id: wire.id });
  };

  return (
    <group>
      <mesh raycast={() => null}>
        <tubeGeometry
          args={[curve, tubularSegments, WIRE_CABLE_RADIUS, 8, false]}
        />
        <meshStandardMaterial
          color={WIRE_COLORS[wire.color]}
          roughness={0.5}
          metalness={0}
          emissive={
            selected ? HIGHLIGHT_EMISSIVE.selected : WIRE_COLORS[wire.color]
          }
          emissiveIntensity={selected ? 0.5 : 0.25}
        />
      </mesh>
      {/* biome-ignore lint/a11y/noStaticElementInteractions: This is an invisible Three.js raycast target. */}
      <mesh onClick={onClick}>
        <tubeGeometry
          args={[
            curve,
            Math.max(24, Math.ceil(tubularSegments / 2)),
            HIT_TARGET_RADIUS,
            4,
            false,
          ]}
        />
        <meshBasicMaterial visible={false} />
      </mesh>
      <WireConnector position={endpoints.a} onClick={onClick} />
      <WireConnector position={endpoints.b} onClick={onClick} />
    </group>
  );
}
