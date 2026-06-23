// Browser key/value storage. Mirrors the mobile app's storage interface, which
// falls back to localStorage on web. All access is guarded so it is safe to
// import during server rendering (where `window` is absent).

export function setItem(key: string, value: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, value);
}

export function getItem(key: string): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(key);
}

export function deleteItem(key: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(key);
}
