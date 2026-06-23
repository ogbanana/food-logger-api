"use client";

import { useTheme } from "../../lib/client/ThemeContext";
import FoodLoggerLogo from "./icons/FoodLoggerLogo";

export default function Header() {
  const { colors } = useTheme();
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        padding: "10px 16px",
        borderBottom: `0.5px solid ${colors.border}`,
        backgroundColor: colors.surface,
        flexShrink: 0,
      }}
    >
      <FoodLoggerLogo
        size={26}
        color={colors.textPrimary}
        bottle="#2563EB"
        apple="#E03131"
        stem="#2F9E44"
      />
      <span
        style={{
          fontSize: 20,
          fontWeight: 700,
          letterSpacing: -0.5,
          color: colors.textPrimary,
        }}
      >
        Food Logger
      </span>
    </div>
  );
}
