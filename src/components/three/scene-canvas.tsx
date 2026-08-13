import { OrbitControls, StatsGl } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { Suspense } from "react";
import type { Wire } from "@/lib/types";
import { useCircuitStore } from "@/store/circuitStore";
import { useBatteryAsset } from "./battery-asset";
import { BatteryModel } from "./battery-model";
import { Breadboard } from "./breadboard";
import { ComponentModel } from "./component-model";
import { CurrentFlow } from "./current-flow";
import { GhostPreview } from "./ghost-preview";
import { Labels } from "./labels";
import { WireModel } from "./wire-model";
import { WorkspaceMat } from "./workspace-mat";

function LoadedCircuitScene({ wires }: { wires: Wire[] }) {
  const battery = useBatteryAsset();

  return (
    <>
      <Breadboard />
      <BatteryModel asset={battery} />
      {wires.map((wire) => (
        <WireModel
          key={wire.id}
          wire={wire}
          batteryTerminals={battery.terminals}
        />
      ))}
      <GhostPreview batteryTerminals={battery.terminals} />
      <CurrentFlow batteryTerminals={battery.terminals} />
      <Labels batteryTerminals={battery.terminals} />
    </>
  );
}

export function SceneCanvas() {
  const components = useCircuitStore((s) => s.components);
  const wires = useCircuitStore((s) => s.wires);

  // Component details are sub-unit, so close orbit views need a shallow near plane.
  return (
    <Canvas
      camera={{ position: [0, 58, 50], fov: 42, near: 0.1, far: 800 }}
      dpr={[1, 2]}
      onPointerMissed={() => useCircuitStore.getState().select(null)}
    >
      <color attach="background" args={["#0d0f13"]} />
      {/* Fades the desk into the void at distance, but darkens the far side
          of the mat at max zoom — disabled for now.
      <fog attach="fog" args={["#0d0f13", 110, 260]} /> */}
      <hemisphereLight args={["#ffffff", "#3a4150", 0.85]} />
      <directionalLight position={[18, 30, 12]} intensity={1.7} />
      <directionalLight position={[-14, 18, -10]} intensity={0.55} />

      <WorkspaceMat />
      <Suspense fallback={null}>
        <LoadedCircuitScene wires={wires} />
        {components.map((comp) => (
          <ComponentModel key={comp.id} comp={comp} />
        ))}
      </Suspense>

      <OrbitControls
        makeDefault
        target={[0, 0, 0]}
        minDistance={8}
        maxDistance={160}
        maxPolarAngle={Math.PI / 2 - 0.06}
        enableDamping
      />
      {import.meta.env.DEV && (
        <StatsGl
          className="pointer-events-none fixed left-2 top-14 z-50"
          trackGPU
        />
      )}
    </Canvas>
  );
}
