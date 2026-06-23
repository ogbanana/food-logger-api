"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import AppChrome from "../../components/web/AppChrome";
import Spinner from "../../components/web/Spinner";
import { SaladIcon } from "../../components/web/icons/EmojiIcons";
import PenIcon from "../../components/web/icons/PenIcon";
import DateTimeHeader from "../../components/web/DateTimeHeader";
import { fetchWeekLogs, type DailyLog } from "../../lib/client/apiClient";
import {
  isWithinSevenDays,
  localDateStr,
  parseLocalDate,
} from "../../lib/client/utils";
import { useTheme, type Colors } from "../../lib/client/ThemeContext";
import { useSettings } from "../../lib/client/SettingsContext";

type TimeRange = "today" | "week" | "month";

const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function DashboardScreen() {
  const { colors } = useTheme();
  const { calorieTarget: target } = useSettings();
  const router = useRouter();
  const [weekLogs, setWeekLogs] = useState<DailyLog[]>([]);
  const [monthLogs, setMonthLogs] = useState<DailyLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<TimeRange>("today");
  const [monthOffset, setMonthOffset] = useState(0);
  const [calLoading, setCalLoading] = useState(false);

  const calDisplayDate = new Date(
    new Date().getFullYear(),
    new Date().getMonth() + monthOffset,
    1,
  );
  const calYear = calDisplayDate.getFullYear();
  const calMonth = calDisplayDate.getMonth();

  function navigateToDay(dateStr: string) {
    router.push(`/log/${dateStr.split("T")[0]}`);
  }

  async function loadData() {
    setLoading(true);
    try {
      const [week, month] = await Promise.all([
        fetchWeekLogs(7),
        fetchWeekLogs(31),
      ]);
      setWeekLogs(week);
      setMonthLogs(month);
    } catch (err: unknown) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function fetchLogsForMonth(offset: number): Promise<DailyLog[]> {
    if (offset === 0) return fetchWeekLogs(31);
    const today = new Date();
    const targetDate = new Date(
      today.getFullYear(),
      today.getMonth() + offset,
      1,
    );
    const daysBack =
      Math.ceil(
        (today.getTime() - targetDate.getTime()) / (1000 * 60 * 60 * 24),
      ) + 1;
    const all = await fetchWeekLogs(daysBack);
    const y = targetDate.getFullYear();
    const m = targetDate.getMonth();
    return all.filter(l => {
      const d = parseLocalDate(l.date);
      return d.getFullYear() === y && d.getMonth() === m;
    });
  }

  async function navigateMonth(delta: number) {
    const next = monthOffset + delta;
    if (next > 0) return;
    setMonthOffset(next);
    setCalLoading(true);
    try {
      setMonthLogs(await fetchLogsForMonth(next));
    } catch (err) {
      console.error(err);
    } finally {
      setCalLoading(false);
    }
  }

  // Load the week/month logs once on mount. `loadData` only updates state inside
  // async callbacks, so this is a fetch-on-mount, not a synchronous render loop.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData();
    // Open directly to Month when linked from the Log screen's guide.
    if (
      typeof window !== "undefined" &&
      new URLSearchParams(window.location.search).get("view") === "month"
    ) {
      setRange("month");
    }
  }, []);

  const todayStr = localDateStr();
  const todayLog = weekLogs.find(l => l.date.startsWith(todayStr));

  const visibleLogs =
    range === "today"
      ? todayLog
        ? [todayLog]
        : []
      : range === "week"
        ? weekLogs
        : monthLogs;

  function formatDate(dateStr: string): string {
    const date = parseLocalDate(dateStr);
    return `${days[date.getDay()]} ${date.getMonth() + 1}/${date.getDate()}`;
  }

  const avgCals = visibleLogs.length
    ? Math.round(
        visibleLogs.reduce((a, l) => a + (l.cal_low + l.cal_high) / 2, 0) /
          visibleLogs.length,
      )
    : 0;

  const totalProtein = visibleLogs.reduce((a, l) => a + l.protein_g, 0);
  const totalCarbs = visibleLogs.reduce((a, l) => a + l.carbs_g, 0);
  const totalFat = visibleLogs.reduce((a, l) => a + l.fat_g, 0);
  const totalFiber = visibleLogs.reduce((a, l) => a + l.fiber_g, 0);

  const n = visibleLogs.length || 1;
  const avgProtein = Math.round(totalProtein / n);
  const avgCarbs = Math.round(totalCarbs / n);
  const avgFat = Math.round(totalFat / n);
  const avgFiber = Math.round(totalFiber / n);

  const s = makeStyles(colors);

  if (loading) {
    return (
      <AppChrome>
        <div style={s.centered}>
          <Spinner size={32} color={colors.textMuted} />
        </div>
      </AppChrome>
    );
  }

  return (
    <AppChrome>
      <div style={s.content}>
        {/* Range toggle */}
        <div style={s.toggleRow}>
          {(["today", "week", "month"] as TimeRange[]).map(r => (
            <button
              key={r}
              style={{
                ...s.toggleBtn,
                ...(range === r ? s.toggleBtnActive : {}),
              }}
              onClick={() => setRange(r)}
            >
              <span
                style={{
                  ...s.toggleText,
                  ...(range === r ? s.toggleTextActive : {}),
                }}
              >
                {r.charAt(0).toUpperCase() + r.slice(1)}
              </span>
            </button>
          ))}
        </div>

        {/* Daily calorie goal (read-only — edit in drawer) */}
        <div style={s.goalChip}>
          <span style={s.goalChipLabel}>Daily goal</span>
          <span style={s.goalChipValue}>{target.toLocaleString()} kcal</span>
        </div>

        {range === "today" && <DateTimeHeader />}

        {visibleLogs.length === 0 && range !== "month" ? (
          <div style={s.empty}>
            <div style={s.emptyIcon}>
              <SaladIcon size={52} />
            </div>
            <div style={s.emptyTitle}>No logs yet</div>
            <div style={s.emptySubtitle}>
              Head to the Log tab and dump what you ate.
            </div>
          </div>
        ) : (
          <>
            {/* Summary cards */}
            {range === "today" ? (
              <>
                <SummaryCard
                  label="Calories"
                  value={
                    todayLog ? `${todayLog.cal_low}–${todayLog.cal_high}` : "0"
                  }
                  unit="kcal today"
                  color={colors.calText}
                  colors={colors}
                  hero
                />
                <div style={s.summaryGrid}>
                  <SummaryCard
                    label="Protein"
                    value={`${totalProtein}g`}
                    unit="today"
                    color={colors.proteinText}
                    colors={colors}
                  />
                  <SummaryCard
                    label="Carbs"
                    value={`${totalCarbs}g`}
                    unit="today"
                    color={colors.carbsText}
                    colors={colors}
                  />
                  <SummaryCard
                    label="Fat"
                    value={`${totalFat}g`}
                    unit="today"
                    color={colors.fatText}
                    colors={colors}
                  />
                  <SummaryCard
                    label="Fiber"
                    value={`${totalFiber}g`}
                    unit="today"
                    color={colors.fiberText}
                    colors={colors}
                  />
                </div>
              </>
            ) : (
              <div style={s.summaryGrid}>
                <SummaryCard
                  label="Avg Calories"
                  value={String(avgCals)}
                  unit="kcal"
                  color={colors.calText}
                  colors={colors}
                />
                <SummaryCard
                  label="Avg Protein"
                  value={`${avgProtein}g`}
                  unit="avg."
                  color={colors.proteinText}
                  colors={colors}
                />
                <SummaryCard
                  label="Avg Carbs"
                  value={`${avgCarbs}g`}
                  unit="avg."
                  color={colors.carbsText}
                  colors={colors}
                />
                <SummaryCard
                  label="Avg Fat"
                  value={`${avgFat}g`}
                  unit="avg."
                  color={colors.fatText}
                  colors={colors}
                />
                <SummaryCard
                  label="Avg Fiber"
                  value={`${avgFiber}g`}
                  unit="avg."
                  color={colors.fiberText}
                  colors={colors}
                />
              </div>
            )}

            {/* Today: progress + macros */}
            {range === "today" && todayLog && (
              <div style={s.card}>
                <div style={s.cardLabel}>PROGRESS TO GOAL</div>
                <div style={s.progressTrack}>
                  <div
                    style={{
                      ...s.progressFill,
                      width: `${Math.min((todayLog.cal_high / target) * 100, 100)}%`,
                      backgroundColor:
                        todayLog.cal_high > target
                          ? colors.error
                          : colors.calText,
                    }}
                  />
                </div>
                <div style={s.progressLabels}>
                  <span style={s.progressSide}>
                    {todayLog.cal_low} kcal low
                  </span>
                  <span style={s.progressMid}>{target} kcal goal</span>
                  <span style={s.progressSide}>
                    {todayLog.cal_high} kcal high
                  </span>
                </div>

                <div style={{ ...s.cardLabel, marginTop: 16 }}>MACROS</div>
                <MacroBar
                  label="Protein"
                  value={todayLog.protein_g}
                  max={200}
                  color={colors.proteinText}
                  bg={colors.proteinBg}
                  colors={colors}
                />
                <MacroBar
                  label="Carbs"
                  value={todayLog.carbs_g}
                  max={300}
                  color={colors.carbsText}
                  bg={colors.carbsBg}
                  colors={colors}
                />
                <MacroBar
                  label="Fat"
                  value={todayLog.fat_g}
                  max={100}
                  color={colors.fatText}
                  bg={colors.fatBg}
                  colors={colors}
                />
                <MacroBar
                  label="Fiber"
                  value={todayLog.fiber_g}
                  max={50}
                  color={colors.fiberText}
                  bg={colors.fiberBg}
                  colors={colors}
                />
              </div>
            )}

            {range === "today" && todayLog && (
              <button
                style={s.viewDayBtn}
                onClick={() => navigateToDay(todayLog.date)}
              >
                View &amp; Edit Today&apos;s Meals →
              </button>
            )}

            {/* Week bar chart */}
            {range === "week" && (
              <div style={s.card}>
                <div style={s.cardLabel}>DAILY CALORIES</div>
                <div style={s.chart}>
                  {Array.from({ length: 7 }).map((_, i) => {
                    const date = new Date();
                    date.setDate(date.getDate() - (6 - i));
                    const dateStr = localDateStr(date);
                    const entry = weekLogs.find(l =>
                      l.date.startsWith(dateStr),
                    );
                    const heightPct = entry
                      ? entry.cal_high /
                        Math.max(...weekLogs.map(l => l.cal_high), target)
                      : 0;
                    const overTarget = entry ? entry.cal_high > target : false;
                    const dayLabel = `${days[date.getDay()]} ${date.getMonth() + 1}/${date.getDate()}`;

                    return (
                      <div key={i} style={s.barCol}>
                        <div style={s.barValue}>
                          {entry ? entry.cal_high : ""}
                        </div>
                        <div style={s.barTrack}>
                          <div style={{ flex: 1 - heightPct }} />
                          <div
                            style={{
                              ...s.barFill,
                              flex: heightPct || 0.02,
                              backgroundColor: !entry
                                ? colors.barEmpty
                                : overTarget
                                  ? colors.barOver
                                  : colors.barNormal,
                            }}
                          />
                        </div>
                        <div style={s.barLabel}>{dayLabel}</div>
                      </div>
                    );
                  })}
                </div>
                <div style={s.chartTargetNote}>
                  Red bars exceed your {target} kcal goal
                </div>
              </div>
            )}

            {/* Month calendar */}
            {range === "month" && (
              <div style={s.card}>
                <div style={s.calNavRow}>
                  <button style={s.calNavBtn} onClick={() => navigateMonth(-1)}>
                    <span style={s.calNavArrow}>‹</span>
                  </button>
                  <span style={s.calNavTitle}>
                    {calDisplayDate.toLocaleString("default", {
                      month: "long",
                      year: "numeric",
                    })}
                  </span>
                  {monthOffset < 0 ? (
                    <button
                      style={s.calNavBtn}
                      onClick={() => navigateMonth(1)}
                    >
                      <span style={s.calNavArrow}>›</span>
                    </button>
                  ) : (
                    <div style={s.calNavBtn} />
                  )}
                </div>
                {calLoading ? (
                  <div style={{ padding: "40px 0", textAlign: "center" }}>
                    <Spinner size={20} color={colors.textMuted} />
                  </div>
                ) : (
                  <CalendarGrid
                    logs={monthLogs}
                    target={target}
                    colors={colors}
                    year={calYear}
                    month={calMonth}
                    onDayPress={navigateToDay}
                  />
                )}
              </div>
            )}

            {/* Day by day list */}
            {range !== "today" && (
              <>
                <div style={s.sectionLabel}>DAY BY DAY</div>
                {visibleLogs.map((entry, i) => (
                  <button
                    key={i}
                    style={s.dayCard}
                    onClick={() => navigateToDay(entry.date)}
                  >
                    <div style={s.dayHeader}>
                      <span style={s.dayDate}>{formatDate(entry.date)}</span>
                      <span
                        style={{
                          ...s.dayCals,
                          ...(entry.cal_high > target ? s.dayCalsOver : {}),
                        }}
                      >
                        {entry.cal_low}–{entry.cal_high} kcal
                      </span>
                    </div>
                    <div style={s.macroRow}>
                      <span
                        style={{
                          ...s.pill,
                          backgroundColor: colors.proteinBg,
                          color: colors.proteinText,
                        }}
                      >
                        P {entry.protein_g}g
                      </span>
                      <span
                        style={{
                          ...s.pill,
                          backgroundColor: colors.carbsBg,
                          color: colors.carbsText,
                        }}
                      >
                        Cb {entry.carbs_g}g
                      </span>
                      <span
                        style={{
                          ...s.pill,
                          backgroundColor: colors.fatBg,
                          color: colors.fatText,
                        }}
                      >
                        F {entry.fat_g}g
                      </span>
                      <span
                        style={{
                          ...s.pill,
                          backgroundColor: colors.fiberBg,
                          color: colors.fiberText,
                        }}
                      >
                        Fi {entry.fiber_g}g
                      </span>
                    </div>
                  </button>
                ))}
              </>
            )}
          </>
        )}
      </div>
    </AppChrome>
  );
}

