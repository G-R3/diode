import { useMemo } from "react";
import type { ThreeEvent } from "@react-three/fiber";
import type { Wire } from "@/lib/types";
import { WIRE_COLORS } from "@/lib/wireColors";
import { useCircuitStore } from "@/store/circuitStore";
import { HIGHLIGHT_EMISSIVE } from "./highlight";
import { wireCurve } from "./paths";

export function WireModel({ wire }: { wire: Wire }) {
  const select = useCircuitStore((s) => s.select);
  const selected = useCircuitStore(
    (s) => s.selection?.kind === "wire" && s.selection.id === wire.id,
  );

  const curve = useMemo(() => wireCurve(wire), [wire]);

  const onClick = (e: ThreeEvent<MouseEvent>) => {
    if (e.delta > 4) return;
    const s = useCircuitStore.getState();
    if (s.tool.kind !== "select") return;
    e.stopPropagation();
    select({ kind: "wire", id: wire.id });
  };

  return (
    <mesh onClick={onClick}>
      <tubeGeometry args={[curve, 24, 0.13, 8, false]} />
      <meshStandardMaterial
        color={WIRE_COLORS[wire.color]}
        roughness={0.45}
        emissive={selected ? HIGHLIGHT_EMISSIVE.selected : "#000000"}
        emissiveIntensity={selected ? 0.5 : 0}
      />
    </mesh>
  );
}
