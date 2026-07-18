import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { WIRE_COLORS } from "@/lib/wireColors";
import { formatAmps, formatOhms, formatVolts } from "@/lib/format";
import type { LedColor, PlacedComponent, Wire, WireColor } from "@/lib/types";
import type { ComponentReading, ComponentStatus } from "@/sim/solver";
import { useCircuitStore } from "@/store/circuitStore";

const E12_PRESETS = [47, 100, 220, 330, 470, 680, 1000, 2200, 4700, 10000, 47000, 100000];
const LED_COLORS: LedColor[] = ["red", "yellow", "green", "blue", "white"];
const WIRE_COLOR_ORDER: WireColor[] = ["red", "black", "green", "blue", "yellow"];

const STATUS_TEXT: Record<ComponentStatus, string> = {
  ok: "Conducting",
  overcurrent: "Overcurrent!",
  reversed: "Reversed",
  "no-path": "No complete circuit",
  off: "No current",
  bypassed: "Bypassed (legs share a strip)",
  open: "Open (not pressed)",
};

function Row({ label, value, alert }: { label: string; value: string; alert?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-2 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className={`font-mono ${alert ? "font-semibold text-destructive" : ""}`}>
        {value}
      </span>
    </div>
  );
}

function Readings({ reading }: { reading: ComponentReading | undefined }) {
  if (!reading) return null;
  const alert =
    reading.status !== "ok" && reading.status !== "off" && reading.status !== "open";
  return (
    <div className="space-y-1 rounded-md bg-muted/60 p-2">
      <Row label="Status" value={STATUS_TEXT[reading.status]} alert={alert} />
      <Row label="Current" value={formatAmps(reading.current)} />
      <Row label="Voltage drop" value={formatVolts(reading.voltageDrop)} />
    </div>
  );
}

