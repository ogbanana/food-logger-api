import { getItem, setItem } from "./storage";

// Anonymous guest identity. A random UUID is minted on first use and reused for
// all unauthenticated requests (sent via the `x-user-id` header). Guests get a
// 7-day window before their data expires.

const GUEST_ID_KEY = "guest_id";
const GUEST_CREATED_AT_KEY = "guest_created_at";
const DAYS_UNTIL_EXPIRY = 7;

export function getOrCreateGuestId(): string {
  const existing = getItem(GUEST_ID_KEY);
  if (existing) return existing;

  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  setItem(GUEST_ID_KEY, id);
  setItem(GUEST_CREATED_AT_KEY, now);

  return id;
}

export function getGuestCreatedAt(): Date | null {
  const raw = getItem(GUEST_CREATED_AT_KEY);
  if (!raw) return null;
  return new Date(raw);
}

export function getDaysRemaining(): number {
  const createdAt = getGuestCreatedAt();
  if (!createdAt) return DAYS_UNTIL_EXPIRY;

  const now = new Date();
  const diffMs = now.getTime() - createdAt.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  return Math.max(0, DAYS_UNTIL_EXPIRY - diffDays);
}

export function isGuestExpired(): boolean {
  return getDaysRemaining() === 0;
}
