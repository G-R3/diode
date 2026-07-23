import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { useThree } from "@react-three/fiber";
import { TABLE_Y } from "@/lib/breadboard";

/**
 * A finite blue "self-healing cutting mat" that the breadboard sits on.
 * The mat artwork (grid, dashed half-lines, ruler ticks, numbers, diagonals)
 * is drawn once onto an offscreen canvas and used as a texture, so it stays
 * crisp without shipping any image assets.
 *
 * World units are one breadboard hole pitch = 2.54mm, so 1cm = 10/2.54 units.
 */

const UNITS_PER_CM = 10 / 2.54;

/** Mat size in centimetres (grid math is easiest in cm). */
const MAT_CM_W = 34;
const MAT_CM_D = 24;
/** Border band (contains the ruler ticks + numbers), in cm. */
const BORDER_CM = 1.5;
/** Corner radius in cm. */
const CORNER_CM = 1;

export const MAT_WIDTH = MAT_CM_W * UNITS_PER_CM;
export const MAT_DEPTH = MAT_CM_D * UNITS_PER_CM;

const PX_PER_CM = 40;

const COLOR_BASE = "#2a63b5";
const COLOR_BORDER = "#245699";
const LINE_MAJOR = "rgba(235, 244, 255, 0.9)";
const LINE_CM = "rgba(220, 235, 255, 0.5)";
const LINE_DASH = "rgba(210, 230, 255, 0.24)";
const LINE_DIAGONAL = "rgba(220, 235, 255, 0.35)";
const TEXT_COLOR = "rgba(240, 247, 255, 0.9)";

