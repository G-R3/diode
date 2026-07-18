import type {
  BatteryTerminal,
  Hole,
  HoleId,
  RailId,
  StripId,
  WireEnd,
} from "./types";

/**
 * Geometry of a standard 830-point breadboard, in world units of one hole
 * pitch (2.54mm). The board lies in the XZ plane with hole openings at y=0.
 *
 * Main grid: 63 columns x 10 rows (a..e above the center channel, f..j below).
 * Each column half (a-e or f-j) is one electrically continuous strip.
 *
 * Rails: 4 rows (top +/-, bottom +/-) of 50 holes in 10 groups of 5.
 * Each rail row is split mid-board into a left and right strip.
 */

export const COLS = 63;
export const MAIN_ROWS = 10;
export const RAIL_HOLES = 50;
export const RAILS: readonly RailId[] = ["tp", "tm", "bp", "bm"];

export const ROW_LETTERS = "abcdefghij";

const MAIN_X0 = -(COLS - 1) / 2; // col 0 at x=-31

const RAIL_Z: Record<RailId, number> = {
  tp: -8.4,
  tm: -7.4,
  bp: 7.4,
  bm: 8.4,
};

export const BOARD_WIDTH = 66;
export const BOARD_DEPTH = 19.6;
export const BOARD_THICKNESS = 1.4;

/** z for a main-grid row (0..9). Rows straddle the center channel at z=0. */
function mainRowZ(row: number): number {
  return row < 5 ? row - 5 : row - 4;
}

/** x for a rail hole index (0..49): groups of 5 with a one-pitch gap between groups. */
function railX(index: number): number {
  return index + Math.floor(index / 5) - 29;
}

export function holeId(hole: Hole): HoleId {
  return (
    hole.kind === "main"
      ? `m:${hole.row}:${hole.col}`
      : `r:${hole.rail}:${hole.index}`
  ) as HoleId;
}

function isRailId(s: string): s is RailId {
  return s === "tp" || s === "tm" || s === "bp" || s === "bm";
}

/** Parse and validate a hole id (also used when importing project JSON). */
export function parseHoleId(id: string): Hole | null {
  const parts = id.split(":");
  if (parts[0] === "m" && parts.length === 3) {
    const row = Number(parts[1]);
    const col = Number(parts[2]);
    if (!Number.isInteger(row) || !Number.isInteger(col)) return null;
    if (row < 0 || row >= MAIN_ROWS || col < 0 || col >= COLS) return null;
    return { kind: "main", row, col };
  }
  if (parts[0] === "r" && parts.length === 3) {
    const rail = parts[1];
    const index = Number(parts[2]);
    if (!isRailId(rail) || !Number.isInteger(index)) return null;
    if (index < 0 || index >= RAIL_HOLES) return null;
    return { kind: "rail", rail, index };
  }
  return null;
}

/** Human-readable hole name, e.g. "a12" or "top + rail". */
export function holeLabel(hole: Hole): string {
  if (hole.kind === "main") {
    return `${ROW_LETTERS[hole.row]}${hole.col + 1}`;
  }
  const side = hole.rail.startsWith("t") ? "top" : "bottom";
  const sign = hole.rail.endsWith("p") ? "+" : "-";
  return `${side} ${sign} rail`;
}

/** The electrically continuous strip a hole belongs to. */
export function stripOfHole(hole: Hole): StripId {
  if (hole.kind === "main") {
    const bank = hole.row < 5 ? "T" : "B";
    return `s:m:${bank}:${hole.col}` as StripId;
  }
  const half = hole.index < RAIL_HOLES / 2 ? "L" : "R";
  return `s:r:${hole.rail}:${half}` as StripId;
}

export type Vec3 = readonly [number, number, number];

export function holePosition(hole: Hole): Vec3 {
  if (hole.kind === "main") {
    return [MAIN_X0 + hole.col, 0, mainRowZ(hole.row)];
  }
  return [railX(hole.index), 0, RAIL_Z[hole.rail]];
}

/** All holes on the board, in a stable order (used for instanced rendering). */
export const ALL_HOLES: readonly Hole[] = (() => {
  const holes: Hole[] = [];
  for (let row = 0; row < MAIN_ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      holes.push({ kind: "main", row, col });
    }
  }
  for (const rail of RAILS) {
    for (let index = 0; index < RAIL_HOLES; index++) {
      holes.push({ kind: "rail", rail, index });
    }
  }
  return holes;
})();

