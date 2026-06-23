"use client";

import { SettingsProvider } from "../../lib/client/SettingsContext";
import { ThemeProvider, useTheme } from "../../lib/client/ThemeContext";
import { DrawerProvider } from "../../lib/client/DrawerContext";

function Shell({ children }: { children: React.ReactNode }) {
  const { colors } = useTheme();
  return (
    <div
      className="app-shell"
      style={{ backgroundColor: colors.bg, color: colors.textPrimary }}
    >
      {children}
    </div>
  );
}

export default function AppProviders({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SettingsProvider>
      <ThemeProvider>
        <DrawerProvider>
          <Shell>{children}</Shell>
        </DrawerProvider>
      </ThemeProvider>
    </SettingsProvider>
  );
}
