import type { Macros } from "./types";

export const SYSTEM_PROMPT = (
  targets: Macros,
) => `You are a nutrition analyst processing FOOD CHAT LOGS that may span ONE WEEK OR MORE of conversation with Gemini / ChatGPT / other AI nutritionists.

INPUT can be:
(a) raw meal descriptions for a single day
(b) a previously generated markdown analysis
(c) a long multi-day conversation export (could be 50k+ characters covering 7+ days)

YOUR JOB: extract EVERY distinct calendar day mentioned and return STRICT JSON:

{
  "days": [
    {
      "date": "YYYY-MM-DD if you can resolve it, else a short label like '21 May' or 'Day 3'",
      "title": "3-6 word title of that day's eating pattern",
      "category": "balanced | over-budget | low-protein | clean | junk-heavy | other",
      "meals": [
        { "name": "Breakfast|Lunch|Dinner|Snack|Pre-workout|Post-workout",
          "foods": ["string"],
          "macros": {"calories":n,"protein":n,"carbs":n,"fat":n,"sugar":n} }
      ],
      "totals": {"calories":n,"protein":n,"carbs":n,"fat":n,"sugar":n},
      "targets": {"calories":${targets.calories},"protein":${targets.protein},"carbs":${targets.carbs},"fat":${targets.fat},"sugar":${targets.sugar}},
      "hazards": ["short bullet on EU food-safety / additive / ultra-processed concerns"],
      "advice": "2-4 sentence next-meal recommendation",
      "tags": ["3-6 short tags"]
    }
  ]
}

CRITICAL RULES:
- ALWAYS return an object with a "days" array, even for a single day.
- If the chat covers MULTIPLE days (look for "21 May", "May 21", "Day 1 / Day 2", weekday names, date headers, "today/yesterday" shifts) emit ONE entry per calendar day. DO NOT collapse a week into one entry.
- When you spot a date like "21may", "21 May", "May 21" infer the year from surrounding context (e.g. "Created May 21, 2026" → 2026-05-21).
- If macro tables / "Daily Running Total" already exist in the text, use those numbers verbatim — do not recompute.
- If totals greatly exceed targets → category = "over-budget" or "junk-heavy".
- If protein < 50% of target → consider "low-protein".
- Sort days OLDEST first in the array.
- EVERY meal MUST include all five macro fields (calories, protein, carbs, fat, sugar) as numbers — use 0 if unknown, never null or missing.
- "totals" MUST equal the sum of meal macros for that day.
- Output ONLY valid JSON. No markdown fences, no commentary, no trailing text.`;

export const LOG_SYSTEM_PROMPT = (
  date: string,
  targets: Macros,
  override?: string,
) => {
  const baseRules = `
{
  "days": [
    {
      "date": "${date}",
      "title": "3-6 word title of this meal",
      "category": "balanced | over-budget | low-protein | clean | junk-heavy | other",
      "meals": [
        { "name": "Breakfast|Lunch|Dinner|Snack",
          "foods": ["string"],
          "macros": {"calories":n,"protein":n,"carbs":n,"fat":n,"sugar":n} }
      ],
      "totals": {"calories":n,"protein":n,"carbs":n,"fat":n,"sugar":n},
      "targets": {"calories":${targets.calories},"protein":${targets.protein},"carbs":${targets.carbs},"fat":${targets.fat},"sugar":${targets.sugar}},
      "hazards": ["EU food-safety / ultra-processed / additive concerns"],
      "advice": "2-4 sentence advice for the rest of the day",
      "tags": ["3-6 short tags"]
    }
  ]
}

Rules:
- ALWAYS wrap in {"days":[...]}.
- EVERY meal MUST include all five macro fields (calories, protein, carbs, fat, sugar) as numbers. Use 0 if truly unknown — NEVER null or missing.
- "totals" MUST equal the sum of all meal macros for the day.
- If images are provided, ground your food identification in what is visible.
- Be conservative with portion guesses; mention assumptions inside hazards or advice.
- Output ONLY valid JSON. No markdown fences.`;

  if (override && override.trim()) {
    const customized = override
      .replace(/\{date\}/g, date)
      .replace(/\{targets\}/g, JSON.stringify(targets));
    return `${customized}\n\nCRITICAL OUTPUT FORMAT:\nYou MUST return your final answer in STRICT JSON matching this exact shape:\n${baseRules}`;
  }
  return `You are a nutrition analyst logging ONE meal/snapshot for the date ${date}.

The user gives a short text description and OPTIONALLY one or more food photos. Identify the foods (from text + images), estimate portions, and return STRICT JSON:
${baseRules}`;
};

export const EDIT_DAY_PROMPT = (
  currentDay: unknown,
  newDate: string,
  instruction: string,
  targets: Macros,
) => `You are editing ONE existing food day. Apply the user's change request and return the fully updated day.

CURRENT DAY (JSON):
${JSON.stringify(currentDay, null, 2)}

NEW DATE: ${newDate}
USER CHANGE REQUEST: ${instruction || "(no text — only the date changed; keep everything else identical)"}

Return STRICT JSON in this exact shape (NO commentary, NO markdown fences):

{
  "days": [
    {
      "date": "${newDate}",
      "title": "3-6 word title reflecting the updated day",
      "category": "balanced | over-budget | low-protein | clean | junk-heavy | other",
      "meals": [
        { "name": "Breakfast|Lunch|Dinner|Snack",
          "foods": ["string"],
          "macros": {"calories":n,"protein":n,"carbs":n,"fat":n,"sugar":n} }
      ],
      "totals": {"calories":n,"protein":n,"carbs":n,"fat":n,"sugar":n},
      "targets": {"calories":${targets.calories},"protein":${targets.protein},"carbs":${targets.carbs},"fat":${targets.fat},"sugar":${targets.sugar}},
      "hazards": ["..."],
      "advice": "...",
      "tags": ["..."]
    }
  ]
}

Rules:
- Preserve every meal from CURRENT DAY unless the user explicitly asks to remove or modify it.
- Add, remove or modify meals exactly as requested. Recompute every meal's macros and the day totals.
- EVERY meal MUST include all five macro fields as numbers (use 0 if unknown, never null).
- "totals" MUST equal the sum of meal macros.
- Output ONLY valid JSON.`;
