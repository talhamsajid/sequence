// Web-matched design system — emerald gradient, white cards, casino felt

export const colors = {
  // Gradient background (emerald-900 → emerald-950)
  bgGradientFrom: "#064e3b",
  bgGradientTo: "#022c22",

  // Card panels
  card: "#ffffff",
  cardShadow: "rgba(0,0,0,0.25)",

  // Primary
  primary: "#059669", // emerald-600
  primaryHover: "#047857", // emerald-700
  primaryLight: "#ecfdf5", // emerald-50
  primaryLightText: "#047857", // emerald-700

  // Board felt gradient
  feltFrom: "#1a5c3a",
  feltMid: "#155230",
  feltTo: "#0f3d24",

  // Status bar
  statusBar: "rgba(17,24,39,0.9)", // gray-900/90

  // Chips
  chipRed: "#dc2626", // red-600
  chipBlue: "#2563eb", // blue-600
  chipGreen: "#059669", // emerald-600

  // Chip inner
  chipRedInner: "#ef4444", // red-500
  chipBlueInner: "#3b82f6", // blue-500
  chipGreenInner: "#10b981", // emerald-500

  // Chip highlight
  chipRedLight: "#fca5a5", // red-300
  chipBlueLight: "#93c5fd", // blue-300
  chipGreenLight: "#6ee7b7", // emerald-300

  // Gold/amber highlights
  gold: "#fbbf24", // amber-400
  goldBright: "#f59e0b", // amber-500

  // Text
  textDark: "#1f2937", // gray-800
  textMuted: "#9ca3af", // gray-400
  textSubtle: "#6b7280", // gray-500
  textWhite: "#ffffff",

  // Inputs
  inputBg: "#f9fafb", // gray-50
  inputBorder: "#e5e7eb", // gray-200
  inputBorderFocus: "#059669",

  // Card cell
  cardCellBg: "#fafaf8",
  cardCellBorder: "rgba(209,213,219,0.6)", // gray-300/60

  // Error
  errorBg: "#fef2f2", // red-50
  errorText: "#dc2626", // red-600

  // Misc
  gray50: "#f9fafb",
  gray100: "#f3f4f6",
  gray200: "#e5e7eb",
  gray300: "#d1d5db",
  gray400: "#9ca3af",
  gray500: "#6b7280",
  gray600: "#4b5563",
  gray900: "#111827",

  // Lobby badges
  purpleBg: "#f3e8ff", // purple-100
  purpleText: "#7c3aed", // purple-700
  amberBg: "#fef3c7", // amber-100
  amberText: "#b45309", // amber-700

  // Sequence overlays
  seqRedBg: "rgba(239,68,68,0.12)",
  seqRedBorder: "rgba(239,68,68,0.7)",
  seqBlueBg: "rgba(59,130,246,0.12)",
  seqBlueBorder: "rgba(59,130,246,0.7)",
  seqGreenBg: "rgba(16,185,129,0.12)",
  seqGreenBorder: "rgba(16,185,129,0.7)",

  // Jack badges
  jackRemove: "#dc2626", // red-600
  jackWild: "#7c3aed", // violet-600

  // Emerald text shades
  emerald200: "#a7f3d0",
  emerald300: "#6ee7b7",
  emerald400: "#34d399",
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
  "2xl": 20,
  full: 9999,
} as const;

export const chipColorMap: Record<string, string> = {
  red: colors.chipRed,
  blue: colors.chipBlue,
  green: colors.chipGreen,
};

export const chipInnerColorMap: Record<string, string> = {
  red: colors.chipRedInner,
  blue: colors.chipBlueInner,
  green: colors.chipGreenInner,
};

export const chipLightColorMap: Record<string, string> = {
  red: colors.chipRedLight,
  blue: colors.chipBlueLight,
  green: colors.chipGreenLight,
};

export type ChipColorKey = keyof typeof chipColorMap;
