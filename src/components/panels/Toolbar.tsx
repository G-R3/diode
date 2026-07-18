import { useState } from "react";
import {
  Activity,
  CircuitBoard,
  Download,
  Trash2,
  Upload,
  Zap,
} from "lucide-react";
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
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
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
        <span className="max-w-64 truncate text-xs text-destructive" title={importError}>
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
              This removes every component and wire. Export first if you want to keep
              this circuit.
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
