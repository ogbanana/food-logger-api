import { NextRequest } from "next/server";
import { verifyToken } from "./auth";

export function getUserId(req: NextRequest): string | null {
  // Check for JWT token first (authenticated user). The identity is the
  // server-verified user UUID — never client-controlled.
  const authHeader = req.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    const payload = verifyToken(token);
    if (payload) return payload.userId;
  }

  // Fall back to guest ID. The x-user-id header is client-supplied and
  // unverified, so it is namespaced to guarantee it can never collide with
  // (and therefore impersonate) a registered user's bare UUID.
  const guestId = req.headers.get("x-user-id")?.trim();
  if (guestId) return guestKey(guestId);

  return null;
}

// Namespace key for an unauthenticated guest identity.
export function guestKey(guestId: string): string {
  return `guest:${guestId}`;
}

// Best-effort client IP from the trusted proxy headers. NextRequest.ip was
// removed in Next 15, so we read the forwarded headers the host sets.
// Assumes the app runs behind a proxy/platform (e.g. Vercel) that controls
// these headers; without one they are client-spoofable.
export function getClientIp(req: NextRequest): string | null {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0].trim();
    if (first) return first;
  }
  return req.headers.get("x-real-ip")?.trim() || null;
}

// Resolve the key used for rate limiting. Authenticated users are limited by
// their verified account. Guests present a spoofable x-user-id, so they are
// limited by client IP — otherwise rotating the header grants unlimited LLM
// usage. Falls back to the guest key only when no IP is available.
export function getRateLimitKey(req: NextRequest, userId: string): string {
  if (!userId.startsWith("guest:")) return userId;
  const ip = getClientIp(req);
  return ip ? `ip:${ip}` : userId;
}
