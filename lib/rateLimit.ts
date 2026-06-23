import pool from "./db";

const FREE_TIER_LIMIT = 20;

type UsageRow = {
  analysis_count: number;
};

// `key` is the rate-limit identity: a verified user UUID for authenticated
// users, or an `ip:<addr>` key for guests (see getRateLimitKey).
export async function checkAndIncrementUsage(key: string): Promise<{
  allowed: boolean;
  remaining: number;
  limit: number;
}> {
  const today = new Date().toISOString().split("T")[0];

  // Upsert usage row for today
  const result = await pool.query<UsageRow>(
    `INSERT INTO daily_usage (user_id, date, analysis_count)
     VALUES ($1, $2, 1)
     ON CONFLICT (user_id, date)
     DO UPDATE SET analysis_count = daily_usage.analysis_count + 1
     RETURNING analysis_count`,
    [key, today],
  );

  const count = result.rows[0].analysis_count;
  const allowed = count <= FREE_TIER_LIMIT;
  const remaining = Math.max(0, FREE_TIER_LIMIT - count);

  return { allowed, remaining, limit: FREE_TIER_LIMIT };
}

export async function getUsage(key: string): Promise<{
  count: number;
  remaining: number;
  limit: number;
}> {
  const today = new Date().toISOString().split("T")[0];

  const result = await pool.query<UsageRow>(
    `SELECT analysis_count FROM daily_usage WHERE user_id = $1 AND date = $2`,
    [key, today],
  );

  const count = result.rows.length ? result.rows[0].analysis_count : 0;
  return {
    count,
    remaining: Math.max(0, FREE_TIER_LIMIT - count),
    limit: FREE_TIER_LIMIT,
  };
}
