import { OrbitControls, Text } from "@react-three/drei";
import { Canvas, useThree } from "@react-three/fiber";
import type { ElementRef } from "react";
import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import "./App.css";

const BOARD_LENGTH = 13.4;
const BOARD_WIDTH = 5.4;
const BOARD_THICKNESS = 0.34;
const HOLE_RADIUS = 0.052;
const COLUMN_COUNT = 60;
const COLUMN_PITCH = 0.19;
const TOP_Z = BOARD_THICKNESS / 2;
const CAMERA_POSITION = new THREE.Vector3(-5.4, 4.4, 6.2);
const CAMERA_TARGET = new THREE.Vector3(0, 0, 0);
const SIDE_DETAIL_X_POSITIONS = [-5.35, -2.65, 0, 2.65, 5.35];
const TERMINAL_ROWS = [1.2, 1.0, 0.8, 0.6, 0.4, -0.4, -0.6, -0.8, -1.0, -1.2];
const RAIL_ROWS = [2.32, 2.12, -2.12, -2.32];

type Hole = {
  x: number;
  y: number;
};

function createHolePath({ x, y }: Hole) {
  const path = new THREE.Path();
  path.absellipse(x, y, HOLE_RADIUS, HOLE_RADIUS, 0, Math.PI * 2, true);
  return path;
}

function createBreadboardShape(holes: Hole[]) {
  const shape = new THREE.Shape();
  const halfLength = BOARD_LENGTH / 2;
  const halfWidth = BOARD_WIDTH / 2;

  shape.moveTo(-halfLength, -halfWidth);
  shape.lineTo(halfLength, -halfWidth);
  shape.lineTo(halfLength, halfWidth);
  shape.lineTo(-halfLength, halfWidth);
  shape.lineTo(-halfLength, -halfWidth);

  holes.forEach((hole) => {
    shape.holes.push(createHolePath(hole));
  });

  return shape;
}

function createHolePositions() {
  const holes: Hole[] = [];
  const firstColumnX = -((COLUMN_COUNT - 1) * COLUMN_PITCH) / 2;

  for (let columnIndex = 0; columnIndex < COLUMN_COUNT; columnIndex += 1) {
    const x = firstColumnX + columnIndex * COLUMN_PITCH;

    TERMINAL_ROWS.forEach((y) => holes.push({ x, y }));

    if (columnIndex !== 29 && columnIndex !== 30) {
      RAIL_ROWS.forEach((y) => holes.push({ x, y }));
    }
  }

  return holes;
}

function useInstancedHoleMatrices(positions: Hole[], z: number, scale = 1) {
  return useMemo(() => {
    const matrix = new THREE.Matrix4();
    const translation = new THREE.Vector3();
    const quaternion = new THREE.Quaternion();
    const size = new THREE.Vector3(scale, scale, scale);

    return positions.map(({ x, y }) => {
      translation.set(x, y, z);
      matrix.compose(translation, quaternion, size);
      return matrix.clone();
    });
  }, [positions, scale, z]);
}

function HoleDepths({ positions }: { positions: Hole[] }) {
  const innerRef = useRef<THREE.InstancedMesh>(null);
  const rimRef = useRef<THREE.InstancedMesh>(null);
  const innerMatrices = useInstancedHoleMatrices(positions, TOP_Z - 0.18);
  const rimMatrices = useInstancedHoleMatrices(positions, TOP_Z + 0.012);
  const innerGeometry = useMemo(() => {
    const geometry = new THREE.CylinderGeometry(
      HOLE_RADIUS * 0.74,
      HOLE_RADIUS * 0.84,
      BOARD_THICKNESS * 0.75,
      18,
    );
    geometry.rotateX(Math.PI / 2);
    return geometry;
  }, []);
  const rimGeometry = useMemo(
    () => new THREE.TorusGeometry(HOLE_RADIUS * 1.05, 0.004, 6, 18),
    [],
  );

  useLayoutEffect(() => {
    innerMatrices.forEach((matrix, index) => {
      innerRef.current?.setMatrixAt(index, matrix);
    });
    rimMatrices.forEach((matrix, index) => {
      rimRef.current?.setMatrixAt(index, matrix);
    });

    if (innerRef.current) {
      innerRef.current.instanceMatrix.needsUpdate = true;
    }
    if (rimRef.current) {
      rimRef.current.instanceMatrix.needsUpdate = true;
    }
  }, [innerMatrices, rimMatrices]);

  return (
    <>
      <instancedMesh
        ref={innerRef}
        args={[innerGeometry, undefined, positions.length]}
        receiveShadow
      >
        <meshStandardMaterial color="#1f1f1c" roughness={0.92} />
      </instancedMesh>
      <instancedMesh
        ref={rimRef}
        args={[rimGeometry, undefined, positions.length]}
        receiveShadow
      >
        <meshStandardMaterial color="#f4f1ea" roughness={0.86} />
      </instancedMesh>
    </>
  );
}

