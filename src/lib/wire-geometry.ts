import { holePosition, parseHoleId } from "./breadboard";
import type { BatteryTerminalPositions, Vec3, WireEnd } from "./types";

export const WIRE_CABLE_RADIUS = 0.13;
export const WIRE_CONNECTOR_HEIGHT = 0.9;

/** World position of either supported wire endpoint. */
export function wireEndPosition(
  end: WireEnd,
  batteryTerminals: BatteryTerminalPositions,
): Vec3 {
  if (end.kind === "battery") return batteryTerminals[end.terminal];
  const hole = parseHoleId(end.hole);
  return hole ? holePosition(hole) : [0, 0, 0];
}