export const HOLE_INDEX: ReadonlyMap<HoleId, number> = new Map(
  ALL_HOLES.map((hole, i) => [holeId(hole), i]),
);

/** Nearest hole to a world-space XZ point, or null when farther than maxDist. */
export function nearestHole(x: number, z: number, maxDist = 0.75): Hole | null {
  let best: Hole | null = null;
  let bestD = maxDist * maxDist;
  for (const hole of ALL_HOLES) {
    const [hx, , hz] = holePosition(hole);
    const d = (hx - x) * (hx - x) + (hz - z) * (hz - z);
    if (d < bestD) {
      bestD = d;
      best = hole;
    }
  }
  return best;
}

/**
 * Walk n holes from `hole` along a placement direction.
 * Directions: 0 = +col, 1 = +row, 2 = -col, 3 = -row.
 * Rail holes only support the column axis. Returns null when out of bounds.
 */
export type Dir = 0 | 1 | 2 | 3;

export function offsetHole(hole: Hole, dir: Dir, n: number): Hole | null {
  const sign = dir === 2 || dir === 3 ? -1 : 1;
  const alongCol = dir === 0 || dir === 2;
  if (hole.kind === "main") {
    if (alongCol) {
      const col = hole.col + sign * n;
      if (col < 0 || col >= COLS) return null;
      return { kind: "main", row: hole.row, col };
    }
    const row = hole.row + sign * n;
    if (row < 0 || row >= MAIN_ROWS) return null;
    return { kind: "main", row, col: hole.col };
  }
  if (!alongCol) return null;
  const index = hole.index + sign * n;
  if (index < 0 || index >= RAIL_HOLES) return null;
  return { kind: "rail", rail: hole.rail, index };
}

/* ------------------------------- battery ------------------------------- */

export const BATTERY_CENTER: Vec3 = [-24, 0, -13.5];
export const BATTERY_SIZE: Vec3 = [7, 3.4, 4.4]; // w, h, d
/** y of the board underside / table surface that everything rests on. */
export const TABLE_Y = -BOARD_THICKNESS;

export function batteryTerminalPosition(terminal: BatteryTerminal): Vec3 {
  const [cx, , cz] = BATTERY_CENTER;
  const topY = TABLE_Y + BATTERY_SIZE[1];
  const dx = terminal === "+" ? 1.8 : -1.8;
  return [cx + dx, topY + 0.9, cz];
}

/** World position of a wire endpoint. */
export function wireEndPosition(end: WireEnd): Vec3 {
  if (end.kind === "battery") return batteryTerminalPosition(end.terminal);
  const hole = parseHoleId(end.hole);
  if (!hole) return [0, 0, 0];
  return holePosition(hole);
}

