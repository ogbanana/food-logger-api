import { getUsage } from "@/lib/rateLimit";
import { getUserId, getRateLimitKey } from "@/lib/getUser";
import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return Response.json({ error: "Missing user ID" }, { status: 401 });
    }

    const usage = await getUsage(getRateLimitKey(req, userId));
    return Response.json(usage);
  } catch (err: unknown) {
    console.error(err);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
