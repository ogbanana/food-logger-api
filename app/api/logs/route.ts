import { NextRequest } from "next/server";
import pool from "@/lib/db";
import { getUserId } from "@/lib/getUser";

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

export async function GET(req: NextRequest) {
  try {
    const userId = getUserId(req);

    if (!userId) {
      return Response.json({ error: "Missing user ID" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const parsedDays = parseInt(searchParams.get("days") || "7", 10);
    // Clamp to a sane range; reject NaN/negative/huge values.
    const days = Number.isFinite(parsedDays)
      ? Math.min(Math.max(parsedDays, 1), 90)
      : 7;

    const logsResult = await pool.query<LogRow>(
      `SELECT * FROM logs WHERE user_id = $1 ORDER BY date DESC LIMIT $2`,
      [userId, days],
    );

    const logs = await Promise.all(
      logsResult.rows.map(async log => {
        const mealsResult = await pool.query(
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
        return { ...log, meals: mealsResult.rows };
      }),
    );

    return Response.json(logs);
  } catch (err: unknown) {
    console.error(err);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
