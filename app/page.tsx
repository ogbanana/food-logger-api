"use client";

import { useRef, useState, useEffect, type CSSProperties } from "react";
import AppChrome from "../components/web/AppChrome";
import Spinner from "../components/web/Spinner";
import DateTimeHeader from "../components/web/DateTimeHeader";
import { SteakIcon } from "../components/web/icons/EmojiIcons";
import {
  analyzeFood,
  addMealsToDay,
  fetchUsage,
  type CalorieLog,
  type Meal,
  type Message,
  type MessageType,
} from "../lib/client/apiClient";
import { useTheme, type Colors } from "../lib/client/ThemeContext";
import { localDateStr, parseLocalDate } from "../lib/client/utils";

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** A friendly label for a logged-for date, e.g. "Yesterday (Mon 6/22)". */
function dayLabel(dateStr: string, todayStr: string): string {
  const d = parseLocalDate(dateStr);
  const t = parseLocalDate(todayStr);
  const diff = Math.round((t.getTime() - d.getTime()) / 86400000);
  const wd = `${DAY_NAMES[d.getDay()]} ${d.getMonth() + 1}/${d.getDate()}`;
  if (diff === 1) return `Yesterday (${wd})`;
  return wd;
}

const EXAMPLES = [
  "in the morning a large coffee with a splash of oat milk and a bagel with two tablespoons of cream cheese, for lunch a turkey sandwich with a small handful of chips, and a handful of almonds as an afternoon snack",
  "for breakfast two scrambled eggs with a slice of toast and a banana, a chicken caesar salad with about a cup of croutons for lunch, and a 16 oz protein shake after the gym",
  "this morning a cup of overnight oats with a handful of berries and a latte, a bowl of leftover pad thai for lunch, and two squares of dark chocolate in the evening",
  "skipped breakfast, a burrito bowl with a scoop of extra guac and a small handful of tortilla chips for lunch, and a fillet of grilled salmon with a cup of rice for dinner",
  "for breakfast a cup of greek yogurt with a quarter cup of granola and an apple, a ham and cheese sandwich for lunch, and a handful of trail mix in the afternoon",
  "morning black coffee with two slices of avocado toast topped with a fried egg, a big bowl of ramen for lunch, and a couple of cookies after dinner",
  "a smoothie with one banana and a tablespoon of peanut butter plus a granola bar in the morning, about eight pieces of sushi for lunch, and a bowl of popcorn at night",
  "two pancakes with a drizzle of syrup and three strips of bacon for breakfast, a chicken wrap for lunch, and a plate of pasta with a cup of marinara for dinner",
  "a bowl of oatmeal with a spoonful of honey and a cappuccino in the morning, a poke bowl with a cup of rice for lunch, and a handful of pretzels in the afternoon",
  "an egg and cheese on a roll with a glass of orange juice for breakfast, two slices of pizza with a side salad for lunch, and a bowl of ice cream for dessert",
];

