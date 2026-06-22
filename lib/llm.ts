import { GoogleGenerativeAI } from "@google/generative-ai";
import Anthropic from "@anthropic-ai/sdk";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM = `You are a calorie and nutrition estimator embedded in a conversational food logging app. The user will describe everything they ate today in free text. Your job is to:
1. Parse and group food items into meals (Breakfast, Lunch, Dinner, Snacks) based on context clues and typical timing.
2. For each meal, estimate calories and macros (protein, carbs, fat). Because portion sizes are often vague, always provide a calorie range (low and high estimate) and note your key assumptions.
3. Provide daily totals as ranges.
4. If the user is adding to a previous log, accumulate the new items with the existing ones and return the full updated day.

Return ONLY a valid JSON object, no markdown, no backticks, no preamble.

Shape:
{
  "intro": "brief acknowledgment",
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
};

export type Message = {
  role: "user" | "assistant";
  content: string;
};

export async function analyzeFood(messages: Message[]): Promise<CalorieLog> {
  try {
    // Try Gemini first
    return await analyzeWithGemini(messages);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "";
    // Fall back to Claude on rate limit or any Gemini error
    if (
      message.includes("429") ||
      message.includes("quota") ||
      message.includes("Too Many Requests")
    ) {
      console.log("Gemini rate limited, falling back to Claude...");
      return await analyzeWithClaude(messages);
    }
    throw err;
  }
}

async function analyzeWithGemini(messages: Message[]): Promise<CalorieLog> {
  const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash",
    systemInstruction: SYSTEM,
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

async function analyzeWithClaude(messages: Message[]): Promise<CalorieLog> {
  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 1024,
    system: SYSTEM,
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
