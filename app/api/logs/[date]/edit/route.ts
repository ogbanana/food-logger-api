import { NextRequest } from "next/server";
import pool from "@/lib/db";
import { analyzeFood, CalorieLog, Message } from "@/lib/llm";
import { getUserId, getRateLimitKey } from "@/lib/getUser";
import { checkAndIncrementUsage } from "@/lib/rateLimit";
import { isWithinSevenDays } from "@/lib/dateUtils";

type MealRow = {
  meal: string;
  items: string[];
  cal_low: number;
  cal_high: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
  assumption: string;
};

type LogRow = {
  id: string;
};

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ date: string }> },
) {
  const { date } = await params;

  if (!isWithinSevenDays(date)) {
    return Response.json(
      {
        error: "You can only edit logs from the past 7 days",
        code: "DATE_OUT_OF_RANGE",
      },
      { status: 400 },
    );
  }

  try {
    const userId = getUserId(req);
    if (!userId)
      return Response.json({ error: "Missing user ID" }, { status: 401 });

    // Propose runs the LLM, so it counts against the same daily limit as
    // /analyze — otherwise this endpoint is an unmetered way to call the model.
    const rateLimitKey = getRateLimitKey(req, userId);
    const { allowed, remaining, limit } =
      await checkAndIncrementUsage(rateLimitKey);
    if (!allowed) {
      return Response.json(
        {
          error: "Daily limit reached",
          code: "RATE_LIMIT_EXCEEDED",
          remaining: 0,
          limit,
        },
        { status: 429 },
      );
    }

    const { messages }: { messages: Message[] } = await req.json();

    // Fetch current meals for context
    const logResult = await pool.query<LogRow>(
      "SELECT id FROM logs WHERE date = $1 AND user_id = $2",
      [date, userId],
    );

    if (!logResult.rows.length) {
      return Response.json(
        { error: "No log found for this date" },
        { status: 404 },
      );
    }

    const logId = logResult.rows[0].id;
    const mealsResult = await pool.query<MealRow>(
      `SELECT * FROM meals WHERE log_id = $1
        ORDER BY CASE meal
          WHEN 'Breakfast' THEN 1
          WHEN 'Lunch' THEN 2
          WHEN 'Dinner' THEN 3
          WHEN 'Snacks' THEN 4
          ELSE 5
        END`,
      [logId],
    );

    // Inject current state as context into the first system message
    const currentState = mealsResult.rows
      .map(
        m =>
          `${m.meal}: ${m.items.join(", ")} (${m.cal_low}–${m.cal_high} kcal, P${m.protein_g}g C${m.carbs_g}g F${m.fat_g}g Fi${m.fiber_g}g)`,
      )
      .join("\n");

    const contextualMessages: Message[] = [
      {
        role: "user",
        content: `The current meals logged for today are:\n${currentState}\n\nPlease apply the following edit and return the full updated day as JSON.`,
      },
      {
        role: "assistant",
        content:
          "Understood. I have the current meals. What would you like to change?",
      },
      ...messages,
    ];

    const proposed = await analyzeFood(contextualMessages);
    return Response.json({ proposed, remaining, limit });
  } catch (err: unknown) {
    console.error(err);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ date: string }> },
) {
  const { date } = await params;

  if (!isWithinSevenDays(date)) {
    return Response.json(
      {
        error: "You can only edit logs from the past 7 days",
        code: "DATE_OUT_OF_RANGE",
      },
      { status: 400 },
    );
  }

  try {
    const userId = getUserId(req);
    if (!userId)
      return Response.json({ error: "Missing user ID" }, { status: 401 });

    const { log }: { log: CalorieLog } = await req.json();

    const logResult = await pool.query<LogRow>(
      "SELECT id FROM logs WHERE date = $1 AND user_id = $2",
      [date, userId],
    );

    if (!logResult.rows.length) {
      return Response.json({ error: "No log found" }, { status: 404 });
    }

    const logId = logResult.rows[0].id;

    // Update log totals
    await pool.query(
      `UPDATE logs SET
        intro=$1, closing=$2, cal_low=$3, cal_high=$4,
        protein_g=$5, carbs_g=$6, fat_g=$7, fiber_g=$8
      WHERE id=$9`,
      [
        log.intro,
        log.closing,
        log.totals.cal_low,
        log.totals.cal_high,
        log.totals.protein_g,
        log.totals.carbs_g,
        log.totals.fat_g,
        log.totals.fiber_g,
        logId,
      ],
    );

    // Replace all meals
    await pool.query("DELETE FROM meals WHERE log_id = $1", [logId]);
    for (const meal of log.meals) {
      await pool.query(
        `INSERT INTO meals (log_id, user_id, meal, items, cal_low, cal_high, protein_g, carbs_g, fat_g, fiber_g, assumption)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [
          logId,
          userId,
          meal.meal,
          meal.items,
          meal.cal_low,
          meal.cal_high,
          meal.protein_g,
          meal.carbs_g,
          meal.fat_g,
          meal.fiber_g,
          meal.assumption ?? null,
        ],
      );
    }

    return Response.json({ success: true });
  } catch (err: unknown) {
    console.error(err);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
