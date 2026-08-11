import * as THREE from "three";
import type { Vec3 } from "@/lib/types";

export const invisibleHitboxMaterial = new THREE.MeshBasicMaterial({
  visible: false,
});

// Placement feedback stays readable when a low orbit angle puts the board or
// cutting mat between the camera and the target hole.
const PLACEMENT_GHOST_RENDER_ORDER = 1;

const placementGhostMaterials = {
  valid: new THREE.MeshStandardMaterial({
    color: "#22c55e",
    depthTest: false,
    depthWrite: false,
    opacity: 0.55,
    roughness: 0.6,
    transparent: true,
  }),
  invalid: new THREE.MeshStandardMaterial({
    color: "#ef4444",
    depthTest: false,
    depthWrite: false,
    opacity: 0.55,
    roughness: 0.6,
    transparent: true,
  }),
};

export interface TwoTerminalAsset {
  model: THREE.Object3D;
  anchorA: THREE.Vector3;
  anchorB: THREE.Vector3;
  hitbox: THREE.Mesh;
  visuals: readonly THREE.Mesh[];
}

/** Apply the shared non-interactive overlay treatment to a placement asset. */
export function configurePlacementGhost(
  asset: TwoTerminalAsset,
  valid: boolean,
) {
  asset.hitbox.visible = false;
  asset.visuals.forEach((visual) => {
    visual.visible = true;
    visual.material = placementGhostMaterials[valid ? "valid" : "invalid"];
    visual.renderOrder = PLACEMENT_GHOST_RENDER_ORDER;
  });
}

/** Clone and resolve the shared runtime contract for two-terminal GLBs. */
export function cloneTwoTerminalAsset(
  source: THREE.Object3D,
  assetName: string,
): TwoTerminalAsset {
  const model = source.clone(true);
  const visuals: THREE.Mesh[] = [];
  const found: {
    anchorA?: THREE.Vector3;
    anchorB?: THREE.Vector3;
    hitbox?: THREE.Mesh;
  } = {};

  model.updateMatrixWorld(true);
  model.traverse((obj) => {
    if (obj.userData?.role === "terminal-anchor") {
      if (obj.userData.terminal === "a") {
        found.anchorA = obj.getWorldPosition(new THREE.Vector3());
      }
      if (obj.userData.terminal === "b") {
        found.anchorB = obj.getWorldPosition(new THREE.Vector3());
      }
      return;
    }
    if (!(obj instanceof THREE.Mesh)) return;
    if (obj.userData?.role === "hitbox" || obj.name === `hitbox_${assetName}`) {
      found.hitbox = obj;
      return;
    }
    obj.raycast = () => null;
    visuals.push(obj);
  });

  if (!found.anchorA || !found.anchorB || !found.hitbox) {
    throw new Error(
      `${assetName.toLowerCase()}.glb must export two terminal anchors and a hitbox`,
    );
  }

  return {
    model,
    anchorA: found.anchorA,
    anchorB: found.anchorB,
    hitbox: found.hitbox,
    visuals,
  };
}

export function twoTerminalTransform(
  a: Vec3,
  b: Vec3,
  anchorA: THREE.Vector3,
  anchorB: THREE.Vector3,
) {
  const targetA = new THREE.Vector3(...a);
  const targetB = new THREE.Vector3(...b);
  const quaternion = new THREE.Quaternion().setFromUnitVectors(
    anchorB.clone().sub(anchorA).normalize(),
    targetB.clone().sub(targetA).normalize(),
  );
  const localMidpoint = anchorA.clone().add(anchorB).multiplyScalar(0.5);

  return {
    position: targetA
      .add(targetB)
      .multiplyScalar(0.5)
      .sub(localMidpoint.applyQuaternion(quaternion)),
    quaternion,
  };
}
