import { useRef, useState } from "react";
import gsap from "gsap";

type Props = {
  onSubmit: (text: string) => Promise<void>;
  loading: boolean;
};

export function InputPanel({ onSubmit, loading }: Props) {
  const [text, setText] = useState("");
  const [drag, setDrag] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);

  async function handleFiles(files: FileList | null) {
    if (!files) return;
    const parts: string[] = [];
    for (const f of Array.from(files)) {
      if (f.size > 1_000_000) continue;
      parts.push(`--- ${f.name} ---\n${await f.text()}`);
    }
    setText((prev) => (prev ? prev + "\n\n" : "") + parts.join("\n\n"));
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

  return (
    <div
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
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-lg font-bold">Log today</h2>
          <p className="text-xs text-muted-foreground">
            Paste meals, an AI analysis, or drop .md / .txt files.
          </p>
        </div>
        <label className="shrink-0 cursor-pointer rounded-full bg-foreground px-3.5 py-2 text-xs font-bold text-background transition hover:opacity-90">
          + Upload
          <input
            type="file"
            accept=".md,.txt,.markdown"
            multiple
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
        </label>
      </div>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="e.g. 2 rotis, paneer sabzi, 1 chai with sugar, 1 gulab jamun..."
        rows={6}
        className="w-full resize-none rounded-2xl border border-border bg-input p-4 font-mono text-sm leading-relaxed text-foreground placeholder:text-muted-foreground/70 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
      />

      <div className="mt-3 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
        <div className="min-w-0 text-xs text-muted-foreground">
          {text.length > 0
            ? `${text.length.toLocaleString()} chars`
            : "Drag files anywhere here"}
        </div>
        <button
          ref={btnRef}
          onClick={go}
          disabled={loading || !text.trim()}
          className="shrink-0 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground shadow-[var(--shadow-pill)] transition disabled:opacity-50"
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
              Analysing…
            </>
          ) : (
            <>
              Categorise
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
  );
}
