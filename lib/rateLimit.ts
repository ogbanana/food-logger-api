import pool from "./db";

const FREE_TIER_LIMIT = 20;
// Safety cap on total model calls per day (food logs + conversational replies),
// so messages that don't count as food analyses still can't be abused.
const TOTAL_CALL_LIMIT = 60;

type UsageRow = {
  analysis_count: number;
};

function todayKey(): string {
  return new Date().toISOString().split("T")[0];
}

// Increment and return the new count for a counter key (today's row).
async function bump(key: string): Promise<number> {
  const result = await pool.query<UsageRow>(
    `INSERT INTO daily_usage (user_id, date, analysis_count)
     VALUES ($1, $2, 1)
     ON CONFLICT (user_id, date)
     DO UPDATE SET analysis_count = daily_usage.analysis_count + 1
     RETURNING analysis_count`,
    [key, todayKey()],
  );
  return result.rows[0].analysis_count;
}

// `key` is the rate-limit identity: a verified user UUID for authenticated
// users, or an `ip:<addr>` key for guests (see getRateLimitKey).

export async function getUsage(key: string): Promise<{
  count: number;
  remaining: number;
  limit: number;
}> {
  const result = await pool.query<UsageRow>(
    `SELECT analysis_count FROM daily_usage WHERE user_id = $1 AND date = $2`,
    [key, todayKey()],
  );

  const count = result.rows.length ? result.rows[0].analysis_count : 0;
  return {
    count,
    remaining: Math.max(0, FREE_TIER_LIMIT - count),
    limit: FREE_TIER_LIMIT,
  };
}

/** Whether another food analysis is allowed, without consuming any budget. */
export async function checkUsage(key: string): Promise<{
  allowed: boolean;
  remaining: number;
  limit: number;
}> {
  const { count, remaining, limit } = await getUsage(key);
  return { allowed: count < FREE_TIER_LIMIT, remaining, limit };
}

/** Consume one food analysis. Call only once the request is confirmed to be a
 * food log (so greetings/questions don't count against the daily limit). */
export async function incrementUsage(key: string): Promise<{
  remaining: number;
  limit: number;
}> {
  const count = await bump(key);
  return { remaining: Math.max(0, FREE_TIER_LIMIT - count), limit: FREE_TIER_LIMIT };
}

/** Increment-and-check a per-identity cap on TOTAL model calls for the day
 * (food + conversational), so free conversational calls can't be abused. */
export async function checkTotalCalls(key: string): Promise<{ allowed: boolean }> {
  const count = await bump(`total:${key}`);
  return { allowed: count <= TOTAL_CALL_LIMIT };
}

/** Increment-and-check the food-analysis limit in one step (used by the
 * edit/propose route, which always counts as an analysis). */
export async function checkAndIncrementUsage(key: string): Promise<{
  allowed: boolean;
  remaining: number;
  limit: number;
}> {
  const count = await bump(key);
  return {
    allowed: count <= FREE_TIER_LIMIT,
    remaining: Math.max(0, FREE_TIER_LIMIT - count),
    limit: FREE_TIER_LIMIT,
  };
}
