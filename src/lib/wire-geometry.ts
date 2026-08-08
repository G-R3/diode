import { holePosition, parseHoleId } from "./breadboard";
import type { BatteryTerminalPositions, Vec3, WireEnd } from "./types";

/** World position of either supported wire endpoint. */
export function wireEndPosition(
  end: WireEnd,
  batteryTerminals: BatteryTerminalPositions,
): Vec3 {
  if (end.kind === "battery") return batteryTerminals[end.terminal];
  const hole = parseHoleId(end.hole);
  return hole ? holePosition(hole) : [0, 0, 0];
}
