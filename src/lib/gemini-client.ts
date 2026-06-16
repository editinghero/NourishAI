import { SYSTEM_PROMPT } from "./prompt";
import type { Macros } from "./types";

export async function categorizeWithGemini(opts: {
  text: string;
  apiKey: string;
  model: string;
  targets: Macros;
  systemPrompt?: string;
  images?: Array<{ dataUrl: string }>;
}): Promise<unknown> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
    opts.model,
  )}:generateContent?key=${encodeURIComponent(opts.apiKey)}`;

  const parts: any[] = [{ text: opts.text }];
  if (opts.images?.length) {
    for (const img of opts.images) {
      const m = /^data:([^;]+);base64,(.+)$/.exec(img.dataUrl);
      if (!m) continue;
      parts.push({ inlineData: { mimeType: m[1], data: m[2] } });
    }
  }

  const body = {
    systemInstruction: {
      role: "system",
      parts: [{ text: opts.systemPrompt ?? SYSTEM_PROMPT(opts.targets) }],
    },
    contents: [{ role: "user", parts }],
    tools: [{ googleSearch: {} }],
    generationConfig: {
      temperature: 0.4,
      maxOutputTokens: 8192,
    },
  };

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Gemini ${res.status}: ${t.slice(0, 200)}`);
  }

  const json = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  const text = json.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}";
  let cleaned = text.replace(/^```(?:json)?\s*|\s*```$/gi, "").trim();
  const match = cleaned.match(/(\{|\[)[\s\S]*(\}|\])/);
  if (match) {
    cleaned = match[0];
  }
  try {
    return JSON.parse(cleaned);
  } catch (e) {
    console.error("Gemini JSON Parse Error. Raw text:", text);
    throw new Error("AI returned invalid data format. Please try again.");
  }
}

export async function analyzePromptWithGemini(opts: {
  text: string;
  apiKey: string;
  model: string;
}): Promise<{ rewrittenPrompt: string; targets: Macros }> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
    opts.model,
  )}:generateContent?key=${encodeURIComponent(opts.apiKey)}`;

  const systemPrompt = `You are an AI that extracts nutritional targets and rewrites a custom log prompt for clarity.
The user will provide their raw prompt.
Return ONLY a JSON object with:
{
  "rewrittenPrompt": "Clear, professional version of their prompt ensuring AI returns the correct JSON format.",
  "targets": {
    "calories": number,
    "protein": number,
    "carbs": number,
    "fat": number,
    "sugar": number
  }
}
If a target is not mentioned, use 0.`;

  const body = {
    systemInstruction: {
      role: "system",
      parts: [{ text: systemPrompt }],
    },
    contents: [{ role: "user", parts: [{ text: opts.text }] }],
    tools: [{ googleSearch: {} }],
    generationConfig: {
      temperature: 0.4,
    },
  };

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errorText = await res.text();
    console.error("Gemini API Error:", errorText);
    throw new Error(
      `Failed to analyze prompt with Gemini: ${errorText.slice(0, 100)}`,
    );
  }

  const json = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  const text = json.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}";
  let cleaned = text.replace(/^```(?:json)?\s*|\s*```$/gi, "").trim();
  const match = cleaned.match(/(\{|\[)[\s\S]*(\}|\])/);
  if (match) {
    cleaned = match[0];
  }
  try {
    return JSON.parse(cleaned);
  } catch (e) {
    console.error("Gemini JSON Parse Error. Raw text:", text);
    throw new Error("AI returned invalid data format. Please try again.");
  }
}
