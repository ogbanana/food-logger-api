import { NextRequest } from "next/server";
import { analyzeFood, Message } from "@/lib/llm";
import pool from "@/lib/db";
import { getUserId, getRateLimitKey } from "@/lib/getUser";
import {
  checkUsage,
  incrementUsage,
  getUsage,
  checkTotalCalls,
} from "@/lib/rateLimit";
import { isWithinSevenDays, todayLocalDate } from "@/lib/dateUtils";

export async function POST(req: NextRequest) {
  try {
    const userId = getUserId(req);

    if (!userId) {
      return Response.json({ error: "Missing user ID" }, { status: 401 });
    }

    const rateLimitKey = getRateLimitKey(req, userId);
    const { allowed: underTotalCap } = await checkTotalCalls(rateLimitKey);

    if (!underTotalCap) {
      return Response.json(
        {
          error: "Too many requests today",
          code: "RATE_LIMIT_EXCEEDED",
          remaining: 0,
          limit: 0,
        },
        { status: 429 },
      );
    }

    const {
      messages,
      date: requestedDate,
      today: clientToday,
    }: {
      messages: Message[];
      date?: string;
      today?: string;
    } = await req.json();
    const today =
      clientToday && /^\d{4}-\d{2}-\d{2}$/.test(clientToday)
        ? clientToday
        : todayLocalDate();

    if (requestedDate && !isWithinSevenDays(requestedDate, today)) {
      return Response.json(
        {
          error: "You can only log food for the past 7 days",
          code: "DATE_OUT_OF_RANGE",
        },
        { status: 400 },
      );
    }

    let analysisMessages = messages;
    if (!requestedDate) {
      const todayLog = await pool.query<LogRow>(
        "SELECT id FROM logs WHERE date = $1 AND user_id = $2",
        [today, userId],
      );
      if (todayLog.rows.length > 0) {
        const todayMeals = await pool.query<MealRow>(
          `SELECT meal, items, cal_low, cal_high, protein_g, carbs_g, fat_g, fiber_g
             FROM meals WHERE log_id = $1`,
          [todayLog.rows[0].id],
        );
        if (todayMeals.rows.length > 0) {
          const currentState = todayMeals.rows
            .map(
              m =>
                `${m.meal}: ${m.items.join(", ")} (${m.cal_low}–${m.cal_high} kcal, P${m.protein_g}g C${m.carbs_g}g F${m.fat_g}g Fi${m.fiber_g}g)`,
            )
            .join("\n");
          analysisMessages = [
            {
              role: "user",
              content: `For reference, here is everything already logged for today (${today}):\n${currentState}\n\nIf my next message logs more food for today, keep all of these existing items and add the new ones, returning the full updated day.`,
            },
            {
              role: "assistant",
              content:
                "Understood — I have today's current log and will keep these items when adding more.",
            },
            ...messages,
          ];
        }
      }
    }

    const data = await analyzeFood(analysisMessages, today);

    const isFoodLog =
      data.is_food_log !== false &&
      Array.isArray(data.meals) &&
      data.meals.length > 0;

    if (!isFoodLog) {
      const usage = await getUsage(rateLimitKey);
      return Response.json({
        is_food_log: false,
        reply:
          data.reply?.trim() ||
          "I'm here to help you log food — tell me what you ate and I'll break down the calories and macros.",
        remaining: usage.remaining,
        limit: usage.limit,
      });
    }

    const usage = await checkUsage(rateLimitKey);
    if (!usage.allowed) {
      return Response.json(
        {
          error: "Daily limit reached",
          code: "RATE_LIMIT_EXCEEDED",
          remaining: 0,
          limit: usage.limit,
        },
        { status: 429 },
      );
    }
    const { remaining, limit } = await incrementUsage(rateLimitKey);

    let targetDate = requestedDate || today;

    if (!requestedDate) {
      const inferred = data.log_date;
      const inferredDate =
        typeof inferred === "string" && /^\d{4}-\d{2}-\d{2}$/.test(inferred)
          ? inferred
          : today;
      if (inferredDate !== today) {
        return Response.json({
          ...data,
          inferred_date: inferredDate,
          needs_confirmation: true,
          out_of_range: !isWithinSevenDays(inferredDate, today),
          remaining,
          limit,
        });
      }
      targetDate = today;
    }

    const existing = await pool.query<LogRow>(
      "SELECT id FROM logs WHERE date = $1 AND user_id = $2",
      [targetDate, userId],
    );

    let logId: string;

    if (existing.rows.length > 0) {
      logId = existing.rows[0].id;
      await pool.query(
        `UPDATE logs SET intro=$1, closing=$2, cal_low=$3, cal_high=$4, protein_g=$5, carbs_g=$6, fat_g=$7, fiber_g=$8 WHERE id=$9`,
        [
          data.intro,
          data.closing,
          data.totals.cal_low,
          data.totals.cal_high,
          data.totals.protein_g,
          data.totals.carbs_g,
          data.totals.fat_g,
          data.totals.fiber_g,
          logId,
        ],
      );
      await pool.query("DELETE FROM meals WHERE log_id = $1", [logId]);
    } else {
      const logResult = await pool.query<LogRow>(
        `INSERT INTO logs (date, user_id, intro, closing, cal_low, cal_high, protein_g, carbs_g, fat_g, fiber_g)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`,
        [
          targetDate,
          userId,
          data.intro,
          data.closing,
          data.totals.cal_low,
          data.totals.cal_high,
          data.totals.protein_g,
          data.totals.carbs_g,
          data.totals.fat_g,
          data.totals.fiber_g,
        ],
      );
      logId = logResult.rows[0].id;
    }

    for (const meal of data.meals) {
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

    return Response.json({ ...data, remaining, limit });
  } catch (err: unknown) {
    console.error(err);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

type LogRow = {
  id: string;
};

type MealRow = {
  meal: string;
  items: string[];
  cal_low: number;
  cal_high: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
};
