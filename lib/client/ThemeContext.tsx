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
  calText: "#C2410C",
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

type ThemeContextType = {
  isDark: boolean;
  toggleTheme: () => void;
  colors: Colors;
};

const ThemeContext = createContext<ThemeContextType>({
  isDark: false,
  toggleTheme: () => {},
  colors: light,
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    // Apply the persisted theme after mount so SSR markup (always light) matches
    // the client's first render, then upgrades to the stored preference.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (getItem("theme_dark") === "true") setIsDark(true);
  }, []);

  function toggleTheme() {
    setIsDark(prev => {
      const next = !prev;
      setItem("theme_dark", String(next));
      return next;
    });
  }

  return (
    <ThemeContext.Provider
      value={{ isDark, toggleTheme, colors: isDark ? dark : light }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
