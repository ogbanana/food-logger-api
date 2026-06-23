import { NextRequest } from "next/server";
import pool from "@/lib/db";
import { getUserId } from "@/lib/getUser";
import { isWithinSevenDays } from "@/lib/dateUtils";
import type { Meal } from "@/lib/llm";

// Appends already-parsed meals to a day's log (creating the log if needed) and
// recomputes the day's totals. Unlike /api/analyze this runs no LLM and does not
// count against the daily limit — it's the "confirm" step for logging to a day
// other than today, so an existing day's meals are merged, not overwritten.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ date: string }> },
) {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return Response.json({ error: "Missing user ID" }, { status: 401 });
    }

    const { date } = await params;
    const {
      meals,
      intro,
      closing,
      today,
    }: {
      meals: Meal[];
      intro?: string;
      closing?: string;
      today?: string;
    } = await req.json();

    if (!isWithinSevenDays(date, today)) {
      return Response.json(
        {
          error: "You can only log food for the past 7 days",
          code: "DATE_OUT_OF_RANGE",
        },
        { status: 400 },
      );
    }

    if (!Array.isArray(meals) || meals.length === 0) {
      return Response.json({ error: "No meals to add" }, { status: 400 });
    }

    // Find or create the day's log.
    const existing = await pool.query<{ id: string }>(
      "SELECT id FROM logs WHERE date = $1 AND user_id = $2",
      [date, userId],
    );

    let logId: string;
    if (existing.rows.length > 0) {
      logId = existing.rows[0].id;
    } else {
      const created = await pool.query<{ id: string }>(
        `INSERT INTO logs (date, user_id, intro, closing, cal_low, cal_high, protein_g, carbs_g, fat_g, fiber_g)
         VALUES ($1, $2, $3, $4, 0, 0, 0, 0, 0, 0) RETURNING id`,
        [date, userId, intro ?? "", closing ?? ""],
      );
      logId = created.rows[0].id;
    }

    for (const meal of meals) {
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

    // Recompute the day's totals from all of its meals.
    await pool.query(
      `UPDATE logs SET
         cal_low   = COALESCE((SELECT SUM(cal_low)   FROM meals WHERE log_id = $1), 0),
         cal_high  = COALESCE((SELECT SUM(cal_high)  FROM meals WHERE log_id = $1), 0),
         protein_g = COALESCE((SELECT SUM(protein_g) FROM meals WHERE log_id = $1), 0),
         carbs_g   = COALESCE((SELECT SUM(carbs_g)   FROM meals WHERE log_id = $1), 0),
         fat_g     = COALESCE((SELECT SUM(fat_g)     FROM meals WHERE log_id = $1), 0),
         fiber_g   = COALESCE((SELECT SUM(fiber_g)   FROM meals WHERE log_id = $1), 0)
       WHERE id = $1`,
      [logId],
    );

    const logRes = await pool.query(
      "SELECT * FROM logs WHERE id = $1",
      [logId],
    );
    const mealsRes = await pool.query(
      `SELECT * FROM meals WHERE log_id = $1
       ORDER BY CASE meal
         WHEN 'Breakfast' THEN 0 WHEN 'Lunch' THEN 1
         WHEN 'Dinner' THEN 2 WHEN 'Snacks' THEN 3 ELSE 4 END`,
      [logId],
    );

    return Response.json({ ...logRes.rows[0], meals: mealsRes.rows });
  } catch (err: unknown) {
    console.error(err);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