function drawMat(): HTMLCanvasElement {
  const w = MAT_CM_W * PX_PER_CM;
  const h = MAT_CM_D * PX_PER_CM;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;

  const cm = PX_PER_CM;
  const border = BORDER_CM * cm;
  const radius = CORNER_CM * cm;
  // Grid rectangle (inside the border band).
  const gx0 = border;
  const gy0 = border;
  const gx1 = w - border;
  const gy1 = h - border;

  // Mat body: rounded rect, transparent outside.
  ctx.clearRect(0, 0, w, h);
  ctx.beginPath();
  ctx.roundRect(0, 0, w, h, radius);
  ctx.fillStyle = COLOR_BORDER;
  ctx.fill();
  ctx.save();
  ctx.clip(); // keep everything inside the rounded outline

  // Slightly lighter working area inside the border band.
  ctx.fillStyle = COLOR_BASE;
  ctx.fillRect(gx0, gy0, gx1 - gx0, gy1 - gy0);

  // Frame line around the grid area.
  ctx.strokeStyle = LINE_MAJOR;
  ctx.lineWidth = 3;
  ctx.strokeRect(gx0, gy0, gx1 - gx0, gy1 - gy0);

  const gridW = gx1 - gx0;
  const gridH = gy1 - gy0;
  const colsCm = Math.round(gridW / cm);
  const rowsCm = Math.round(gridH / cm);

  // Dashed half-centimetre lines.
  ctx.strokeStyle = LINE_DASH;
  ctx.lineWidth = 1.5;
  ctx.setLineDash([cm * 0.16, cm * 0.14]);
  ctx.beginPath();
  for (let i = 0; i < colsCm; i++) {
    const x = gx0 + (i + 0.5) * cm;
    ctx.moveTo(x, gy0);
    ctx.lineTo(x, gy1);
  }
  for (let j = 0; j < rowsCm; j++) {
    const y = gy0 + (j + 0.5) * cm;
    ctx.moveTo(gx0, y);
    ctx.lineTo(gx1, y);
  }
  ctx.stroke();
  ctx.setLineDash([]);

  // Solid centimetre grid; heavier line every 5cm.
  for (const major of [false, true]) {
    ctx.strokeStyle = major ? LINE_MAJOR : LINE_CM;
    ctx.lineWidth = major ? 3 : 1.5;
    ctx.beginPath();
    for (let i = 1; i < colsCm; i++) {
      if (i % 5 === 0 !== major) continue;
      const x = gx0 + i * cm;
      ctx.moveTo(x, gy0);
      ctx.lineTo(x, gy1);
    }
    for (let j = 1; j < rowsCm; j++) {
      if (j % 5 === 0 !== major) continue;
      const y = gy0 + j * cm;
      ctx.moveTo(gx0, y);
      ctx.lineTo(gx1, y);
    }
    ctx.stroke();
  }

  // Corner-to-corner 45-degree diagonals, like a real mat.
  ctx.strokeStyle = LINE_DIAGONAL;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(gx0, gy0);
  ctx.lineTo(gx1, gy1);
  ctx.moveTo(gx1, gy0);
  ctx.lineTo(gx0, gy1);
  ctx.stroke();

  // Ruler ticks in the border band: mm ticks, taller 5mm and cm ticks.
  const tick = (len: number, alpha: number) => {
    ctx.strokeStyle = `rgba(230, 242, 255, ${alpha})`;
    ctx.lineWidth = 1.5;
    return len * cm;
  };
  const drawTicks = (horizontal: boolean, nearEdge: boolean) => {
    const lengthCm = horizontal ? colsCm : rowsCm;
    for (let mm = 0; mm <= lengthCm * 10; mm++) {
      const isCm = mm % 10 === 0;
      const isHalf = mm % 5 === 0;
      const len = tick(isCm ? 0.5 : isHalf ? 0.34 : 0.22, isCm ? 0.85 : 0.55);
      const p = (horizontal ? gx0 : gy0) + (mm / 10) * cm;
      ctx.beginPath();
      if (horizontal) {
        const y = nearEdge ? gy0 : gy1;
        ctx.moveTo(p, y);
        ctx.lineTo(p, y + (nearEdge ? -len : len));
      } else {
        const x = nearEdge ? gx0 : gx1;
        ctx.moveTo(x, p);
        ctx.lineTo(x + (nearEdge ? -len : len), p);
      }
      ctx.stroke();
    }
  };
  drawTicks(true, true);
  drawTicks(true, false);
  drawTicks(false, true);
  drawTicks(false, false);

  // Numbers every 5cm, in the border band on all four sides.
  ctx.fillStyle = TEXT_COLOR;
  ctx.font = `600 ${cm * 0.6}px system-ui, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  for (let i = 5; i < colsCm; i += 5) {
    const x = gx0 + i * cm;
    ctx.fillText(String(i), x, gy0 - border * 0.62);
    ctx.fillText(String(i), x, gy1 + border * 0.62);
  }
  for (let j = 5; j < rowsCm; j += 5) {
    const y = gy0 + j * cm;
    ctx.fillText(String(j), gx0 - border * 0.55, y);
    ctx.fillText(String(j), gx1 + border * 0.55, y);
  }

  ctx.restore();
  return canvas;
}

/** Mat slab thickness (~3mm at real scale). */
const MAT_THICKNESS = 0.3 * UNITS_PER_CM;

export function WorkspaceMat() {
  const gl = useThree((s) => s.gl);

  const texture = useMemo(() => {
    const t = new THREE.CanvasTexture(drawMat());
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = gl.capabilities.getMaxAnisotropy();
    t.minFilter = THREE.LinearMipmapLinearFilter;
    return t;
  }, [gl]);

  useEffect(() => () => texture.dispose(), [texture]);

  // Rounded-rect slab that gives the mat its physical thickness. The
  // textured plane sits just above its top face; the slab's darker sides
  // are what read as "depth" at low camera angles.
  const slabGeometry = useMemo(() => {
    const w = MAT_WIDTH;
    const d = MAT_DEPTH;
    const r = CORNER_CM * UNITS_PER_CM;
    const shape = new THREE.Shape();
    shape.moveTo(-w / 2 + r, -d / 2);
    shape.lineTo(w / 2 - r, -d / 2);
    shape.quadraticCurveTo(w / 2, -d / 2, w / 2, -d / 2 + r);
    shape.lineTo(w / 2, d / 2 - r);
    shape.quadraticCurveTo(w / 2, d / 2, w / 2 - r, d / 2);
    shape.lineTo(-w / 2 + r, d / 2);
    shape.quadraticCurveTo(-w / 2, d / 2, -w / 2, d / 2 - r);
    shape.lineTo(-w / 2, -d / 2 + r);
    shape.quadraticCurveTo(-w / 2, -d / 2, -w / 2 + r, -d / 2);
    const geo = new THREE.ExtrudeGeometry(shape, {
      depth: MAT_THICKNESS,
      bevelEnabled: false,
    });
    // Extrudes along +z; lay it flat so it extends downward from TABLE_Y.
    // Keep the top face well clear of the textured plane above it, or the
    // two surfaces z-fight (flicker) at far zoom / shallow angles.
    geo.rotateX(Math.PI / 2);
    geo.translate(0, -0.1, 0);
    return geo;
  }, []);

  useEffect(() => () => slabGeometry.dispose(), [slabGeometry]);

  return (
    <group>
      {/* Dark desk surface stretching to the horizon under the mat. */}
      <mesh
        position={[0, TABLE_Y - MAT_THICKNESS - 0.4, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <planeGeometry args={[900, 900]} />
        <meshStandardMaterial color="#131519" roughness={1} />
      </mesh>
      {/* Mat body: darker blue slab with rounded corners. */}
      <mesh geometry={slabGeometry} position={[0, TABLE_Y, 0]}>
        <meshStandardMaterial color="#1d4a87" roughness={0.9} />
      </mesh>
      {/* Mat artwork (transparent outside its rounded corners). */}
      <mesh position={[0, TABLE_Y - 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[MAT_WIDTH, MAT_DEPTH]} />
        <meshStandardMaterial
          map={texture}
          transparent
          roughness={0.92}
          polygonOffset
          polygonOffsetFactor={-1}
          polygonOffsetUnits={-1}
        />
      </mesh>
    </group>
  );
}
