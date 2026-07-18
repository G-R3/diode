import { useState } from "react";
import { Html } from "@react-three/drei";
import type { ThreeEvent } from "@react-three/fiber";
import {
  BATTERY_CENTER,
  BATTERY_SIZE,
  batteryTerminalPosition,
  TABLE_Y,
} from "@/lib/breadboard";
import type { BatteryTerminal } from "@/lib/types";
import { useCircuitStore } from "@/store/circuitStore";
import { highlightProps, type Highlight } from "./highlight";

function TerminalPost({ terminal }: { terminal: BatteryTerminal }) {
  const wireClick = useCircuitStore((s) => s.wireClick);
  const tool = useCircuitStore((s) => s.tool);
  const [hovered, setHovered] = useState(false);
  const [x, y, z] = batteryTerminalPosition(terminal);
  const color = terminal === "+" ? "#dc2626" : "#27272a";
  const active = tool.kind === "wire";

  const onClick = (e: ThreeEvent<MouseEvent>) => {
    if (e.delta > 4) return;
    e.stopPropagation();
    wireClick({ kind: "battery", terminal });
  };

  return (
    <group position={[x, 0, z]}>
      <mesh
        position={[0, y - 0.45, 0]}
        onClick={onClick}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
        }}
        onPointerOut={() => setHovered(false)}
      >
        <cylinderGeometry args={[0.32, 0.32, 1.1, 12]} />
        <meshStandardMaterial
          color={color}
          metalness={0.6}
          roughness={0.3}
          emissive={active && hovered ? "#22c55e" : "#000000"}
          emissiveIntensity={active && hovered ? 0.6 : 0}
        />
      </mesh>
      <mesh position={[0, y, 0]} raycast={() => null}>
        <sphereGeometry args={[0.34, 12, 8]} />
        <meshStandardMaterial color={color} metalness={0.6} roughness={0.3} />
      </mesh>
      <Html position={[0, y + 0.7, 0]} center distanceFactor={28} zIndexRange={[10, 0]}>
        <div
          className={`select-none rounded-full px-1.5 text-xs font-bold text-white ${
            terminal === "+" ? "bg-red-600" : "bg-zinc-700"
          }`}
        >
          {terminal}
        </div>
      </Html>
    </group>
  );
}

export function BatteryModel() {
  const volts = useCircuitStore((s) => s.battery.volts);
  const select = useCircuitStore((s) => s.select);
  const selected = useCircuitStore((s) => s.selection?.kind === "battery");
  const [cx, , cz] = BATTERY_CENTER;
  const [w, h, d] = BATTERY_SIZE;
  const highlight: Highlight = selected ? "selected" : null;

  const onClick = (e: ThreeEvent<MouseEvent>) => {
    if (e.delta > 4) return;
    e.stopPropagation();
    const s = useCircuitStore.getState();
    if (s.tool.kind === "select") select({ kind: "battery" });
  };

  return (
    <group position={[cx, TABLE_Y + h / 2, cz]}>
      <mesh onClick={onClick}>
        <boxGeometry args={[w, h, d]} />
        <meshStandardMaterial color="#18181b" roughness={0.5} {...highlightProps(highlight)} />
      </mesh>
      {/* Label face */}
      <Html
        position={[0, 0.2, d / 2 + 0.04]}
        transform
        distanceFactor={10}
        occlude
        zIndexRange={[10, 0]}
      >
        <div className="pointer-events-none select-none rounded bg-zinc-800 px-2 py-0.5 text-center font-mono text-[10px] leading-tight text-amber-300">
          {volts}V
          <div className="text-[6px] uppercase tracking-widest text-zinc-400">battery</div>
        </div>
      </Html>
      <group position={[-cx, -(TABLE_Y + h / 2), -cz]}>
        <TerminalPost terminal="+" />
        <TerminalPost terminal="-" />
      </group>
    </group>
  );
}
