export type Highlight = "selected" | "warning" | null;

export const HIGHLIGHT_EMISSIVE: Record<Exclude<Highlight, null>, string> = {
  selected: "#2563eb",
  warning: "#dc2626",
};

/** Emissive props for a body material given the current highlight state. */
export function highlightProps(highlight: Highlight): {
  emissive: string;
  emissiveIntensity: number;
} {
  if (!highlight) return { emissive: "#000000", emissiveIntensity: 0 };
  return { emissive: HIGHLIGHT_EMISSIVE[highlight], emissiveIntensity: 0.45 };
}
