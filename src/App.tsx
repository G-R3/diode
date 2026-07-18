import { InspectorPanel } from "@/components/panels/InspectorPanel";
import { PalettePanel } from "@/components/panels/PalettePanel";
import { StatusBar } from "@/components/panels/StatusBar";
import { Toolbar } from "@/components/panels/Toolbar";
import { SceneCanvas } from "@/components/three/SceneCanvas";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";

function App() {
  useKeyboardShortcuts();

  return (
    <TooltipProvider>
      <div className="flex h-full flex-col">
        <Toolbar />
        <main className="relative flex-1 overflow-hidden">
          <SceneCanvas />
          <div className="pointer-events-none absolute inset-y-0 left-2 flex items-center">
            <PalettePanel />
          </div>
          <div className="pointer-events-none absolute right-2 top-2">
            <InspectorPanel />
          </div>
        </main>
        <StatusBar />
      </div>
    </TooltipProvider>
  );
}

export default App;
