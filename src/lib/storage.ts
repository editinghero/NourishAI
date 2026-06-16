import type { DayEntry } from "./types";

const KEY = "nutri.days.v1";

export function loadDays(): DayEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    return JSON.parse(raw) as DayEntry[];
  } catch {
    return [];
  }
}

export function saveDays(days: DayEntry[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(days));
}
