"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { getDaysRemaining } from "../../lib/client/identity";
import {
  isAuthenticated,
  getUserEmail,
  logout,
} from "../../lib/client/authClient";
import { useTheme, type Colors } from "../../lib/client/ThemeContext";
import { useSettings } from "../../lib/client/SettingsContext";
import { useDrawer } from "../../lib/client/DrawerContext";
import FoodLoggerLogo from "./icons/FoodLoggerLogo";
import InstallButton from "./InstallButton";
import {
  PersonIcon,
  HourglassIcon,
  CheckIcon,
} from "./icons/EmojiIcons";

const DRAWER_WIDTH = "78%";

export default function Drawer() {
  const router = useRouter();
  const { drawerOpen, setDrawerOpen } = useDrawer();
  const { colors, isDark, toggleTheme } = useTheme();
  const { calorieTarget, setCalorieTarget } = useSettings();
  const [daysRemaining, setDaysRemaining] = useState<number | null>(null);
  const [authenticated, setAuthenticated] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [editingTarget, setEditingTarget] = useState(false);
  const [targetInput, setTargetInput] = useState("");

  // Re-read identity/auth from storage each time the drawer opens, so it
  // reflects the latest login/logout/guest state. This syncs an external store
  // (localStorage) into React on an event, which the lint rule below flags but
  // is the intended pattern here.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!drawerOpen) return;
    const authed = isAuthenticated();
    setAuthenticated(authed);
    setUserEmail(authed ? getUserEmail() : null);
    setDaysRemaining(getDaysRemaining());
  }, [drawerOpen]);
  /* eslint-enable react-hooks/set-state-in-effect */

  function close() {
    setDrawerOpen(false);
  }

  function handleSaveTarget() {
    const val = parseInt(targetInput);
    if (!val || val < 100) return;
    setCalorieTarget(val);
    setEditingTarget(false);
  }

  const s = makeStyles(colors);

  return (
    <>
      <div
        style={{
          ...s.backdrop,
          opacity: drawerOpen ? 1 : 0,
          pointerEvents: drawerOpen ? "auto" : "none",
        }}
        onClick={close}
      />
      <div
        style={{
          ...s.drawer,
          transform: drawerOpen ? "translateX(0)" : "translateX(-100%)",
        }}
      >
        {/* Header */}
        <div style={s.drawerHeader}>
          <div style={s.drawerHeaderTitleRow}>
            <FoodLoggerLogo size={26} color="#FFFFFF" accent="#FFFFFF" />
            <span style={s.appName}>Food Logger</span>
          </div>
          <span style={s.appTagline}>Your personal food brain dump</span>
        </div>

        <div style={s.body}>
          {/* Auth section */}
          {authenticated ? (
            <div style={s.guestCard}>
              <div style={s.guestLabel}>SIGNED IN AS</div>
              <div style={s.guestStatus}>
                <CheckIcon size={16} />
                <span>{userEmail}</span>
              </div>
              <button
                style={s.logoutBtn}
                onClick={() => {
                  logout();
                  setAuthenticated(false);
                  setUserEmail(null);
                  close();
                }}
              >
                Log Out
              </button>
            </div>
          ) : (
            <>
              <div style={s.guestCard}>
                <div style={s.guestLabel}>ACCOUNT STATUS</div>
                <div style={s.guestStatus}>
                  <PersonIcon size={16} />
                  <span>Guest</span>
                </div>
                {daysRemaining !== null && daysRemaining <= 7 && (
                  <div
                    style={{
                      ...s.guestExpiry,
                      ...(daysRemaining <= 2 ? s.guestExpiryUrgent : {}),
                    }}
                  >
                    <HourglassIcon size={14} />
                    <span>
                      Data expires in {daysRemaining} day
                      {daysRemaining === 1 ? "" : "s"}
                    </span>
                  </div>
                )}
                {daysRemaining !== null && daysRemaining > 7 && (
                  <div style={s.guestExpiry}>
                    <CheckIcon size={14} />
                    <span>{daysRemaining} days of free logging remaining</span>
                  </div>
                )}
              </div>
              <div style={s.authSection}>
                <button
                  style={s.signUpBtn}
                  onClick={() => {
                    close();
                    router.push("/signup");
                  }}
                >
                  Create Account
                </button>
                <button
                  style={s.loginBtn}
                  onClick={() => {
                    close();
                    router.push("/login");
                  }}
                >
                  Log In
                </button>
              </div>
            </>
          )}

          <InstallButton />

          <div style={s.divider} />

          {/* Nutrition key */}
          <div style={s.section}>
            <div style={s.sectionLabel}>NUTRITION KEY</div>
            <div style={s.legendGrid}>
              <LegendRow label="Protein (g)" pill="P" pillBg={colors.proteinBg} pillText={colors.proteinText} colors={colors} />
              <LegendRow label="Carbohydrates (g)" pill="Cb" pillBg={colors.carbsBg} pillText={colors.carbsText} colors={colors} />
              <LegendRow label="Fat (g)" pill="F" pillBg={colors.fatBg} pillText={colors.fatText} colors={colors} />
              <LegendRow label="Fiber (g)" pill="Fi" pillBg={colors.fiberBg} pillText={colors.fiberText} colors={colors} />
              <LegendRow label="Calories (kcal)" pill="C" pillBg={colors.calBg} pillText={colors.calText} colors={colors} />
            </div>
          </div>

          <div style={s.divider} />

          {/* Settings */}
          <div style={s.section}>
            <div style={s.sectionLabel}>SETTINGS</div>

            {/* Dark mode */}
            <div style={s.themeRow}>
              <span style={s.themeLabel}>Dark Mode</span>
              <button
                role="switch"
                aria-checked={isDark}
                onClick={toggleTheme}
                style={{
                  ...s.switch,
                  backgroundColor: isDark ? "#4A4A4A" : colors.surfaceAlt,
                }}
              >
                <span
                  style={{
                    ...s.switchThumb,
                    backgroundColor: colors.textPrimary,
                    transform: isDark ? "translateX(20px)" : "translateX(0)",
                  }}
                />
              </button>
            </div>

            {/* Daily calorie target */}
            <div style={s.targetBlock}>
              <span style={s.themeLabel}>Daily Calorie Target</span>
              {editingTarget ? (
                <div style={s.targetEditRow}>
                  <input
                    style={s.targetInput}
                    value={targetInput}
                    onChange={e => setTargetInput(e.target.value)}
                    inputMode="numeric"
                    autoFocus
                    placeholder={String(calorieTarget)}
                    onKeyDown={e => {
                      if (e.key === "Enter") handleSaveTarget();
                    }}
                  />
                  <button style={s.targetSaveBtn} onClick={handleSaveTarget}>
                    Save
                  </button>
                  <button
                    style={s.targetCancelBtn}
                    onClick={() => setEditingTarget(false)}
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  style={s.targetValueRow}
                  onClick={() => {
                    setTargetInput(String(calorieTarget));
                    setEditingTarget(true);
                  }}
                >
                  <span style={s.targetValue}>{calorieTarget} kcal</span>
                  <span style={s.targetEditHint}>Edit</span>
                </button>
              )}
            </div>
          </div>

          <div style={{ height: 32 }} />
        </div>
      </div>
    </>
  );
}

