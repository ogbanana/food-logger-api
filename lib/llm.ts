import { GoogleGenerativeAI } from "@google/generative-ai";
import Anthropic from "@anthropic-ai/sdk";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function buildSystem(today: string): string {
  return `You are a calorie and nutrition estimator embedded in a conversational food logging app. Your job:

1. First decide whether the user's latest message is actually logging food they ate. If it is NOT a food log — e.g. a greeting, a question, thanks, or other small talk — set "is_food_log" to false, return an empty "meals" array with all "totals" set to 0, and put a short, friendly one-sentence "reply" that gently steers them to tell you what they ate. Never invent food that wasn't mentioned. Otherwise set "is_food_log" to true and continue.
2. Parse and group food items into meals (Breakfast, Lunch, Dinner, Snacks) based on context clues and typical timing.
3. For each meal, estimate calories and macros (protein, carbs, fat). Because portion sizes are often vague, always provide a calorie range (low and high estimate) and note your key assumptions.
4. Provide daily totals as ranges.
5. If the user is adding to a previous log, accumulate the new items with the existing ones and return the full updated day.
6. Determine which day the user is logging for and return it as "log_date" (YYYY-MM-DD). Today's date is ${today} (a ${weekdayName(today)}). Default "log_date" to today unless the user clearly refers to another day — e.g. "yesterday", "last night" (treat as yesterday), a weekday name, "N days ago", or an explicit date — in which case resolve it to the correct calendar date relative to today. A bare weekday name (e.g. "Sunday") means the MOST RECENT PAST occurrence of that weekday, never an upcoming one. Phrases describing where food came from (e.g. "yesterday's leftovers") are NOT a different log day.

Return ONLY a valid JSON object, no markdown, no backticks, no preamble.

Shape:
{
  "is_food_log": true,
  "reply": "",
  "intro": "brief acknowledgment",
  "log_date": "${today}",
  "meals": [
    {
      "meal": "Breakfast",
      "items": ["item 1", "item 2"],
      "cal_low": 400,
      "cal_high": 520,
      "protein_g": 18,
      "carbs_g": 52,
      "fat_g": 14,
      "fiber_g": 3,
      "assumption": "Assumed medium bagel and 2 tbsp cream cheese"
    }
  ],
  "totals": {
    "cal_low": 1200,
    "cal_high": 1600,
    "protein_g": 72,
    "carbs_g": 140,
    "fat_g": 45,
    "fiber_g": 22
  },
  "closing": "brief helpful note"
}`;
}

export type Meal = {
  meal: string;
  items: string[];
  cal_low: number;
  cal_high: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
  assumption?: string;
};

export type CalorieLog = {
  intro: string;
  meals: Meal[];
  totals: {
    cal_low: number;
    cal_high: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
    fiber_g: number;
  };
  closing?: string;
  /** The day the user is logging for, resolved by the model (YYYY-MM-DD). */
  log_date?: string;
  /** False when the message isn't logging food (greeting, question, small talk). */
  is_food_log?: boolean;
  /** A short conversational reply, used when is_food_log is false. */
  reply?: string;
};

export type Message = {
  role: "user" | "assistant";
  content: string;
};

const WEEKDAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

function weekdayName(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  return WEEKDAYS[new Date(y, m - 1, d).getDay()];
}

/**
 * Resolve a natural-language day reference ("last Sunday", "the 21st", "two days
 * ago") to a YYYY-MM-DD date relative to `today`, or null if no clear day is
 * given. Used to re-resolve the date when the user clarifies a confirmation —
 * no food parsing, so it doesn't disturb the already-parsed meals.
 */
export async function resolveDate(
  text: string,
  today: string,
): Promise<string | null> {
  const prompt = `Today is ${today} (a ${weekdayName(today)}). The user is telling you which past day a food log is for. Resolve the single day they mean to a calendar date (YYYY-MM-DD). A bare weekday name means the MOST RECENT PAST occurrence. If they don't clearly specify a day, use null.

Respond with ONLY a JSON object, no markdown: {"date": "YYYY-MM-DD"} or {"date": null}

User message: ${JSON.stringify(text)}`;

  const parse = (raw: string): string | null => {
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return null;
    const obj = JSON.parse(match[0]) as { date?: string | null };
    return obj.date && /^\d{4}-\d{2}-\d{2}$/.test(obj.date) ? obj.date : null;
  };

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    const result = await model.generateContent(prompt);
    return parse(result.response.text());
  } catch {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 64,
      messages: [{ role: "user", content: prompt }],
    });
    const responseText = response.content
      .filter(b => b.type === "text")
      .map(b => b.text)
      .join("");
    return parse(responseText);
  }
}

export async function analyzeFood(
  messages: Message[],
  today: string,
): Promise<CalorieLog> {
  try {
    // Try Gemini first
    return await analyzeWithGemini(messages, today);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "";
    // Fall back to Claude on rate limit or any Gemini error
    if (
      message.includes("429") ||
      message.includes("quota") ||
      message.includes("Too Many Requests")
    ) {
      console.log("Gemini rate limited, falling back to Claude...");
      return await analyzeWithClaude(messages, today);
    }
    throw err;
  }
}

async function analyzeWithGemini(
  messages: Message[],
  today: string,
): Promise<CalorieLog> {
  const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash",
    systemInstruction: buildSystem(today),
  });

  const history = messages.slice(0, -1).map(m => ({
    role: m.role === "assistant" ? ("model" as const) : ("user" as const),
    parts: [{ text: m.content }],
  }));

  const lastMessage = messages[messages.length - 1].content;
  const chat = model.startChat({ history });
  const result = await chat.sendMessage(lastMessage);
  const responseText = result.response.text();

  const jsonMatch = responseText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error(`No JSON found: ${responseText}`);
  return JSON.parse(jsonMatch[0]) as CalorieLog;
}

async function analyzeWithClaude(
  messages: Message[],
  today: string,
): Promise<CalorieLog> {
  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 1024,
    system: buildSystem(today),
    messages,
  });

  const responseText = response.content
    .filter(b => b.type === "text")
    .map(b => b.text)
    .join("");

  const jsonMatch = responseText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error(`No JSON found: ${responseText}`);
  return JSON.parse(jsonMatch[0]) as CalorieLog;
}
