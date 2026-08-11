import { useGLTF } from "@react-three/drei";
import type { ThreeEvent } from "@react-three/fiber";
import { useMemo } from "react";
import * as THREE from "three";
import type { Vec3 } from "@/lib/types";
import {
  cloneTwoTerminalAsset,
  configurePlacementGhost,
  invisibleHitboxMaterial,
  type TwoTerminalAsset,
  twoTerminalTransform,
} from "./two-terminal-asset";

const MODEL_URL = "/models/button.glb";

interface ButtonAsset extends TwoTerminalAsset {
  actuator: THREE.Mesh;
  actuatorRestY: number;
  pressedOffsetY: number;
}

interface ButtonModelProps {
  a: Vec3;
  b: Vec3;
  pressed: boolean;
  onPress: (down: boolean) => void;
}

export function ButtonModel({ a, b, pressed, onPress }: ButtonModelProps) {
  const { scene } = useGLTF(MODEL_URL);
  const asset = useMemo(() => prepareButton(scene), [scene]);
  const transform = useMemo(
    () => twoTerminalTransform(a, b, asset.anchorA, asset.anchorB),
    [a, asset.anchorA, asset.anchorB, b],
  );

  const down = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation();
    onPress(true);
  };

  return (
    <group position={transform.position} quaternion={transform.quaternion}>
      <primitive object={asset.model} dispose={null} />
      <primitive
        object={asset.actuator}
        dispose={null}
        position={[
          asset.actuator.position.x,
          asset.actuatorRestY + (pressed ? asset.pressedOffsetY : 0),
          asset.actuator.position.z,
        ]}
      />
      <primitive
        object={asset.hitbox}
        dispose={null}
        material={invisibleHitboxMaterial}
        onPointerDown={down}
        onPointerOut={() => onPress(false)}
        onPointerUp={() => onPress(false)}
      />
    </group>
  );
}

export function ButtonGhost({
  a,
  b,
  valid,
}: {
  a: Vec3;
  b: Vec3;
  valid: boolean;
}) {
  const { scene } = useGLTF(MODEL_URL);
  const asset = useMemo(() => prepareButtonGhost(scene, valid), [scene, valid]);
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

function prepareButton(source: THREE.Object3D): ButtonAsset {
  const asset = cloneButtonAsset(source);
  asset.hitbox.visible = true;
  asset.actuator.removeFromParent();
  asset.hitbox.removeFromParent();
  return asset;
}

function prepareButtonGhost(
  source: THREE.Object3D,
  valid: boolean,
): TwoTerminalAsset {
  const asset = cloneButtonAsset(source);
  configurePlacementGhost(asset, valid);
  return asset;
}

function cloneButtonAsset(source: THREE.Object3D): ButtonAsset {
  const asset = cloneTwoTerminalAsset(source, "Button");
  const actuator = asset.model.getObjectByName("ButtonVisual_Actuator");
  if (!(actuator instanceof THREE.Mesh)) {
    throw new Error("button.glb must export ButtonVisual_Actuator");
  }

  const pressedOffsetY = actuator.userData.pressed_offset_y;
  if (typeof pressedOffsetY !== "number" || !Number.isFinite(pressedOffsetY)) {
    throw new Error("button.glb actuator must export pressed_offset_y");
  }

  return {
    ...asset,
    actuator,
    actuatorRestY: actuator.position.y,
    pressedOffsetY,
  };
}

useGLTF.preload(MODEL_URL);
