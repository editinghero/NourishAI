import type { Macros } from "./types";

const KEY = "nutri.settings.v1";

export type Settings = {
  geminiKey: string;
  geminiModel: string;
  targets: Macros;
  customLogPrompt: string;
};

export const DEFAULT_TARGETS: Macros = {
  calories: 2200,
  protein: 100,
  carbs: 250,
  fat: 70,
  sugar: 40,
};

export const DEFAULT_SETTINGS: Settings = {
  geminiKey: "",
  geminiModel: "gemini-2.0-flash",
  targets: DEFAULT_TARGETS,
  customLogPrompt: "",
};

export function loadSettings(): Settings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      targets: { ...DEFAULT_TARGETS, ...(parsed.targets ?? {}) },
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(s: Settings) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(s));
}
