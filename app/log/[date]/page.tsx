"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { useParams, useRouter } from "next/navigation";
import Spinner from "../../../components/web/Spinner";
import {
  CalendarIcon,
  SteakIcon,
} from "../../../components/web/icons/EmojiIcons";
import {
  fetchDayLog,
  proposeEdit,
  commitEdit,
  updateMeal,
  analyzeFood,
  type DailyLog,
  type MealWithId,
  type Message,
  type CalorieLog,
} from "../../../lib/client/apiClient";
import { isWithinSevenDays, parseLocalDate } from "../../../lib/client/utils";
import { hasInAppHistory } from "../../../lib/client/navHistory";
import { useTheme, type Colors } from "../../../lib/client/ThemeContext";

type Meal = MealWithId;

const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function DayDetailScreen() {
  const params = useParams<{ date: string }>();
  const date = params.date;
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const [log, setLog] = useState<DailyLog | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [input, setInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [proposed, setProposed] = useState<CalorieLog | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const canEdit = isWithinSevenDays(date);

  function handleBack() {
    if (hasInAppHistory()) router.back();
    else router.push("/");
  }

  useEffect(() => {
    loadLog();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);

  function scrollToEnd() {
    setTimeout(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
    }, 100);
  }

  async function loadLog() {
    setLoading(true);
    setLog(null);
    setNotFound(false);
    setMessages([]);
    setProposed(null);
    try {
      const data = await fetchDayLog(date);
      setLog(data);
      setNotFound(false);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "";
      if (message === "No log found for this date" || message.includes("404")) {
        setNotFound(true);
      } else {
        setNotice(message);
      }
    } finally {
      setLoading(false);
    }
  }

  async function handlePropose() {
    if (!input.trim() || chatLoading) return;
    const text = input.trim();
    setInput("");
    setChatLoading(true);
    setNotice(null);

    const newMessages: Message[] = [
      ...messages,
      { role: "user", content: text },
    ];
    setMessages(newMessages);

    try {
      if (notFound) {
        await analyzeFood(newMessages, date);
        setNotFound(false);
        await loadLog();
      } else {
        const result = await proposeEdit(date, newMessages);
        setProposed(result);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      if (message === "RATE_LIMIT_EXCEEDED") {
        setNotice(
          "Daily limit reached — you've used all 20 of your free analyses for today. Create an account to get unlimited logging.",
        );
      } else if (message === "DATE_OUT_OF_RANGE") {
        setNotice(
          "Can't edit this day — you can only log food for the past 7 days.",
        );
      } else {
        setNotice(message);
      }
    } finally {
      setChatLoading(false);
      scrollToEnd();
    }
  }

  async function handleConfirm() {
    if (!proposed) return;
    try {
      await commitEdit(date, proposed);
      setProposed(null);
      setMessages([]);
      await loadLog();
      setNotice("Saved! Your log has been updated.");
    } catch (err: unknown) {
      setNotice(err instanceof Error ? err.message : "Unknown error");
    }
  }

  function formatDate(dateStr: string): string {
    const d = parseLocalDate(dateStr);
    return `${days[d.getDay()]} ${d.getMonth() + 1}/${d.getDate()}`;
  }

  const s = makeStyles(colors, isDark);

  if (loading) {
    return (
      <div style={s.centered}>
        <Spinner size={32} color={colors.textMuted} />
      </div>
    );
  }

  return (
    <div style={s.root}>
      <div ref={scrollRef} style={s.scroll}>
        <div style={s.content}>
          <button style={s.backBtn} onClick={handleBack}>
            ← Back
          </button>

          <h1 style={s.dateTitle}>{formatDate(date)}</h1>

          {notice && (
            <div style={s.notice}>
              <span style={s.noticeText}>
                {notice}
                {notice.includes("unlimited logging") && (
                  <span style={{ marginLeft: 5 }}>
                    <SteakIcon size={14} />
                  </span>
                )}
              </span>
              <button style={s.noticeClose} onClick={() => setNotice(null)}>
                ✕
              </button>
            </div>
          )}

          {!canEdit && (
            <div style={s.readOnlyBanner}>
              <span style={s.readOnlyText}>
                <CalendarIcon size={15} />
                <span>
                  This log is older than 7 days and can&apos;t be edited
                </span>
              </span>
            </div>
          )}

          {notFound && canEdit && (
            <div style={s.emptyDay}>
              <div style={s.emptyDayText}>No log for this day yet.</div>
              <div style={s.emptyDaySubtext}>
                Use the chat below to add what you ate.
              </div>
            </div>
          )}

          {log && (
            <>
              <div style={s.totalsRow}>
                <TotalCell
                  label="Calories"
                  value={`${log.cal_low}–${log.cal_high}`}
                  color={colors.calText}
                  colors={colors}
                />
                <TotalCell
                  label="Protein"
                  value={`${log.protein_g}g`}
                  color={colors.proteinText}
                  colors={colors}
                />
                <TotalCell
                  label="Carbs"
                  value={`${log.carbs_g}g`}
                  color={colors.carbsText}
                  colors={colors}
                />
                <TotalCell
                  label="Fat"
                  value={`${log.fat_g}g`}
                  color={colors.fatText}
                  colors={colors}
                />
                <TotalCell
                  label="Fiber"
                  value={`${log.fiber_g}g`}
                  color={colors.fiberText}
                  colors={colors}
                />
              </div>

              <div style={s.sectionLabel}>CURRENT MEALS</div>
              {log.meals.map((meal, i) => (
                <MealCard
                  key={i}
                  meal={meal}
                  colors={colors}
                  editable={canEdit}
                  onSave={async updates => {
                    await updateMeal(date, meal.id, updates);
                    await loadLog();
                  }}
                />
              ))}
            </>
          )}

          {proposed && (
            <>
              <div style={s.sectionLabel}>PROPOSED CHANGES</div>
              <div style={s.proposedCard}>
                <div style={s.proposedIntro}>{proposed.intro}</div>

                {proposed.meals.map((meal, i) => (
                  <div key={i} style={s.proposedMeal}>
                    <div style={s.proposedMealName}>{meal.meal}</div>
                    <div style={s.proposedMealItems}>
                      {meal.items.join(", ")}
                    </div>
                    <div style={s.pillRow}>
                      <span
                        style={{
                          ...s.pill,
                          backgroundColor: colors.calBg,
                          color: colors.calText,
                        }}
                      >
                        C {meal.cal_low}–{meal.cal_high} kcal
                      </span>
                      <span
                        style={{
                          ...s.pill,
                          backgroundColor: colors.proteinBg,
                          color: colors.proteinText,
                        }}
                      >
                        P {meal.protein_g}g
                      </span>
                      <span
                        style={{
                          ...s.pill,
                          backgroundColor: colors.carbsBg,
                          color: colors.carbsText,
                        }}
                      >
                        Cb {meal.carbs_g}g
                      </span>
                      <span
                        style={{
                          ...s.pill,
                          backgroundColor: colors.fatBg,
                          color: colors.fatText,
                        }}
                      >
                        F {meal.fat_g}g
                      </span>
                      <span
                        style={{
                          ...s.pill,
                          backgroundColor: colors.fiberBg,
                          color: colors.fiberText,
                        }}
                      >
                        Fi {meal.fiber_g}g
                      </span>
                    </div>
                    {meal.assumption && (
                      <div style={s.assumption}>Assumed: {meal.assumption}</div>
                    )}
                  </div>
                ))}

                <div style={s.proposedTotals}>
                  <div style={s.proposedTotalsLabel}>New day total:</div>
                  <div style={s.proposedTotalsValue}>
                    {proposed.totals.cal_low}–{proposed.totals.cal_high} kcal ·
                    P{proposed.totals.protein_g}g · C{proposed.totals.carbs_g}g
                    · F{proposed.totals.fat_g}g · Fi{proposed.totals.fiber_g}g
                  </div>
                </div>

                {proposed.closing && (
                  <div style={s.proposedClosing}>{proposed.closing}</div>
                )}

                <div style={s.confirmRow}>
                  <button style={s.cancelBtn} onClick={() => setProposed(null)}>
                    Cancel
                  </button>
                  <button style={s.confirmBtn} onClick={handleConfirm}>
                    Confirm &amp; Save
                  </button>
                </div>
              </div>
            </>
          )}

          {messages.length > 0 && (
            <>
              <div style={s.sectionLabel}>EDIT HISTORY</div>
              {messages.map((m, i) => (
                <div
                  key={i}
                  style={m.role === "user" ? s.userBubble : s.assistantBubble}
                >
                  <span
                    style={m.role === "user" ? s.userText : s.assistantText}
                  >
                    {m.content}
                  </span>
                </div>
              ))}
            </>
          )}

          {chatLoading && (
            <div style={s.assistantBubble}>
              <Spinner size={18} color={colors.textMuted} />
            </div>
          )}
        </div>
      </div>

      {canEdit && (
        <div style={s.inputArea}>
          <div style={s.inputHint}>
            Tell the AI what to change — &quot;add ramen for lunch&quot;,
            &quot;remove the croissant&quot;, etc.
          </div>
          <div style={s.inputRow}>
            <textarea
              style={s.textInput}
              placeholder="Edit this day's log..."
              value={input}
              onChange={e => setInput(e.target.value)}
              rows={1}
            />
            <button
              style={{
                ...s.sendBtn,
                ...(!input.trim() || chatLoading ? s.sendBtnDisabled : {}),
              }}
              onClick={handlePropose}
              disabled={!input.trim() || chatLoading}
            >
              Go
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function MealCard({
  meal,
  colors,
  editable = true,
  onSave,
}: {
  meal: Meal;
  colors: Colors;
  editable?: boolean;
  onSave: (updates: Partial<Meal>) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [calLow, setCalLow] = useState(String(meal.cal_low));
  const [calHigh, setCalHigh] = useState(String(meal.cal_high));
  const [protein, setProtein] = useState(String(meal.protein_g));
  const [carbs, setCarbs] = useState(String(meal.carbs_g));
  const [fat, setFat] = useState(String(meal.fat_g));
  const [fiber, setFiber] = useState(String(meal.fiber_g));
  const [items, setItems] = useState(meal.items.join(", "));
  const [showAssumption, setShowAssumption] = useState(false);
  const s = makeStyles(colors);

  async function handleSave() {
    setSaving(true);
    await onSave({
      items: items
        .split(",")
        .map(x => x.trim())
        .filter(Boolean),
      cal_low: parseInt(calLow),
      cal_high: parseInt(calHigh),
      protein_g: parseInt(protein),
      carbs_g: parseInt(carbs),
      fat_g: parseInt(fat),
      fiber_g: parseInt(fiber),
    });
    setSaving(false);
    setEditing(false);
  }

  return (
    <div style={s.mealCard}>
      <div style={s.mealHeader}>
        <span style={s.mealName}>{meal.meal}</span>
        {editable && (
          <button style={s.editText} onClick={() => setEditing(!editing)}>
            {editing ? "Cancel" : "Edit"}
          </button>
        )}
      </div>

      {editing ? (
        <div style={s.editForm}>
          <label style={s.editLabel}>Items (comma separated)</label>
          <textarea
            style={s.editInput}
            value={items}
            onChange={e => setItems(e.target.value)}
            rows={2}
          />
          <div style={s.editRow}>
            <EditField
              label="Cal Low"
              value={calLow}
              onChange={setCalLow}
              colors={colors}
            />
            <EditField
              label="Cal High"
              value={calHigh}
              onChange={setCalHigh}
              colors={colors}
            />
          </div>
          <div style={s.editRow}>
            <EditField
              label="Protein (g)"
              value={protein}
              onChange={setProtein}
              colors={colors}
            />
            <EditField
              label="Carbs (g)"
              value={carbs}
              onChange={setCarbs}
              colors={colors}
            />
            <EditField
              label="Fat (g)"
              value={fat}
              onChange={setFat}
              colors={colors}
            />
            <EditField
              label="Fiber (g)"
              value={fiber}
              onChange={setFiber}
              colors={colors}
            />
          </div>
          <button
            style={{ ...s.saveBtn, ...(saving ? { opacity: 0.5 } : {}) }}
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      ) : (
        <>
          <div style={s.mealItems}>{meal.items.join(", ")}</div>
          <div style={s.pillRow}>
            <span
              style={{
                ...s.pill,
                backgroundColor: colors.calBg,
                color: colors.calText,
              }}
            >
              C {meal.cal_low}–{meal.cal_high} kcal
            </span>
            <span
              style={{
                ...s.pill,
                backgroundColor: colors.proteinBg,
                color: colors.proteinText,
              }}
            >
              P {meal.protein_g}g
            </span>
            <span
              style={{
                ...s.pill,
                backgroundColor: colors.carbsBg,
                color: colors.carbsText,
              }}
            >
              Cb {meal.carbs_g}g
            </span>
            <span
              style={{
                ...s.pill,
                backgroundColor: colors.fatBg,
                color: colors.fatText,
              }}
            >
              F {meal.fat_g}g
            </span>
            <span
              style={{
                ...s.pill,
                backgroundColor: colors.fiberBg,
                color: colors.fiberText,
              }}
            >
              Fi {meal.fiber_g}g
            </span>
          </div>
          {meal.assumption && (
            <div>
              <button
                style={s.assumptionToggle}
                onClick={() => setShowAssumption(!showAssumption)}
              >
                {showAssumption ? "▲ Hide assumptions" : "▼ View assumptions"}
              </button>
              {showAssumption && (
                <div style={s.assumption}>{meal.assumption}</div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function EditField({
  label,
  value,
  onChange,
  colors,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  colors: Colors;
}) {
  const s = makeStyles(colors);
  return (
    <div style={s.editField}>
      <label style={s.editLabel}>{label}</label>
      <input
        style={s.editInputSmall}
        value={value}
        onChange={e => onChange(e.target.value)}
        inputMode="numeric"
      />
    </div>
  );
}

function TotalCell({
  label,
  value,
  color,
  colors,
}: {
  label: string;
  value: string;
  color: string;
  colors: Colors;
}) {
  const s = makeStyles(colors);
  return (
    <div style={s.totalCell}>
      <div style={s.totalLabel}>{label}</div>
      <div style={{ ...s.totalValue, color }}>{value}</div>
    </div>
  );
}

function makeStyles(
  colors: Colors,
  isDark = false,
): Record<string, CSSProperties> {
  const proposedBg = isDark ? colors.surfaceAlt : colors.carbsBg;
  const proposedBorder = isDark ? colors.borderStrong : `${colors.carbsText}44`;
  const proposedDivider = isDark ? colors.border : `${colors.carbsText}33`;
  return {
    root: {
      height: "100%",
      display: "flex",
      flexDirection: "column",
      backgroundColor: colors.bg,
    },
    scroll: { flex: 1, overflowY: "auto" },
    content: {
      padding: 16,
      display: "flex",
      flexDirection: "column",
      gap: 12,
      paddingBottom: 24,
    },
    centered: {
      height: "100%",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.bg,
    },

    backBtn: {
      alignSelf: "flex-start",
      background: "none",
      border: "none",
      cursor: "pointer",
      fontSize: 14,
      color: colors.carbsText,
      padding: 0,
    },
    dateTitle: {
      fontSize: 26,
      fontWeight: 700,
      color: colors.textPrimary,
      letterSpacing: -0.3,
    },

    notice: {
      backgroundColor: colors.surfaceAlt,
      borderRadius: 14,
      padding: 12,
      border: `0.5px solid ${colors.border}`,
      display: "flex",
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 8,
    },
    noticeText: { fontSize: 13, color: colors.textSecondary },
    noticeClose: {
      background: "none",
      border: "none",
      cursor: "pointer",
      color: colors.textMuted,
      fontSize: 13,
      flexShrink: 0,
    },

    totalsRow: { display: "flex", flexDirection: "row", gap: 8 },
    totalCell: {
      flex: 1,
      backgroundColor: colors.surfaceAlt,
      borderRadius: 16,
      padding: 10,
      border: `0.5px solid ${colors.border}`,
      minWidth: 0,
    },
    totalLabel: { fontSize: 10, color: colors.textMuted, marginBottom: 2 },
    totalValue: { fontSize: 15, fontWeight: 600 },

    sectionLabel: {
      fontSize: 11,
      fontWeight: 600,
      letterSpacing: 0.8,
      color: colors.textMuted,
    },

    mealCard: {
      backgroundColor: colors.surface,
      border: `0.5px solid ${colors.border}`,
      borderRadius: 20,
      padding: 16,
      display: "flex",
      flexDirection: "column",
      gap: 8,
      boxShadow:
        "0 1px 2px rgba(16,24,40,0.04), 0 8px 20px rgba(16,24,40,0.06)",
    },
    mealHeader: {
      display: "flex",
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    mealName: { fontSize: 15, fontWeight: 600, color: colors.textPrimary },
    editText: {
      fontSize: 13,
      color: colors.carbsText,
      fontWeight: 500,
      background: "none",
      border: "none",
      cursor: "pointer",
    },
    mealItems: { fontSize: 13, color: colors.textSecondary, lineHeight: 1.5 },

    proposedCard: {
      backgroundColor: proposedBg,
      border: `0.5px solid ${proposedBorder}`,
      borderRadius: 20,
      padding: 14,
      display: "flex",
      flexDirection: "column",
      gap: 10,
    },
    proposedIntro: { fontSize: 14, color: colors.textPrimary, lineHeight: 1.5 },
    proposedMeal: {
      display: "flex",
      flexDirection: "column",
      gap: 6,
      paddingBottom: 10,
      borderBottom: `0.5px solid ${proposedDivider}`,
    },
    proposedMealName: {
      fontSize: 14,
      fontWeight: 600,
      color: colors.textPrimary,
    },
    proposedMealItems: { fontSize: 13, color: colors.textSecondary },
    proposedTotals: {
      backgroundColor: colors.surface,
      borderRadius: 14,
      padding: 10,
      display: "flex",
      flexDirection: "column",
      gap: 4,
    },
    proposedTotalsLabel: {
      fontSize: 11,
      color: colors.textMuted,
      fontWeight: 600,
    },
    proposedTotalsValue: {
      fontSize: 13,
      color: colors.textPrimary,
      fontWeight: 500,
    },
    proposedClosing: {
      fontSize: 13,
      color: colors.textSecondary,
      fontStyle: "italic",
    },

    confirmRow: { display: "flex", flexDirection: "row", gap: 8, marginTop: 4 },
    cancelBtn: {
      flex: 1,
      padding: 10,
      borderRadius: 14,
      border: `0.5px solid ${colors.borderStrong}`,
      backgroundColor: colors.surface,
      cursor: "pointer",
      fontSize: 14,
      color: colors.textSecondary,
      fontWeight: 500,
    },
    confirmBtn: {
      flex: 1,
      padding: 10,
      borderRadius: 14,
      backgroundColor: colors.primary,
      color: colors.primaryText,
      border: "none",
      cursor: "pointer",
      fontSize: 14,
      fontWeight: 600,
    },

    userBubble: {
      backgroundColor: colors.userBubbleBg,
      borderRadius: 20,
      borderBottomRightRadius: 4,
      padding: 10,
      alignSelf: "flex-end",
      maxWidth: "85%",
    },
    userText: {
      fontSize: 13,
      color: colors.textPrimary,
      whiteSpace: "pre-wrap",
    },
    assistantBubble: {
      backgroundColor: colors.surfaceAlt,
      borderRadius: 20,
      borderBottomLeftRadius: 4,
      padding: 10,
      alignSelf: "flex-start",
      maxWidth: "85%",
      border: `0.5px solid ${colors.border}`,
    },
    assistantText: { fontSize: 13, color: colors.textPrimary },

    pillRow: {
      display: "flex",
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 6,
    },
    pill: {
      padding: "4px 10px",
      borderRadius: 99,
      fontSize: 12,
      fontWeight: 500,
      whiteSpace: "nowrap",
    },
    assumption: { fontSize: 12, color: colors.textMuted, fontStyle: "italic" },
    assumptionToggle: {
      fontSize: 12,
      color: colors.carbsText,
      marginTop: 6,
      background: "none",
      border: "none",
      cursor: "pointer",
      padding: 0,
    },

    inputArea: {
      borderTop: `0.5px solid ${colors.border}`,
      padding: 14,
      display: "flex",
      flexDirection: "column",
      gap: 8,
      backgroundColor: colors.surface,
      flexShrink: 0,
    },
    inputHint: { fontSize: 12, color: colors.textMuted },
    inputRow: {
      display: "flex",
      flexDirection: "row",
      gap: 8,
      alignItems: "flex-end",
    },
    textInput: {
      flex: 1,
      border: `0.5px solid ${colors.inputBorder}`,
      borderRadius: 16,
      padding: 10,
      fontSize: 14,
      minHeight: 44,
      maxHeight: 100,
      color: colors.textPrimary,
      backgroundColor: colors.inputBg,
      resize: "none",
    },
    sendBtn: {
      backgroundColor: colors.primary,
      color: colors.primaryText,
      borderRadius: 16,
      padding: "12px 18px",
      border: "none",
      cursor: "pointer",
      fontWeight: 600,
      fontSize: 14,
    },
    sendBtnDisabled: { opacity: 0.35, cursor: "default" },

    editForm: {
      display: "flex",
      flexDirection: "column",
      gap: 10,
      marginTop: 8,
    },
    editLabel: {
      fontSize: 11,
      color: colors.textMuted,
      marginBottom: 4,
      fontWeight: 500,
    },
    editInput: {
      border: `0.5px solid ${colors.inputBorder}`,
      borderRadius: 14,
      padding: 10,
      fontSize: 14,
      color: colors.textPrimary,
      minHeight: 60,
      backgroundColor: colors.inputBg,
      resize: "none",
      width: "100%",
    },
    editInputSmall: {
      border: `0.5px solid ${colors.inputBorder}`,
      borderRadius: 14,
      padding: 8,
      fontSize: 14,
      color: colors.textPrimary,
      backgroundColor: colors.inputBg,
      width: "100%",
    },
    editRow: { display: "flex", flexDirection: "row", gap: 8 },
    editField: { flex: 1, minWidth: 0 },
    saveBtn: {
      backgroundColor: colors.primary,
      color: colors.primaryText,
      borderRadius: 14,
      padding: 10,
      border: "none",
      cursor: "pointer",
      fontSize: 14,
      fontWeight: 600,
      marginTop: 4,
    },

    readOnlyBanner: {
      backgroundColor: colors.surfaceAlt,
      borderRadius: 14,
      padding: 12,
      borderLeft: `3px solid ${colors.textMuted}`,
      border: `0.5px solid ${colors.border}`,
    },
    readOnlyText: {
      fontSize: 13,
      color: colors.textSecondary,
      display: "flex",
      alignItems: "center",
      gap: 7,
    },
    emptyDay: {
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      padding: "32px 0",
      gap: 8,
    },
    emptyDayText: { fontSize: 16, fontWeight: 500, color: colors.textPrimary },
    emptyDaySubtext: { fontSize: 13, color: colors.textSecondary },
  };
}