function ResistorInspector({ comp }: { comp: PlacedComponent & { kind: "resistor" } }) {
  const setResistorOhms = useCircuitStore((s) => s.setResistorOhms);
  const reading = useCircuitStore((s) => s.sim.components.get(comp.id));
  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label className="text-xs">Resistance</Label>
        <div className="flex gap-1.5">
          <Select
            value={E12_PRESETS.includes(comp.ohms) ? String(comp.ohms) : undefined}
            onValueChange={(v) => v && setResistorOhms(comp.id, Number(v))}
          >
            <SelectTrigger size="sm" className="w-24">
              <SelectValue placeholder={formatOhms(comp.ohms)} />
            </SelectTrigger>
            <SelectContent>
              {E12_PRESETS.map((ohms) => (
                <SelectItem key={ohms} value={String(ohms)}>
                  {formatOhms(ohms)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            type="number"
            min={1}
            value={comp.ohms}
            onChange={(e) => {
              const n = Number(e.target.value);
              if (Number.isFinite(n) && n > 0) setResistorOhms(comp.id, n);
            }}
            className="h-7 w-24 text-xs"
            aria-label="Custom resistance in ohms"
          />
        </div>
      </div>
      <Readings reading={reading} />
    </div>
  );
}

function LedInspector({ comp }: { comp: PlacedComponent & { kind: "led" } }) {
  const setLedColor = useCircuitStore((s) => s.setLedColor);
  const setLedVf = useCircuitStore((s) => s.setLedVf);
  const reading = useCircuitStore((s) => s.sim.components.get(comp.id));
  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label className="text-xs">Color</Label>
        <Select
          value={comp.color}
          onValueChange={(v) => v && setLedColor(comp.id, v as LedColor)}
        >
          <SelectTrigger size="sm" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {LED_COLORS.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Forward voltage (Vf)</Label>
        <Input
          type="number"
          step={0.1}
          min={0.5}
          max={5}
          value={comp.vf}
          onChange={(e) => {
            const n = Number(e.target.value);
            if (Number.isFinite(n)) setLedVf(comp.id, n);
          }}
          className="h-7 w-24 text-xs"
        />
      </div>
      {reading && reading.brightness > 0 && (
        <Row label="Brightness" value={`${Math.round(reading.brightness * 100)}%`} />
      )}
      <Readings reading={reading} />
    </div>
  );
}

function ButtonInspector({ comp }: { comp: PlacedComponent & { kind: "button" } }) {
  const reading = useCircuitStore((s) => s.sim.components.get(comp.id));
  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Momentary push button. Press and hold the red cap in the scene to close the
        circuit.
      </p>
      <Readings reading={reading} />
    </div>
  );
}

function WireInspector({ wire }: { wire: Wire }) {
  const setWireColor = useCircuitStore((s) => s.setWireColor);
  const amps = useCircuitStore((s) => s.sim.wireCurrent.get(wire.id) ?? 0);
  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label className="text-xs">Color</Label>
        <div className="flex gap-1.5">
          {WIRE_COLOR_ORDER.map((color) => (
            <button
              key={color}
              type="button"
              aria-label={`${color} wire`}
              onClick={() => setWireColor(wire.id, color)}
              className={`size-5 rounded-full border-2 ${
                wire.color === color ? "border-foreground" : "border-transparent"
              }`}
              style={{ backgroundColor: WIRE_COLORS[color] }}
            />
          ))}
        </div>
      </div>
      <div className="rounded-md bg-muted/60 p-2">
        <Row label="Current" value={formatAmps(amps)} />
      </div>
    </div>
  );
}

function BatteryInspector() {
  const battery = useCircuitStore((s) => s.battery);
  const setBatteryVolts = useCircuitStore((s) => s.setBatteryVolts);
  const sim = useCircuitStore((s) => s.sim);
  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label className="text-xs">Voltage: {battery.volts}V</Label>
        <Slider
          value={[battery.volts]}
          min={1}
          max={12}
          step={0.5}
          onValueChange={(v) =>
            setBatteryVolts(Array.isArray(v) ? (v[0] ?? battery.volts) : v)
          }
        />
      </div>
      <div className="space-y-1 rounded-md bg-muted/60 p-2">
        <Row
          label="Current draw"
          value={formatAmps(sim.batteryCurrent)}
          alert={sim.shorted}
        />
        <Row
          label="Power"
          value={`${(Math.abs(sim.batteryCurrent) * battery.volts).toFixed(2).replace(/\.?0+$/, "")}W`}
        />
      </div>
    </div>
  );
}

const KIND_TITLE: Record<PlacedComponent["kind"], string> = {
  resistor: "Resistor",
  led: "LED",
  button: "Push button",
};

export function InspectorPanel() {
  const selection = useCircuitStore((s) => s.selection);
  const components = useCircuitStore((s) => s.components);
  const wires = useCircuitStore((s) => s.wires);
  const deleteSelection = useCircuitStore((s) => s.deleteSelection);

  let title = "Battery";
  let body: React.ReactNode = <BatteryInspector />;
  let deletable = false;

  if (selection?.kind === "component") {
    const comp = components.find((c) => c.id === selection.id);
    if (comp) {
      title = KIND_TITLE[comp.kind];
      deletable = true;
      switch (comp.kind) {
        case "resistor":
          body = <ResistorInspector comp={comp} />;
          break;
        case "led":
          body = <LedInspector comp={comp} />;
          break;
        case "button":
          body = <ButtonInspector comp={comp} />;
          break;
      }
    }
  } else if (selection?.kind === "wire") {
    const wire = wires.find((w) => w.id === selection.id);
    if (wire) {
      title = "Jumper wire";
      deletable = true;
      body = <WireInspector wire={wire} />;
    }
  }

  return (
    <aside className="pointer-events-auto w-60 rounded-md border bg-background/95 p-3 shadow-md backdrop-blur">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {title}
        </h2>
        {deletable && (
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={deleteSelection}
            aria-label="Delete selection"
          >
            <Trash2 className="size-3.5 text-destructive" />
          </Button>
        )}
      </div>
      {body}
    </aside>
  );
}
