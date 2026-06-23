"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { useTheme, type Colors } from "../../lib/client/ThemeContext";

// The browser fires `beforeinstallprompt` before the native install UI; we
// capture it and trigger it from our own button. iOS Safari has no such API, so
// we show "Add to Home Screen" instructions there instead.
type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export default function InstallButton() {
  const { colors } = useTheme();
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(
    null,
  );
  const [installed, setInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSHelp, setShowIOSHelp] = useState(false);

  useEffect(() => {
    // Read platform/install state once on mount (browser-only APIs).
    const nav = navigator as Navigator & { standalone?: boolean };
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      nav.standalone === true;
    /* eslint-disable react-hooks/set-state-in-effect */
    setInstalled(standalone);
    setIsIOS(/iphone|ipad|ipod/i.test(navigator.userAgent));
    /* eslint-enable react-hooks/set-state-in-effect */

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferred(null);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  // Already installed — nothing to do.
  if (installed) return null;
  // Non-iOS browsers only get the button once the install prompt is available.
  if (!isIOS && !deferred) return null;

  async function handleClick() {
    if (isIOS) {
      setShowIOSHelp(v => !v);
      return;
    }
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    setDeferred(null);
  }

  const s = makeStyles(colors);

  return (
    <div style={s.wrap}>
      <button style={s.btn} onClick={handleClick}>
        <DownloadIcon color={colors.carbsText} />
        <span>Install app</span>
      </button>
      {isIOS && showIOSHelp && (
        <div style={s.help}>
          To install, tap the Share button
          <span style={s.inlineIcon}>
            <ShareIcon color={colors.textSecondary} />
          </span>
          in the toolbar, then choose <strong>Add to Home Screen</strong>.
        </div>
      )}
    </div>
  );
}

function DownloadIcon({ color }: { color: string }) {
  return (
    <svg
      width={17}
      height={17}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 3 V14 M8 10 L12 14 L16 10" />
      <path d="M4 17 V19 Q4 21 6 21 H18 Q20 21 20 19 V17" />
    </svg>
  );
}

function ShareIcon({ color }: { color: string }) {
  return (
    <svg
      width={14}
      height={14}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ display: "inline-block", verticalAlign: "-0.2em" }}
      aria-hidden="true"
    >
      <path d="M12 3 V15 M8.5 6.5 L12 3 L15.5 6.5" />
      <path d="M7 11 H6 Q4 11 4 13 V19 Q4 21 6 21 H18 Q20 21 20 19 V13 Q20 11 18 11 H17" />
    </svg>
  );
}

function makeStyles(colors: Colors): Record<string, CSSProperties> {
  return {
    wrap: {
      marginTop: 12,
      display: "flex",
      flexDirection: "column",
      gap: 8,
    },
    btn: {
      width: "100%",
      display: "flex",
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      backgroundColor: colors.surfaceAlt,
      color: colors.textPrimary,
      border: `0.5px solid ${colors.border}`,
      borderRadius: 14,
      padding: 12,
      cursor: "pointer",
      fontWeight: 600,
      fontSize: 14,
    },
    help: {
      fontSize: 12.5,
      lineHeight: 1.6,
      color: colors.textSecondary,
      backgroundColor: colors.surfaceAlt,
      border: `0.5px solid ${colors.border}`,
      borderRadius: 12,
      padding: 12,
    },
    inlineIcon: { margin: "0 4px" },
  };
}