export default function LogScreen() {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<MessageType[]>([]);
  const [history, setHistory] = useState<Message[]>([]);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [limit, setLimit] = useState(20);
  const [example, setExample] = useState(EXAMPLES[0]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { colors } = useTheme();

  useEffect(() => {
    // Randomize the placeholder example after mount (not during render) so the
    // server and client initial markup match and hydration stays clean.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setExample(EXAMPLES[Math.floor(Math.random() * EXAMPLES.length)]);
    fetchUsage()
      .then(u => {
        setRemaining(u.remaining);
        setLimit(u.limit);
      })
      .catch(() => {});
  }, []);

  function scrollToEnd() {
    setTimeout(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
    }, 100);
  }

  async function analyze() {
    if (!input.trim() || loading) return;
    const text = input.trim();
    setInput("");
    setLoading(true);
    setMessages(prev => [...prev, { type: "user", text }]);
    scrollToEnd();

    const newHistory: Message[] = [...history, { role: "user", content: text }];

    try {
      // Send the client's local date as `today` (no explicit `date`) so the
      // server can infer which day the text is for. The server runs in UTC and
      // can't know the user's "today" on its own.
      const data = await analyzeFood(newHistory, undefined, localDateStr());

      if (typeof data.remaining === "number") setRemaining(data.remaining);
      if (typeof data.limit === "number") setLimit(data.limit);

      // The text looks like it's for a different day — ask before logging, then
      // append to that day rather than overwriting it.
      if (data.needs_confirmation) {
        setMessages(prev => [
          ...prev,
          {
            type: "confirm",
            data,
            inferredDate: data.inferred_date,
            outOfRange: data.out_of_range,
          },
        ]);
        return;
      }

      setHistory([
        ...newHistory,
        {
          role: "assistant",
          content: `I've logged the following meals: ${data.meals
            .map(
              m =>
                `${m.meal}: ${m.items.join(", ")} (${m.cal_low}-${m.cal_high} kcal)`,
            )
            .join(
              ". ",
            )}. Day total so far: ${data.totals.cal_low}-${data.totals.cal_high} kcal, ${data.totals.protein_g}g protein, ${data.totals.carbs_g}g carbs, ${data.totals.fat_g}g fat, ${data.totals.fiber_g}g fiber.`,
        },
      ]);

      setMessages(prev => [...prev, { type: "result", data }]);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      if (message === "RATE_LIMIT_EXCEEDED") {
        setMessages(prev => [
          ...prev,
          {
            type: "error",
            text: `You've used all ${limit} of your free analyses for today. Create an account and upgrade to get unlimited logging.`,
          },
        ]);
      } else {
        setMessages(prev => [...prev, { type: "error", text: message }]);
      }
    } finally {
      setLoading(false);
      scrollToEnd();
    }
  }

  // Confirm logging a flagged message to a chosen day (appends, no LLM/charge).
  async function confirmLog(
    index: number,
    targetDate: string,
    label: string,
    data: CalorieLog,
  ) {
    setMessages(prev =>
      prev.map((m, i) => (i === index ? { ...m, pending: true } : m)),
    );
    scrollToEnd();
    try {
      await addMealsToDay(targetDate, data, localDateStr());
      setMessages(prev =>
        prev.map((m, i) =>
          i === index ? { ...m, pending: false, doneLabel: label } : m,
        ),
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setMessages(prev => [
        ...prev.map((m, i) => (i === index ? { ...m, pending: false } : m)),
        { type: "error", text: message },
      ]);
    } finally {
      scrollToEnd();
    }
  }

  const s = makeStyles(colors);

  return (
    <AppChrome>
      <div style={s.root}>
        <div ref={scrollRef} style={s.messages}>
          <div style={s.messagesContent}>
            <DateTimeHeader />

            <div style={s.assistantBubble}>
              <span style={s.assistantText}>
                Hey! Welcome to Food Logger — just dump everything you ate today
                in one go, no format needed.
                <br />
                <br />
                Something like{" "}
                <span style={s.italic}>&quot;{example}&quot;</span> works
                perfectly.
              </span>
            </div>

            {messages.map((msg, i) => {
              if (msg.type === "user") {
                return (
                  <div key={i} style={s.userBubble}>
                    <span style={s.userText}>{msg.text}</span>
                  </div>
                );
              }
              if (msg.type === "error") {
                return (
                  <div key={i} style={s.errorBubble}>
                    <span style={s.errorText}>
                      {msg.text}
                      {msg.text?.includes("unlimited logging") && (
                        <span style={{ marginLeft: 5 }}>
                          <SteakIcon size={15} />
                        </span>
                      )}
                    </span>
                  </div>
                );
              }
              if (msg.type === "result" && msg.data) {
                return <ResultCard key={i} data={msg.data} colors={colors} />;
              }
              if (msg.type === "confirm" && msg.data) {
                return (
                  <ConfirmCard
                    key={i}
                    msg={msg}
                    colors={colors}
                    onChoose={(targetDate, label) =>
                      confirmLog(i, targetDate, label, msg.data!)
                    }
                  />
                );
              }
              return null;
            })}

            {loading && (
              <div style={s.assistantBubble}>
                <Spinner size={18} color={colors.textMuted} />
              </div>
            )}
          </div>
        </div>

        {remaining !== null && (
          <div
            style={{
              fontSize: 12,
              color:
                remaining === 0
                  ? colors.error
                  : remaining <= 3
                    ? colors.warning
                    : colors.textMuted,
              textAlign: "center",
              padding: "6px 0",
              backgroundColor: colors.bg,
              flexShrink: 0,
            }}
          >
            {remaining} / {limit} analyses remaining today
          </div>
        )}

        <div style={s.inputArea}>
          <textarea
            style={s.textInput}
            placeholder="Tell me everything you ate today..."
            value={input}
            onChange={e => setInput(e.target.value)}
            rows={3}
          />
          <button
            style={{
              ...s.sendBtn,
              ...(!input.trim() || loading ? s.sendBtnDisabled : {}),
            }}
            onClick={analyze}
            disabled={!input.trim() || loading}
          >
            Analyze
          </button>
        </div>
      </div>
    </AppChrome>
  );
}

function ResultCard({ data, colors }: { data: CalorieLog; colors: Colors }) {
  const s = makeStyles(colors);
  return (
    <div>
      <div style={s.assistantBubble}>
        <span style={s.assistantText}>{data.intro}</span>
      </div>

      {data.meals.map((meal, i) => (
        <MealCard key={i} meal={meal} colors={colors} />
      ))}

      <div style={s.card}>
        <div style={s.cardLabel}>DAY TOTAL</div>

        <div style={{ ...s.totalHero, backgroundColor: colors.calBg }}>
          <div style={s.totalHeroLabel}>Calories</div>
          <div style={{ ...s.totalHeroValue, color: colors.calText }}>
            {data.totals.cal_low}–{data.totals.cal_high}
          </div>
          <div style={s.totalUnit}>kcal</div>
        </div>

        <div style={s.macroGrid}>
          <TotalCell label="Protein" value={`${data.totals.protein_g}g`} unit="est." bg={colors.proteinBg} color={colors.proteinText} colors={colors} />
          <TotalCell label="Carbs" value={`${data.totals.carbs_g}g`} unit="est." bg={colors.carbsBg} color={colors.carbsText} colors={colors} />
          <TotalCell label="Fat" value={`${data.totals.fat_g}g`} unit="est." bg={colors.fatBg} color={colors.fatText} colors={colors} />
          <TotalCell label="Fiber" value={`${data.totals.fiber_g}g`} unit="est." bg={colors.fiberBg} color={colors.fiberText} colors={colors} />
        </div>
      </div>

      {data.closing && (
        <div style={s.assistantBubble}>
          <span style={s.assistantText}>{data.closing}</span>
        </div>
      )}
    </div>
  );
}

function ConfirmCard({
  msg,
  colors,
  onChoose,
}: {
  msg: MessageType;
  colors: Colors;
  onChoose: (targetDate: string, label: string) => void;
}) {
  const s = makeStyles(colors);
  const data = msg.data!;
  const today = localDateStr();
  const label = msg.inferredDate ? dayLabel(msg.inferredDate, today) : "another day";
  const done = !!msg.doneLabel;

  return (
    <div style={s.confirmCard}>
      {done ? (
        <div style={s.confirmHeaderDone}>✓ Added to {msg.doneLabel}</div>
      ) : (
        <div style={s.confirmHeader}>
          This looks like it&apos;s for <strong>{label}</strong> — not today.
          Where should it go?
        </div>
      )}

      {data.meals.map((meal, i) => (
        <MealCard key={i} meal={meal} colors={colors} />
      ))}

      <div style={s.confirmTotals}>
        {data.totals.cal_low}–{data.totals.cal_high} kcal · P
        {data.totals.protein_g}g · Cb{data.totals.carbs_g}g · F
        {data.totals.fat_g}g · Fi{data.totals.fiber_g}g
      </div>

      {!done &&
        (msg.pending ? (
          <div style={s.confirmPending}>
            <Spinner size={16} color={colors.textMuted} />
          </div>
        ) : msg.outOfRange ? (
          <>
            <div style={s.confirmNote}>
              That day is more than 7 days ago, so it can&apos;t be saved there.
            </div>
            <button
              style={s.confirmBtnPrimary}
              onClick={() => onChoose(today, "Today")}
            >
              Log as today instead
            </button>
          </>
        ) : (
          <div style={s.confirmActions}>
            <button
              style={s.confirmBtnSecondary}
              onClick={() => onChoose(today, "Today")}
            >
              It&apos;s for today
            </button>
            <button
              style={s.confirmBtnPrimary}
              onClick={() => onChoose(msg.inferredDate!, label)}
            >
              Add to {label}
            </button>
          </div>
        ))}
    </div>
  );
}

function MealCard({ meal, colors }: { meal: Meal; colors: Colors }) {
  const [showAssumption, setShowAssumption] = useState(false);
  const s = makeStyles(colors);
  return (
    <div style={s.card}>
      <div style={s.cardLabel}>{meal.meal.toUpperCase()}</div>
      <div style={s.mealItems}>{meal.items.join(", ")}</div>
      <div style={s.pillRow}>
        <Pill bg={colors.calBg} text={colors.calText} label={`C ${meal.cal_low}–${meal.cal_high} kcal`} />
        <Pill bg={colors.proteinBg} text={colors.proteinText} label={`P ${meal.protein_g}g`} />
        <Pill bg={colors.carbsBg} text={colors.carbsText} label={`Cb ${meal.carbs_g}g`} />
        <Pill bg={colors.fatBg} text={colors.fatText} label={`F ${meal.fat_g}g`} />
        <Pill bg={colors.fiberBg} text={colors.fiberText} label={`Fi ${meal.fiber_g}g`} />
      </div>
      {meal.assumption && (
        <div>
          <button
            style={s.assumptionToggle}
            onClick={() => setShowAssumption(!showAssumption)}
          >
            {showAssumption ? "▲ Hide assumptions" : "▼ View assumptions"}
          </button>
          {showAssumption && <div style={s.assumption}>{meal.assumption}</div>}
        </div>
      )}
    </div>
  );
}

function TotalCell({
  label,
  value,
  unit,
  bg,
  color,
  colors,
}: {
  label: string;
  value: string;
  unit: string;
  bg: string;
  color: string;
  colors: Colors;
}) {
  const s = makeStyles(colors);
  return (
    <div style={{ ...s.totalCell, backgroundColor: bg }}>
      <div style={s.totalLabel}>{label}</div>
      <div style={{ ...s.totalValue, color }}>{value}</div>
      <div style={s.totalUnit}>{unit}</div>
    </div>
  );
}

function Pill({ bg, text, label }: { bg: string; text: string; label: string }) {
  return (
    <span
      style={{
        padding: "4px 10px",
        borderRadius: 99,
        backgroundColor: bg,
        fontSize: 12,
        fontWeight: 500,
        color: text,
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </span>
  );
}

function makeStyles(colors: Colors): Record<string, CSSProperties> {
  return {
    root: {
      height: "100%",
      display: "flex",
      flexDirection: "column",
      backgroundColor: colors.bg,
    },
    messages: { flex: 1, overflowY: "auto" },
    messagesContent: {
      padding: 16,
      display: "flex",
      flexDirection: "column",
      gap: 10,
    },

    assistantBubble: {
      backgroundColor: colors.surfaceAlt,
      borderRadius: 20,
      borderBottomLeftRadius: 4,
      padding: 13,
      alignSelf: "flex-start",
      maxWidth: "92%",
      border: `0.5px solid ${colors.border}`,
    },
    assistantText: {
      fontSize: 14,
      lineHeight: 1.55,
      color: colors.textPrimary,
    },
    italic: { fontStyle: "italic" },

    userBubble: {
      backgroundColor: colors.userBubbleBg,
      borderRadius: 20,
      borderBottomRightRadius: 4,
      padding: 13,
      alignSelf: "flex-end",
      maxWidth: "92%",
    },
    userText: {
      fontSize: 14,
      lineHeight: 1.55,
      color: colors.textPrimary,
      whiteSpace: "pre-wrap",
    },

    errorBubble: {
      backgroundColor: colors.errorBg,
      borderRadius: 16,
      padding: 12,
      border: `0.5px solid ${colors.error}44`,
    },
    errorText: {
      fontSize: 13,
      color: colors.error,
      fontFamily: "var(--font-geist-mono), monospace",
    },

    card: {
      backgroundColor: colors.surface,
      border: `0.5px solid ${colors.border}`,
      borderRadius: 20,
      padding: 16,
      marginTop: 8,
      boxShadow:
        "0 1px 2px rgba(16,24,40,0.04), 0 8px 20px rgba(16,24,40,0.06)",
    },
    cardLabel: {
      fontSize: 11,
      fontWeight: 600,
      letterSpacing: 0.8,
      color: colors.textMuted,
      marginBottom: 8,
    },
    mealItems: {
      fontSize: 13,
      color: colors.textSecondary,
      marginBottom: 10,
      lineHeight: 1.5,
    },

    pillRow: { display: "flex", flexDirection: "row", flexWrap: "wrap", gap: 6 },

    assumption: {
      fontSize: 12,
      color: colors.textMuted,
      fontStyle: "italic",
      marginTop: 8,
    },
    assumptionToggle: {
      fontSize: 12,
      color: colors.carbsText,
      marginTop: 6,
      background: "none",
      border: "none",
      cursor: "pointer",
      padding: 0,
    },

    totalHero: {
      borderRadius: 14,
      padding: 12,
      marginBottom: 8,
    },
    totalHeroLabel: { fontSize: 11, color: colors.textSecondary, marginBottom: 4 },
    totalHeroValue: { fontSize: 24, fontWeight: 600, letterSpacing: -0.5 },
    macroGrid: { display: "flex", flexDirection: "row", flexWrap: "wrap", gap: 8 },
    totalCell: {
      flexGrow: 1,
      flexBasis: "45%",
      borderRadius: 14,
      padding: 10,
    },
    totalLabel: { fontSize: 11, color: colors.textSecondary, marginBottom: 4 },
    totalValue: { fontSize: 16, fontWeight: 500 },
    totalUnit: { fontSize: 11, color: colors.textMuted, marginTop: 2 },

    inputArea: {
      borderTop: `0.5px solid ${colors.border}`,
      padding: 14,
      display: "flex",
      flexDirection: "column",
      gap: 8,
      backgroundColor: colors.surface,
      flexShrink: 0,
    },
    textInput: {
      border: `0.5px solid ${colors.inputBorder}`,
      borderRadius: 16,
      padding: 12,
      fontSize: 14,
      minHeight: 80,
      color: colors.textPrimary,
      backgroundColor: colors.inputBg,
      resize: "none",
    },
    sendBtn: {
      backgroundColor: colors.primary,
      color: colors.primaryText,
      borderRadius: 16,
      padding: 14,
      border: "none",
      cursor: "pointer",
      fontWeight: 600,
      fontSize: 14,
      boxShadow: "0 6px 16px rgba(16,24,40,0.18)",
    },
    sendBtnDisabled: { opacity: 0.35, cursor: "default", boxShadow: "none" },

    confirmCard: {
      backgroundColor: colors.surface,
      border: `0.5px solid ${colors.warning}55`,
      borderRadius: 14,
      padding: 14,
      marginTop: 8,
      display: "flex",
      flexDirection: "column",
      boxShadow:
        "0 1px 2px rgba(16,24,40,0.04), 0 8px 20px rgba(16,24,40,0.06)",
    },
    confirmHeader: {
      fontSize: 13,
      lineHeight: 1.5,
      color: colors.textPrimary,
      marginBottom: 4,
    },
    confirmHeaderDone: {
      fontSize: 13,
      fontWeight: 600,
      color: colors.proteinText,
      marginBottom: 4,
    },
    confirmTotals: {
      fontSize: 12,
      color: colors.textSecondary,
      fontWeight: 500,
      marginTop: 4,
      marginBottom: 10,
    },
    confirmNote: {
      fontSize: 12,
      color: colors.textMuted,
      marginBottom: 8,
    },
    confirmPending: { display: "flex", justifyContent: "center", padding: 6 },
    confirmActions: { display: "flex", flexDirection: "row", gap: 8 },
    confirmBtnPrimary: {
      flex: 1,
      backgroundColor: colors.primary,
      color: colors.primaryText,
      border: "none",
      borderRadius: 12,
      padding: 11,
      cursor: "pointer",
      fontSize: 13,
      fontWeight: 600,
    },
    confirmBtnSecondary: {
      flex: 1,
      backgroundColor: colors.surfaceAlt,
      color: colors.textPrimary,
      border: `0.5px solid ${colors.border}`,
      borderRadius: 12,
      padding: 11,
      cursor: "pointer",
      fontSize: 13,
      fontWeight: 500,
    },
  };
}
