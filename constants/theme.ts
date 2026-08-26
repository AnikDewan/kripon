/**
 * Design tokens mirrored from global.css's @theme block.
 * Use these in places NativeWind classes can't reach directly —
 * StatusBar, chart libraries, SVG fills, native modules, etc.
 * Keep this file in sync with global.css if the palette changes.
 */
export const colors = {
  ink: "#112a3d",
  paper: "#f3f7f8",
  coral: "#c85949",
  coralPale: "#f6e3df",
  teal: "#116f6b",
  sand: "#ddebea",
  mist: "#e9f0f2",
  inkMuted: "#637687",
  inkFaint: "#8a9aa8",
  line: "#dbe5e8",
  tealPale: "#d9eeea",
  tealLine: "#a9d5cd",
  slate: "#758697",
  whiteMuted: "#b6c6d0",
  whiteLine: "#365269",
  tealShade: "#195e60",
} as const;

export type ColorName = keyof typeof colors;

export const fonts = {
  sans: "System",
} as const;
