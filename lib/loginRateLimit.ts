import pool from "./db";

const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 10;

export async function isLoginRateLimited(identifier: string): Promise<boolean> {
  try {
    const cutoff = new Date(Date.now() - WINDOW_MS);
    const result = await pool.query<{ count: number }>(
      `SELECT COUNT(*)::int AS count FROM login_attempts
        WHERE identifier = $1 AND attempted_at > $2`,
      [identifier, cutoff],
    );
    return (result.rows[0]?.count ?? 0) >= MAX_ATTEMPTS;
  } catch (err) {
    console.error("login rate-limit check failed", err);
    return false;
  }
}

export async function recordFailedLogin(identifier: string): Promise<void> {
  try {
    await pool.query(`INSERT INTO login_attempts (identifier) VALUES ($1)`, [
      identifier,
    ]);
    await pool.query(`DELETE FROM login_attempts WHERE attempted_at < $1`, [
      new Date(Date.now() - WINDOW_MS),
    ]);
  } catch (err) {
    console.error("recording failed login failed", err);
  }
}

export async function clearLoginAttempts(identifier: string): Promise<void> {
  try {
    await pool.query(`DELETE FROM login_attempts WHERE identifier = $1`, [
      identifier,
    ]);
  } catch (err) {
    console.error("clearing login attempts failed", err);
  }
}
