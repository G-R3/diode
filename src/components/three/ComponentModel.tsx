import type { ThreeEvent } from "@react-three/fiber";
import type { PlacedComponent } from "@/lib/types";
import { useCircuitStore } from "@/store/circuitStore";
import type { ComponentStatus } from "@/sim/solver";
import { ButtonModel } from "./ButtonModel";
import { LedModel } from "./LedModel";
import { componentEndpoints } from "./paths";
import { ResistorModel } from "./ResistorModel";
import type { Highlight } from "./highlight";

const WARNING_STATUSES: ReadonlySet<ComponentStatus> = new Set([
  "no-path",
  "reversed",
  "overcurrent",
  "bypassed",
]);

export function ComponentModel({ comp }: { comp: PlacedComponent }) {
  const select = useCircuitStore((s) => s.select);
  const setButtonPressed = useCircuitStore((s) => s.setButtonPressed);
  const selected = useCircuitStore(
    (s) => s.selection?.kind === "component" && s.selection.id === comp.id,
  );
  const reading = useCircuitStore((s) => s.sim.components.get(comp.id));

  const highlight: Highlight = selected
    ? "selected"
    : reading && WARNING_STATUSES.has(reading.status)
      ? "warning"
      : null;

  const { a, b } = componentEndpoints(comp);

  const onClick = (e: ThreeEvent<MouseEvent>) => {
    if (e.delta > 4) return;
    const s = useCircuitStore.getState();
    if (s.tool.kind !== "select") return;
    e.stopPropagation();
    select({ kind: "component", id: comp.id });
  };

  switch (comp.kind) {
    case "resistor":
      return (
        <group onClick={onClick}>
          <ResistorModel a={a} b={b} ohms={comp.ohms} highlight={highlight} />
        </group>
      );
    case "led":
      return (
        <group onClick={onClick}>
          <LedModel
            a={a}
            b={b}
            color={comp.color}
            brightness={reading?.brightness ?? 0}
            highlight={highlight}
          />
        </group>
      );
    case "button":
      return (
        <group onClick={onClick}>
          <ButtonModel
            a={a}
            b={b}
            pressed={comp.pressed}
            highlight={highlight}
            onPress={(down) => setButtonPressed(comp.id, down)}
          />
        </group>
      );
    default: {
      const _exhaustive: never = comp;
      return _exhaustive;
    }
  }
}
