// "Deep Table" design system — dark luxury card room aesthetic

export const colors = {
  // Surfaces
  background: "#0D0B0E",
  board: "#1C1209",
  cardFelt: "#1A2E1A",
  statusBar: "#110F13",
  surface: "#151217",
  surfaceElevated: "#1E1A22",

  // Accents
  gold: "#C9943A",
  goldBright: "#E8C06A",
  copper: "#A0522D",

  // Chips
  red: "#C0392B",
  blue: "#1A6B9A",
  green: "#2D7A4A",
  freeGold: "#8B6914",

  // Text
  heading: "#F2E8D5",
  body: "#C8B89A",
  muted: "#6B5B4A",

  // Feedback
  error: "#E74C3C",
  success: "#2ECC71",
  warning: "#F39C12",
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const borderRadius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  full: 9999,
} as const;

export const chipColorMap = {
  red: colors.red,
  blue: colors.blue,
  green: colors.green,
} as const;

export type ChipColorKey = keyof typeof chipColorMap;
