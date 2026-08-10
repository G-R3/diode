import { useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import type { LedColor, Vec3 } from "@/lib/types";
import { HIGHLIGHT_EMISSIVE, type Highlight } from "./highlight";
import {
  cloneTwoTerminalAsset,
  invisibleHitboxMaterial,
  placementGhostMaterials,
  type TwoTerminalAsset,
  twoTerminalTransform,
} from "./two-terminal-asset";

const MODEL_URL = "/models/led.glb";
const LED_RISE_SPEED = 5.5;
const LED_FALL_SPEED = 4;

const LED_TINT: Record<LedColor, string> = {
  red: "#ef4444",
  green: "#22c55e",
  blue: "#3b82f6",
  yellow: "#eab308",
  white: "#f5f5f4",
};

const LED_GLOW: Record<LedColor, string> = {
  red: "#ff2020",
  green: "#4dff7a",
  blue: "#4d8bff",
  yellow: "#ffe14d",
  white: "#ffffff",
};

interface PreparedLed extends TwoTerminalAsset {
  lightPosition: THREE.Vector3;
}

interface LedAsset extends PreparedLed {
  resinMaterials: readonly THREE.MeshStandardMaterial[];
}

interface LedSourceAsset extends PreparedLed {
  resinMeshes: readonly THREE.Mesh[];
}

interface LedModelProps {
  a: Vec3;
  b: Vec3;
  color: LedColor;
  /** 0..1 from the simulation. */
  brightness: number;
  highlight: Highlight;
}

export function LedModel({
  a,
  b,
  color,
  brightness,
  highlight,
}: LedModelProps) {
  const { scene } = useGLTF(MODEL_URL);
  const asset = useMemo(() => prepareLed(scene), [scene]);
  const transform = useMemo(
    () => twoTerminalTransform(a, b, asset.anchorA, asset.anchorB),
    [a, asset.anchorA, asset.anchorB, b],
  );
  const animatedBrightness = useRef(0);
  const light = useRef<THREE.PointLight>(null);
  const renderedGlow = useRef(-1);
  const renderedColor = useRef<LedColor | null>(null);
  const renderedHighlight = useRef<Highlight | undefined>(undefined);
  const colors = useMemo(
    () => ({
      glow: new THREE.Color(LED_GLOW[color]),
      tint: new THREE.Color(LED_TINT[color]),
    }),
    [color],
  );

  useEffect(
    () => () =>
      asset.resinMaterials.forEach((material) => {
        material.dispose();
      }),
    [asset.resinMaterials],
  );

  useFrame((_, delta) => {
    const nextBrightness = THREE.MathUtils.damp(
      animatedBrightness.current,
      brightness,
      brightness > animatedBrightness.current ? LED_RISE_SPEED : LED_FALL_SPEED,
      Math.min(delta, 0.1),
    );
    animatedBrightness.current =
      Math.abs(nextBrightness - brightness) < 0.001
        ? brightness
        : nextBrightness;
    const glow = THREE.MathUtils.smoothstep(animatedBrightness.current, 0, 1);
    if (
      glow === renderedGlow.current &&
      color === renderedColor.current &&
      highlight === renderedHighlight.current
    ) {
      return;
    }

    const emissive = highlight ? HIGHLIGHT_EMISSIVE[highlight] : colors.glow;
    asset.resinMaterials.forEach((material) => {
      material.color.copy(colors.tint).lerp(colors.glow, glow * 0.18);
      material.emissive.set(emissive);
      material.emissiveIntensity = highlight ? 0.5 : 0.035 + glow * 0.9;
    });
    if (light.current) {
      light.current.intensity = glow * 75;
      light.current.visible = glow > 0.001;
    }
    renderedGlow.current = glow;
    renderedColor.current = color;
    renderedHighlight.current = highlight;
  });

  return (
    <group position={transform.position} quaternion={transform.quaternion}>
      <primitive object={asset.model} dispose={null} />
      <pointLight
        ref={light}
        color={LED_GLOW[color]}
        decay={2}
        distance={7}
        intensity={0}
        position={asset.lightPosition}
        visible={false}
      />
    </group>
  );
}

export function LedGhost({
  a,
  b,
  valid,
}: {
  a: Vec3;
  b: Vec3;
  valid: boolean;
}) {
  const { scene } = useGLTF(MODEL_URL);
  const asset = useMemo(() => prepareLedGhost(scene, valid), [scene, valid]);
  const transform = useMemo(
    () => twoTerminalTransform(a, b, asset.anchorA, asset.anchorB),
    [a, asset.anchorA, asset.anchorB, b],
  );

  return (
    <group position={transform.position} quaternion={transform.quaternion}>
      <primitive object={asset.model} dispose={null} />
    </group>
  );
}

function prepareLed(source: THREE.Object3D): LedAsset {
  const asset = cloneLedAsset(source);
  asset.hitbox.material = invisibleHitboxMaterial;
  asset.hitbox.visible = true;

  const resinMaterials = asset.resinMeshes.map((mesh) => {
    if (!(mesh.material instanceof THREE.MeshStandardMaterial)) {
      throw new Error(`${mesh.name} must use one standard resin material`);
    }
    const runtimeMaterial = mesh.material.clone();
    // glTF alpha-blended materials default to no depth writes in Three.js.
    // This renderer-specific override keeps the opaque-looking shell stable.
    runtimeMaterial.depthWrite = true;
    mesh.material = runtimeMaterial;
    return runtimeMaterial;
  });

  return { ...asset, resinMaterials };
}

function prepareLedGhost(source: THREE.Object3D, valid: boolean): PreparedLed {
  const asset = cloneLedAsset(source);
  asset.hitbox.visible = false;
  asset.visuals.forEach((visual) => {
    visual.visible = true;
    visual.material = placementGhostMaterials[valid ? "valid" : "invalid"];
  });
  return asset;
}

/** Resolve the LED-specific surfaces after the shared two-terminal contract. */
function cloneLedAsset(source: THREE.Object3D): LedSourceAsset {
  const asset = cloneTwoTerminalAsset(source, "LED");
  const resinMeshes = asset.visuals.filter(
    (visual) => visual.userData?.role === "led-resin",
  );
  if (resinMeshes.length !== 2) {
    throw new Error("led.glb must export stateful dome and rim resin meshes");
  }

  const die = asset.model.getObjectByName("LEDVisual_Die");
  if (!(die instanceof THREE.Mesh)) {
    throw new Error("led.glb must export LEDVisual_Die");
  }

  return {
    ...asset,
    lightPosition: die.getWorldPosition(new THREE.Vector3()),
    resinMeshes,
  };
}

useGLTF.preload(MODEL_URL);
