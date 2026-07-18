import { AlertTriangle, CheckCircle2, Info, OctagonAlert } from "lucide-react";
import { formatAmps } from "@/lib/format";
import { useCircuitStore } from "@/store/circuitStore";

export function StatusBar() {
  const sim = useCircuitStore((s) => s.sim);
  const components = useCircuitStore((s) => s.components);
  const wires = useCircuitStore((s) => s.wires);

  const empty = components.length === 0 && wires.length === 0;
  const errors = sim.warnings.filter((w) => w.severity === "error");
  const warnings = sim.warnings.filter((w) => w.severity === "warning");
  const flowing = Math.abs(sim.batteryCurrent) > 1e-6;

  let icon: React.ReactNode;
  let text: string;
  let tone: string;

  if (empty) {
    icon = <Info className="size-3.5 shrink-0" />;
    text =
      "Pick a component on the left, click the board to place it, then connect the battery posts with jumper wires.";
    tone = "text-muted-foreground";
  } else if (errors.length > 0) {
    icon = <OctagonAlert className="size-3.5 shrink-0" />;
    text = errors[0].message;
    tone = "text-destructive";
  } else if (warnings.length > 0) {
    icon = <AlertTriangle className="size-3.5 shrink-0" />;
    text = warnings[0].message;
    tone = "text-amber-600";
  } else if (flowing) {
    icon = <CheckCircle2 className="size-3.5 shrink-0" />;
    text = `Circuit closed — battery delivering ${formatAmps(sim.batteryCurrent)}.`;
    tone = "text-emerald-600";
  } else {
    icon = <Info className="size-3.5 shrink-0" />;
    text = "No current flowing. Close the loop from battery + back to battery -.";
    tone = "text-muted-foreground";
  }

  const extra = sim.warnings.length > 1 ? ` (+${sim.warnings.length - 1} more)` : "";

  return (
    <footer
      className={`flex items-center gap-2 border-t bg-background px-3 py-1.5 text-xs ${tone}`}
    >
      {icon}
      <span className="truncate">
        {text}
        {extra}
      </span>
      <span className="ml-auto shrink-0 font-mono text-[11px] text-muted-foreground">
        {components.length} parts · {wires.length} wires
      </span>
    </footer>
  );
}
