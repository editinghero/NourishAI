import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import type { Settings } from "@/lib/settings";
import { DEFAULT_TARGETS } from "@/lib/settings";
import { analyzePromptWithGemini } from "@/lib/gemini-client";
import type { DayEntry } from "@/lib/types";

type Props = {
  open: boolean;
  onClose: () => void;
  settings: Settings;
  days: DayEntry[];
  onSave: (s: Settings) => void;
  onImport: (
    days: DayEntry[],
    settings: Settings,
    mode: "merge" | "replace",
  ) => void;
};

type View = "menu" | "api" | "targets" | "prompt" | "data";

export function SettingsSheet({
  open,
  onClose,
  settings,
  days,
  onSave,
  onImport,
}: Props) {
  const [draft, setDraft] = useState<Settings>(settings);
  const [view, setView] = useState<View>("menu");
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      setDraft(settings);
      setView("menu");
    }
  }, [open, settings]);

  useEffect(() => {
    if (!open || !panelRef.current) return;
    gsap.fromTo(
      panelRef.current,
      { y: 40, opacity: 0, scale: 0.97 },
      { y: 0, opacity: 1, scale: 1, duration: 0.4, ease: "power3.out" },
    );
  }, [open]);

  if (!open) return null;

  function save(next: Settings) {
    setDraft(next);
    onSave(next);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/30 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        ref={panelRef}
        onClick={(e) => e.stopPropagation()}
        className="card-soft w-full max-w-lg rounded-3xl bg-card p-6 shadow-[var(--shadow-card)]"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {view !== "menu" && (
              <button
                onClick={() => setView("menu")}
                className="grid h-9 w-9 place-items-center rounded-full bg-muted text-muted-foreground hover:text-foreground"
                aria-label="Back"
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.4"
                >
                  <path d="m15 18-6-6 6-6" />
                </svg>
              </button>
            )}
            <h2 className="text-2xl font-bold">
              {view === "menu" && "Settings"}
              {view === "api" && "Gemini API key"}
              {view === "targets" && "Daily targets"}
              {view === "prompt" && "Custom log prompt"}
              {view === "data" && "Backup & restore"}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="grid h-9 w-9 place-items-center rounded-full bg-muted text-muted-foreground hover:text-foreground"
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

        <div className="mt-5">
          {view === "menu" && (
            <Menu
              setView={setView}
              hasKey={!!draft.geminiKey.trim()}
              hasCustomPrompt={!!draft.customLogPrompt.trim()}
            />
          )}
          {view === "api" && (
            <ApiView draft={draft} setDraft={setDraft} onSave={save} />
          )}
          {view === "targets" && (
            <TargetsView draft={draft} setDraft={setDraft} onSave={save} />
          )}
          {view === "prompt" && (
            <PromptView draft={draft} setDraft={setDraft} onSave={save} />
          )}
          {view === "data" && (
            <DataView days={days} settings={draft} onImport={onImport} />
          )}
        </div>
      </div>
    </div>
  );
}

function Menu({
  setView,
  hasKey,
  hasCustomPrompt,
}: {
  setView: (v: View) => void;
  hasKey: boolean;
  hasCustomPrompt: boolean;
}) {
  const items: Array<{
    key: View;
    label: string;
    sub: string;
    status?: string;
    icon: React.ReactNode;
  }> = [
    {
      key: "api",
      label: "Gemini API key",
      sub: "Use your own Google AI Studio key",
      status: hasKey ? "Set" : "Required",
      icon: (
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
        >
          <path d="M21 2 9 14M21 2l-7 20-4-9-9-4 20-7Z" />
        </svg>
      ),
    },
    {
      key: "targets",
      label: "Daily targets",
      sub: "Calories, protein, carbs, fat, sugar",
      icon: (
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
        >
          <circle cx="12" cy="12" r="9" />
          <circle cx="12" cy="12" r="5" />
          <circle cx="12" cy="12" r="1.5" fill="currentColor" />
        </svg>
      ),
    },
    {
      key: "prompt",
      label: "Custom log prompt",
      sub: "Override the AI instructions for Log",
      status: hasCustomPrompt ? "Custom" : "Default",
      icon: (
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
        >
          <path d="M4 4h12l4 4v12H4z" />
          <path d="M8 10h8M8 14h8M8 18h5" />
        </svg>
      ),
    },
    {
      key: "data",
      label: "Backup & restore",
      sub: "Export or import all your data",
      icon: (
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
        >
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <path d="m7 10 5 5 5-5" />
          <path d="M12 15V3" />
        </svg>
      ),
    },
  ];

  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        {items.map((it) => (
          <button
            key={it.key}
            onClick={() => setView(it.key)}
            className="group flex flex-col items-start gap-2 rounded-3xl border border-border bg-card p-4 text-left transition hover:border-primary hover:shadow-[var(--shadow-pill)]"
          >
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">
              {it.icon}
            </span>
            <div className="min-w-0">
              <div className="text-sm font-bold">{it.label}</div>
              <div className="text-[11px] leading-snug text-muted-foreground">
                {it.sub}
              </div>
            </div>
            {it.status && (
              <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                {it.status}
              </span>
            )}
          </button>
        ))}
      </div>
      <div className="mt-8 text-center">
        <button
          onClick={async () => {
            if (confirm("Are you sure you want to log out?")) {
              await fetch("/api/auth/logout", { method: "POST" });
              window.location.href = "/login";
            }
          }}
          className="text-xs font-bold text-muted-foreground underline-offset-4 hover:text-[color:var(--danger)] hover:underline transition-colors"
        >
          Log out
        </button>
      </div>
    </>
  );
}

