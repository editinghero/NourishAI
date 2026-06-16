import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import type { DayEntry } from "@/lib/types";

type Props = {
  entry: DayEntry | null;
  onClose: () => void;
  onApply: (instruction: string, newDate: string) => Promise<void>;
  loading: boolean;
};

function safeDate(s: string) {
  return /^\d{4}-\d{2}-\d{2}/.test(s)
    ? s.slice(0, 10)
    : new Date().toISOString().slice(0, 10);
}

export function EditDaySheet({ entry, onClose, onApply, loading }: Props) {
  const [text, setText] = useState("");
  const [date, setDate] = useState(safeDate(entry?.date ?? ""));
  const panelRef = useRef<HTMLDivElement>(null);
  const dateRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (entry) {
      setText("");
      setDate(safeDate(entry.date));
    }
  }, [entry]);

  useEffect(() => {
    if (!entry || !panelRef.current) return;
    gsap.fromTo(
      panelRef.current,
      { y: 40, opacity: 0, scale: 0.97 },
      { y: 0, opacity: 1, scale: 1, duration: 0.35, ease: "power3.out" },
    );
  }, [entry]);

  if (!entry) return null;

  async function go() {
    if (loading) return;
    await onApply(text.trim(), date);
    setText("");
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/30 p-4 backdrop-blur-sm sm:items-center"
      onClick={onClose}
    >
      <div
        ref={panelRef}
        onClick={(e) => e.stopPropagation()}
        className="card-soft w-full max-w-lg rounded-3xl bg-card p-5 shadow-[var(--shadow-card)]"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Edit with AI
            </div>
            <h2 className="mt-0.5 truncate text-xl font-bold">{entry.title}</h2>
          </div>
          <button
            onClick={onClose}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-muted text-muted-foreground hover:text-foreground"
            aria-label="Close"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
            >
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        <div className="mt-4 space-y-3">
          <label className="block">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Date
            </span>
            <button
              type="button"
              onClick={() => {
                const el = dateRef.current;
                if (!el) return;
                if (
                  "showPicker" in el &&
                  typeof (el as any).showPicker === "function"
                ) {
                  (el as any).showPicker();
                } else {
                  el.focus();
                  el.click();
                }
              }}
              className="relative mt-1 flex w-full items-center justify-between rounded-2xl border border-border bg-input px-4 py-3 text-sm font-bold"
            >
              <span suppressHydrationWarning>
                {new Date(date + "T00:00:00").toLocaleDateString(undefined, {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </span>
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
              >
                <rect x="3" y="5" width="18" height="16" rx="2" />
                <path d="M3 9h18M8 3v4M16 3v4" />
              </svg>
              <input
                ref={dateRef}
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="absolute inset-0 cursor-pointer opacity-0"
              />
            </button>
          </label>

          <label className="block">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              What to change
            </span>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={5}
              placeholder={`e.g. "Add a dinner of grilled chicken and salad" or "remove the gulab jamun" or "fix protein, I had 4 eggs not 2"`}
              className="mt-1 w-full resize-y rounded-2xl border border-border bg-input p-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </label>

          <p className="text-[11px] text-muted-foreground">
            AI re-analyses the entire day with your change and recalculates
            macros, totals, hazards and advice.
          </p>

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              onClick={onClose}
              className="rounded-full bg-muted px-4 py-2.5 text-sm font-bold"
            >
              Cancel
            </button>
            <button
              onClick={go}
              disabled={
                loading || (!text.trim() && date === safeDate(entry.date))
              }
              className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground shadow-[var(--shadow-pill)] disabled:opacity-50"
            >
              {loading ? (
                <>
                  <svg
                    className="animate-spin"
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <circle
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeOpacity="0.3"
                      strokeWidth="3"
                    />
                    <path
                      d="M22 12a10 10 0 00-10-10"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeLinecap="round"
                    />
                  </svg>
                  Updating…
                </>
              ) : (
                <>
                  Apply with AI
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                  >
                    <path d="M5 12h14M13 6l6 6-6 6" />
                  </svg>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
