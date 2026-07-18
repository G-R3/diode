import { useEffect } from "react";
import { useCircuitStore } from "@/store/circuitStore";

function isTypingTarget(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement &&
    (target.tagName === "INPUT" ||
      target.tagName === "TEXTAREA" ||
      target.isContentEditable)
  );
}

/** R = rotate placement, Esc = cancel, Delete/Backspace = delete selection. */
export function useKeyboardShortcuts() {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target)) return;
      const s = useCircuitStore.getState();
      if (e.key === "r" || e.key === "R") {
        s.rotatePlacement();
      } else if (e.key === "Escape") {
        s.cancel();
      } else if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        s.deleteSelection();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);
}