function ApiView({
  draft,
  setDraft,
  onSave,
}: {
  draft: Settings;
  setDraft: (s: Settings) => void;
  onSave: (s: Settings) => void;
}) {
  return (
    <div className="space-y-3">
      <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
        Google Gemini API key
      </label>
      <input
        type="password"
        value={draft.geminiKey}
        onChange={(e) => setDraft({ ...draft, geminiKey: e.target.value })}
        placeholder="Paste your AI Studio key — stays in this browser"
        className="w-full rounded-2xl border border-border bg-input px-4 py-3 font-mono text-xs focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
      />
      <p className="text-[11px] text-muted-foreground">
        With a key, requests go directly from your browser to Gemini. This is
        required.
      </p>
      {draft.geminiKey && (
        <div className="space-y-1 mt-2">
          <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            Gemini Model ID
          </label>
          <input
            type="text"
            list="gemini-models"
            value={draft.geminiModel}
            onChange={(e) =>
              setDraft({ ...draft, geminiModel: e.target.value })
            }
            placeholder="e.g. gemini-2.5-flash"
            className="w-full rounded-2xl border border-border bg-input px-4 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
          <datalist id="gemini-models">
            <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
            <option value="gemini-2.5-flash-lite">Gemini 2.5 Flash Lite</option>
            <option value="gemini-3-flash-preview">Gemini 3 Flash</option>
            <option value="gemini-3.1-flash-lite">Gemini 3.1 Flash Lite</option>
            <option value="gemini-3.5-flash">Gemini 3.5 Flash</option>
            <option value="gemma-4-26b-a4b">Gemma 4 26B (MoE)</option>
            <option value="gemma-4-31b-it">Gemma 4 31B (Dense)</option>
          </datalist>
        </div>
      )}
      <SaveBar onSave={() => onSave(draft)} />
    </div>
  );
}

function TargetsView({
  draft,
  setDraft,
  onSave,
}: {
  draft: Settings;
  setDraft: (s: Settings) => void;
  onSave: (s: Settings) => void;
}) {
  function patch(k: keyof typeof DEFAULT_TARGETS, v: string) {
    setDraft({ ...draft, targets: { ...draft.targets, [k]: Number(v) || 0 } });
  }
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-5 gap-2">
        {(["calories", "protein", "carbs", "fat", "sugar"] as const).map(
          (k) => (
            <label key={k} className="flex flex-col gap-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                {k.slice(0, 3)}
              </span>
              <input
                type="number"
                inputMode="numeric"
                value={draft.targets[k]}
                onChange={(e) => patch(k, e.target.value)}
                className="rounded-xl border border-border bg-input px-2 py-2 text-center text-sm font-bold tabular-nums focus:border-primary focus:outline-none"
              />
            </label>
          ),
        )}
      </div>
      <button
        onClick={() => setDraft({ ...draft, targets: DEFAULT_TARGETS })}
        className="text-[11px] font-semibold text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
      >
        Reset to defaults
      </button>
      <SaveBar onSave={() => onSave(draft)} />
    </div>
  );
}

