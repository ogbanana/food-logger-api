import { setItem, getItem, deleteItem } from "./storage";

const TOKEN_KEY = "auth_token";
const USER_ID_KEY = "auth_user_id";
const USER_EMAIL_KEY = "auth_email";

const EXPIRY_LEEWAY_SECONDS = 30;

function base64UrlDecode(input: string): string {
  const base64 = input.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(
    base64.length + ((4 - (base64.length % 4)) % 4),
    "=",
  );
  return atob(padded);
}

export function getTokenExpiry(token: string): number | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  try {
    const payload = JSON.parse(base64UrlDecode(parts[1]));
    if (typeof payload.exp !== "number") return null;
    return payload.exp * 1000;
  } catch {
    return null;
  }
}

export function isTokenExpired(token: string): boolean {
  const expiry = getTokenExpiry(token);
  if (expiry === null) return false;
  return Date.now() >= expiry - EXPIRY_LEEWAY_SECONDS * 1000;
}

export function saveAuth(token: string, userId: string, email: string): void {
  setItem(TOKEN_KEY, token);
  setItem(USER_ID_KEY, userId);
  setItem(USER_EMAIL_KEY, email);
}

export function getToken(): string | null {
  const token = getItem(TOKEN_KEY);
  if (token === null) return null;
  if (isTokenExpired(token)) {
    logout();
    return null;
  }
  return token;
}

export function getUserEmail(): string | null {
  return getItem(USER_EMAIL_KEY);
}

export function isAuthenticated(): boolean {
  return getToken() !== null;
}

export function logout(): void {
  deleteItem(TOKEN_KEY);
  deleteItem(USER_ID_KEY);
  deleteItem(USER_EMAIL_KEY);
}
