import { useMemo } from "react";
import { Html } from "@react-three/drei";
import {
  batteryTerminalPosition,
  holePosition,
  parseHoleId,
  stripOfHole,
  type Vec3,
} from "@/lib/breadboard";
import { formatAmps, formatVolts } from "@/lib/format";
import type { StripId } from "@/lib/types";
import { useCircuitStore } from "@/store/circuitStore";
import { componentEndpoints, wireCurve } from "./paths";

function Chip({
  position,
  text,
  tone,
}: {
  position: Vec3;
  text: string;
  tone: "voltage" | "current";
}) {
  return (
    <Html position={position} center distanceFactor={30} zIndexRange={[20, 0]}>
      <div
        className={`pointer-events-none select-none whitespace-nowrap rounded-full border px-1.5 py-px font-mono text-[10px] leading-tight shadow-sm ${
          tone === "voltage"
            ? "border-sky-300 bg-sky-50/95 text-sky-800"
            : "border-amber-300 bg-amber-50/95 text-amber-800"
        }`}
      >
        {text}
      </div>
    </Html>
  );
}

/** Voltage chips on every used strip, current chips on every conducting branch. */
export function Labels() {
  const components = useCircuitStore((s) => s.components);
  const wires = useCircuitStore((s) => s.wires);
  const sim = useCircuitStore((s) => s.sim);
  const showVoltage = useCircuitStore((s) => s.showVoltage);
  const showCurrent = useCircuitStore((s) => s.showCurrent);

  // One voltage label per used strip, at the centroid of its used holes.
  const voltageLabels = useMemo(() => {
    const byStrip = new Map<StripId, { x: number; z: number; n: number }>();
    const addHole = (id: string) => {
      const hole = parseHoleId(id);
      if (!hole) return;
      const strip = stripOfHole(hole);
      const [x, , z] = holePosition(hole);
      const acc = byStrip.get(strip) ?? { x: 0, z: 0, n: 0 };
      byStrip.set(strip, { x: acc.x + x, z: acc.z + z, n: acc.n + 1 });
    };
    for (const c of components) {
      addHole(c.holeA);
      addHole(c.holeB);
    }
    for (const w of wires) {
      if (w.a.kind === "hole") addHole(w.a.hole);
      if (w.b.kind === "hole") addHole(w.b.hole);
    }
    const labels: { strip: StripId; position: Vec3 }[] = [];
    for (const [strip, acc] of byStrip) {
      labels.push({
        strip,
        position: [acc.x / acc.n, 1.1, acc.z / acc.n + 0.55],
      });
    }
    return labels;
  }, [components, wires]);

  const currentLabels = useMemo(() => {
    const labels: { key: string; position: Vec3; amps: number }[] = [];
    for (const wire of wires) {
      const amps = sim.wireCurrent.get(wire.id) ?? 0;
      if (Math.abs(amps) < 1e-6) continue;
      const p = wireCurve(wire).getPointAt(0.5);
      labels.push({ key: wire.id, position: [p.x, p.y + 0.5, p.z], amps });
    }
    for (const comp of components) {
      const amps = sim.components.get(comp.id)?.current ?? 0;
      if (Math.abs(amps) < 1e-6) continue;
      const { a, b } = componentEndpoints(comp);
      labels.push({
        key: comp.id,
        position: [(a[0] + b[0]) / 2, 2.3, (a[2] + b[2]) / 2],
        amps,
      });
    }
    return labels;
  }, [components, wires, sim]);

  const plusPost = batteryTerminalPosition("+");

  return (
    <group>
      {showVoltage &&
        voltageLabels.map(({ strip, position }) => {
          const v = sim.stripVoltage.get(strip);
          if (v === undefined) return null;
          return (
            <Chip
              key={strip}
              position={position}
              text={formatVolts(v)}
              tone="voltage"
            />
          );
        })}
      {showVoltage && (
        <Chip
          position={[plusPost[0] + 1.6, plusPost[1] + 0.4, plusPost[2]]}
          text={formatVolts(sim.batteryPlusVoltage)}
          tone="voltage"
        />
      )}
      {showCurrent &&
        currentLabels.map(({ key, position, amps }) => (
          <Chip key={key} position={position} text={formatAmps(amps)} tone="current" />
        ))}
    </group>
  );
}
