import { SYSTEM_PROMPT } from "./prompt";
import type { Macros } from "./types";

export async function categorizeWithAI(opts: {
  text: string;
  apiKey: string;
  apiUrl: string;
  model: string;
  targets: Macros;
  systemPrompt?: string;
  images?: Array<{ dataUrl: string }>;
}): Promise<unknown> {
  const messages: any[] = [
    {
      role: "system",
      content: opts.systemPrompt ?? SYSTEM_PROMPT(opts.targets),
    },
  ];

  let content: any[] | string = opts.text;

  if (opts.images && opts.images.length > 0) {
    content = [{ type: "text", text: opts.text }];
    for (const img of opts.images) {
      content.push({
        type: "image_url",
        image_url: {
          url: img.dataUrl,
        },
      });
    }
  }

  messages.push({
    role: "user",
    content: content,
  });

  const body = {
    model: opts.model,
    messages: messages,
    temperature: 0.4,
    response_format: { type: "json_object" },
  };

  const res = await fetch(opts.apiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${opts.apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const t = await res.text();
    throw new Error(`AI API ${res.status}: ${t.slice(0, 200)}`);
  }

  const json = await res.json();
  const text = json.choices?.[0]?.message?.content ?? "{}";
  let cleaned = text.replace(/^```(?:json)?\s*|\s*```$/gi, "").trim();
  const match = cleaned.match(/(\{|\[)[\s\S]*(\}|\])/);
  if (match) {
    cleaned = match[0];
  }
  try {
    return JSON.parse(cleaned);
  } catch (e) {
    console.error("AI JSON Parse Error. Raw text:", text);
    throw new Error("AI returned invalid data format. Please try again.");
  }
}

export async function analyzePromptWithAI(opts: {
  text: string;
  apiKey: string;
  apiUrl: string;
  model: string;
}): Promise<{ rewrittenPrompt: string; targets: Macros }> {
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
    model: opts.model,
    messages: [
      {
        role: "system",
        content: systemPrompt,
      },
      {
        role: "user",
        content: opts.text,
      },
    ],
    temperature: 0.4,
    response_format: { type: "json_object" },
  };

  const res = await fetch(opts.apiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${opts.apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errorText = await res.text();
    console.error("AI API Error:", errorText);
    throw new Error(
      `Failed to analyze prompt with AI: ${errorText.slice(0, 100)}`,
    );
  }

  const json = await res.json();
  const text = json.choices?.[0]?.message?.content ?? "{}";
  let cleaned = text.replace(/^```(?:json)?\s*|\s*```$/gi, "").trim();
  const match = cleaned.match(/(\{|\[)[\s\S]*(\}|\])/);
  if (match) {
    cleaned = match[0];
  }
  try {
    return JSON.parse(cleaned);
  } catch (e) {
    console.error("AI JSON Parse Error. Raw text:", text);
    throw new Error("AI returned invalid data format. Please try again.");
  }
}
