import type { ThreeEvent } from "@react-three/fiber";
import { useState } from "react";
import * as THREE from "three";
import type { BatteryTerminal, Vec3 } from "@/lib/types";
import { useCircuitStore } from "@/store/circuitStore";
import type { BatteryAsset } from "./battery-asset";

const TERMINAL_HOVER_COLOR = "#22c55e";
const TERMINAL_TARGET_GEOMETRY = new THREE.BoxGeometry(0.86, 0.5, 0.86);

/** Invisible terminal target at the authored GLB anchor position. */
function TerminalTarget({
  terminal,
  position,
  connect,
}: {
  terminal: BatteryTerminal;
  position: Vec3;
  connect: (terminal: BatteryTerminal) => void;
}) {
  const [hovered, setHovered] = useState(false);

  const onClick = (event: ThreeEvent<MouseEvent>) => {
    if (event.delta > 4) return;
    event.stopPropagation();
    connect(terminal);
  };

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: This is a raycast target in a Three.js canvas, not a DOM element.
    <mesh
      dispose={null}
      geometry={TERMINAL_TARGET_GEOMETRY}
      position={position}
      onClick={onClick}
      onPointerOver={(event) => {
        event.stopPropagation();
        setHovered(true);
      }}
      onPointerOut={() => setHovered(false)}
    >
      <meshBasicMaterial
        color={TERMINAL_HOVER_COLOR}
        opacity={0.2}
        transparent
        visible={hovered}
        depthWrite={false}
      />
    </mesh>
  );
}

export function BatteryModel({ asset }: { asset: BatteryAsset }) {
  const wireClick = useCircuitStore((state) => state.wireClick);
  const wireToolActive = useCircuitStore((state) => state.tool.kind === "wire");

  const connect = (terminal: BatteryTerminal) => {
    wireClick({ kind: "battery", terminal });
  };

  return (
    <group position={asset.origin}>
      <primitive object={asset.model} />
      {wireToolActive && (
        <>
          <TerminalTarget
            terminal="+"
            position={asset.localTerminals["+"]}
            connect={connect}
          />
          <TerminalTarget
            terminal="-"
            position={asset.localTerminals["-"]}
            connect={connect}
          />
        </>
      )}
    </group>
  );
}
