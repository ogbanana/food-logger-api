import { NextRequest } from "next/server";
import pool from "@/lib/db";
import { getUserId } from "@/lib/getUser";
import { isWithinSevenDays } from "@/lib/dateUtils";

type LogRow = {
  id: string;
  date: string;
  intro: string;
  closing: string;
  cal_low: number;
  cal_high: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
};

type MealRow = {
  id: string;
  log_id: string;
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

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ date: string }> },
) {
  const { date } = await params;
  const userId = getUserId(req);
  if (!userId) {
    return Response.json({ error: "Missing user ID" }, { status: 401 });
  }

  try {
    const logResult = await pool.query<LogRow>(
      "SELECT * FROM logs WHERE date = $1 AND user_id = $2",
      [date, userId],
    );

    if (!logResult.rows.length) {
      return Response.json(
        { error: "No log found for this date" },
        { status: 404 },
      );
    }

    const log = logResult.rows[0];
    const mealsResult = await pool.query<MealRow>(
      `SELECT * FROM meals WHERE log_id = $1
        ORDER BY CASE meal
          WHEN 'Breakfast' THEN 1
          WHEN 'Lunch' THEN 2
          WHEN 'Dinner' THEN 3
          WHEN 'Snacks' THEN 4
          ELSE 5
        END`,
      [log.id],
    );

    if (!mealsResult.rows.length) {
      return Response.json(
        { error: "No log found for this date" },
        { status: 404 },
      );
    }

    return Response.json({ ...log, meals: mealsResult.rows });
  } catch (err: unknown) {
    console.error(err);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ date: string }> },
) {
  try {
    const { date } = await params;
    const userId = getUserId(req);
    if (!userId) {
      return Response.json({ error: "Missing user ID" }, { status: 401 });
    }

    if (!isWithinSevenDays(date)) {
      return Response.json(
        {
          error: "You can only edit logs from the past 7 days",
          code: "DATE_OUT_OF_RANGE",
        },
        { status: 400 },
      );
    }

    const {
      meal_id,
      items,
      cal_low,
      cal_high,
      protein_g,
      carbs_g,
      fat_g,
      fiber_g,
      assumption,
    } = await req.json();

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

    const updateResult = await pool.query(
      `UPDATE meals SET
        items=COALESCE($1, items),
        cal_low=COALESCE($2, cal_low),
        cal_high=COALESCE($3, cal_high),
        protein_g=COALESCE($4, protein_g),
        carbs_g=COALESCE($5, carbs_g),
        fat_g=COALESCE($6, fat_g),
        fiber_g=COALESCE($7, fiber_g),
        assumption=COALESCE($8, assumption)
      WHERE id=$9 AND log_id=$10 AND user_id=$11`,
      [
        items,
        cal_low,
        cal_high,
        protein_g,
        carbs_g,
        fat_g,
        fiber_g,
        assumption,
        meal_id,
        logId,
        userId,
      ],
    );
    if (updateResult.rowCount === 0) {
      return Response.json({ error: "Meal not found" }, { status: 404 });
    }

    await pool.query(
      `UPDATE logs SET
        cal_low = (SELECT SUM(cal_low) FROM meals WHERE log_id = $1),
        cal_high = (SELECT SUM(cal_high) FROM meals WHERE log_id = $1),
        protein_g = (SELECT SUM(protein_g) FROM meals WHERE log_id = $1),
        carbs_g = (SELECT SUM(carbs_g) FROM meals WHERE log_id = $1),
        fat_g = (SELECT SUM(fat_g) FROM meals WHERE log_id = $1),
        fiber_g = (SELECT SUM(fiber_g) FROM meals WHERE log_id = $1)
      WHERE id = $1`,
      [logId],
    );

    return Response.json({ success: true });
  } catch (err: unknown) {
    console.error(err);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ date: string }> },
) {
  try {
    const { date } = await params;
    const userId = getUserId(req);
    if (!userId) {
      return Response.json({ error: "Missing user ID" }, { status: 401 });
    }

    if (!isWithinSevenDays(date)) {
      return Response.json(
        {
          error: "You can only edit logs from the past 7 days",
          code: "DATE_OUT_OF_RANGE",
        },
        { status: 400 },
      );
    }

    const { meal_id } = await req.json();

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

    const deleteResult = await pool.query(
      "DELETE FROM meals WHERE id = $1 AND log_id = $2 AND user_id = $3",
      [meal_id, logId, userId],
    );
    if (deleteResult.rowCount === 0) {
      return Response.json({ error: "Meal not found" }, { status: 404 });
    }

    const remaining = await pool.query<{ count: string }>(
      "SELECT COUNT(*)::int AS count FROM meals WHERE log_id = $1",
      [logId],
    );
    if (Number(remaining.rows[0].count) === 0) {
      await pool.query("DELETE FROM logs WHERE id = $1", [logId]);
      return Response.json({ success: true });
    }

    await pool.query(
      `UPDATE logs SET
        cal_low = (SELECT COALESCE(SUM(cal_low), 0) FROM meals WHERE log_id = $1),
        cal_high = (SELECT COALESCE(SUM(cal_high), 0) FROM meals WHERE log_id = $1),
        protein_g = (SELECT COALESCE(SUM(protein_g), 0) FROM meals WHERE log_id = $1),
        carbs_g = (SELECT COALESCE(SUM(carbs_g), 0) FROM meals WHERE log_id = $1),
        fat_g = (SELECT COALESCE(SUM(fat_g), 0) FROM meals WHERE log_id = $1),
        fiber_g = (SELECT COALESCE(SUM(fiber_g), 0) FROM meals WHERE log_id = $1)
      WHERE id = $1`,
      [logId],
    );

    return Response.json({ success: true });
  } catch (err: unknown) {
    console.error(err);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
