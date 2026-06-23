import { getToken } from "./authClient";
import { getOrCreateGuestId } from "./identity";

// The web frontend is served from the same origin as the API, so requests use
// relative paths.
const API_BASE = "";

function getHeaders(): Record<string, string> {
  const token = getToken();

  if (token) {
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    };
  }

  const userId = getOrCreateGuestId();
  return {
    "Content-Type": "application/json",
    "x-user-id": userId,
  };
}

export async function signup(
  email: string,
  password: string,
): Promise<{ token: string; userId: string; email: string }> {
  const guestId = getOrCreateGuestId();
  const res = await fetch(`${API_BASE}/api/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, guestId }),
  });
  const raw = await res.json();
  if (raw.error) throw new Error(raw.error);
  return raw;
}

export async function login(
  email: string,
  password: string,
): Promise<{ token: string; userId: string; email: string }> {
  const res = await fetch(`${API_BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const raw = await res.json();
  if (raw.error) throw new Error(raw.error);
  return raw;
}

export async function analyzeFood(
  messages: Message[],
  date?: string,
): Promise<AnalyzeResponse> {
  const res = await fetch(`${API_BASE}/api/analyze`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({ messages, date }),
  });

  const raw = await res.json();

  if (raw.code === "RATE_LIMIT_EXCEEDED") {
    throw new Error("RATE_LIMIT_EXCEEDED");
  }

  if (raw.code === "DATE_OUT_OF_RANGE") {
    throw new Error("DATE_OUT_OF_RANGE");
  }

  if (raw.error) throw new Error(raw.error);
  return raw as AnalyzeResponse;
}

export async function fetchUsage(): Promise<{
  count: number;
  remaining: number;
  limit: number;
}> {
  const res = await fetch(`${API_BASE}/api/usage`, {
    headers: getHeaders(),
  });
  const raw = await res.json();
  if (raw.error) throw new Error(raw.error);
  return raw;
}

export async function fetchWeekLogs(days = 7): Promise<DailyLog[]> {
  const res = await fetch(`${API_BASE}/api/logs?days=${days}`, {
    headers: getHeaders(),
  });
  const raw = await res.json();
  if (raw.error) throw new Error(raw.error);
  return raw as DailyLog[];
}

export async function fetchDayLog(date: string): Promise<DailyLog> {
  const res = await fetch(`${API_BASE}/api/logs/${date}`, {
    headers: getHeaders(),
  });
  const raw = await res.json();
  if (raw.error) throw new Error(raw.error);
  return raw as DailyLog;
}

export async function updateMeal(
  date: string,
  meal_id: string,
  updates: Partial<DailyLog["meals"][0]>,
): Promise<void> {
  const res = await fetch(`${API_BASE}/api/logs/${date}`, {
    method: "PATCH",
    headers: getHeaders(),
    body: JSON.stringify({ meal_id, ...updates }),
  });
  const raw = await res.json();
  if (raw.error) throw new Error(raw.error);
}

export async function deleteMeal(date: string, meal_id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/logs/${date}`, {
    method: "DELETE",
    headers: getHeaders(),
    body: JSON.stringify({ meal_id }),
  });
  const raw = await res.json();
  if (raw.error) throw new Error(raw.error);
}

export async function proposeEdit(
  date: string,
  messages: Message[],
): Promise<CalorieLog> {
  const res = await fetch(`${API_BASE}/api/logs/${date}/edit`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({ messages }),
  });
  const raw = await res.json();

  if (raw.code === "RATE_LIMIT_EXCEEDED") {
    throw new Error("RATE_LIMIT_EXCEEDED");
  }

  if (raw.code === "DATE_OUT_OF_RANGE") {
    throw new Error("DATE_OUT_OF_RANGE");
  }

  if (raw.error) throw new Error(raw.error);
  return raw.proposed as CalorieLog;
}

export async function commitEdit(date: string, log: CalorieLog): Promise<void> {
  const res = await fetch(`${API_BASE}/api/logs/${date}/edit`, {
    method: "PUT",
    headers: getHeaders(),
    body: JSON.stringify({ log }),
  });
  const raw = await res.json();
  if (raw.error) throw new Error(raw.error);
}

export type MealWithId = {
  id: string;
  log_id: string;
  meal: string;
  items: string[];
  cal_low: number;
  cal_high: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
  assumption?: string;
};

export type DailyLog = {
  id: string;
  date: string;
  intro: string;
  closing: string;
  cal_low: number;
  cal_high: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
  meals: MealWithId[];
};

export type Meal = {
  meal: string;
  items: string[];
  cal_low: number;
  cal_high: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
  assumption?: string;
};

export type CalorieLog = {
  intro: string;
  meals: Meal[];
  totals: {
    cal_low: number;
    cal_high: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
    fiber_g: number;
  };
  closing?: string;
};

export type Message = {
  role: "user" | "assistant";
  content: string;
};

export type MessageType = {
  type: "user" | "result" | "error";
  text?: string;
  data?: CalorieLog;
};

export type AnalyzeResponse = CalorieLog & {
  remaining?: number;
  limit?: number;
};
