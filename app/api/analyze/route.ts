import { NextRequest } from "next/server";
import { analyzeFood, Message } from "@/lib/llm";
import pool from "@/lib/db";
import { getUserId, getRateLimitKey } from "@/lib/getUser";
import { checkAndIncrementUsage } from "@/lib/rateLimit";
import { isWithinSevenDays, todayLocalDate } from "@/lib/dateUtils";

export async function POST(req: NextRequest) {
  try {
    const userId = getUserId(req);

    if (!userId) {
      return Response.json({ error: "Missing user ID" }, { status: 401 });
    }

    // Check rate limit. Guests are limited by IP (the x-user-id header is
    // spoofable), authenticated users by their verified account.
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

    const {
      messages,
      date: requestedDate,
    }: { messages: Message[]; date?: string } = await req.json();
    // Use local time so the default day matches the local-time 7-day window
    // check below (a UTC date can be "tomorrow" in negative-offset timezones).
    const today = todayLocalDate();
    const targetDate = requestedDate || today;

    // Validate date is within 7 days
    if (!isWithinSevenDays(targetDate)) {
      return Response.json(
        {
          error: "You can only log food for the past 7 days",
          code: "DATE_OUT_OF_RANGE",
        },
        { status: 400 },
      );
    }

    // Use requested date or fall back to today
    const data = await analyzeFood(messages);

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
