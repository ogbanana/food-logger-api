import { NextRequest } from "next/server";
import { resolveDate } from "@/lib/llm";
import { getUserId, getRateLimitKey } from "@/lib/getUser";
import { checkTotalCalls } from "@/lib/rateLimit";

export async function POST(req: NextRequest) {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return Response.json({ error: "Missing user ID" }, { status: 401 });
    }

    const { allowed } = await checkTotalCalls(getRateLimitKey(req, userId));
    if (!allowed) {
      return Response.json(
        { error: "Too many requests today", code: "RATE_LIMIT_EXCEEDED" },
        { status: 429 },
      );
    }

    const { text, today }: { text?: string; today?: string } = await req.json();
    if (!text || typeof text !== "string") {
      return Response.json({ error: "Missing text" }, { status: 400 });
    }
    const ref =
      today && /^\d{4}-\d{2}-\d{2}$/.test(today)
        ? today
        : new Date().toISOString().split("T")[0];

    const date = await resolveDate(text, ref);
    return Response.json({ date });
  } catch (err: unknown) {
    console.error(err);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
