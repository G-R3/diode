import { useGLTF } from "@react-three/drei";
import { useMemo } from "react";
import * as THREE from "three";
import type {
  BatteryTerminal,
  BatteryTerminalPositions,
  Vec3,
} from "@/lib/types";
import { WORK_SURFACE_Y } from "@/lib/workspace";

const MODEL_PATH = "/models/battery.glb";
const SANDBOX_X = -24;
const SANDBOX_Z = -13.5;

export interface BatteryAsset {
  model: THREE.Object3D;
  origin: Vec3;
  localTerminals: BatteryTerminalPositions;
  terminals: BatteryTerminalPositions;
}

function isBatteryTerminal(value: unknown): value is BatteryTerminal {
  return value === "+" || value === "-";
}

function toVec3(vector: THREE.Vector3): Vec3 {
  return [vector.x, vector.y, vector.z];
}

/** Resolve visual bounds and terminal anchors directly from the exported GLB. */
function prepareBatteryAsset(source: THREE.Object3D): BatteryAsset {
  const model = source.clone(true);
  const visualBounds = new THREE.Box3();
  const anchors: Partial<Record<BatteryTerminal, Vec3>> = {};

  model.updateMatrixWorld(true);

  model.traverse((obj) => {
    if (obj.userData?.role === "terminal-anchor") {
      const terminal = obj.userData.terminal;
      if (!isBatteryTerminal(terminal)) {
        throw new Error(`Battery anchor ${obj.name} has an invalid terminal`);
      }
      anchors[terminal] = toVec3(obj.getWorldPosition(new THREE.Vector3()));
    }

    if (!(obj instanceof THREE.Mesh)) return;

    // Selection is deferred; no GLB triangle participates in picking yet.
    obj.raycast = () => null;

    if (obj.name === "hitbox_Battery" || obj.userData?.role === "hitbox") {
      obj.visible = false;
    } else {
      visualBounds.expandByObject(obj);
    }
  });

  const negative = anchors["-"];
  const positive = anchors["+"];
  if (!negative || !positive) {
    throw new Error("battery.glb must export + and - terminal anchors");
  }
  if (visualBounds.isEmpty()) {
    throw new Error("battery.glb has no visual geometry");
  }

  const origin: Vec3 = [
    SANDBOX_X,
    WORK_SURFACE_Y - visualBounds.min.y,
    SANDBOX_Z,
  ];
  const localTerminals: BatteryTerminalPositions = {
    "-": negative,
    "+": positive,
  };
  const terminals: BatteryTerminalPositions = {
    "-": [
      origin[0] + negative[0],
      origin[1] + negative[1],
      origin[2] + negative[2],
    ],
    "+": [
      origin[0] + positive[0],
      origin[1] + positive[1],
      origin[2] + positive[2],
    ],
  };

  return { model, origin, localTerminals, terminals };
}

export function useBatteryAsset(): BatteryAsset {
  const { scene } = useGLTF(MODEL_PATH);
  return useMemo(() => prepareBatteryAsset(scene), [scene]);
}

useGLTF.preload(MODEL_PATH);
