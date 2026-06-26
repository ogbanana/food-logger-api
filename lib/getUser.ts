import { NextRequest } from "next/server";
import { verifyToken } from "./auth";

export function getUserId(req: NextRequest): string | null {
  const authHeader = req.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    const payload = verifyToken(token);
    if (payload) return payload.userId;
  }

  const guestId = req.headers.get("x-user-id")?.trim();
  if (guestId) return guestKey(guestId);

  return null;
}

export function guestKey(guestId: string): string {
  return `guest:${guestId}`;
}

export function getClientIp(req: NextRequest): string | null {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0].trim();
    if (first) return first;
  }
  return req.headers.get("x-real-ip")?.trim() || null;
}

export function getRateLimitKey(req: NextRequest, userId: string): string {
  if (!userId.startsWith("guest:")) return userId;
  const ip = getClientIp(req);
  return ip ? `ip:${ip}` : userId;
}
