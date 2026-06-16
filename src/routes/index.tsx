import { createFileRoute, redirect } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { DayPicker } from "react-day-picker";
import { categorizeWithGemini } from "@/lib/gemini-client";
import { useDays } from "@/hooks/useDays";
import { LogPanel } from "@/components/LogPanel";
import { ImportPanel } from "@/components/ImportPanel";
import { DayCard } from "@/components/DayCard";
import { Hero } from "@/components/Hero";
import { SettingsSheet } from "@/components/SettingsSheet";
import { loadSettings, DEFAULT_TARGETS, type Settings } from "@/lib/settings";
import { LOG_SYSTEM_PROMPT, EDIT_DAY_PROMPT } from "@/lib/prompt";
import { splitMultiDay } from "@/lib/chunker";
import { EditDaySheet } from "@/components/EditDaySheet";
import { ChatSheet } from "@/components/ChatSheet";
import type { DayEntry, Macros } from "@/lib/types";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "NourishAI — AI nutrition journal" },
      {
        name: "description",
        content:
          "Log meals with photos. Import week-long AI chats. NourishAI splits them into days, tracks macros, flags hazards.",
      },
      { property: "og:title", content: "NourishAI — AI nutrition journal" },
      {
        property: "og:description",
        content:
          "AI-powered multi-day food categorisation with beautiful macro rings.",
      },
    ],
  }),
  loader: async () => {
    try {
      const res = await fetch("/api/user");
      const user = await res.json();
      if (!user) {
        throw redirect({ to: "/login" });
      }
      return { user };
    } catch (err: any) {
      if (err.statusCode === 302 || err.isRedirect) throw err;
      throw err;
    }
  },
  component: Index,
});

const EMPTY: Macros = { calories: 0, protein: 0, carbs: 0, fat: 0, sugar: 0 };

function dayKey(d: DayEntry): string {
  if (/^\d{4}-\d{2}-\d{2}/.test(d.date)) return d.date.slice(0, 10);
  return new Date(d.createdAt).toISOString().slice(0, 10);
}

