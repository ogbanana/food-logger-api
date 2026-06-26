"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { useTheme, type Colors } from "../../lib/client/ThemeContext";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

type IOSBrowser = "safari" | "chrome" | "other";

const DISMISSED_KEY = "a2hs-dismissed";

export default function InstallButton() {
  const { colors } = useTheme();
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(
    null,
  );
  const [installed, setInstalled] = useState(false);
  const [iosBrowser, setIosBrowser] = useState<IOSBrowser | null>(null);
  const [showIOSHelp, setShowIOSHelp] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const helpRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const nav = navigator as Navigator & { standalone?: boolean };
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      nav.standalone === true;
    const ua = navigator.userAgent;
    const isIOS = /iphone|ipad|ipod/i.test(ua);
    let wasDismissed = false;
    try {
      wasDismissed = localStorage.getItem(DISMISSED_KEY) === "1";
    } catch {}
    /* eslint-disable react-hooks/set-state-in-effect */
    setInstalled(standalone);
    setDismissed(wasDismissed);
    setIosBrowser(
      isIOS
        ? /CriOS/i.test(ua)
          ? "chrome"
          : /FxiOS|EdgiOS|OPiOS|GSA/i.test(ua)
            ? "other"
            : "safari"
        : null,
    );
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

  useEffect(() => {
    if (showIOSHelp) {
      helpRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [showIOSHelp]);

  if (installed || dismissed) return null;
  if (!iosBrowser && !deferred) return null;

  async function handleClick() {
    if (iosBrowser) {
      setShowIOSHelp(v => !v);
      return;
    }
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    setDeferred(null);
  }

  function handleDismiss() {
    setDismissed(true);
    try {
      localStorage.setItem(DISMISSED_KEY, "1");
    } catch {
      // Persisting is best-effort; hiding for this session is enough.
    }
  }

  const s = makeStyles(colors);

  return (
    <div style={s.wrap}>
      <button style={s.btn} onClick={handleClick}>
        <DownloadIcon color={colors.carbsText} />
        <span>Add to Home Screen</span>
      </button>
      {iosBrowser && showIOSHelp && (
        <div ref={helpRef} style={s.help}>
          {iosBrowser === "chrome" ? (
            <>
              In Chrome, tap the <strong>⋯</strong> menu (bottom-right), then
              choose <strong>Add to Home Screen</strong>. If you don&apos;t see
              it, update Chrome or open this page in Safari.
            </>
          ) : iosBrowser === "safari" ? (
            <>
              Tap the Share button
              <span style={s.inlineIcon}>
                <ShareIcon color={colors.textSecondary} />
              </span>
              in the bottom toolbar, then choose{" "}
              <strong>Add to Home Screen</strong>.
            </>
          ) : (
            <>
              Open this page in <strong>Safari</strong> or{" "}
              <strong>Chrome</strong>, then use that browser&apos;s menu to
              choose <strong>Add to Home Screen</strong>.
            </>
          )}
          <button style={s.dismiss} onClick={handleDismiss}>
            I&apos;ve added it — hide this
          </button>
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
    dismiss: {
      display: "block",
      marginTop: 10,
      padding: 0,
      background: "none",
      border: "none",
      color: colors.carbsText,
      fontSize: 12.5,
      fontWeight: 600,
      cursor: "pointer",
    },
    inlineIcon: { margin: "0 4px" },
  };
}
