import {
  Activity,
  CircuitBoard,
  Download,
  Trash2,
  Upload,
  Zap,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Toggle } from "@/components/ui/toggle";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { downloadProject, pickProjectFile } from "@/lib/serialization";
import type { Project } from "@/lib/types";
import { useCircuitStore } from "@/store/circuitStore";

export function Toolbar() {
  const projectName = useCircuitStore((s) => s.projectName);
  const setProjectName = useCircuitStore((s) => s.setProjectName);
  const showVoltage = useCircuitStore((s) => s.showVoltage);
  const showCurrent = useCircuitStore((s) => s.showCurrent);
  const setShowVoltage = useCircuitStore((s) => s.setShowVoltage);
  const setShowCurrent = useCircuitStore((s) => s.setShowCurrent);
  const clearBoard = useCircuitStore((s) => s.clearBoard);
  const loadProject = useCircuitStore((s) => s.loadProject);
  const [clearOpen, setClearOpen] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  const onExport = () => {
    const s = useCircuitStore.getState();
    const project: Project = {
      version: 1,
      name: s.projectName,
      battery: s.battery,
      components: s.components,
      wires: s.wires,
    };
    downloadProject(project);
  };

  const onImport = async () => {
    setImportError(null);
    try {
      const project = await pickProjectFile();
      if (project) loadProject(project);
    } catch (err) {
      setImportError(err instanceof Error ? err.message : "Import failed");
    }
  };

  return (
    <header className="flex items-center gap-2 border-b bg-background px-3 py-2">
      <div className="flex items-center gap-2 pr-1">
        <CircuitBoard className="size-5 text-primary" />
        <span className="text-sm font-semibold tracking-tight">Diode</span>
      </div>
      <Separator orientation="vertical" className="h-6" />
      <Input
        value={projectName}
        onChange={(e) => setProjectName(e.target.value)}
        className="h-8 w-52 text-xs"
        aria-label="Project name"
      />
      <a
        href="https://github.com/G-R3/diode"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Open Diode's GitHub repository in a new tab"
        className="flex size-8 items-center justify-center text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      >
        <svg
          className="size-5 text-primary"
          viewBox="0 0 24 24"
          fill="currentColor"
          aria-hidden="true"
        >
          <path d="M12 .5C5.65.5.5 5.65.5 12a11.5 11.5 0 007.86 10.93c.58.1.79-.25.79-.56v-2c-3.2.69-3.88-1.37-3.88-1.37-.52-1.33-1.27-1.69-1.27-1.69-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.18 1.76 1.18 1.02 1.76 2.68 1.25 3.33.96.1-.75.4-1.25.72-1.54-2.55-.29-5.24-1.27-5.24-5.67 0-1.25.45-2.28 1.18-3.08-.12-.29-.51-1.45.11-3.02 0 0 .96-.31 3.15 1.18a10.96 10.96 0 015.74 0c2.19-1.49 3.15-1.18 3.15-1.18.62 1.57.23 2.73.11 3.02.74.8 1.18 1.83 1.18 3.08 0 4.41-2.7 5.38-5.27 5.66.41.36.78 1.06.78 2.13v3.16c0 .31.21.67.8.56A11.5 11.5 0 0023.5 12C23.5 5.65 18.35.5 12 .5z" />
        </svg>{" "}
      </a>
      <div className="flex-1" />
      <Tooltip>
        <TooltipTrigger
          render={
            <Toggle
              pressed={showVoltage}
              onPressedChange={setShowVoltage}
              aria-label="Toggle voltage labels"
              size="sm"
            >
              <Zap className="size-3.5" />
              <span className="text-xs">V</span>
            </Toggle>
          }
        />
        <TooltipContent>Voltage labels</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger
          render={
            <Toggle
              pressed={showCurrent}
              onPressedChange={setShowCurrent}
              aria-label="Toggle current labels"
              size="sm"
            >
              <Activity className="size-3.5" />
              <span className="text-xs">mA</span>
            </Toggle>
          }
        />
        <TooltipContent>Current labels</TooltipContent>
      </Tooltip>
      <Separator orientation="vertical" className="h-6" />
      <Button variant="outline" size="sm" onClick={onExport}>
        <Download data-icon="inline-start" />
        Export
      </Button>
      <Button variant="outline" size="sm" onClick={onImport}>
        <Upload data-icon="inline-start" />
        Import
      </Button>
      {importError && (
        <span
          className="max-w-64 truncate text-xs text-destructive"
          title={importError}
        >
          {importError}
        </span>
      )}
      <Dialog open={clearOpen} onOpenChange={setClearOpen}>
        <DialogTrigger
          render={
            <Button variant="destructive" size="sm">
              <Trash2 data-icon="inline-start" />
              Clear
            </Button>
          }
        />
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Clear the board?</DialogTitle>
            <DialogDescription>
              This removes every component and wire. Export first if you want to
              keep this circuit.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setClearOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                clearBoard();
                setClearOpen(false);
              }}
            >
              Clear board
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </header>
  );
}
