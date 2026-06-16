import { useCallback, useEffect, useState } from "react";
import type { DayEntry, Macros } from "@/lib/types";

export function useDays() {
  const [days, setDays] = useState<DayEntry[]>([]);

  useEffect(() => {
    fetch("/api/days")
      .then((res) => res.json())
      .then(setDays)
      .catch(console.error);
  }, []);

  const add = useCallback((entry: DayEntry) => {
    setDays((prev) => {
      const idx = prev.findIndex((d) => d.date === entry.date);
      if (idx !== -1) {
        // Optimistically merge in memory
        const next = [...prev];
        const existing = next[idx];
        const meals = [...existing.meals, ...entry.meals];
        const totals = meals.reduce(
          (acc, m) => ({
            calories: (acc.calories || 0) + (m.macros?.calories || 0),
            protein: (acc.protein || 0) + (m.macros?.protein || 0),
            carbs: (acc.carbs || 0) + (m.macros?.carbs || 0),
            fat: (acc.fat || 0) + (m.macros?.fat || 0),
            sugar: (acc.sugar || 0) + (m.macros?.sugar || 0),
          }),
          { calories: 0, protein: 0, carbs: 0, fat: 0, sugar: 0 },
        );
        next[idx] = {
          ...existing,
          meals,
          totals,
          tags: Array.from(new Set([...existing.tags, ...entry.tags])),
          hazards: Array.from(new Set([...existing.hazards, ...entry.hazards])),
        };
        return next;
      } else {
        return [entry, ...prev].sort((a, b) => b.date.localeCompare(a.date));
      }
    });

    fetch("/api/days", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(entry),
    }).catch(console.error);
  }, []);

  const addMany = useCallback((entries: DayEntry[]) => {
    // Basic optimistic add
    setDays((prev) => {
      const all = [...entries, ...prev];
      return all.sort((a, b) => b.date.localeCompare(a.date));
    });
    fetch("/api/days", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(entries),
    }).catch(console.error);
  }, []);

  const remove = useCallback((id: string) => {
    setDays((prev) => prev.filter((d) => d.id !== id));
    fetch(`/api/days/${id}`, { method: "DELETE" }).catch(console.error);
  }, []);

  const replace = useCallback((id: string, entry: DayEntry) => {
    setDays((prev) => {
      const updated = {
        ...entry,
        id: entry.id || id,
        createdAt: entry.createdAt,
      };
      return prev.map((d) => (d.id === id ? updated : d));
    });
    fetch(`/api/days/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(entry),
    }).catch(console.error);
  }, []);

  const changeDate = useCallback((id: string, newDate: string) => {
    setDays((prev) =>
      prev
        .map((d) => (d.id === id ? { ...d, date: newDate } : d))
        .sort((a, b) => b.date.localeCompare(a.date)),
    );
    fetch(`/api/days/${id}/date`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ newDate }),
    }).catch(console.error);
  }, []);

  const clear = useCallback(() => {
    setDays([]);
    fetch("/api/days/replace", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify([]),
    }).catch(console.error);
  }, []);

  const setAll = useCallback((entries: DayEntry[]) => {
    setDays(entries);
    fetch("/api/days/replace", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(entries),
    }).catch(console.error);
  }, []);

  return { days, add, addMany, remove, replace, changeDate, clear, setAll };
}
