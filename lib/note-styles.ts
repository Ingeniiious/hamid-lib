// Paper styles — CSS background patterns for the note editor

// Line spacing in px — all patterns and editor line-height sync to this
export const LINE_HEIGHT = 32;

export const PAPER_STYLES = {
  blank: {
    label: "Blank",
    background: "none",
  },
  lined: {
    label: "Lined",
    background: `repeating-linear-gradient(transparent, transparent ${LINE_HEIGHT - 1}px, rgba(0,0,0,0.08) ${LINE_HEIGHT - 1}px, rgba(0,0,0,0.08) ${LINE_HEIGHT}px)`,
  },
  grid: {
    label: "Grid",
    background: `repeating-linear-gradient(transparent, transparent ${LINE_HEIGHT - 1}px, rgba(0,0,0,0.06) ${LINE_HEIGHT - 1}px, rgba(0,0,0,0.06) ${LINE_HEIGHT}px), repeating-linear-gradient(90deg, transparent, transparent ${LINE_HEIGHT - 1}px, rgba(0,0,0,0.06) ${LINE_HEIGHT - 1}px, rgba(0,0,0,0.06) ${LINE_HEIGHT}px)`,
  },
  dotted: {
    label: "Dotted",
    background:
      "radial-gradient(circle, rgba(0,0,0,0.12) 1px, transparent 1px)",
    backgroundSize: `${LINE_HEIGHT * 0.75}px ${LINE_HEIGHT * 0.75}px`,
  },
} as const;

export const PAPER_COLORS = [
  { label: "White", value: "#ffffff" },
  { label: "Cream", value: "#fdf6e3" },
  { label: "Yellow", value: "#fffde7" },
  { label: "Blue", value: "#e8f0fe" },
  { label: "Pink", value: "#fce4ec" },
  { label: "Green", value: "#e8f5e9" },
  { label: "Lavender", value: "#ede7f6" },
  { label: "Peach", value: "#fff3e0" },
] as const;

export const NOTE_FONTS = [
  { label: "Default", value: "default", className: "font-sans" },
  { label: "Classic", value: "display", className: "font-display" },
  { label: "Gochi Hand", value: "gochi", className: "font-gochi" },
  { label: "Delicious", value: "delicious", className: "font-delicious" },
] as const;

/** Paper sizes — width & height in px for on-screen display (real aspect ratios) */
export const PAPER_SIZES = {
  a4: { label: "A4", width: 640, height: 905 },
  a5: { label: "A5", width: 480, height: 679 },
  letter: { label: "Letter", width: 660, height: 854 },
  b5: { label: "B5", width: 540, height: 764 },
  notebook: { label: "Notebook", width: 500, height: 700 },
} as const;

/**
 * Line alignment — controls how text sits relative to ruled lines.
 * `offset` is the padding-top (px) applied to the editor so text
 * baselines align with the background pattern.
 */
export const LINE_ALIGNS = {
  "on-line": { label: "On Line", offset: 7 },
  between: { label: "Between", offset: 23 },
  above: { label: "Above Line", offset: 1 },
} as const;

export type PaperStyle = keyof typeof PAPER_STYLES;
export type PaperColor = (typeof PAPER_COLORS)[number]["value"] | string;
export type NoteFont = (typeof NOTE_FONTS)[number]["value"];
export type PaperSize = keyof typeof PAPER_SIZES;
export type LineAlign = keyof typeof LINE_ALIGNS;
