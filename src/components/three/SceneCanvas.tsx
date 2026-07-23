import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { useCircuitStore } from "@/store/circuitStore";
import { BatteryModel } from "./BatteryModel";
import { Breadboard } from "./Breadboard";
import { ComponentModel } from "./ComponentModel";
import { CurrentFlow } from "./CurrentFlow";
import { GhostPreview } from "./GhostPreview";
import { Labels } from "./Labels";
import { WireModel } from "./WireModel";
import { WorkspaceMat } from "./WorkspaceMat";

export function SceneCanvas() {
  const components = useCircuitStore((s) => s.components);
  const wires = useCircuitStore((s) => s.wires);

  return (
    <Canvas
      camera={{ position: [0, 58, 50], fov: 42, near: 1, far: 800 }}
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
      <Breadboard />
      <BatteryModel />
      {components.map((comp) => (
        <ComponentModel key={comp.id} comp={comp} />
      ))}
      {wires.map((wire) => (
        <WireModel key={wire.id} wire={wire} />
      ))}
      <GhostPreview />
      <CurrentFlow />
      <Labels />

      <OrbitControls
        makeDefault
        target={[0, 0, 0]}
        minDistance={8}
        maxDistance={160}
        maxPolarAngle={Math.PI / 2 - 0.06}
        enableDamping
      />
    </Canvas>
  );
}
