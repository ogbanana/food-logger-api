"use client";

import { useTheme } from "../../lib/client/ThemeContext";
import Header from "./Header";
import TabBar from "./TabBar";
import Drawer from "./Drawer";

/**
 * Shared app shell for the main tabbed screens (Log, Dashboard): a fixed Header,
 * a scrollable content area, a bottom TabBar, and the slide-in Drawer overlay.
 * Auth and day-detail screens render standalone and do not use this chrome.
 */
export default function AppChrome({ children }: { children: React.ReactNode }) {
  const { colors } = useTheme();
  return (
    <div
      style={{
        position: "relative",
        display: "flex",
        flexDirection: "column",
        height: "100%",
        overflow: "hidden",
        backgroundColor: colors.surface,
      }}
    >
      <Header />
      <div style={{ flex: 1, overflowY: "auto", backgroundColor: colors.bg }}>
        {children}
      </div>
      <TabBar />
      <Drawer />
    </div>
  );
}
