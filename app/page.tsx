"use client";

import {
  useRef,
  useState,
  useEffect,
  useLayoutEffect,
  type CSSProperties,
} from "react";
import { useRouter } from "next/navigation";
import AppChrome from "../components/web/AppChrome";
import Spinner from "../components/web/Spinner";
import DateTimeHeader from "../components/web/DateTimeHeader";
import { SteakIcon } from "../components/web/icons/EmojiIcons";
import NotebookIcon from "../components/web/icons/NotebookIcon";
import {
  analyzeFood,
  addMealsToDay,
  resolveDate,
  fetchUsage,
  fetchDayLog,
  type CalorieLog,
  type DailyLog,
  type Meal,
  type Message,
  type MessageType,
} from "../lib/client/apiClient";
import { getItem, setItem } from "../lib/client/storage";
import { useTheme, type Colors } from "../lib/client/ThemeContext";
import {
  localDateStr,
  parseLocalDate,
  isWithinSevenDays,
} from "../lib/client/utils";

const RECENTS_KEY = "recentLogInputs";
const RECENTS_MAX = 8;

function loadRecents(): string[] {
  try {
    const raw = getItem(RECENTS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.slice(0, RECENTS_MAX) : [];
  } catch {
    return [];
  }
}

const CHAT_KEY = "logChat";

function loadChat(today: string): {
  messages: MessageType[];
  history: Message[];
} {
  try {
    const raw = getItem(CHAT_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    if (!parsed || parsed.date !== today) return { messages: [], history: [] };
    return {
      messages: Array.isArray(parsed.messages) ? parsed.messages : [],
      history: Array.isArray(parsed.history) ? parsed.history : [],
    };
  } catch {
    return { messages: [], history: [] };
  }
}

const PREV_DAY_GUIDE =
  "To log food for previous days, head to Dashboard → Month and tap the day. You can only update food logs up to 7 days ago.";

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

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
  const [pendingConfirm, setPendingConfirm] = useState<{
    data: CalorieLog;
    date: string;
    originalText: string;
  } | null>(null);
  const [example, setExample] = useState(EXAMPLES[0]);
  const [todayLog, setTodayLog] = useState<DailyLog | null>(null);
  const [showToday, setShowToday] = useState(false);
  const [recents, setRecents] = useState<string[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const pinnedToBottom = useRef(true);
  const { colors } = useTheme();
  const router = useRouter();

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setExample(EXAMPLES[Math.floor(Math.random() * EXAMPLES.length)]);
    setRecents(loadRecents());
    const savedChat = loadChat(localDateStr());
    if (savedChat.messages.length) setMessages(savedChat.messages);
    if (savedChat.history.length) setHistory(savedChat.history);
    inputRef.current?.focus();
    refreshToday();
    fetchUsage()
      .then(u => {
        setRemaining(u.remaining);
        setLimit(u.limit);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (messages.length === 0 && history.length === 0) return;
    setItem(
      CHAT_KEY,
      JSON.stringify({ date: localDateStr(), messages, history }),
    );
  }, [messages, history]);

  useLayoutEffect(() => {
    if (!pinnedToBottom.current) return;
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, recents, remaining, todayLog, pendingConfirm, loading]);

  function handleMessagesScroll() {
    const el = scrollRef.current;
    if (!el) return;
    pinnedToBottom.current =
      el.scrollHeight - el.scrollTop - el.clientHeight < 40;
  }

  async function refreshToday() {
    try {
      setTodayLog(await fetchDayLog(localDateStr()));
    } catch {
      setTodayLog(null);
    }
  }

  function rememberInput(text: string) {
    setRecents(prev => {
      const next = [text, ...prev.filter(t => t !== text)].slice(
        0,
        RECENTS_MAX,
      );
      setItem(RECENTS_KEY, JSON.stringify(next));
      return next;
    });
  }

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

    if (pendingConfirm) {
      await handleConfirmReply(text);
      return;
    }

    rememberInput(text);
    setLoading(true);
    setMessages(prev => [...prev, { type: "user", text }]);
    scrollToEnd();

    const newHistory: Message[] = [...history, { role: "user", content: text }];

    try {
      const data = await analyzeFood(newHistory, undefined, localDateStr());

      if (typeof data.remaining === "number") setRemaining(data.remaining);
      if (typeof data.limit === "number") setLimit(data.limit);

      if (data.is_food_log === false) {
        const reply =
          data.reply?.trim() || "Tell me what you ate and I'll log it for you.";
        setHistory([...newHistory, { role: "assistant", content: reply }]);
        setMessages(prev => [...prev, { type: "assistant", text: reply }]);
        return;
      }

      if (data.needs_confirmation && data.inferred_date) {
        setPendingConfirm({
          data,
          date: data.inferred_date,
          originalText: text,
        });
        scrollToEnd();
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
      refreshToday();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setInput(text);
      if (message === "RATE_LIMIT_EXCEEDED") {
        setMessages(prev => [
          ...prev,
          {
            type: "error",
            text: `You've used all ${limit} of your free analyses for today. Create an account and upgrade to get unlimited logging.`,
          },
        ]);
      } else {
        setMessages(prev => [
          ...prev,
          { type: "error", text: message, canRetry: true },
        ]);
      }
    } finally {
      setLoading(false);
      scrollToEnd();
    }
  }

  function pushAssistant(text: string) {
    setMessages(prev => [...prev, { type: "assistant", text }]);
    scrollToEnd();
  }

  function pushGuide() {
    setMessages(prev => [...prev, { type: "guide", text: PREV_DAY_GUIDE }]);
    scrollToEnd();
  }

  async function commitConfirm(pc: NonNullable<typeof pendingConfirm>) {
    const label = dayLabel(pc.date, localDateStr());
    if (!isWithinSevenDays(pc.date)) {
      setPendingConfirm(null);
      pushAssistant(
        `${label} is more than 7 days ago and can no longer be edited.`,
      );
      pushGuide();
      return;
    }
    setLoading(true);
    try {
      await addMealsToDay(pc.date, pc.data, localDateStr());
      setPendingConfirm(null);
      setMessages(prev => [...prev, { type: "result", data: pc.data }]);
      pushAssistant(`✓ Logged to ${label}.`);
      pushGuide();
    } catch (err: unknown) {
      pushAssistant(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  function cancelConfirm() {
    setPendingConfirm(null);
    pushAssistant(
      "Okay, I won't log that. Tell me what you ate whenever you're ready.",
    );
  }

  async function handleConfirmReply(text: string) {
    const pc = pendingConfirm;
    if (!pc) return;
    setMessages(prev => [...prev, { type: "user", text }]);
    scrollToEnd();

    const reply = text.trim().toLowerCase();

    const mentionsDay =
      /\b(sun|mon|tue|tues|wed|weds|thu|thur|thurs|fri|sat|sunday|monday|tuesday|wednesday|thursday|friday|saturday|yesterday|today|tonight|jan|feb|mar|apr|jun|jul|aug|sep|sept|oct|nov|dec|january|february|march|april|june|july|august|september|october|november|december)\b/.test(
        reply,
      ) ||
      /\d{1,2}\s*\/\s*\d{1,2}/.test(reply) || // 6/21
      /\b\d{1,2}(st|nd|rd|th)\b/.test(reply) || // 21st
      /\b\d+\s+days?\s+ago\b/.test(reply) || // 3 days ago
      /\b(last|this|the)\s+\w+/.test(reply) || // last sunday, the 21st, day before
      /\bday before\b/.test(reply);

    if (mentionsDay) {
      setLoading(true);
      try {
        const newDate = await resolveDate(
          `${pc.originalText}. ${text}`,
          localDateStr(),
        );
        if (newDate) {
          setPendingConfirm({ ...pc, date: newDate });
          return;
        }
      } catch (err: unknown) {
        pushAssistant(err instanceof Error ? err.message : "Unknown error");
        return;
      } finally {
        setLoading(false);
      }
    }

    if (
      /^(y|yes|yep|yeah|yup|sure|ok|okay|correct|confirm|right|do it|log it|sounds good)\b/.test(
        reply,
      )
    ) {
      await commitConfirm(pc);
      return;
    }
    if (/^(n|no|nope|nah|cancel|stop|never ?mind|don'?t)\b/.test(reply)) {
      cancelConfirm();
      return;
    }

    pushAssistant(
      "I didn't catch that — reply yes to log it, no to cancel, or tell me the day, like “last Sunday” or “June 21”.",
    );
  }

  const s = makeStyles(colors);
  const hasTodayFab = !!(todayLog && todayLog.meals.length > 0);
  const isReturning = recents.length > 0;

  return (
    <AppChrome>
      <div style={s.root}>
        {hasTodayFab && (
          <button
            style={s.todayFab}
            onClick={() => setShowToday(true)}
            aria-label="Show today's food"
          >
            <NotebookIcon size={18} color={colors.calText} />
            <span style={s.todayFabText}>Today</span>
          </button>
        )}

        {showToday && todayLog && (
          <TodayPopover
            log={todayLog}
            colors={colors}
            onClose={() => setShowToday(false)}
          />
        )}

        <div ref={scrollRef} style={s.messages} onScroll={handleMessagesScroll}>
          <div
            style={{
              ...s.messagesContent,
              ...(hasTodayFab ? { paddingTop: 64 } : {}),
            }}
          >
            <DateTimeHeader />

            <div style={s.assistantBubble}>
              <span style={s.assistantText}>
                {isReturning ? (
                  <>
                    What&apos;d you eat? Dump it all in one go — something like{" "}
                    <span style={s.italic}>&quot;{example}&quot;</span> works.
                  </>
                ) : (
                  <>
                    Hey! Welcome to Food Logger — just dump everything you ate
                    today in one go, no format needed.
                    <br />
                    <br />
                    Something like{" "}
                    <span style={s.italic}>&quot;{example}&quot;</span> works
                    perfectly.
                  </>
                )}
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
              if (msg.type === "assistant") {
                return (
                  <div key={i} style={s.assistantBubble}>
                    <span style={s.assistantText}>{msg.text}</span>
                  </div>
                );
              }
              if (msg.type === "guide") {
                return (
                  <div key={i} style={s.assistantBubble}>
                    <span style={s.assistantText}>{msg.text}</span>
                    <button
                      style={s.guideBtn}
                      onClick={() => router.push("/dashboard?view=month")}
                    >
                      Open Dashboard → Month
                    </button>
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
                    {msg.canRetry && (
                      <button
                        style={s.retryBtn}
                        onClick={analyze}
                        disabled={loading}
                      >
                        Retry
                      </button>
                    )}
                  </div>
                );
              }
              if (msg.type === "result" && msg.data) {
                return <ResultCard key={i} data={msg.data} colors={colors} />;
              }
              return null;
            })}

            {pendingConfirm && (
              <ConfirmCard
                data={pendingConfirm.data}
                date={pendingConfirm.date}
                today={localDateStr()}
                colors={colors}
                loading={loading}
                onYes={() => commitConfirm(pendingConfirm)}
                onNo={cancelConfirm}
              />
            )}

            {loading && !pendingConfirm && (
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

        {recents.length > 0 && !pendingConfirm && (
          <div style={s.recentsRow}>
            <span style={s.recentsLabel}>Recent</span>
            {recents.map((text, i) => (
              <button
                key={i}
                style={s.recentChip}
                title={text}
                onClick={() => setInput(text)}
              >
                {text.length > 32 ? `${text.slice(0, 32)}…` : text}
              </button>
            ))}
          </div>
        )}

        <div style={s.inputArea}>
          <textarea
            ref={inputRef}
            style={s.textInput}
            placeholder={
              pendingConfirm
                ? "Reply yes, no, or the correct day…"
                : "Tell me everything you ate today..."
            }
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
            {pendingConfirm ? "Send" : "Analyze"}
          </button>
        </div>
      </div>
    </AppChrome>
  );
}

function TodayPopover({
  log,
  colors,
  onClose,
}: {
  log: DailyLog;
  colors: Colors;
  onClose: () => void;
}) {
  const s = makeStyles(colors);
  return (
    <>
      <div style={s.todayBackdrop} onClick={onClose} />
      <div style={s.todayPopover} role="dialog" aria-label="Today's food">
        <div style={s.todayPopoverHeader}>
          <div>
            <div style={s.todayTitle}>Today so far</div>
            <div style={s.todayCals}>
              {log.cal_low}–{log.cal_high} kcal
            </div>
          </div>
          <button style={s.todayClose} onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>
        <div style={s.todayBody}>
          {log.meals.map((meal, i) => (
            <div key={i} style={s.todayItem}>
              <span style={s.todayMealName}>{meal.meal}</span>
              <span style={s.todayMealItems}>{meal.items.join(", ")}</span>
            </div>
          ))}
        </div>
      </div>
    </>
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

      <div style={{ ...s.card, marginBottom: 10 }}>
        <div style={s.cardLabel}>DAY TOTAL</div>

        <div style={s.totalSplit}>
          <div style={{ ...s.totalHero, backgroundColor: colors.calBg }}>
            <div style={s.totalHeroLabel}>Calories</div>
            <div style={s.totalHeroValueRow}>
              <span style={{ ...s.totalHeroValue, color: colors.calText }}>
                {data.totals.cal_low}–{data.totals.cal_high}
              </span>
              <span style={s.totalUnit}>kcal</span>
            </div>
          </div>

          <div style={s.macroGrid}>
            <TotalCell
              label="Protein"
              value={`${data.totals.protein_g}g`}
              bg={colors.proteinBg}
              color={colors.proteinText}
              colors={colors}
            />
            <TotalCell
              label="Carbs"
              value={`${data.totals.carbs_g}g`}
              bg={colors.carbsBg}
              color={colors.carbsText}
              colors={colors}
            />
            <TotalCell
              label="Fat"
              value={`${data.totals.fat_g}g`}
              bg={colors.fatBg}
              color={colors.fatText}
              colors={colors}
            />
            <TotalCell
              label="Fiber"
              value={`${data.totals.fiber_g}g`}
              bg={colors.fiberBg}
              color={colors.fiberText}
              colors={colors}
            />
          </div>
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
  data,
  date,
  today,
  colors,
  loading,
  onYes,
  onNo,
}: {
  data: CalorieLog;
  date: string;
  today: string;
  colors: Colors;
  loading: boolean;
  onYes: () => void;
  onNo: () => void;
}) {
  const s = makeStyles(colors);
  const label = dayLabel(date, today);
  const inRange = isWithinSevenDays(date);

  return (
    <div style={s.confirmCard}>
      <div style={s.confirmHeader}>
        This looks like it&apos;s for <strong>{label}</strong> — not today.
      </div>

      {data.meals.map((meal, i) => (
        <MealCard key={i} meal={meal} colors={colors} />
      ))}

      <div style={s.confirmTotals}>
        {data.totals.cal_low}–{data.totals.cal_high} kcal · P
        {data.totals.protein_g}g · Cb{data.totals.carbs_g}g · F
        {data.totals.fat_g}g · Fi{data.totals.fiber_g}g
      </div>

      {loading ? (
        <div style={s.confirmPending}>
          <Spinner size={16} color={colors.textMuted} />
        </div>
      ) : inRange ? (
        <>
          <div style={s.confirmNote}>
            Reply <strong>yes</strong> to log it there, <strong>no</strong> to
            cancel, or tell me the correct day.
          </div>
          <div style={s.confirmActions}>
            <button style={s.confirmBtnSecondary} onClick={onNo}>
              No
            </button>
            <button style={s.confirmBtnPrimary} onClick={onYes}>
              Yes, log to {label}
            </button>
          </div>
        </>
      ) : (
        <div style={s.confirmNote}>
          {label} is more than 7 days ago, so it can&apos;t be edited. Tell me a
          more recent day, or say <strong>no</strong> to cancel.
        </div>
      )}
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
        <Pill
          bg={colors.calBg}
          text={colors.calText}
          label={`C ${meal.cal_low}–${meal.cal_high} kcal`}
        />
        <Pill
          bg={colors.proteinBg}
          text={colors.proteinText}
          label={`P ${meal.protein_g}g`}
        />
        <Pill
          bg={colors.carbsBg}
          text={colors.carbsText}
          label={`Cb ${meal.carbs_g}g`}
        />
        <Pill
          bg={colors.fatBg}
          text={colors.fatText}
          label={`F ${meal.fat_g}g`}
        />
        <Pill
          bg={colors.fiberBg}
          text={colors.fiberText}
          label={`Fi ${meal.fiber_g}g`}
        />
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
  bg,
  color,
  colors,
}: {
  label: string;
  value: string;
  bg: string;
  color: string;
  colors: Colors;
}) {
  const s = makeStyles(colors);
  return (
    <div style={{ ...s.totalCell, backgroundColor: bg }}>
      <div style={s.totalLabel}>{label}</div>
      <div style={{ ...s.totalValue, color }}>{value}</div>
    </div>
  );
}

function Pill({
  bg,
  text,
  label,
}: {
  bg: string;
  text: string;
  label: string;
}) {
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
      position: "relative",
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

    guideBtn: {
      display: "block",
      marginTop: 10,
      backgroundColor: colors.primary,
      color: colors.primaryText,
      border: "none",
      borderRadius: 12,
      padding: "9px 14px",
      cursor: "pointer",
      fontSize: 13,
      fontWeight: 600,
    },

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
    retryBtn: {
      display: "block",
      marginTop: 10,
      backgroundColor: colors.surface,
      color: colors.error,
      border: `0.5px solid ${colors.error}55`,
      borderRadius: 10,
      padding: "6px 14px",
      cursor: "pointer",
      fontSize: 13,
      fontWeight: 600,
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

    pillRow: {
      display: "flex",
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 6,
    },

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

    totalSplit: {
      display: "flex",
      flexDirection: "row",
      gap: 6,
      alignItems: "stretch",
    },
    totalHero: {
      flex: "0 0 36%",
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
      borderRadius: 10,
      padding: 10,
    },
    totalHeroLabel: {
      fontSize: 13,
      color: colors.textSecondary,
      marginBottom: 2,
    },
    totalHeroValueRow: {
      display: "flex",
      flexDirection: "row",
      alignItems: "baseline",
      gap: 4,
    },
    totalHeroValue: { fontSize: 22, fontWeight: 600, letterSpacing: -0.5 },
    macroGrid: {
      flex: 1,
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 6,
    },
    totalCell: {
      display: "flex",
      flexDirection: "row",
      alignItems: "baseline",
      justifyContent: "space-between",
      gap: 6,
      minWidth: 0,
      borderRadius: 10,
      padding: "6px 8px",
    },
    totalLabel: { fontSize: 11, color: colors.textSecondary },
    totalValue: { fontSize: 14, fontWeight: 500 },
    totalUnit: { fontSize: 9, color: colors.textMuted },

    todayFab: {
      position: "absolute",
      top: 12,
      right: 16,
      zIndex: 30,
      width: 56,
      height: 56,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      gap: 1,
      borderRadius: "50%",
      backgroundColor: colors.calBg,
      border: `0.5px solid ${colors.calText}55`,
      boxShadow:
        "0 6px 16px rgba(16,24,40,0.20), 0 2px 6px rgba(216,149,25,0.40)",
      cursor: "pointer",
    },
    todayFabText: {
      fontSize: 9,
      fontWeight: 700,
      color: colors.calText,
      lineHeight: 1,
    },

    todayBackdrop: {
      position: "absolute",
      inset: 0,
      zIndex: 40,
      backgroundColor: "rgba(0,0,0,0.25)",
    },
    todayPopover: {
      position: "absolute",
      top: 52,
      right: 16,
      zIndex: 50,
      width: 280,
      maxWidth: "calc(100% - 32px)",
      maxHeight: "70%",
      overflowY: "auto",
      backgroundColor: colors.surface,
      border: `0.5px solid ${colors.border}`,
      borderRadius: 16,
      boxShadow: "0 8px 24px rgba(16,24,40,0.18)",
      padding: 14,
      display: "flex",
      flexDirection: "column",
      gap: 10,
    },
    todayPopoverHeader: {
      display: "flex",
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "space-between",
      gap: 8,
    },
    todayTitle: {
      fontSize: 12,
      fontWeight: 600,
      letterSpacing: 0.4,
      color: colors.textSecondary,
    },
    todayCals: {
      fontSize: 16,
      fontWeight: 700,
      color: colors.calText,
      marginTop: 2,
    },
    todayClose: {
      background: "none",
      border: "none",
      cursor: "pointer",
      color: colors.textMuted,
      fontSize: 14,
      flexShrink: 0,
      padding: 0,
    },
    todayBody: {
      display: "flex",
      flexDirection: "column",
      gap: 10,
    },
    todayItem: {
      display: "flex",
      flexDirection: "column",
      gap: 2,
      paddingTop: 8,
      borderTop: `0.5px solid ${colors.border}`,
    },
    todayMealName: {
      fontSize: 12,
      fontWeight: 600,
      color: colors.textPrimary,
    },
    todayMealItems: {
      fontSize: 13,
      color: colors.textSecondary,
      lineHeight: 1.4,
    },

    recentsRow: {
      flexShrink: 0,
      display: "flex",
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      padding: "14px 16px",
      overflowX: "auto",
      backgroundColor: colors.surface,
    },
    recentsLabel: {
      fontSize: 11,
      fontWeight: 600,
      color: colors.textMuted,
      flexShrink: 0,
    },
    recentChip: {
      flexShrink: 0,
      backgroundColor: colors.surfaceAlt,
      border: `0.5px solid ${colors.border}`,
      borderRadius: 99,
      padding: "5px 12px",
      fontSize: 12,
      color: colors.textSecondary,
      cursor: "pointer",
      whiteSpace: "nowrap",
      maxWidth: 220,
      overflow: "hidden",
      textOverflow: "ellipsis",
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
    textInput: {
      border: "none",
      outline: "none",
      borderRadius: 0,
      padding: "4px 2px",
      fontSize: 14,
      minHeight: 64,
      color: colors.textPrimary,
      backgroundColor: "transparent",
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