/* https://github.com/algorave-dave/Fail-safe/blob/main/Fail-safe.js

  ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣀⣀⠀⠀⠀⠀⡀⠀⠂⠀⠄⡀⢀⡂⣀⠀⢀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠤⣀⣈⠹⢛⣿⣖⣶⡷⢮⡴⣶⡲⣵⣘⣐⣌⣤
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢀⠀⠈⠉⠈⣉⢐⣲⢾⣿⠻⠿⣿⠿⢝⡻⡿⠿⢛⣻
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢠⢠⣀⣨⣏⣩⠵⠶⠷⢓⣾⣊⡥⢞⡹⠛⣻⣷⣲⣿⣿⣿
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢀⠀⠀⠀⠀⠀⢒⠒⠒⢲⣠⡝⣭⣷⣚⣿⣽⡽⣿⠿⢿⠿⢫⣿⠿⣒⣻⣿⣟⣉⣹⣯⡽
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠐⡠⢄⣉⡀⣦⣖⣒⣺⣧⣭⣽⣯⡯⠍⢫⣉⣿⠜⢉⣡⣮⣿⣽⣿⡿⠟⠋⢁⠄⠀⠀⠉⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⡠⠐⠁⠀⠀⣀⣔⣷⠽⠭⠿⣛⣶⣶⡫⢍⡕⢑⣈⢶⡦⠞⣋⢤⢎⣻⣿⡞⠛⠥⠐⠊⠥⠀⡀⠀⡠⠰⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⡀⠀⠀⣤⡖⣉⣠⣋⣌⣭⣲⣷⢮⣥⣲⡒⠢⢤⢶⡿⠿⢛⣭⡿⣟⣷⣶⠾⠿⠛⣉⡊⠁⠀⠀⢀⠔⠀⠀⠠⢀⠈⠂⠀⠀⠀⢀
⠀⠀⠀⠀⢀⠀⠀⠀⠀⠀⠄⠀⠀⠤⢀⣁⠠⣤⠌⢻⣛⣷⣖⣗⣷⠖⣻⣿⠯⣡⠔⢁⠔⣠⠞⣡⣔⠼⣶⠟⠮⣃⠐⠉⠁⠀⠉⠁⠠⡠⠤⠲⠊⠁⠀⠀⡀⠄⠁⠀⠀⠀⠀⡄⣲
⠀⠀⠀⡠⠁⠀⠀⠀⠈⠑⠒⠈⢩⣶⣶⣾⢲⣛⣿⢿⠟⣿⡥⣶⡷⣟⣿⡥⣚⣥⡾⣛⣛⣴⡿⠎⣫⠟⠉⠐⠂⢸⠐⠀⠀⠀⠉⠁⠒⠑⠒⠀⠈⠀⠀⠈⠀⠀⠀⢀⣴⣬⣾⣿⣋
⠀⢀⠔⠁⠀⠀⢀⠀⢀⣐⣛⢻⣿⠿⠿⣽⡷⣯⣿⣶⣞⣭⣯⠷⣻⣽⣷⡿⢛⠁⢅⣋⣝⣶⠶⠏⠡⠄⠒⠀⢈⠄⠀⠀⡠⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣀⢐⣴⣯⣿⣿⠟⣩⡿
⠀⠀⡤⠀⢪⡠⠤⠬⢭⣭⢿⣟⣷⣽⣛⣭⡿⣟⡿⢿⢿⣿⡿⣾⠻⠍⢓⠩⠕⠏⠉⠋⠐⠀⠂⠀⠀⠀⠀⠠⠈⠀⠀⣴⠀⢀⠀⣀⢀⣀⣠⣠⣤⣤⣴⣾⣶⣿⣿⣿⣟⣠⣾⠓⠀
⠀⣁⡤⠟⠙⢁⢔⠾⢫⢴⣯⣟⣿⠞⡝⠉⠋⠃⠊⠁⠀⠀⣀⣅⣀⣀⣀⣀⣀⢠⣶⣠⣤⢤⣴⠶⣶⠾⠥⣴⡶⣶⣾⣭⣟⠺⡿⢟⠻⠟⠛⠻⣿⢿⣿⣟⣛⣭⣴⣾⣿⠟⠁⠀⠀
⠜⡁⠤⢒⢀⣄⣴⠺⠛⠛⠑⣉⢠⡴⣶⣒⣢⣦⣦⣴⣾⣷⣿⣯⣿⣿⣿⣿⣿⣿⣼⣥⣤⣾⣿⣶⣾⣿⣶⣾⣴⣿⣷⣾⣶⣿⣿⣾⣷⣿⣿⣿⣿⣿⣿⣿⣿⡋⠉⢀⡠⠆⣀⣀⠠
⡰⢖⣿⣻⠏⠛⠁⠀⠀⠠⢠⣶⣭⣾⢿⣛⣿⡯⣴⣷⣷⣿⣿⣿⣿⣿⣿⣿⣿⡟⢿⢿⣿⣿⣿⣿⣾⣿⣿⣿⡿⢿⣿⢾⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣮⣙⣾⣿⡋⠉⠃⠉⠀⠀
⠋⠉⠀⠀⠀⠀⠀⢄⣠⣴⠿⢫⣿⡷⣿⡹⠑⣱⣿⣿⣿⣋⠝⢋⡛⢿⣿⣿⣽⣿⣿⣾⡿⠻⣿⡟⢩⢻⣉⣿⢋⢂⢀⠄⢈⠋⢟⠟⢿⣿⣿⣿⢿⣿⢿⡿⣿⠫⣈⠑⠊⠉⠉⠉⠉
⡀⠀⠀⠀⠀⠀⣤⣾⢿⠿⣤⣾⡿⣱⣟⣷⣶⣿⡻⠹⣿⣏⠀⠨⠷⣼⣿⠿⣿⠿⠿⠿⠓⡖⢯⣣⡈⠨⣽⠏⠈⠈⠊⠀⠈⠂⠘⠆⣬⡿⠋⢩⡘⠟⠚⠓⠿⡦⣉⠂⡀⠀⠀⠀⠀
⠀⠀⠀⢀⡴⡾⡿⠃⣠⣼⣿⢿⡟⠛⠓⠒⠀⠀⠀⠀⠈⢷⣦⡄⠁⠈⠁⢀⠁⠀⠀⠐⠀⠐⢈⢊⢮⣿⠏⠀⠀⠀⠀⠀⠀⠀⢰⡽⠟⠀⣶⣿⡿⣇⠉⠛⢬⣧⠂⠑⠂⠁⠀⠀⠀
⠀⠀⢀⢽⡾⠋⢠⣾⢟⡾⠟⡟⡁⠀⠀⠀⠀⠀⠀⠀⠀⠀⠻⢿⣷⣤⡤⢀⢀⠠⢀⣀⡀⢀⣠⠶⠋⠀⠀⠀⠀⠀⠀⣀⣤⠖⠋⠀⣠⣾⣯⣟⣛⣾⡆⠀⠀⠹⡆⠀⠀⠀⠀⠀⠀
⠀⠀⡡⢉⣤⢞⡽⠒⠋⣴⠬⠼⠓⠒⠦⠤⠤⣀⣀⡀⠀⠀⠀⠀⠀⠛⠛⠛⠗⠿⠿⠛⠛⠋⠁⠀⠀⠀⠀⡀⠄⠐⠈⠀⢀⣠⣶⣿⣿⣷⡃⠈⢉⢼⠗⠀⠀⠰⠐⠀⠀⠀⠀⠀⠀
⠀⠀⢔⡿⢵⠟⠒⢉⣡⡴⠵⠒⠚⣲⠤⢖⡀⡀⠤⠈⠚⠛⠚⠶⠤⠤⠤⠄⠀⠀⠄⢀⠀⠀⠔⠒⠂⠉⠀⢀⣀⣤⣰⣵⣿⢿⣿⠿⣿⣿⣯⢊⠼⡋⣹⡀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠡⠀⠈⠀⠐⠁⠀⠀⠀⠐⠾⣭⣶⠉⣼⡽⠛⡥⣢⢤⣤⣀⡀⠀⠀⠀⠀⠀⠀⡀⣀⢀⢀⣀⢠⣖⣽⡼⡧⣙⠿⢿⣷⡧⢉⣾⢠⡺⣿⠏⢈⠀⠀⡇⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠁⡘⠀⠀⢄⠀⠠⢀⠀⢂⢼⠏⠀⣹⡟⠠⠀⣰⣘⣹⣡⡞⠛⣦⢱⢆⢑⢶⢤⡈⡖⣗⡷⣷⣥⡇⠈⣧⡇⢀⣠⣦⢿⣟⠋⠠⠳⠍⣼⠁⠀⠀⠀⠁⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠐⠀⡠⢚⠋⠀⢰⠋⡆⠀⠀⠓⠁⣿⡏⣀⠀⠘⣞⡾⠃⢸⢿⢾⣡⣿⠄⠐⢽⡗⡀⣻⣇⡧⠟⢛⢉⡗⠀⠀⠀⢀⠛⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠰⠁⠀⠀⠀⠹⠀⠕⠀⠠⠀⢀⢿⠁⠉⠛⢾⣿⣃⣀⣿⣿⠁⣿⡏⠀⠀⠀⣿⢁⠃⣏⠀⠀⠀⠸⠀⠀⠀⠀⠈⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠈⠀⠛⠀⠀⢆⡎⠀⠈⣽⠋⢹⠘⣿⠙⠀⠁⠀⣿⠈⠸⡇⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢈⠀⠀⣺⠓⠊⠴⢄⣿⠒⠀⠀⢰⡇⠀⠁⠁⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠈⢀⠃⠡⠀⠀⢸⠀⠀⠀⠀⢘⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠈⠀⠀⠠⠀⣀⠀⠀⠀⠠⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
*/
