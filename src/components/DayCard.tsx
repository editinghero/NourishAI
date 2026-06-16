import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import type { DayEntry } from "@/lib/types";
import { MacroRing } from "./MacroRing";

const CATEGORY_STYLE: Record<
  DayEntry["category"],
  { label: string; color: string }
> = {
  balanced: { label: "Balanced", color: "var(--success)" },
  "over-budget": { label: "Over Budget", color: "var(--danger)" },
  "low-protein": { label: "Low Protein", color: "var(--fat)" },
  clean: { label: "Clean", color: "var(--success)" },
  "junk-heavy": { label: "Junk Heavy", color: "var(--danger)" },
  other: { label: "Mixed", color: "var(--muted-foreground)" },
};

export function DayCard({
  entry,
  onDelete,
  onEdit,
  index,
}: {
  entry: DayEntry;
  onDelete: () => void;
  onEdit?: () => void;
  onChangeDate?: (d: string) => void;
  index: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [editingDate, setEditingDate] = useState(false);
  const [tempDate, setTempDate] = useState(entry.date);
  const cat = CATEGORY_STYLE[entry.category] ?? CATEGORY_STYLE.other;

  useEffect(() => {
    if (!ref.current) return;
    gsap.fromTo(
      ref.current,
      { y: 30, opacity: 0 },
      {
        y: 0,
        opacity: 1,
        duration: 0.6,
        ease: "power3.out",
        delay: index * 0.05,
      },
    );
  }, [index]);

  return (
    <div
      ref={ref}
      className="card-soft relative overflow-hidden rounded-3xl p-5"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            {editingDate ? (
              <input
                type="date"
                value={tempDate}
                onChange={(e) => setTempDate(e.target.value)}
                onBlur={() => {
                  setEditingDate(false);
                  if (tempDate && tempDate !== entry.date && onChangeDate) {
                    onChangeDate(tempDate);
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    setEditingDate(false);
                    if (tempDate && tempDate !== entry.date && onChangeDate) {
                      onChangeDate(tempDate);
                    }
                  } else if (e.key === "Escape") {
                    setEditingDate(false);
                    setTempDate(entry.date);
                  }
                }}
                autoFocus
                className="bg-input text-[11px] font-mono text-muted-foreground rounded px-1 -ml-1 border border-primary focus:outline-none"
              />
            ) : (
              <span
                className="text-[11px] font-mono text-muted-foreground cursor-pointer hover:text-foreground hover:bg-muted rounded px-1 -ml-1 transition"
                onClick={() => setEditingDate(true)}
                title="Click to edit date"
              >
                {entry.date}
              </span>
            )}
            <span
              className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"
              style={{ background: cat.color + "20", color: cat.color }}
            >
              {cat.label}
            </span>
          </div>
          <h3 className="mt-1.5 truncate text-xl font-bold">{entry.title}</h3>
          <p className="text-xs text-muted-foreground tabular-nums">
            {entry.totals.calories} kcal
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {onEdit && (
            <button
              onClick={onEdit}
              className="grid h-9 w-9 place-items-center rounded-full bg-muted text-muted-foreground transition hover:bg-primary/10 hover:text-primary"
              aria-label="Edit with AI"
              title="Edit with AI"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
              >
                <path d="M12 20h9" />
                <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z" />
              </svg>
            </button>
          )}
          <button
            onClick={onDelete}
            className="grid h-9 w-9 place-items-center rounded-full bg-muted text-muted-foreground transition hover:bg-danger/10 hover:text-danger"
            aria-label="Delete"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
            >
              <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6" />
            </svg>
          </button>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <MacroRing
          label="Carbs"
          value={entry.totals.carbs}
          target={entry.targets.carbs}
          color="var(--carbs)"
          icon="leaf"
          size={84}
        />
        <MacroRing
          label="Fats"
          value={entry.totals.fat}
          target={entry.targets.fat}
          color="var(--fat)"
          icon="drop"
          size={84}
        />
        <MacroRing
          label="Sugar"
          value={entry.totals.sugar}
          target={entry.targets.sugar}
          color="var(--sugar)"
          icon="cube"
          size={84}
        />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <div className="rounded-2xl bg-muted p-3">
          <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Protein
          </div>
          <div
            className="font-display text-lg font-bold tabular-nums"
            style={{ color: "var(--protein)" }}
          >
            {entry.totals.protein}g{" "}
            <span className="text-xs text-muted-foreground">
              / {entry.targets.protein}g
            </span>
          </div>
        </div>
        <div className="rounded-2xl bg-muted p-3">
          <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Calories
          </div>
          <div
            className="font-display text-lg font-bold tabular-nums"
            style={{ color: "var(--calories)" }}
          >
            {entry.totals.calories}{" "}
            <span className="text-xs text-muted-foreground">
              / {entry.targets.calories}
            </span>
          </div>
        </div>
      </div>

      {entry.tags.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {entry.tags.slice(0, 6).map((t) => (
            <span
              key={t}
              className="rounded-full bg-muted px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground"
            >
              #{t}
            </span>
          ))}
        </div>
      )}

      <button
        onClick={() => setOpen((o) => !o)}
        className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-full bg-foreground py-2.5 text-xs font-bold uppercase tracking-wider text-background transition hover:opacity-90"
      >
        {open ? "Hide details" : "View details"}
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          style={{
            transform: open ? "rotate(180deg)" : "rotate(0)",
            transition: "transform .3s",
          }}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div className="mt-4 space-y-4 border-t border-border pt-4 text-sm">
          {entry.meals.length > 0 && (
            <div>
              <div className="mb-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Meals
              </div>
              <div className="space-y-2">
                {entry.meals.map((m, i) => {
                  const mm = {
                    calories: m.macros?.calories ?? 0,
                    protein: m.macros?.protein ?? 0,
                    carbs: m.macros?.carbs ?? 0,
                    fat: m.macros?.fat ?? 0,
                  };
                  return (
                    <div key={i} className="rounded-2xl bg-muted p-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate font-semibold">{m.name}</span>
                        <span className="shrink-0 font-mono text-[11px] text-muted-foreground tabular-nums">
                          {mm.calories} kcal
                        </span>
                      </div>
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        <Chip
                          color="var(--protein)"
                          label={`${mm.protein}g P`}
                        />
                        <Chip color="var(--carbs)" label={`${mm.carbs}g C`} />
                        <Chip color="var(--fat)" label={`${mm.fat}g F`} />
                      </div>
                      {m.foods.length > 0 && (
                        <div className="mt-2 text-xs text-muted-foreground">
                          {m.foods.join(" · ")}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {entry.hazards.length > 0 && (
            <div className="rounded-2xl border border-danger/20 bg-danger/5 p-3">
              <div
                className="mb-1.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider"
                style={{ color: "var(--danger)" }}
              >
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <path d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                </svg>
                EU Hazards
              </div>
              <ul className="space-y-1 text-xs text-foreground/80">
                {entry.hazards.map((h, i) => (
                  <li key={i} className="flex gap-2">
                    <span style={{ color: "var(--danger)" }}>•</span>
                    <span>{h}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {entry.advice && (
            <div className="rounded-2xl border border-primary/20 bg-primary/5 p-3">
              <div className="mb-1 text-[11px] font-bold uppercase tracking-wider text-primary">
                Advice
              </div>
              <p className="text-xs text-foreground/80">{entry.advice}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Chip({ color, label }: { color: string; label: string }) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full bg-card px-2 py-0.5 text-[10px] font-semibold pill"
      style={{ color }}
    >
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{ background: color }}
      />
      {label}
    </span>
  );
}
