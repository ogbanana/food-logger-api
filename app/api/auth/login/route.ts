import pool from "@/lib/db";
import { verifyPassword, hashPassword, signToken } from "@/lib/auth";
import { getClientIp } from "@/lib/getUser";
import {
  isLoginRateLimited,
  recordFailedLogin,
  clearLoginAttempts,
} from "@/lib/loginRateLimit";
import { NextRequest } from "next/server";

type UserRow = {
  id: string;
  email: string;
  password_hash: string;
};

const dummyHashPromise = hashPassword("invalid-account-timing-equalizer");

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return Response.json(
        { error: "Email and password are required" },
        { status: 400 },
      );
    }

    const normalizedEmail = String(email).toLowerCase();

    const ip = getClientIp(req);
    const rateLimitId = ip ? `ip:${ip}` : `email:${normalizedEmail}`;

    if (await isLoginRateLimited(rateLimitId)) {
      return Response.json(
        {
          error: "Too many login attempts. Please try again later.",
          code: "RATE_LIMIT_EXCEEDED",
        },
        { status: 429 },
      );
    }

    const result = await pool.query<UserRow>(
      "SELECT id, email, password_hash FROM users WHERE email = $1",
      [normalizedEmail],
    );

    if (!result.rows.length) {
      await verifyPassword(password, await dummyHashPromise);
      await recordFailedLogin(rateLimitId);
      return Response.json(
        { error: "Invalid email or password" },
        { status: 401 },
      );
    }

    const user = result.rows[0];
    const valid = await verifyPassword(password, user.password_hash);

    if (!valid) {
      await recordFailedLogin(rateLimitId);
      return Response.json(
        { error: "Invalid email or password" },
        { status: 401 },
      );
    }

    await clearLoginAttempts(rateLimitId);

    const token = signToken({ userId: user.id, email: user.email });

    return Response.json({ token, userId: user.id, email: user.email });
  } catch (err: unknown) {
    console.error(err);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
