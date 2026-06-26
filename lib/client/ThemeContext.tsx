"use client";

import { createContext, useContext, useState, useEffect } from "react";
import { getItem, setItem } from "./storage";

export type Colors = {
  bg: string;
  surface: string;
  surfaceAlt: string;
  border: string;
  borderStrong: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  primary: string;
  primaryText: string;
  calBg: string;
  calText: string;
  proteinBg: string;
  proteinText: string;
  carbsBg: string;
  carbsText: string;
  fatBg: string;
  fatText: string;
  fiberBg: string;
  fiberText: string;
  error: string;
  errorBg: string;
  warning: string;
  warningBg: string;
  drawerHeaderBg: string;
  tabBarBg: string;
  tabActive: string;
  tabInactive: string;
  inputBorder: string;
  inputBg: string;
  userBubbleBg: string;
  barNormal: string;
  barOver: string;
  barEmpty: string;
};

export const light: Colors = {
  bg: "#EDEFF4",
  surface: "#FFFFFF",
  surfaceAlt: "#F4F6FA",
  border: "rgba(16,24,40,0.06)",
  borderStrong: "rgba(16,24,40,0.12)",
  textPrimary: "#10131A",
  textSecondary: "#565E6E",
  textMuted: "#98A0B0",
  primary: "#10131A",
  primaryText: "#FFFFFF",
  calBg: "#FFEAD4",
  calText: "#d89519",
  proteinBg: "#ECE3FD",
  proteinText: "#7C3AED",
  carbsBg: "#DEEBFD",
  carbsText: "#1366D6",
  fatBg: "#FDE3E3",
  fatText: "#DC2626",
  fiberBg: "#CCF5E8",
  fiberText: "#08906A",
  error: "#DC2626",
  errorBg: "#FDE3E3",
  warning: "#C2410C",
  warningBg: "#FFEAD4",
  drawerHeaderBg: "#10131A",
  tabBarBg: "#FFFFFF",
  tabActive: "#10131A",
  tabInactive: "#98A0B0",
  inputBorder: "rgba(16,24,40,0.10)",
  inputBg: "#F4F6FA",
  userBubbleBg: "#DEEBFD",
  barNormal: "#FBB13C",
  barOver: "#F46A6A",
  barEmpty: "#E3E6EC",
};

export const dark: Colors = {
  bg: "#0D0E12",
  surface: "#191B22",
  surfaceAlt: "#23262F",
  border: "rgba(255,255,255,0.07)",
  borderStrong: "rgba(255,255,255,0.13)",
  textPrimary: "#F3F4F8",
  textSecondary: "#A6ABB9",
  textMuted: "#6B7080",
  primary: "#F3F4F8",
  primaryText: "#0D0E12",
  calBg: "#412A00",
  calText: "#FFB02E",
  proteinBg: "#2A1B4D",
  proteinText: "#B399FF",
  carbsBg: "#04214D",
  carbsText: "#63B3FF",
  fatBg: "#490707",
  fatText: "#FF8585",
  fiberBg: "#053D2C",
  fiberText: "#45E0AE",
  error: "#FF8585",
  errorBg: "#490707",
  warning: "#FFB02E",
  warningBg: "#412A00",
  drawerHeaderBg: "#05060A",
  tabBarBg: "#191B22",
  tabActive: "#F3F4F8",
  tabInactive: "#6B7080",
  inputBorder: "rgba(255,255,255,0.11)",
  inputBg: "#23262F",
  userBubbleBg: "#0C2547",
  barNormal: "#E0931F",
  barOver: "#B14A4A",
  barEmpty: "#34373F",
};

export type ThemeMode = "light" | "dark" | "auto";

const THEME_MODE_KEY = "theme_mode";
const LEGACY_DARK_KEY = "theme_dark";

type ThemeContextType = {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  /** Resolved value: true when the effective theme is dark. */
  isDark: boolean;
  colors: Colors;
};

const ThemeContext = createContext<ThemeContextType>({
  mode: "auto",
  setMode: () => {},
  isDark: false,
  colors: light,
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>("auto");
  const [systemDark, setSystemDark] = useState(false);

  useEffect(() => {
    const stored = getItem(THEME_MODE_KEY);
    /* eslint-disable react-hooks/set-state-in-effect */
    if (stored === "light" || stored === "dark" || stored === "auto") {
      setModeState(stored);
    } else {
      const legacy = getItem(LEGACY_DARK_KEY);
      if (legacy === "true") setModeState("dark");
      else if (legacy === "false") setModeState("light");
    }

    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    setSystemDark(mq.matches);
    /* eslint-enable react-hooks/set-state-in-effect */
    const onChange = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  function setMode(next: ThemeMode) {
    setModeState(next);
    setItem(THEME_MODE_KEY, next);
  }

  const isDark = mode === "auto" ? systemDark : mode === "dark";

  return (
    <ThemeContext.Provider
      value={{ mode, setMode, isDark, colors: isDark ? dark : light }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
