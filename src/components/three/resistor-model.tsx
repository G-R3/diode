import { useGLTF } from "@react-three/drei";
import { useMemo } from "react";
import * as THREE from "three";
import type { Vec3 } from "@/lib/types";
import { WIRE_COLORS } from "@/lib/wireColors";
import {
  cloneTwoTerminalAsset,
  invisibleHitboxMaterial,
  placementGhostMaterials,
  type TwoTerminalAsset,
  twoTerminalTransform,
} from "./two-terminal-asset";

const MODEL_URL = "/models/resistor.glb";
const BAND_COUNT = 6;

const BAND_COLORS = [
  "#15151a", // 0 black
  "#a55318", // 1 brown
  WIRE_COLORS.red, // 2 red
  "#ff7a1a", // 3 orange
  WIRE_COLORS.yellow, // 4 yellow
  WIRE_COLORS.green, // 5 green
  WIRE_COLORS.blue, // 6 blue
  "#b45cff", // 7 violet
  "#9297a6", // 8 grey
  "#fffaf0", // 9 white
] as const;
const GOLD = "#f3bd32";

const bandMaterials = new Map(
  [...BAND_COLORS, GOLD].map((color) => [
    color,
    new THREE.MeshStandardMaterial({
      color,
      emissive: color,
      emissiveIntensity: color === GOLD ? 0.14 : 0.25,
      metalness: color === GOLD ? 0.15 : 0,
      roughness: 0.82,
    }),
  ]),
);
interface ResistorAsset extends TwoTerminalAsset {
  bands: readonly THREE.Mesh[];
}

interface ResistorModelProps {
  a: Vec3;
  b: Vec3;
  ohms: number;
}

export function ResistorModel({ a, b, ohms }: ResistorModelProps) {
  const { scene } = useGLTF(MODEL_URL);
  const bands = useMemo(() => resistorBands(ohms), [ohms]);
  const asset = useMemo(() => prepareResistor(scene, bands), [bands, scene]);

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

export function ResistorGhost({
  a,
  b,
  valid,
}: {
  a: Vec3;
  b: Vec3;
  valid: boolean;
}) {
  const { scene } = useGLTF(MODEL_URL);
  const asset = useMemo(
    () => prepareResistorGhost(scene, valid),
    [scene, valid],
  );
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

function prepareResistor(
  source: THREE.Object3D,
  colors: readonly string[],
): TwoTerminalAsset {
  const asset = cloneResistorAsset(source);
  asset.hitbox.material = invisibleHitboxMaterial;
  asset.hitbox.visible = true;

  asset.bands.forEach((band, index) => {
    const color = colors[index];
    band.visible = color !== undefined;
    if (!color) return;
    const material = bandMaterials.get(color);
    if (!material) throw new Error(`Unsupported resistor band color ${color}`);
    band.material = material;
  });

  return asset;
}

function prepareResistorGhost(
  source: THREE.Object3D,
  valid: boolean,
): TwoTerminalAsset {
  const asset = cloneResistorAsset(source);
  asset.hitbox.visible = false;
  asset.visuals.forEach((visual) => {
    visual.visible = true;
    visual.material = placementGhostMaterials[valid ? "valid" : "invalid"];
  });
  asset.bands.forEach((band, index) => {
    band.visible = index < 4;
  });
  return asset;
}

/** Clone the GLB and resolve its named runtime contract once. */
function cloneResistorAsset(source: THREE.Object3D): ResistorAsset {
  const asset = cloneTwoTerminalAsset(source, "Resistor");

  const bands = Array.from({ length: BAND_COUNT }, (_, index) => {
    const band = asset.model.getObjectByName(`band_${index + 1}`);
    if (!(band instanceof THREE.Mesh)) {
      throw new Error(`resistor.glb must export band_${index + 1}`);
    }
    return band;
  });

  return {
    ...asset,
    bands,
  };
}

/** Current project data uses a standard 4-band code with gold tolerance. */
function resistorBands(ohms: number): readonly string[] {
  if (ohms < 1) return [BAND_COLORS[0], BAND_COLORS[0], BAND_COLORS[0], GOLD];
  const exp = Math.max(Math.floor(Math.log10(ohms)) - 1, 0);
  const sig = Math.min(Math.round(ohms / 10 ** exp), 99);
  return [
    BAND_COLORS[Math.floor(sig / 10) % 10],
    BAND_COLORS[sig % 10],
    BAND_COLORS[Math.min(exp, 9)],
    GOLD,
  ];
}

useGLTF.preload(MODEL_URL);