function PromptView({
  draft,
  setDraft,
  onSave,
}: {
  draft: Settings;
  setDraft: (s: Settings) => void;
  onSave: (s: Settings) => void;
}) {
  const [analyzing, setAnalyzing] = useState(false);

  async function handleAnalyze() {
    if (!draft.customLogPrompt.trim() || analyzing) return;
    if (!draft.geminiKey) {
      alert("Please set your Gemini API key first to use this feature.");
      return;
    }
    setAnalyzing(true);
    try {
      const res = await analyzePromptWithGemini({
        text: draft.customLogPrompt,
        apiKey: draft.geminiKey,
        model: draft.geminiModel || "gemini-2.5-flash",
      });

      if (res) {
        const nextDraft = {
          ...draft,
          customLogPrompt: res.rewrittenPrompt || draft.customLogPrompt,
          targets: {
            ...draft.targets,
            ...res.targets,
          },
        };
        setDraft(nextDraft);
        onSave(nextDraft);
        alert("Prompt analyzed and macros automatically saved!");
      }
    } catch (e) {
      console.error(e);
      alert(e instanceof Error ? e.message : "Failed to analyze prompt.");
    } finally {
      setAnalyzing(false);
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Used <strong>only</strong> for the Log section. Leave blank to use the
        built-in prompt. Placeholders: <code>{`{date}`}</code> and{" "}
        <code>{`{targets}`}</code>. The AI must still return JSON in the form{" "}
        <code>{`{"days":[...]}`}</code>.
      </p>
      <textarea
        value={draft.customLogPrompt}
        onChange={(e) =>
          setDraft({ ...draft, customLogPrompt: e.target.value })
        }
        rows={9}
        placeholder={`e.g. You are a vegan nutritionist for the date {date}. Targets: {targets}. Return JSON {"days":[...]}.`}
        className="w-full resize-y rounded-2xl border border-border bg-input p-3 font-mono text-xs focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
      />
      <div className="flex items-center justify-between">
        <button
          onClick={() => setDraft({ ...draft, customLogPrompt: "" })}
          className="text-[11px] font-semibold text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          Clear custom prompt
        </button>
        <button
          onClick={handleAnalyze}
          disabled={analyzing || !draft.customLogPrompt.trim()}
          className="text-[11px] font-semibold text-primary underline-offset-4 hover:underline disabled:opacity-50 disabled:hover:no-underline"
        >
          {analyzing ? "Analyzing..." : "Analyze & Set Macros"}
        </button>
      </div>
      <SaveBar onSave={() => onSave(draft)} />
    </div>
  );
}

function DataView({
  days,
  settings,
  onImport,
}: {
  days: DayEntry[];
  settings: Settings;
  onImport: (
    days: DayEntry[],
    settings: Settings,
    mode: "merge" | "replace",
  ) => void;
}) {
  const [status, setStatus] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function handleDownload() {
    const backup = {
      version: 1,
      exportedAt: new Date().toISOString(),
      days,
      settings,
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `nourishai-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setStatus("Backup downloaded.");
  }

  async function handleImport(file: File, mode: "merge" | "replace") {
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      if (!parsed || !Array.isArray(parsed.days))
        throw new Error("Invalid backup file");
      onImport(parsed.days, parsed.settings || settings, mode);
      setStatus("Imported successfully.");
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Import failed");
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Backups include every logged day and your settings. Files stay on your
        device.
      </p>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <button
          onClick={handleDownload}
          className="rounded-2xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground shadow-[var(--shadow-pill)]"
        >
          Export JSON
        </button>
        <button
          onClick={() => fileRef.current?.click()}
          className="rounded-2xl border border-border bg-card px-4 py-3 text-sm font-bold"
        >
          Import (merge)
        </button>
        <button
          onClick={() => {
            if (!confirm("Replace ALL existing data with the backup file?"))
              return;
            const inp = document.createElement("input");
            inp.type = "file";
            inp.accept = "application/json,.json";
            inp.onchange = () =>
              inp.files?.[0] && handleImport(inp.files[0], "replace");
            inp.click();
          }}
          className="rounded-2xl border border-border bg-card px-4 py-3 text-sm font-bold text-[color:var(--danger)]"
        >
          Import (replace)
        </button>
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={(e) =>
          e.target.files?.[0] && handleImport(e.target.files[0], "merge")
        }
      />
      {status && (
        <div className="rounded-xl bg-muted px-3 py-2 text-xs">{status}</div>
      )}
    </div>
  );
}

function SaveBar({ onSave }: { onSave: () => void }) {
  return (
    <div className="flex items-center justify-end pt-2">
      <button
        onClick={onSave}
        className="rounded-full bg-primary px-6 py-2.5 text-sm font-bold text-primary-foreground shadow-[var(--shadow-pill)]"
      >
        Save
      </button>
    </div>
  );
}
