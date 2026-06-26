"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { getDaysRemaining } from "../../lib/client/identity";
import {
  isAuthenticated,
  getUserEmail,
  logout,
} from "../../lib/client/authClient";
import {
  useTheme,
  type Colors,
  type ThemeMode,
} from "../../lib/client/ThemeContext";
import { useSettings } from "../../lib/client/SettingsContext";
import { useDrawer } from "../../lib/client/DrawerContext";
import FoodLoggerLogo from "./icons/FoodLoggerLogo";
import InstallButton from "./InstallButton";
import { PersonIcon, HourglassIcon, CheckIcon } from "./icons/EmojiIcons";

const DRAWER_WIDTH = "78%";

export default function Drawer() {
  const router = useRouter();
  const { drawerOpen, setDrawerOpen } = useDrawer();
  const { colors, mode, setMode, isDark } = useTheme();
  const { calorieTarget, setCalorieTarget } = useSettings();
  const [daysRemaining, setDaysRemaining] = useState<number | null>(null);
  const [authenticated, setAuthenticated] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [editingTarget, setEditingTarget] = useState(false);
  const [targetInput, setTargetInput] = useState("");

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

  const s = makeStyles(colors, isDark);

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
            <FoodLoggerLogo
              size={26}
              color="#FFFFFF"
              bottle="#2563EB"
              apple="#E03131"
              stem="#2F9E44"
            />
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

          <div style={s.divider} />

          {/* Nutrition key */}
          <div style={s.section}>
            <div style={s.sectionLabel}>NUTRITION KEY</div>
            <div style={s.legendGrid}>
              <LegendRow
                label="Protein (g)"
                pill="P"
                pillBg={colors.proteinBg}
                pillText={colors.proteinText}
                colors={colors}
              />
              <LegendRow
                label="Carbohydrates (g)"
                pill="Cb"
                pillBg={colors.carbsBg}
                pillText={colors.carbsText}
                colors={colors}
              />
              <LegendRow
                label="Fat (g)"
                pill="F"
                pillBg={colors.fatBg}
                pillText={colors.fatText}
                colors={colors}
              />
              <LegendRow
                label="Fiber (g)"
                pill="Fi"
                pillBg={colors.fiberBg}
                pillText={colors.fiberText}
                colors={colors}
              />
              <LegendRow
                label="Calories (kcal)"
                pill="C"
                pillBg={colors.calBg}
                pillText={colors.calText}
                colors={colors}
              />
            </div>
          </div>

          <div style={s.divider} />

          {/* Settings */}
          <div style={s.section}>
            <div style={s.sectionLabel}>SETTINGS</div>

            <div style={s.settingsCard}>
              {/* Theme */}
              <div style={s.settingEditRow}>
                <span style={s.settingLabel}>Theme</span>
                <div style={s.segTrack} role="radiogroup" aria-label="Theme">
                  {(["light", "dark", "auto"] as ThemeMode[]).map(m => {
                    const active = mode === m;
                    return (
                      <button
                        key={m}
                        role="radio"
                        aria-checked={active}
                        onClick={() => setMode(m)}
                        style={{
                          ...s.segBtn,
                          ...(active ? s.segBtnActive : {}),
                        }}
                      >
                        {m === "auto"
                          ? "Auto"
                          : m === "dark"
                            ? "Dark"
                            : "Light"}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div style={s.rowDivider} />

              {/* Daily calorie target */}
              {editingTarget ? (
                <div style={s.settingEditRow}>
                  <span style={s.settingLabel}>Daily Calorie Target</span>
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
                </div>
              ) : (
                <button
                  style={s.settingRowBtn}
                  onClick={() => {
                    setTargetInput(String(calorieTarget));
                    setEditingTarget(true);
                  }}
                >
                  <span style={s.settingLabel}>Daily Calorie Target</span>
                  <span style={s.settingValueWrap}>
                    <span style={s.settingValue}>{calorieTarget} kcal</span>
                    <svg
                      width={14}
                      height={14}
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke={colors.textMuted}
                      strokeWidth={2.5}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M9 6 L15 12 L9 18" />
                    </svg>
                  </span>
                </button>
              )}
            </div>
          </div>

          <div style={s.divider} />

          <div style={s.section}>
            <InstallButton />
          </div>
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
    <div
      style={{
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
      }}
    >
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

function makeStyles(
  colors: Colors,
  isDark = false,
): Record<string, CSSProperties> {
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
    appName: {
      fontSize: 22,
      fontWeight: 700,
      color: "#FFFFFF",
      letterSpacing: -0.3,
    },
    appTagline: { fontSize: 13, color: "rgba(255,255,255,0.55)" },
    body: {
      flex: 1,
      overflowY: "auto",
      padding: 16,
      display: "flex",
      flexDirection: "column",
    },
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
    authSection: {
      display: "flex",
      flexDirection: "column",
      gap: 8,
      marginTop: 12,
    },
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
    settingsCard: {
      backgroundColor: colors.surfaceAlt,
      border: `0.5px solid ${colors.border}`,
      borderRadius: 14,
      overflow: "hidden",
      display: "flex",
      flexDirection: "column",
    },
    settingRow: {
      display: "flex",
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "12px 14px",
      minHeight: 50,
    },
    settingRowBtn: {
      display: "flex",
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "12px 14px",
      minHeight: 50,
      width: "100%",
      background: "none",
      border: "none",
      cursor: "pointer",
      textAlign: "left",
    },
    settingEditRow: {
      display: "flex",
      flexDirection: "column",
      gap: 10,
      padding: "12px 14px",
    },
    rowDivider: { height: 0.5, backgroundColor: colors.border, marginLeft: 14 },
    settingLabel: { fontSize: 14, color: colors.textPrimary, fontWeight: 500 },
    settingValueWrap: {
      display: "flex",
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    settingValue: { fontSize: 14, fontWeight: 600, color: colors.calText },
    segTrack: {
      display: "flex",
      flexDirection: "row",
      backgroundColor: isDark ? colors.surface : colors.bg,
      borderRadius: 11,
      padding: 3,
      gap: 3,
    },
    segBtn: {
      flex: 1,
      padding: "8px 0",
      borderRadius: 8,
      border: "none",
      backgroundColor: isDark ? colors.bg : "transparent",
      cursor: "pointer",
      fontSize: 13,
      fontWeight: 500,
      color: colors.textSecondary,
      transition: "color 0.15s ease, background-color 0.15s ease",
    },
    segBtnActive: {
      backgroundColor: colors.primary,
      color: colors.primaryText,
      fontWeight: 600,
      boxShadow: "0 1px 4px rgba(0,0,0,0.18)",
    },
    targetEditRow: {
      display: "flex",
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
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