function SummaryCard({
  label,
  value,
  unit,
  color,
  colors,
  hero = false,
}: {
  label: string;
  value: string;
  unit: string;
  color: string;
  colors: Colors;
  hero?: boolean;
}) {
  const s = makeStyles(colors);
  return (
    <div style={{ ...s.summaryCard, ...(hero ? s.summaryCardHero : {}) }}>
      <div style={s.summaryCellLeft}>
        <span
          style={{
            ...s.summaryCellLabel,
            ...(hero ? s.summaryCellLabelHero : {}),
          }}
        >
          {label}
        </span>
        <span style={s.summaryCellUnit}>{unit}</span>
      </div>
      <span
        style={{
          ...s.summaryCellValue,
          color,
          ...(hero ? s.summaryCellValueHero : {}),
        }}
      >
        {value}
      </span>
    </div>
  );
}

function MacroBar({
  label,
  value,
  max,
  color,
  bg,
  colors,
}: {
  label: string;
  value: number;
  max: number;
  color: string;
  bg: string;
  colors: Colors;
}) {
  const pct = Math.min((value / max) * 100, 100);
  const s = makeStyles(colors);
  return (
    <div style={s.macroBarRow}>
      <span style={s.macroBarLabel}>{label}</span>
      <div style={{ ...s.macroBarTrack, backgroundColor: bg }}>
        <div
          style={{
            ...s.macroBarFill,
            width: `${pct}%`,
            backgroundColor: color,
          }}
        />
      </div>
      <span style={{ ...s.macroBarValue, color }}>{value}g</span>
    </div>
  );
}

