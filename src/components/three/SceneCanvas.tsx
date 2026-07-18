import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { TABLE_Y } from "@/lib/breadboard";
import { useCircuitStore } from "@/store/circuitStore";
import { BatteryModel } from "./BatteryModel";
import { Breadboard } from "./Breadboard";
import { ComponentModel } from "./ComponentModel";
import { CurrentFlow } from "./CurrentFlow";
import { GhostPreview } from "./GhostPreview";
import { Labels } from "./Labels";
import { WireModel } from "./WireModel";

function Table() {
  return (
    <mesh position={[0, TABLE_Y - 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[400, 400]} />
      <meshStandardMaterial color="#d7dade" roughness={0.95} />
    </mesh>
  );
}

export function SceneCanvas() {
  const components = useCircuitStore((s) => s.components);
  const wires = useCircuitStore((s) => s.wires);

  return (
    <Canvas
      camera={{ position: [0, 30, 26], fov: 42 }}
      dpr={[1, 2]}
      onPointerMissed={() => useCircuitStore.getState().select(null)}
    >
      <color attach="background" args={["#e3e6ea"]} />
      <hemisphereLight args={["#ffffff", "#b8bcc4", 0.9]} />
      <directionalLight position={[18, 30, 12]} intensity={1.6} />
      <directionalLight position={[-14, 18, -10]} intensity={0.5} />

      <Table />
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
        maxDistance={90}
        maxPolarAngle={Math.PI / 2 - 0.06}
        enableDamping
      />
    </Canvas>
  );
}
