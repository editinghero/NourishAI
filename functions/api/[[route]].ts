import { Hono } from "hono";
import { handle } from "hono/cloudflare-pages";
import { getCookie, setCookie, deleteCookie } from "hono/cookie";
import { encryptKey, decryptKey } from "../../src/lib/crypto";

export type Env = {
  DB: D1Database;
  ENCRYPTION_SECRET: string;
  DISABLE_REGISTRATION?: string;
};

const app = new Hono<{ Bindings: Env }>().basePath("/api");

// Helper to hash passwords locally
async function hashPassword(pw: string) {
  const msg = new TextEncoder().encode(pw + "salt");
  const hash = await crypto.subtle.digest("SHA-256", msg);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

app.post("/auth/signup", async (c) => {
  if (c.env.DISABLE_REGISTRATION === "true") {
    return c.json({ error: "Registration is currently disabled" }, 403);
  }
  const { username, password } = await c.req.json();
  const db = c.env.DB;
  const hash = await hashPassword(password);
  const id = crypto.randomUUID();

  try {
    await db
      .prepare(
        "INSERT INTO users (id, username, password_hash, created_at) VALUES (?, ?, ?, ?)",
      )
      .bind(id, username, hash, Date.now())
      .run();

    setCookie(c, "session_id", id, {
      httpOnly: true,
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
    return c.json({ success: true });
  } catch (e: any) {
    return c.json({ error: `DB Error: ${e.message || e}` }, 400);
  }
});

app.post("/auth/login", async (c) => {
  const { username, password } = await c.req.json();
  const db = c.env.DB;
  const hash = await hashPassword(password);
  const { results } = await db
    .prepare("SELECT * FROM users WHERE username = ? AND password_hash = ?")
    .bind(username, hash)
    .all();

  if (!results || results.length === 0) {
    return c.json({ error: "Invalid username or password" }, 401);
  }
  const user: any = results[0];
  setCookie(c, "session_id", user.id, {
    httpOnly: true,
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return c.json({ success: true });
});

app.post("/auth/logout", async (c) => {
  deleteCookie(c, "session_id", { path: "/" });
  return c.json({ success: true });
});

app.get("/user", async (c) => {
  const sid = getCookie(c, "session_id");
  if (!sid) return c.json(null);

  const db = c.env.DB;
  const { results } = await db
    .prepare("SELECT * FROM users WHERE id = ?")
    .bind(sid)
    .all();

  if (!results || results.length === 0) return c.json(null);

  const user: any = results[0];
  let decryptedKey = "";
  if (user.encrypted_api_key) {
    decryptedKey = await decryptKey(
      user.encrypted_api_key,
      c.env.ENCRYPTION_SECRET,
    );
  }

  return c.json({
    id: user.id,
    username: user.username,
    apiKey: decryptedKey,
    modelId: user.model_id,
    settingsJson: user.settings_json,
  });
});

app.post("/user/settings", async (c) => {
  const sid = getCookie(c, "session_id");
  if (!sid) return c.json({ error: "Unauthorized" }, 401);

  const { apiKey, modelId, settingsJson } = await c.req.json();
  const db = c.env.DB;
  const updates: string[] = [];
  const values: any[] = [];

  if (apiKey !== undefined) {
    updates.push("encrypted_api_key = ?");
    values.push(
      apiKey ? await encryptKey(apiKey, c.env.ENCRYPTION_SECRET) : null,
    );
  }
  if (modelId !== undefined) {
    updates.push("model_id = ?");
    values.push(modelId);
  }
  if (settingsJson !== undefined) {
    updates.push("settings_json = ?");
    values.push(settingsJson);
  }

  if (updates.length > 0) {
    values.push(sid);
    await db
      .prepare(`UPDATE users SET ${updates.join(", ")} WHERE id = ?`)
      .bind(...values)
      .run();
  }
  return c.json({ success: true });
});

app.get("/days", async (c) => {
  const sid = getCookie(c, "session_id");
  if (!sid) return c.json([]);

  const db = c.env.DB;
  const { results } = await db
    .prepare("SELECT * FROM days WHERE user_id = ? ORDER BY date DESC")
    .bind(sid)
    .all();
  if (!results) return c.json([]);

  return c.json(results.map((r: any) => JSON.parse(r.entry_json)));
});

app.post("/days", async (c) => {
  const sid = getCookie(c, "session_id");
  if (!sid) return c.json({ error: "Unauthorized" }, 401);

  const data = await c.req.json();
  // We expect an array of DayEntry objects, but we might also get a single DayEntry for merging
  const days = Array.isArray(data) ? data : [data];
  const db = c.env.DB;

  for (const day of days) {
    // Feature: Merge meals instead of replace
    const { results } = await db
      .prepare("SELECT entry_json FROM days WHERE user_id = ? AND date = ?")
      .bind(sid, day.date)
      .all();
    if (results && results.length > 0) {
      // Append meals and recalculate totals!
      const existing = JSON.parse((results[0] as any).entry_json);
      existing.meals = [...existing.meals, ...(day.meals || [])];
      existing.totals = {
        calories: existing.totals.calories + day.totals.calories,
        protein: existing.totals.protein + day.totals.protein,
        carbs: existing.totals.carbs + day.totals.carbs,
        fat: existing.totals.fat + day.totals.fat,
        sugar: existing.totals.sugar + day.totals.sugar,
      };
      // Keep existing targets, combine tags/hazards
      existing.tags = Array.from(new Set([...existing.tags, ...day.tags]));
      existing.hazards = Array.from(
        new Set([...existing.hazards, ...day.hazards]),
      );

      await db
        .prepare(
          "UPDATE days SET entry_json = ? WHERE user_id = ? AND date = ?",
        )
        .bind(JSON.stringify(existing), sid, day.date)
        .run();
    } else {
      await db
        .prepare(
          "INSERT INTO days (id, user_id, date, entry_json, created_at) VALUES (?, ?, ?, ?, ?)",
        )
        .bind(day.id, sid, day.date, JSON.stringify(day), day.createdAt)
        .run();
    }
  }

  return c.json({ success: true });
});

app.post("/days/replace", async (c) => {
  const sid = getCookie(c, "session_id");
  if (!sid) return c.json({ error: "Unauthorized" }, 401);

  const days = await c.req.json();
  const db = c.env.DB;

  await db.prepare("DELETE FROM days WHERE user_id = ?").bind(sid).run();
  const batch = [];
  for (const day of days) {
    batch.push(
      db
        .prepare(
          "INSERT INTO days (id, user_id, date, entry_json, created_at) VALUES (?, ?, ?, ?, ?)",
        )
        .bind(day.id, sid, day.date, JSON.stringify(day), day.createdAt),
    );
  }
  if (batch.length > 0) {
    await db.batch(batch);
  }
  return c.json({ success: true });
});

app.delete("/days/:id", async (c) => {
  const sid = getCookie(c, "session_id");
  if (!sid) return c.json({ error: "Unauthorized" }, 401);

  const id = c.req.param("id");
  const db = c.env.DB;
  await db
    .prepare("DELETE FROM days WHERE id = ? AND user_id = ?")
    .bind(id, sid)
    .run();
  return c.json({ success: true });
});

app.put("/days/:id/date", async (c) => {
  const sid = getCookie(c, "session_id");
  if (!sid) return c.json({ error: "Unauthorized" }, 401);

  const id = c.req.param("id");
  const { newDate } = await c.req.json();
  const db = c.env.DB;

  const { results } = await db
    .prepare("SELECT entry_json FROM days WHERE id = ? AND user_id = ?")
    .bind(id, sid)
    .all();
  if (!results || results.length === 0)
    return c.json({ error: "Not found" }, 404);

  const day = JSON.parse((results[0] as any).entry_json);
  day.date = newDate;

  await db
    .prepare(
      "UPDATE days SET date = ?, entry_json = ? WHERE id = ? AND user_id = ?",
    )
    .bind(newDate, JSON.stringify(day), id, sid)
    .run();

  return c.json({ success: true });
});

app.put("/days/:id", async (c) => {
  const sid = getCookie(c, "session_id");
  if (!sid) return c.json({ error: "Unauthorized" }, 401);

  const id = c.req.param("id");
  const updatedDay = await c.req.json();
  const db = c.env.DB;

  await db
    .prepare("UPDATE days SET entry_json = ? WHERE id = ? AND user_id = ?")
    .bind(JSON.stringify(updatedDay), id, sid)
    .run();

  return c.json({ success: true });
});

app.get("/chats/:date", async (c) => {
  const sid = getCookie(c, "session_id");
  if (!sid) return c.json({ error: "Unauthorized" }, 401);
  const date = c.req.param("date");
  const db = c.env.DB;

  const { results } = await db
    .prepare(
      "SELECT * FROM chats WHERE user_id = ? AND date = ? ORDER BY created_at ASC",
    )
    .bind(sid, date)
    .all();

  return c.json(results || []);
});

app.post("/chats/:date", async (c) => {
  const sid = getCookie(c, "session_id");
  if (!sid) return c.json({ error: "Unauthorized" }, 401);
  const date = c.req.param("date");
  const { message } = await c.req.json();
  const db = c.env.DB;

  // 1. Get User Config
  const userQuery = await db
    .prepare(
      "SELECT encrypted_api_key, model_id, settings_json FROM users WHERE id = ?",
    )
    .bind(sid)
    .all();
  if (!userQuery.results || userQuery.results.length === 0)
    return c.json({ error: "User not found" }, 404);
  const user = userQuery.results[0] as any;
  if (!user.encrypted_api_key) return c.json({ error: "No API key set" }, 400);
  const apiKey = await decryptKey(
    user.encrypted_api_key,
    c.env.ENCRYPTION_SECRET,
  );
  const modelId = user.model_id || "";
  let settings = {} as any;
  try {
    settings = JSON.parse(user.settings_json || "{}");
  } catch (e) {}

  const apiUrl = settings.apiUrl;
  if (!apiUrl || !modelId) {
    return c.json({ error: "API URL or Model ID not set" }, 400);
  }

  // 2. Fetch past 3 days of nutrition info
  const daysQuery = await db
    .prepare(
      "SELECT date, entry_json FROM days WHERE user_id = ? ORDER BY date DESC LIMIT 3",
    )
    .bind(sid)
    .all();
  let contextText =
    "You are NourishAI's nutrition assistant. You help the user manage their diet, settings, and understand their logs.\n";
  contextText +=
    "Today's date is " +
    new Date().toISOString().slice(0, 10) +
    ". Chat is for date: " +
    date +
    ".\n";
  contextText +=
    "Here are their recent nutrition logs (to understand what they eat):\n";
  if (daysQuery.results) {
    for (const row of daysQuery.results) {
      contextText += `Date: ${(row as any).date}, Log: ${(row as any).entry_json}\n`;
    }
  }

  // 3. Save User message to DB
  const userMsgId = crypto.randomUUID();
  await db
    .prepare(
      "INSERT INTO chats (id, user_id, date, role, content, created_at) VALUES (?, ?, ?, ?, ?, ?)",
    )
    .bind(userMsgId, sid, date, "user", message, Date.now())
    .run();

  // 4. Fetch Chat History
  const historyQuery = await db
    .prepare(
      "SELECT role, content FROM chats WHERE user_id = ? AND date = ? ORDER BY created_at ASC",
    )
    .bind(sid, date)
    .all();
  const messages: any[] = [{ role: "system", content: contextText }];
  if (historyQuery.results) {
    for (const row of historyQuery.results) {
      messages.push({
        role: (row as any).role,
        content: (row as any).content,
      });
    }
  }

  // 5. Call AI API
  const body = {
    model: modelId,
    messages,
    tools: [
      {
        type: "function",
        function: {
          name: "updateSettings",
          description:
            "Update the user's daily nutrition targets and custom AI prompt. Returns success status.",
          parameters: {
            type: "object",
            properties: {
              targets: {
                type: "object",
                properties: {
                  calories: { type: "number" },
                  protein: { type: "number" },
                  carbs: { type: "number" },
                  fat: { type: "number" },
                  sugar: { type: "number" },
                },
              },
              customLogPrompt: { type: "string" },
            },
          },
        },
      },
    ],
    temperature: 0.5,
  };

  // Main Loop to handle tool calls
  const currentBody = body;
  let finalResponseText = "";

  for (let step = 0; step < 3; step++) {
    const res = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(currentBody),
    });
    if (!res.ok) {
      const err = await res.text();
      return c.json({ error: "AI API Error: " + err }, 500);
    }
    const json = (await res.json()) as any;
    const choice = json.choices?.[0];
    if (!choice) break;

    const msg = choice.message;
    // Save model's response to history so we can append next turns
    currentBody.messages.push(msg);

    if (msg.content) finalResponseText += msg.content;

    if (msg.tool_calls && msg.tool_calls.length > 0) {
      for (const toolCall of msg.tool_calls) {
        if (toolCall.function.name === "updateSettings") {
          try {
            const args = JSON.parse(toolCall.function.arguments);
            const newSettings = { ...settings };
            if (args.targets)
              newSettings.targets = { ...newSettings.targets, ...args.targets };
            if (args.customLogPrompt !== undefined)
              newSettings.customLogPrompt = args.customLogPrompt;
            await db
              .prepare("UPDATE users SET settings_json = ? WHERE id = ?")
              .bind(JSON.stringify(newSettings), sid)
              .run();

            currentBody.messages.push({
              tool_call_id: toolCall.id,
              role: "tool",
              name: toolCall.function.name,
              content: JSON.stringify({ success: true, newSettings }),
            });
            settings = newSettings; // Update local scope
          } catch (e: any) {
            currentBody.messages.push({
              tool_call_id: toolCall.id,
              role: "tool",
              name: toolCall.function.name,
              content: JSON.stringify({ success: false, error: e.message }),
            });
          }
        }
      }
    } else {
      break; // No more function calls, we are done
    }
  }

  // 6. Save Assistant response to DB
  const asstMsgId = crypto.randomUUID();
  await db
    .prepare(
      "INSERT INTO chats (id, user_id, date, role, content, created_at) VALUES (?, ?, ?, ?, ?, ?)",
    )
    .bind(asstMsgId, sid, date, "assistant", finalResponseText, Date.now())
    .run();

  return c.json({
    id: asstMsgId,
    role: "assistant",
    content: finalResponseText,
  });
});

export const onRequest = handle(app);
