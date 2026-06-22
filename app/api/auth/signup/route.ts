import pool from "@/lib/db";
import { hashPassword, signToken } from "@/lib/auth";
import { guestKey } from "@/lib/getUser";
import { NextRequest } from "next/server";

type UserRow = {
  id: string;
  email: string;
};

export async function POST(req: NextRequest) {
  try {
    const { email, password, guestId } = await req.json();

    if (!email || !password) {
      return Response.json(
        { error: "Email and password are required" },
        { status: 400 },
      );
    }

    if (password.length < 8) {
      return Response.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 },
      );
    }

    // Check if email already exists
    const existing = await pool.query<UserRow>(
      "SELECT id FROM users WHERE email = $1",
      [email.toLowerCase()],
    );

    if (existing.rows.length > 0) {
      return Response.json(
        { error: "An account with this email already exists" },
        { status: 409 },
      );
    }

    const passwordHash = await hashPassword(password);

    // Create user
    const result = await pool.query<UserRow>(
      `INSERT INTO users (email, password_hash, guest_id)
       VALUES ($1, $2, $3)
       RETURNING id, email`,
      [email.toLowerCase(), passwordHash, guestId || null],
    );

    const user = result.rows[0];

    // Migrate guest logs to new user ID. Guest data is stored under the
    // namespaced guest key, so we only ever match rows in the guest namespace
    // — a supplied guestId can never target another (registered) user's UUID.
    if (guestId) {
      const guestUserId = guestKey(guestId);
      await pool.query("UPDATE logs SET user_id = $1 WHERE user_id = $2", [
        user.id,
        guestUserId,
      ]);
      await pool.query("UPDATE meals SET user_id = $1 WHERE user_id = $2", [
        user.id,
        guestUserId,
      ]);
    }

    const token = signToken({ userId: user.id, email: user.email });

    return Response.json({ token, userId: user.id, email: user.email });
  } catch (err: unknown) {
    console.error(err);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
