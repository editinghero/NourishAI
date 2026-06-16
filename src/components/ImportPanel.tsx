import { useRef, useState } from "react";
import gsap from "gsap";

type Props = {
  onSubmit: (text: string) => Promise<void>;
  loading: boolean;
  progress?: { current: number; total: number } | null;
};

export function ImportPanel({ onSubmit, loading, progress }: Props) {
  const [text, setText] = useState("");
  const [open, setOpen] = useState(false);
  const [drag, setDrag] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  async function handleFiles(files: FileList | null) {
    if (!files) return;
    const parts: string[] = [];
    for (const f of Array.from(files)) {
      if (f.size > 10_000_000) continue;
      parts.push(`--- ${f.name} ---\n${await f.text()}`);
    }
    setText((prev) => (prev ? prev + "\n\n" : "") + parts.join("\n\n"));
    setOpen(true);
  }

  async function go() {
    if (!text.trim() || loading) return;
    if (btnRef.current)
      gsap.to(btnRef.current, {
        scale: 0.94,
        duration: 0.1,
        yoyo: true,
        repeat: 1,
      });
    await onSubmit(text);
    setText("");
  }

  function toggle() {
    setOpen((v) => {
      const next = !v;
      requestAnimationFrame(() => {
        if (next && bodyRef.current) {
          gsap.fromTo(
            bodyRef.current,
            { height: 0, opacity: 0 },
            { height: "auto", opacity: 1, duration: 0.45, ease: "power3.out" },
          );
        }
      });
      return next;
    });
  }

  return (
    <section
      className={`card-soft relative rounded-3xl p-5 transition ${drag ? "ring-2 ring-primary" : ""}`}
      onDragOver={(e) => {
        e.preventDefault();
        setDrag(true);
      }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDrag(false);
        handleFiles(e.dataTransfer.files);
      }}
    >
      <button
        onClick={toggle}
        className="flex w-full items-center justify-between gap-3 text-left"
        aria-expanded={open}
      >
        <div className="flex items-center gap-3">
          <span className="grid h-12 w-12 place-items-center rounded-full bg-accent/15 text-[color:var(--accent)]">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
          </span>
          <div className="min-w-0">
            <h2 className="text-lg font-bold">Import from other AI chats</h2>
            <p className="text-xs text-muted-foreground">
              Paste or drop a week-long Gemini / ChatGPT export. We'll split it
              day-by-day.
            </p>
          </div>
        </div>
        <span
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-muted transition"
          style={{ transform: open ? "rotate(180deg)" : "none" }}
        >
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.4"
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </span>
      </button>

      {open && (
        <div ref={bodyRef} className="overflow-hidden">
          <div className="pt-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <label className="cursor-pointer rounded-full bg-foreground px-3.5 py-2 text-xs font-bold text-background transition hover:opacity-90">
                + Upload .md / .txt
                <input
                  type="file"
                  accept=".md,.txt,.markdown,.json,.csv"
                  multiple
                  className="hidden"
                  onChange={(e) => handleFiles(e.target.files)}
                />
              </label>
              <span className="text-[11px] text-muted-foreground">
                Up to 10 MB per file
              </span>
            </div>

            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Paste a full week of chat with your nutritionist AI here…"
              rows={8}
              className="w-full resize-y rounded-2xl border border-border bg-input p-4 font-mono text-xs leading-relaxed text-foreground placeholder:text-muted-foreground/70 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />

            <div className="mt-3 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
              <div className="min-w-0 text-xs text-muted-foreground">
                {loading && progress
                  ? `Processing chunk ${progress.current} / ${progress.total}…`
                  : text.length > 0
                    ? `${text.length.toLocaleString()} chars`
                    : "Drag files anywhere on this card"}
              </div>
              <button
                ref={btnRef}
                onClick={go}
                disabled={loading || !text.trim()}
                className="inline-flex shrink-0 items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground shadow-[var(--shadow-pill)] transition disabled:opacity-50"
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
                    Importing…
                  </>
                ) : (
                  <>
                    Import all days
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
      )}
    </section>
  );
}