function LegendRow({
  label,
  pill,
  pillBg,
  pillText,
  colors,
}: {
  label: string;
  pill: string;
  pillBg: string;
  pillText: string;
  colors: Colors;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: 10 }}>
      <div
        style={{
          width: 28,
          height: 28,
          borderRadius: 99,
          backgroundColor: pillBg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <span style={{ fontSize: 12, fontWeight: 500, color: pillText }}>
          {pill}
        </span>
      </div>
      <span style={{ fontSize: 13, color: colors.textPrimary }}>{label}</span>
    </div>
  );
}

function makeStyles(colors: Colors): Record<string, CSSProperties> {
  return {
    backdrop: {
      position: "absolute",
      inset: 0,
      backgroundColor: "rgba(0,0,0,0.45)",
      transition: "opacity 0.28s ease",
      zIndex: 40,
    },
    drawer: {
      position: "absolute",
      left: 0,
      top: 0,
      bottom: 0,
      width: DRAWER_WIDTH,
      backgroundColor: colors.surface,
      borderTopRightRadius: 28,
      borderBottomRightRadius: 28,
      boxShadow: "12px 0 40px rgba(0,0,0,0.35)",
      transition: "transform 0.3s ease",
      zIndex: 41,
      display: "flex",
      flexDirection: "column",
      overflow: "hidden",
    },
    drawerHeader: {
      paddingTop: 36,
      paddingLeft: 20,
      paddingRight: 20,
      paddingBottom: 20,
      backgroundColor: colors.drawerHeaderBg,
      flexShrink: 0,
    },
    drawerHeaderTitleRow: {
      display: "flex",
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginBottom: 4,
    },
    appName: { fontSize: 22, fontWeight: 700, color: "#FFFFFF", letterSpacing: -0.3 },
    appTagline: { fontSize: 13, color: "rgba(255,255,255,0.55)" },
    body: { flex: 1, overflowY: "auto", padding: 16, display: "flex", flexDirection: "column" },
    guestCard: {
      padding: 14,
      backgroundColor: colors.surfaceAlt,
      borderRadius: 16,
      border: `0.5px solid ${colors.border}`,
      display: "flex",
      flexDirection: "column",
      gap: 4,
    },
    guestLabel: {
      fontSize: 10,
      fontWeight: 600,
      letterSpacing: 0.8,
      color: colors.textMuted,
      marginBottom: 4,
    },
    guestStatus: {
      fontSize: 15,
      fontWeight: 500,
      color: colors.textPrimary,
      display: "flex",
      alignItems: "center",
      gap: 7,
    },
    guestExpiry: {
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: 2,
      display: "flex",
      alignItems: "center",
      gap: 6,
    },
    guestExpiryUrgent: { color: colors.error },
    authSection: { display: "flex", flexDirection: "column", gap: 8, marginTop: 12 },
    signUpBtn: {
      backgroundColor: colors.primary,
      color: colors.primaryText,
      borderRadius: 14,
      padding: 12,
      border: "none",
      cursor: "pointer",
      fontWeight: 600,
      fontSize: 14,
    },
    loginBtn: {
      backgroundColor: colors.surfaceAlt,
      color: colors.textPrimary,
      borderRadius: 14,
      padding: 12,
      border: `0.5px solid ${colors.border}`,
      cursor: "pointer",
      fontWeight: 500,
      fontSize: 14,
    },
    divider: { height: 0.5, backgroundColor: colors.border, margin: "16px 0" },
    section: { display: "flex", flexDirection: "column", gap: 10 },
    sectionLabel: {
      fontSize: 10,
      fontWeight: 600,
      letterSpacing: 0.8,
      color: colors.textMuted,
    },
    legendGrid: { display: "flex", flexDirection: "column", gap: 10 },
    themeRow: {
      display: "flex",
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    themeLabel: { fontSize: 14, color: colors.textPrimary, fontWeight: 500 },
    switch: {
      width: 48,
      height: 28,
      borderRadius: 99,
      border: "none",
      cursor: "pointer",
      padding: 3,
      display: "flex",
      alignItems: "center",
      transition: "background-color 0.2s ease",
    },
    switchThumb: {
      width: 22,
      height: 22,
      borderRadius: 99,
      transition: "transform 0.2s ease",
      boxShadow: "0 1px 2px rgba(0,0,0,0.3)",
    },
    targetBlock: { display: "flex", flexDirection: "column", gap: 8, marginTop: 14 },
    targetValueRow: {
      display: "flex",
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      background: "none",
      border: "none",
      padding: 0,
      cursor: "pointer",
    },
    targetValue: { fontSize: 15, fontWeight: 600, color: colors.calText },
    targetEditHint: { fontSize: 12, color: colors.textMuted },
    targetEditRow: { display: "flex", flexDirection: "row", alignItems: "center", gap: 8 },
    targetInput: {
      flex: 1,
      minWidth: 0,
      border: `0.5px solid ${colors.inputBorder}`,
      borderRadius: 12,
      padding: 8,
      fontSize: 14,
      color: colors.textPrimary,
      backgroundColor: colors.inputBg,
    },
    targetSaveBtn: {
      backgroundColor: colors.primary,
      color: colors.primaryText,
      borderRadius: 12,
      padding: "7px 12px",
      border: "none",
      cursor: "pointer",
      fontSize: 13,
      fontWeight: 600,
    },
    targetCancelBtn: {
      background: "none",
      border: "none",
      cursor: "pointer",
      fontSize: 13,
      color: colors.textMuted,
    },
    logoutBtn: {
      marginTop: 10,
      padding: 8,
      borderRadius: 12,
      border: `0.5px solid ${colors.error}44`,
      background: "none",
      cursor: "pointer",
      fontSize: 13,
      color: colors.error,
      fontWeight: 500,
    },
  };
}