function CalendarGrid({
  logs,
  target,
  colors,
  year,
  month,
  onDayPress,
}: {
  logs: DailyLog[];
  target: number;
  colors: Colors;
  year: number;
  month: number;
  onDayPress: (date: string) => void;
}) {
  const s = makeStyles(colors);
  const todayStr = localDateStr();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay();

  const logMap: Record<string, DailyLog> = {};
  logs.forEach(l => {
    logMap[l.date.split("T")[0]] = l;
  });

  const raw: (number | null)[] = [
    ...Array(firstDayOfWeek).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  const remainder = raw.length % 7;
  const cells =
    remainder === 0 ? raw : [...raw, ...Array(7 - remainder).fill(null)];

  const weeks: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

  const dayHeaders = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

  function renderCell(day: number | null, weekIdx: number, dayIdx: number) {
    if (!day) return <div key={`e-${weekIdx}-${dayIdx}`} style={s.calCell} />;

    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const entry = logMap[dateStr];
    const isToday = dateStr === todayStr;
    const overTarget = entry && entry.cal_high > target;
    // A day is editable when it falls inside the 7-day window (whether or not it
    // already has a log) — those get a pen affordance.
    const editableDay = isWithinSevenDays(dateStr);
    const editable = !entry && editableDay;
    const avgCal = entry ? Math.round((entry.cal_low + entry.cal_high) / 2) : 0;
    const clickable = !!entry || editable;

    return (
      <button
        key={dateStr}
        disabled={!clickable}
        onClick={() => {
          if (entry) onDayPress(entry.date);
          else if (editable) onDayPress(dateStr);
        }}
        style={{
          ...s.calCell,
          ...s.calCellFilled,
          position: "relative",
          cursor: clickable ? "pointer" : "default",
          ...(entry && !overTarget ? { backgroundColor: colors.calBg } : {}),
          ...(overTarget ? { backgroundColor: colors.errorBg } : {}),
          ...(isToday ? s.calCellToday : {}),
          ...(editable ? s.calCellEditable : {}),
        }}
      >
        {editableDay && (
          <span style={s.calPen}>
            <PenIcon size={14} color={colors.textMuted} />
          </span>
        )}
        <span style={{ ...s.calDayNum, ...(isToday ? s.calDayNumToday : {}) }}>
          {day}
        </span>
        <span
          style={{
            ...s.calCals,
            ...(entry ? { color: colors.calText, fontWeight: 500 } : {}),
          }}
        >
          {entry ? avgCal : "—"}
        </span>
      </button>
    );
  }

  return (
    <div>
      <div style={s.calHeaderRow}>
        {dayHeaders.map(d => (
          <span key={d} style={s.calHeaderCell}>
            {d}
          </span>
        ))}
      </div>
      {weeks.map((week, weekIdx) => (
        <div key={weekIdx} style={s.calWeekRow}>
          {week.map((day, dayIdx) => renderCell(day, weekIdx, dayIdx))}
        </div>
      ))}
    </div>
  );
}

function makeStyles(colors: Colors): Record<string, CSSProperties> {
  return {
    content: {
      padding: 16,
      display: "flex",
      flexDirection: "column",
      gap: 12,
      paddingBottom: 32,
    },
    centered: {
      height: "100%",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.bg,
    },

    toggleRow: {
      display: "flex",
      flexDirection: "row",
      backgroundColor: colors.surfaceAlt,
      borderRadius: 16,
      padding: 3,
      gap: 3,
    },
    toggleBtn: {
      flex: 1,
      padding: "8px 0",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 12,
      border: "none",
      backgroundColor: "transparent",
      cursor: "pointer",
    },
    toggleBtnActive: {
      backgroundColor: colors.surface,
      boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
    },
    toggleText: { fontSize: 13, color: colors.textSecondary, fontWeight: 500 },
    toggleTextActive: { color: colors.textPrimary },

    goalChip: {
      alignSelf: "flex-end",
      display: "flex",
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      backgroundColor: colors.surfaceAlt,
      border: `0.5px solid ${colors.border}`,
      borderRadius: 99,
      padding: "6px 12px",
    },
    goalChipLabel: { fontSize: 12, color: colors.textSecondary },
    goalChipValue: { fontSize: 12, fontWeight: 600, color: colors.calText },

    empty: {
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      paddingTop: 60,
    },
    emptyIcon: { fontSize: 48 },
    emptyTitle: { fontSize: 18, fontWeight: 500, color: colors.textPrimary },
    emptySubtitle: {
      fontSize: 14,
      color: colors.textSecondary,
      textAlign: "center",
    },

    summaryGrid: {
      display: "flex",
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
    },
    summaryCard: {
      width: "47.5%",
      backgroundColor: colors.surface,
      borderRadius: 20,
      padding: 16,
      border: `0.5px solid ${colors.border}`,
      boxShadow:
        "0 1px 2px rgba(16,24,40,0.04), 0 6px 16px rgba(16,24,40,0.05)",
      display: "flex",
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    summaryCardHero: { width: "100%", padding: "20px 18px" },
    summaryCellLeft: { display: "flex", flexDirection: "column", gap: 3 },
    summaryCellLabel: { fontSize: 11, color: colors.textSecondary },
    summaryCellLabelHero: {
      fontSize: 14,
      fontWeight: 500,
      color: colors.textSecondary,
    },
    summaryCellValue: { fontSize: 22, fontWeight: 500 },
    summaryCellValueHero: {
      fontSize: 34,
      fontWeight: 600,
      letterSpacing: -0.5,
    },
    summaryCellUnit: { fontSize: 11, color: colors.textMuted },

    card: {
      backgroundColor: colors.surface,
      borderRadius: 20,
      padding: 16,
      border: `0.5px solid ${colors.border}`,
      boxShadow:
        "0 1px 2px rgba(16,24,40,0.04), 0 8px 20px rgba(16,24,40,0.06)",
    },
    cardLabel: {
      fontSize: 11,
      fontWeight: 600,
      letterSpacing: 0.8,
      color: colors.textMuted,
      marginBottom: 10,
    },

    progressTrack: {
      height: 12,
      backgroundColor: colors.border,
      borderRadius: 99,
      overflow: "hidden",
    },
    progressFill: { height: "100%", borderRadius: 99 },
    progressLabels: {
      display: "flex",
      flexDirection: "row",
      justifyContent: "space-between",
      marginTop: 6,
    },
    progressSide: { fontSize: 11, color: colors.textSecondary },
    progressMid: { fontSize: 11, color: colors.textMuted },

    macroBarRow: {
      display: "flex",
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginBottom: 8,
    },
    macroBarLabel: {
      fontSize: 12,
      color: colors.textSecondary,
      width: 48,
      flexShrink: 0,
    },
    macroBarTrack: { flex: 1, height: 8, borderRadius: 99, overflow: "hidden" },
    macroBarFill: { height: "100%", borderRadius: 99 },
    macroBarValue: {
      fontSize: 12,
      fontWeight: 500,
      width: 36,
      textAlign: "right",
      flexShrink: 0,
    },

    chart: {
      display: "flex",
      flexDirection: "row",
      height: 160,
      gap: 4,
      alignItems: "flex-end",
    },
    barCol: {
      flex: 1,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      height: "100%",
      justifyContent: "flex-end",
    },
    barValue: { fontSize: 9, color: colors.textSecondary, marginBottom: 2 },
    barTrack: {
      width: "80%",
      flex: 1,
      display: "flex",
      flexDirection: "column",
    },
    barFill: { borderRadius: 4 },
    barLabel: {
      fontSize: 9,
      color: colors.textSecondary,
      marginTop: 4,
      textAlign: "center",
    },
    chartTargetNote: {
      fontSize: 11,
      color: colors.textMuted,
      marginTop: 8,
      textAlign: "center",
    },

    sectionLabel: {
      fontSize: 11,
      fontWeight: 600,
      letterSpacing: 0.8,
      color: colors.textMuted,
    },
    dayCard: {
      backgroundColor: colors.surface,
      border: `0.5px solid ${colors.border}`,
      borderRadius: 20,
      padding: 16,
      display: "flex",
      flexDirection: "column",
      gap: 8,
      cursor: "pointer",
      textAlign: "left",
      width: "100%",
      boxShadow:
        "0 1px 2px rgba(16,24,40,0.04), 0 6px 16px rgba(16,24,40,0.05)",
    },
    dayHeader: {
      display: "flex",
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    dayDate: { fontSize: 14, fontWeight: 500, color: colors.textPrimary },
    dayCals: { fontSize: 13, color: colors.calText, fontWeight: 500 },
    dayCalsOver: { color: colors.error },
    macroRow: {
      display: "flex",
      flexDirection: "row",
      gap: 6,
      flexWrap: "wrap",
    },

    pill: {
      padding: "3px 10px",
      borderRadius: 99,
      fontSize: 12,
      fontWeight: 500,
      whiteSpace: "nowrap",
    },

    calHeaderRow: { display: "flex", flexDirection: "row", marginBottom: 4 },
    calHeaderCell: {
      flex: 1,
      textAlign: "center",
      fontSize: 11,
      fontWeight: 500,
      color: colors.textMuted,
    },
    calWeekRow: { display: "flex", flexDirection: "row" },
    calCell: {
      flex: 1,
      aspectRatio: "1",
      padding: 2,
      border: "none",
      backgroundColor: "transparent",
      minWidth: 0,
    },
    calCellFilled: {
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 10,
    },
    calCellToday: { border: `1.5px solid ${colors.textPrimary}` },
    calDayNum: { fontSize: 11, fontWeight: 500, color: colors.textSecondary },
    calDayNumToday: { color: colors.textPrimary },
    calCals: { fontSize: 9, color: colors.textMuted },
    calCellEditable: { border: `0.5px dashed ${colors.borderStrong}` },
    calPen: {
      position: "absolute",
      top: 3,
      right: 4,
      display: "flex",
      lineHeight: 0,
    },

    viewDayBtn: {
      padding: 13,
      borderRadius: 16,
      border: `0.5px solid ${colors.borderStrong}`,
      backgroundColor: colors.surface,
      cursor: "pointer",
      fontSize: 13,
      color: colors.carbsText,
      fontWeight: 500,
    },

    calNavRow: {
      display: "flex",
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 12,
    },
    calNavBtn: {
      width: 32,
      height: 32,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      border: "none",
      backgroundColor: "transparent",
      cursor: "pointer",
    },
    calNavArrow: { fontSize: 24, color: colors.textPrimary, lineHeight: 1 },
    calNavTitle: { fontSize: 14, fontWeight: 600, color: colors.textPrimary },
  };
}