function Index() {
  const { user } = Route.useLoaderData();
  const { days, addMany, remove, replace, setAll } = useDays();
  const [loadingLog, setLoadingLog] = useState(false);
  const [loadingImport, setLoadingImport] = useState(false);
  const [loadingEdit, setLoadingEdit] = useState(false);
  const [editing, setEditing] = useState<DayEntry | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [importProgress, setImportProgress] = useState<{
    current: number;
    total: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"timeline" | "calendar">("timeline");
  const [calendarDate, setCalendarDate] = useState<Date | undefined>(
    new Date(),
  );
  const [settingsOpen, setSettingsOpen] = useState(false);

  const [settings, setSettings] = useState<Settings>(() => {
    const parsed = user.settingsJson ? JSON.parse(user.settingsJson) : {};
    return {
      geminiKey: user.geminiKey || "",
      geminiModel: user.geminiModel || "gemini-2.5-flash",
      targets: parsed.targets || DEFAULT_TARGETS,
      customLogPrompt: parsed.customLogPrompt || "",
    };
  });

  const sorted = useMemo(() => {
    return [...days].sort((a, b) => {
      const ka = dayKey(a);
      const kb = dayKey(b);
      if (ka === kb) return b.createdAt - a.createdAt;
      return ka < kb ? 1 : -1;
    });
  }, [days]);

  const filtered = useMemo(() => {
    let list = sorted;
    if (viewMode === "timeline") {
      const seen = new Set<string>();
      const recent: DayEntry[] = [];
      for (const d of sorted) {
        const k = dayKey(d);
        if (!seen.has(k)) {
          seen.add(k);
        }
        if (seen.size > 7) break;
        recent.push(d);
      }
      list = recent;
    } else if (viewMode === "calendar") {
      if (!calendarDate) {
        list = [];
      } else {
        const dStr = calendarDate.toISOString().slice(0, 10);
        list = sorted.filter((d) => dayKey(d) === dStr);
      }
    }

    if (filter === "all") return list;
    return list.filter((d) => d.category === filter);
  }, [sorted, filter, viewMode, calendarDate]);

  const weekAvg = useMemo(() => {
    if (sorted.length === 0) return EMPTY;
    const seen = new Set<string>();
    const recent: DayEntry[] = [];
    for (const d of sorted) {
      const k = dayKey(d);
      if (seen.has(k)) continue;
      seen.add(k);
      recent.push(d);
      if (recent.length === 7) break;
    }
    const sum = recent.reduce(
      (a, d) => ({
        calories: a.calories + (d.totals.calories || 0),
        protein: a.protein + (d.totals.protein || 0),
        carbs: a.carbs + (d.totals.carbs || 0),
        fat: a.fat + (d.totals.fat || 0),
        sugar: a.sugar + (d.totals.sugar || 0),
      }),
      EMPTY,
    );
    return {
      calories: Math.round(sum.calories / recent.length),
      protein: Math.round(sum.protein / recent.length),
      carbs: Math.round(sum.carbs / recent.length),
      fat: Math.round(sum.fat / recent.length),
      sugar: Math.round(sum.sugar / recent.length),
    };
  }, [sorted]);

  const recentCount = useMemo(() => {
    const seen = new Set<string>();
    for (const d of sorted) seen.add(dayKey(d));
    return Math.min(seen.size, 7);
  }, [sorted]);

  function mapToEntries(
    raw: any,
    fallbackDate: string,
    rawInput: string,
  ): DayEntry[] {
    const list: any[] = Array.isArray(raw?.days) ? raw.days : [raw];
    return list
      .filter((r) => r && typeof r === "object")
      .map((r, i) => {
        const meals = (Array.isArray(r.meals) ? r.meals : []).map((m: any) => ({
          name: m?.name ?? "Meal",
          foods: Array.isArray(m?.foods) ? m.foods : [],
          macros: { ...EMPTY, ...(m?.macros ?? {}) },
        }));
        // derive totals from meals if AI omitted them
        const derived = meals.reduce(
          (a: Macros, m: any) => ({
            calories: a.calories + (m.macros.calories || 0),
            protein: a.protein + (m.macros.protein || 0),
            carbs: a.carbs + (m.macros.carbs || 0),
            fat: a.fat + (m.macros.fat || 0),
            sugar: a.sugar + (m.macros.sugar || 0),
          }),
          EMPTY,
        );
        const totals = { ...EMPTY, ...(r.totals ?? {}) };
        // if totals look empty but meals exist, fall back to derived
        const totalsFinal =
          totals.calories === 0 && derived.calories > 0 ? derived : totals;
        return {
          id: crypto.randomUUID(),
          date: r.date ?? fallbackDate,
          title: r.title ?? "Untitled day",
          category: r.category ?? "other",
          meals,
          totals: totalsFinal,
          targets: { ...settings.targets, ...(r.targets ?? {}) },
          hazards: Array.isArray(r.hazards) ? r.hazards : [],
          advice: r.advice ?? "",
          tags: Array.isArray(r.tags) ? r.tags : [],
          rawInput,
          createdAt: Date.now() + i,
        };
      });
  }

  async function runAi(
    text: string,
    systemPrompt?: string,
    images?: Array<{ dataUrl: string }>,
  ) {
    if (settings.geminiKey.trim()) {
      return await categorizeWithGemini({
        text,
        apiKey: settings.geminiKey.trim(),
        model: settings.geminiModel,
        targets: settings.targets,
        systemPrompt,
        images,
      });
    }
    throw new Error(
      "Please set your Gemini API key in Settings. The Default AI has been removed.",
    );
  }

  async function handleLog(p: {
    text: string;
    date: string;
    images: Array<{ dataUrl: string; name: string }>;
  }) {
    setLoadingLog(true);
    setError(null);
    try {
      const sys = LOG_SYSTEM_PROMPT(
        p.date,
        settings.targets,
        settings.customLogPrompt,
      );
      const raw = await runAi(
        p.text,
        sys,
        p.images.map((i) => ({ dataUrl: i.dataUrl })),
      );
      const entries = mapToEntries(raw, p.date, p.text);
      if (entries.length === 0) throw new Error("AI returned no day");
      addMany(entries);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoadingLog(false);
    }
  }

  async function handleImport(text: string) {
    setLoadingImport(true);
    setError(null);
    setImportProgress(null);
    try {
      const chunks = splitMultiDay(text);
      setImportProgress({ current: 0, total: chunks.length });
      const all: DayEntry[] = [];
      for (let i = 0; i < chunks.length; i++) {
        setImportProgress({ current: i + 1, total: chunks.length });
        const raw = await runAi(chunks[i]);
        const entries = mapToEntries(
          raw,
          new Date().toISOString().slice(0, 10),
          chunks[i],
        );
        all.push(...entries);
      }
      if (all.length === 0) throw new Error("No days found in input");
      addMany(all);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoadingImport(false);
      setImportProgress(null);
    }
  }

  function handleSaveSettings(s: Settings) {
    setSettings(s);
    fetch("/api/user/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        geminiKey: s.geminiKey,
        modelId: s.geminiModel,
        settingsJson: JSON.stringify({
          targets: s.targets,
          customLogPrompt: s.customLogPrompt,
        }),
      }),
    }).catch(console.error);
  }

  async function handleEditApply(instruction: string, newDate: string) {
    if (!editing) return;
    setLoadingEdit(true);
    setError(null);
    try {
      const sys = EDIT_DAY_PROMPT(
        {
          date: editing.date,
          title: editing.title,
          category: editing.category,
          meals: editing.meals,
          totals: editing.totals,
          targets: editing.targets,
          hazards: editing.hazards,
          advice: editing.advice,
          tags: editing.tags,
        },
        newDate,
        instruction,
        settings.targets,
      );
      const raw = await runAi(instruction || `Change date to ${newDate}`, sys);
      const entries = mapToEntries(raw, newDate, instruction);
      if (entries.length === 0) throw new Error("AI returned no day");
      replace(editing.id, entries[0]);
      setEditing(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Edit failed");
    } finally {
      setLoadingEdit(false);
    }
  }

  const categories: Array<{ key: string; label: string }> = [
    { key: "all", label: "All" },
    { key: "balanced", label: "Balanced" },
    { key: "clean", label: "Clean" },
    { key: "low-protein", label: "Low Protein" },
    { key: "over-budget", label: "Over Budget" },
    { key: "junk-heavy", label: "Junk Heavy" },
  ];

  return (
    <main className="mx-auto min-h-screen w-full max-w-2xl px-4 pb-24">
      <Hero
        count={sorted.length}
        onOpenSettings={() => setSettingsOpen(true)}
      />

      <section className="mt-5 space-y-4">
        <LogPanel onSubmit={handleLog} loading={loadingLog} />

        <aside className="card-soft rounded-3xl p-5">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-lg font-bold">7-day average</h2>
              <p className="text-xs text-muted-foreground">
                {recentCount === 0
                  ? "Log a day to start tracking"
                  : `Across your ${recentCount} most recent day${recentCount === 1 ? "" : "s"}`}
              </p>
            </div>
            <span className="shrink-0 rounded-full bg-primary/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-primary">
              {recentCount} day{recentCount === 1 ? "" : "s"}
            </span>
          </div>
          <div className="mt-4 grid grid-cols-5 gap-2 text-center">
            {(
              [
                ["Cal", weekAvg.calories, "var(--calories)"],
                ["P", weekAvg.protein, "var(--protein)"],
                ["C", weekAvg.carbs, "var(--carbs)"],
                ["F", weekAvg.fat, "var(--fat)"],
                ["S", weekAvg.sugar, "var(--sugar)"],
              ] as const
            ).map(([l, v, c]) => (
              <div key={l} className="rounded-2xl bg-muted px-2 py-3">
                <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  {l}
                </div>
                <div
                  className="font-display text-lg font-bold tabular-nums"
                  style={{ color: c }}
                >
                  {v}
                </div>
              </div>
            ))}
          </div>
        </aside>
      </section>

      {error && (
        <div
          className="mt-4 rounded-2xl border bg-danger/5 p-4 text-sm"
          style={{ borderColor: "var(--danger)", color: "var(--danger)" }}
        >
          {error}
        </div>
      )}

      {sorted.length > 0 && (
        <div className="mt-10 mb-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">Your timeline</h2>
            <button
              onClick={() => setIsChatOpen(true)}
              className="flex items-center gap-2 rounded-full bg-primary/10 text-primary px-3 py-1.5 text-sm font-bold transition hover:bg-primary/20"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
              </svg>
              AI Chat
            </button>
          </div>
          <div className="scrollbar-thin -mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
            <button
              onClick={() => setViewMode("timeline")}
              className={`whitespace-nowrap rounded-full px-4 py-2 text-xs font-bold transition ${
                viewMode === "timeline"
                  ? "bg-foreground text-background"
                  : "bg-card text-muted-foreground pill hover:text-foreground"
              }`}
            >
              Recent 7 Days
            </button>
            <button
              onClick={() => setViewMode("calendar")}
              className={`whitespace-nowrap rounded-full px-4 py-2 text-xs font-bold transition ${
                viewMode === "calendar"
                  ? "bg-foreground text-background"
                  : "bg-card text-muted-foreground pill hover:text-foreground"
              }`}
            >
              Calendar
            </button>
            <div className="w-px bg-border my-1 mx-1 shrink-0" />
            {categories.map((c) => (
              <button
                key={c.key}
                onClick={() => setFilter(c.key)}
                className={`whitespace-nowrap rounded-full px-4 py-2 text-xs font-bold transition ${
                  filter === c.key
                    ? "bg-muted-foreground text-background"
                    : "bg-card text-muted-foreground pill hover:text-foreground"
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {viewMode === "calendar" && (
        <div className="mb-6 flex justify-center card-soft rounded-3xl bg-card p-4">
          <DayPicker
            mode="single"
            selected={calendarDate}
            onSelect={setCalendarDate}
            modifiers={{
              hasLog: (date) =>
                sorted.some(
                  (d) => dayKey(d) === date.toISOString().slice(0, 10),
                ),
            }}
            modifiersStyles={{
              hasLog: {
                fontWeight: "bold",
                textDecoration: "underline",
                color: "var(--primary)",
              },
            }}
          />
        </div>
      )}

      {filtered.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="flex flex-col gap-4">
          {filtered.map((d, i) => (
            <DayCard
              key={d.id}
              entry={d}
              index={i}
              onDelete={() => remove(d.id)}
              onEdit={() => setEditing(d)}
            />
          ))}
        </div>
      )}

      <div className="mt-10">
        <ImportPanel
          onSubmit={handleImport}
          loading={loadingImport}
          progress={importProgress}
        />
      </div>

      <EditDaySheet
        entry={editing}
        onClose={() => setEditing(null)}
        onApply={handleEditApply}
        loading={loadingEdit}
      />

      <ChatSheet
        open={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        date={new Date().toISOString().slice(0, 10)}
      />

      <SettingsSheet
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        settings={settings}
        days={days}
        onSave={handleSaveSettings}
        onImport={(importedDays, importedSettings, mode) => {
          if (mode === "replace") {
            setAll(importedDays);
          } else {
            addMany(importedDays);
          }
          handleSaveSettings(importedSettings);
        }}
      />
    </main>
  );
}

function EmptyState() {
  return (
    <div className="card-soft relative mt-8 overflow-hidden rounded-3xl p-10 text-center">
      <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-primary/10">
        <svg
          width="28"
          height="28"
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--primary)"
          strokeWidth="2"
        >
          <path d="M12 22s8-4 8-12V4h-6c-4 0-6 3-6 7 0 2 1 4 2 5" />
          <path d="M6 22c0-6 4-10 8-12" />
        </svg>
      </div>
      <h3 className="text-xl font-bold">No days yet</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        Log a meal above with a photo, or scroll down to import a full week of
        AI chat.
      </p>
    </div>
  );
}
