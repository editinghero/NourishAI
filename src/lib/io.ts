import type { DayEntry } from "./types";
import { loadDays, saveDays } from "./storage";
import { loadSettings, saveSettings, type Settings } from "./settings";

export type Backup = {
  version: 1;
  exportedAt: string;
  days: DayEntry[];
  settings: Settings;
};

export function exportBackup(): Backup {
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    days: loadDays(),
    settings: loadSettings(),
  };
}

export function downloadBackup() {
  const data = exportBackup();
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `nourishai-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function importBackup(
  json: string,
  mode: "merge" | "replace" = "merge",
): {
  daysAdded: number;
  settingsRestored: boolean;
} {
  const parsed = JSON.parse(json) as Partial<Backup>;
  if (!parsed || !Array.isArray(parsed.days))
    throw new Error("Invalid backup file");
  const existing = mode === "replace" ? [] : loadDays();
  const seen = new Set(existing.map((d) => d.id));
  const merged = [...existing];
  for (const d of parsed.days) {
    if (!d?.id || seen.has(d.id)) continue;
    merged.push(d);
    seen.add(d.id);
  }
  saveDays(merged);
  let settingsRestored = false;
  if (parsed.settings) {
    saveSettings({ ...loadSettings(), ...parsed.settings });
    settingsRestored = true;
  }
  return { daysAdded: merged.length - existing.length, settingsRestored };
}
