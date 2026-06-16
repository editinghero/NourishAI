import { useEffect, useRef, useState } from "react";
import gsap from "gsap";

type LogImage = { dataUrl: string; name: string };

type Props = {
  onSubmit: (payload: {
    text: string;
    date: string;
    images: LogImage[];
  }) => Promise<void>;
  loading: boolean;
};

function todayISO() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
}

async function fileToDataUrl(file: File): Promise<string> {
  return await new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result as string);
    r.onerror = rej;
    r.readAsDataURL(file);
  });
}

export function LogPanel({ onSubmit, loading }: Props) {
  const [text, setText] = useState("");
  const [date, setDate] = useState(todayISO());
  const [images, setImages] = useState<LogImage[]>([]);
  const cardRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!cardRef.current) return;
    gsap.fromTo(
      cardRef.current,
      { y: 14, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.5, ease: "power3.out" },
    );
  }, []);

  async function addImages(files: FileList | null) {
    if (!files) return;
    const next: LogImage[] = [];
    for (const f of Array.from(files)) {
      if (!f.type.startsWith("image/")) continue;
      if (f.size > 6_000_000) continue;
      next.push({ dataUrl: await fileToDataUrl(f), name: f.name });
    }
    setImages((p) => [...p, ...next]);
  }

  async function go() {
    if (loading) return;
    if (!text.trim() && images.length === 0) return;
    if (btnRef.current)
      gsap.to(btnRef.current, {
        scale: 0.94,
        duration: 0.1,
        yoyo: true,
        repeat: 1,
      });
    await onSubmit({
      text: text.trim() || "(photo only — identify foods from the images)",
      date,
      images,
    });
    setText("");
    setImages([]);
  }

  return (
    <div ref={cardRef} className="card-soft relative rounded-3xl p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-lg font-bold">Log a meal</h2>
          <p className="text-xs text-muted-foreground">
            Snap photos, type what you ate, pick the day.
          </p>
        </div>
        <DatePill value={date} onChange={setDate} />
      </div>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="e.g. 2 rotis, paneer sabzi, 1 chai with sugar, 1 gulab jamun…"
        rows={4}
        className="w-full resize-none rounded-2xl border border-border bg-input p-4 font-mono text-sm leading-relaxed text-foreground placeholder:text-muted-foreground/70 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
      />

      {images.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {images.map((img, i) => (
            <div key={i} className="relative">
              <img
                src={img.dataUrl}
                alt={img.name}
                className="h-16 w-16 rounded-xl object-cover ring-1 ring-border"
              />
              <button
                onClick={() => setImages((p) => p.filter((_, j) => j !== i))}
                className="absolute -right-1.5 -top-1.5 grid h-5 w-5 place-items-center rounded-full bg-foreground text-background"
                aria-label="Remove"
              >
                <svg
                  width="9"
                  height="9"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                >
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="mt-3 grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2">
        <label className="cursor-pointer rounded-full bg-muted px-3.5 py-2 text-xs font-bold text-foreground transition hover:bg-foreground hover:text-background">
          + Photo
          <input
            type="file"
            accept="image/*"
            multiple
            capture="environment"
            className="hidden"
            onChange={(e) => addImages(e.target.files)}
          />
        </label>
        <div className="truncate text-[11px] text-muted-foreground">
          {images.length > 0
            ? `${images.length} photo${images.length === 1 ? "" : "s"} attached`
            : "Optional — AI reads what's on the plate"}
        </div>
        <button
          ref={btnRef}
          onClick={go}
          disabled={loading || (!text.trim() && images.length === 0)}
          className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground shadow-[var(--shadow-pill)] transition disabled:opacity-50"
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
              Logging…
            </>
          ) : (
            <>
              Log day
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

function DatePill({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const d = new Date(value + "T00:00:00");
  const label = isNaN(d.getTime())
    ? value
    : d.toLocaleDateString(undefined, {
        weekday: "short",
        day: "numeric",
        month: "short",
      });
  return (
    <button
      type="button"
      suppressHydrationWarning
      onClick={() => {
        const el = ref.current;
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
      className="group relative inline-flex shrink-0 items-center gap-2 rounded-full bg-foreground px-3.5 py-2 text-xs font-bold text-background shadow-[var(--shadow-pill)] transition hover:opacity-90"
    >
      <svg
        width="13"
        height="13"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
      >
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M3 9h18M8 3v4M16 3v4" />
      </svg>
      {label}
      <input
        ref={ref}
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="absolute inset-0 cursor-pointer opacity-0"
      />
    </button>
  );
}
