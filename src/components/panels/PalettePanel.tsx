import type { LucideIcon } from "lucide-react";
import { Lightbulb, MousePointer2, Omega, Power, Spline } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { ComponentKind, WireColor } from "@/lib/types";
import { useCircuitStore, type Tool } from "@/store/circuitStore";
import { WIRE_COLORS } from "@/lib/wireColors";

const COMPONENTS: { kind: ComponentKind; label: string; icon: LucideIcon }[] = [
  { kind: "resistor", label: "Resistor", icon: Omega },
  { kind: "led", label: "LED", icon: Lightbulb },
  { kind: "button", label: "Push button", icon: Power },
];

const WIRE_COLOR_ORDER: WireColor[] = ["red", "black", "green", "blue", "yellow"];

function ToolButton({
  active,
  label,
  icon: Icon,
  onClick,
}: {
  active: boolean;
  label: string;
  icon: LucideIcon;
  onClick: () => void;
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            variant={active ? "default" : "ghost"}
            size="icon"
            onClick={onClick}
            aria-label={label}
            aria-pressed={active}
          >
            <Icon className="size-4" />
          </Button>
        }
      />
      <TooltipContent side="right">{label}</TooltipContent>
    </Tooltip>
  );
}

export function PalettePanel() {
  const tool = useCircuitStore((s) => s.tool);
  const setTool = useCircuitStore((s) => s.setTool);

  const isPlace = (kind: ComponentKind) =>
    tool.kind === "place" && tool.component === kind;

  const pick = (next: Tool) => setTool(next);

  return (
    <aside className="pointer-events-auto flex flex-col items-center gap-1 rounded-md border bg-background/95 p-1.5 shadow-md backdrop-blur">
      <ToolButton
        active={tool.kind === "select"}
        label="Select (Esc)"
        icon={MousePointer2}
        onClick={() => pick({ kind: "select" })}
      />
      <div className="my-0.5 h-px w-6 bg-border" />
      {COMPONENTS.map(({ kind, label, icon }) => (
        <ToolButton
          key={kind}
          active={isPlace(kind)}
          label={`${label} — click the board to place, R rotates`}
          icon={icon}
          onClick={() => pick({ kind: "place", component: kind, dir: 0 })}
        />
      ))}
      <div className="my-0.5 h-px w-6 bg-border" />
      <ToolButton
        active={tool.kind === "wire"}
        label="Jumper wire — click two holes to connect"
        icon={Spline}
        onClick={() => pick({ kind: "wire", color: "red" })}
      />
      {tool.kind === "wire" && (
        <div className="flex flex-col gap-1 pt-1">
          {WIRE_COLOR_ORDER.map((color) => (
            <button
              key={color}
              type="button"
              aria-label={`${color} wire`}
              onClick={() => pick({ kind: "wire", color })}
              className={`size-5 rounded-full border-2 transition-transform ${
                tool.color === color
                  ? "scale-110 border-foreground"
                  : "border-transparent hover:scale-105"
              }`}
              style={{ backgroundColor: WIRE_COLORS[color] }}
            />
          ))}
        </div>
      )}
    </aside>
  );
}
