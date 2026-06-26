"use client";

import { useEffect, useState } from "react";
import { useTheme } from "../../lib/client/ThemeContext";

export default function DateTimeHeader() {
  const { colors } = useTheme();
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  if (!now) return null;

  return (
    <div
      style={{
        textAlign: "center",
        fontSize: 13,
        fontWeight: 500,
        color: colors.textSecondary,
        padding: "4px 0",
      }}
    >
      {now.toLocaleDateString(undefined, {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      })}
      {" · "}
      {now.toLocaleTimeString(undefined, {
        hour: "numeric",
        minute: "2-digit",
      })}
    </div>
  );
}