function Breadboard() {
  const holes = useMemo(() => createHolePositions(), []);
  const boardGeometry = useMemo(() => {
    const geometry = new THREE.ExtrudeGeometry(createBreadboardShape(holes), {
      depth: BOARD_THICKNESS,
      bevelEnabled: true,
      bevelSegments: 5,
      bevelSize: 0.028,
      bevelThickness: 0.035,
      curveSegments: 14,
      steps: 1,
    });
    geometry.translate(0, 0, -TOP_Z);
    geometry.computeVertexNormals();
    return geometry;
  }, [holes]);
  const columnLabels = useMemo(() => {
    return Array.from({ length: 13 }, (_, index) => {
      const label = index * 5;
      const x =
        -((COLUMN_COUNT - 1) * COLUMN_PITCH) / 2 +
        Math.min(label, COLUMN_COUNT - 1) * COLUMN_PITCH;

      return { label, x };
    });
  }, []);

  return (
    <group rotation={[-Math.PI / 2, 0, Math.PI]} scale={0.58}>
      <mesh geometry={boardGeometry} castShadow receiveShadow>
        <meshStandardMaterial
          color="#f7f5ee"
          roughness={0.82}
          metalness={0.02}
        />
      </mesh>

      <HoleDepths positions={holes} />

      <mesh position={[0, 0, TOP_Z + 0.008]} receiveShadow>
        <boxGeometry args={[11.35, 0.34, 0.014]} />
        <meshStandardMaterial color="#ddd9d0" roughness={0.94} />
      </mesh>

      {[-3.05, 3.05].map((x) => (
        <group key={`rail-lines-${x}`}>
          <mesh position={[x, 2.48, TOP_Z + 0.07]} renderOrder={2}>
            <planeGeometry args={[5.45, 0.038]} />
            <meshBasicMaterial color="#e34845" depthTest={false} />
          </mesh>
          <mesh position={[x, 1.94, TOP_Z + 0.07]} renderOrder={2}>
            <planeGeometry args={[5.45, 0.038]} />
            <meshBasicMaterial color="#2995d1" depthTest={false} />
          </mesh>
          <mesh position={[x, -1.94, TOP_Z + 0.07]} renderOrder={2}>
            <planeGeometry args={[5.45, 0.038]} />
            <meshBasicMaterial color="#2995d1" depthTest={false} />
          </mesh>
          <mesh position={[x, -2.48, TOP_Z + 0.07]} renderOrder={2}>
            <planeGeometry args={[5.45, 0.038]} />
            <meshBasicMaterial color="#e34845" depthTest={false} />
          </mesh>
        </group>
      ))}

      <mesh position={[0, 1.68, TOP_Z + 0.01]} receiveShadow>
        <boxGeometry args={[11.35, 0.026, 0.012]} />
        <meshStandardMaterial color="#dad6cf" roughness={0.92} />
      </mesh>
      <mesh position={[0, -1.68, TOP_Z + 0.01]} receiveShadow>
        <boxGeometry args={[11.35, 0.026, 0.012]} />
        <meshStandardMaterial color="#dad6cf" roughness={0.92} />
      </mesh>

      {columnLabels.map(({ label, x }) => (
        <Text
          key={`column-${label}`}
          color="#4f4a44"
          fontSize={0.16}
          anchorX="center"
          anchorY="middle"
          position={[x, 1.48, TOP_Z + 0.06]}
        >
          {label}
        </Text>
      ))}

      {columnLabels.map(({ label, x }) => (
        <Text
          key={`bottom-column-${label}`}
          color="#4f4a44"
          fontSize={0.16}
          anchorX="center"
          anchorY="middle"
          position={[x, -1.48, TOP_Z + 0.06]}
          rotation={[0, 0, Math.PI]}
        >
          {label}
        </Text>
      ))}

      {["A", "B", "C", "D", "E"].map((label, index) => (
        [-6.22, 6.22].map((x) => (
          <Text
            key={`top-row-${label}-${x}`}
            color="#4f4a44"
            fontSize={0.16}
            anchorX="center"
            anchorY="middle"
            position={[x, 1.2 - index * 0.2, TOP_Z + 0.06]}
          >
            {label}
          </Text>
        ))
      ))}

      {["F", "G", "H", "I", "J"].map((label, index) => (
        [-6.22, 6.22].map((x) => (
          <Text
            key={`bottom-row-${label}-${x}`}
            color="#4f4a44"
            fontSize={0.16}
            anchorX="center"
            anchorY="middle"
            position={[x, -0.4 - index * 0.2, TOP_Z + 0.06]}
          >
            {label}
          </Text>
        ))
      ))}

      {[
        ["+", -6.1, 2.48, "#e05a58"],
        ["-", -6.1, 1.94, "#5ea6d8"],
        ["+", 6.1, 2.48, "#e05a58"],
        ["-", 6.1, 1.94, "#5ea6d8"],
        ["-", -6.1, -1.94, "#5ea6d8"],
        ["+", -6.1, -2.48, "#e05a58"],
        ["-", 6.1, -1.94, "#5ea6d8"],
        ["+", 6.1, -2.48, "#e05a58"],
      ].map(([label, x, y, color]) => (
        <Text
          key={`${label}-${x}-${y}`}
          color={color}
          fontSize={0.26}
          outlineColor={color}
          outlineWidth={0.008}
          anchorX="center"
          anchorY="middle"
          position={[Number(x), Number(y), TOP_Z + 0.075]}
        >
          {label}
        </Text>
      ))}

      {SIDE_DETAIL_X_POSITIONS.map((x) => (
        <group key={x}>
          <mesh position={[x, BOARD_WIDTH / 2 + 0.02, -0.03]} castShadow>
            <boxGeometry args={[0.34, 0.08, 0.18]} />
            <meshStandardMaterial color="#e8e5de" roughness={0.9} />
          </mesh>
          <mesh position={[x, -BOARD_WIDTH / 2 - 0.02, -0.03]} castShadow>
            <boxGeometry args={[0.34, 0.08, 0.18]} />
            <meshStandardMaterial color="#e8e5de" roughness={0.9} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function SceneControls() {
  const camera = useThree((state) => state.camera);
  const controlsRef = useRef<ElementRef<typeof OrbitControls>>(null);

  useLayoutEffect(() => {
    camera.position.copy(CAMERA_POSITION);
    camera.lookAt(CAMERA_TARGET);
    camera.updateProjectionMatrix();
    controlsRef.current?.target.copy(CAMERA_TARGET);
    controlsRef.current?.update();
  }, [camera]);

  return (
    <OrbitControls
      ref={controlsRef}
      enableDamping
      enablePan={false}
      dampingFactor={0.07}
      makeDefault
      maxDistance={18}
      minDistance={2.4}
      target={CAMERA_TARGET}
    />
  );
}

function App() {
  return (
    <main className="scene-page">
      <div className="scene-copy">
        <p className="eyebrow">Interactive prototype</p>
        <h1>3D breadboard</h1>
        <p>Drag to orbit. Scroll or pinch to zoom.</p>
      </div>

      <section className="scene-card" aria-label="Interactive 3D breadboard">
        <Canvas camera={{ fov: 43 }} dpr={[1, 2]} shadows>
          <color attach="background" args={["#eef2f7"]} />
          <ambientLight intensity={1.15} />
          <directionalLight
            castShadow
            intensity={2.8}
            position={[4, 7, 8]}
            shadow-mapSize={[2048, 2048]}
          />
          <pointLight intensity={0.9} position={[-5, 5, 4]} color="#ffffff" />
          <Breadboard />
          <SceneControls />
        </Canvas>
      </section>
    </main>
  );
}

export default App;
