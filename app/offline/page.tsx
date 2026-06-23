"use client";

import { useTheme } from "../../lib/client/ThemeContext";
import FoodLoggerLogo from "../../components/web/icons/FoodLoggerLogo";

export default function OfflineScreen() {
  const { colors } = useTheme();
  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        gap: 14,
        padding: 32,
        backgroundColor: colors.bg,
      }}
    >
      <FoodLoggerLogo size={48} color={colors.textPrimary} accent={colors.calText} />
      <h1 style={{ fontSize: 22, fontWeight: 700, color: colors.textPrimary }}>
        You&apos;re offline
      </h1>
      <p
        style={{
          fontSize: 14,
          color: colors.textSecondary,
          lineHeight: 1.6,
          maxWidth: 280,
        }}
      >
        Food Logger needs a connection to analyze meals and load your logs.
        Reconnect and try again.
      </p>
      <button
        onClick={() => location.reload()}
        style={{
          marginTop: 4,
          backgroundColor: colors.primary,
          color: colors.primaryText,
          border: "none",
          borderRadius: 16,
          padding: "12px 22px",
          fontSize: 14,
          fontWeight: 600,
          cursor: "pointer",
          boxShadow: "0 6px 16px rgba(16,24,40,0.18)",
        }}
      >
        Retry
      </button>
    </div>
  );
}
