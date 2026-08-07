import type { LucideIcon } from "lucide-react";
import { MousePointer2, Power, Spline } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { ComponentKind, WireColor } from "@/lib/types";
import { WIRE_COLORS } from "@/lib/wireColors";
import { type Tool, useCircuitStore } from "@/store/circuitStore";

const COMPONENTS: {
  kind: ComponentKind;
  label: string;
  icon?: LucideIcon;
  thumbnail?: string;
}[] = [
  { kind: "resistor", label: "Resistor", thumbnail: "/parts/resistor.svg" },
  { kind: "led", label: "LED", thumbnail: "/parts/led.svg" },
  { kind: "button", label: "Push button", icon: Power },
];

const WIRE_COLOR_ORDER: WireColor[] = [
  "red",
  "black",
  "green",
  "blue",
  "yellow",
];

function ToolButton({
  active,
  label,
  displayLabel,
  icon: Icon,
  thumbnail,
  expanded = false,
  onClick,
}: {
  active: boolean;
  label: string;
  displayLabel?: string;
  icon?: LucideIcon;
  thumbnail?: string;
  expanded?: boolean;
  onClick: () => void;
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            variant={active ? "default" : "ghost"}
            size={expanded ? "default" : "icon"}
            onClick={onClick}
            aria-label={label}
            aria-pressed={active}
            className={
              expanded ? "h-12 w-full justify-start gap-3 px-2" : undefined
            }
          >
            {thumbnail ? (
              <span className="grid size-8 shrink-0 place-items-center rounded-md">
                <img
                  src={thumbnail}
                  alt=""
                  className="max-h-6 max-w-6 object-contain"
                />
              </span>
            ) : Icon ? (
              <Icon className="size-4" />
            ) : null}
            {expanded && (
              <span className="text-sm font-medium">
                {displayLabel ?? label}
              </span>
            )}
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
      {COMPONENTS.map(({ kind, label, icon, thumbnail }) => (
        <ToolButton
          key={kind}
          active={isPlace(kind)}
          label={`${label} — click the board to place, R rotates`}
          displayLabel={label}
          icon={icon}
          thumbnail={thumbnail}
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
