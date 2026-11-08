// Supabase Edge Function "claude": leitet Anfragen der App an die Claude-API weiter.
// Der API-Schlüssel bleibt auf dem Server (Secret ANTHROPIC_API_KEY) und ist nie in der App sichtbar.
// Nutzen dürfen die Funktion nur angemeldete Personen, deren E-Mail in ALLOWED_EMAILS steht.
import { createClient } from "jsr:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });

const MODELS: Record<string, string> = {
  quick: Deno.env.get("CLAUDE_MODEL_QUICK") ?? "claude-haiku-5-5",
  default: Deno.env.get("CLAUDE_MODEL") ?? "claude-sonnet-5-5",
  complex: Deno.env.get("CLAUDE_MODEL") ?? "claude-sonnet-5-5",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "method" }, 405);

  // Wer fragt?
  const auth = req.headers.get("Authorization") ?? "";
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: auth } },
  });
  const { data: { user } } = await sb.auth.getUser(auth.replace(/^Bearer\s+/i, ""));
  if (!user) return json({ error: "not_signed_in" }, 401);
  const allowed = (Deno.env.get("ALLOWED_EMAILS") ?? "").toLowerCase().split(",").map((s) => s.trim()).filter(Boolean);
  if (!allowed.includes((user.email ?? "").toLowerCase())) return json({ ok: false, error: "not_allowed" }, 403);

  const key = Deno.env.get("ANTHROPIC_API_KEY");
  if (!key) return json({ ok: false, error: "no_key" }, 500);

  let body: any;
  try { body = await req.json(); } catch { return json({ error: "bad_json" }, 400); }
  if (body?.ping) return json({ ok: true });

  // Nachricht zusammenbauen: Bilder vor den Text der letzten Nachricht
  const msgs = Array.isArray(body?.messages) ? body.messages.slice(-12) : [];
  if (!msgs.length) return json({ error: "empty" }, 400);
  const images = Array.isArray(body?.images) ? body.images.slice(0, 4) : [];
  const last = msgs[msgs.length - 1];
  const content: any[] = images
    .filter((i: any) => typeof i?.data === "string" && i.data.length < 6_000_000)
    .map((i: any) => ({ type: "image", source: { type: "base64", media_type: /^image\/(png|jpeg|webp|gif)$/.test(i.media_type) ? i.media_type : "image/jpeg", data: i.data } }));
  content.push({ type: "text", text: String(last.content ?? "").slice(0, 20000) });
  const messages = [
    ...msgs.slice(0, -1).map((m: any) => ({ role: m.role === "assistant" ? "assistant" : "user", content: String(m.content ?? "").slice(0, 20000) })),
    { role: "user", content },
  ];

  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({ model: MODELS[body?.tier] ?? MODELS.default, max_tokens: 8000, messages }),
  });
  if (!r.ok) {
    const t = await r.text();
    console.error("Claude API", r.status, t.slice(0, 500));
    return json({ error: "claude_api", status: r.status }, r.status === 429 ? 429 : 502);
  }
  const out = await r.json();
  const text = (out?.content ?? []).filter((c: any) => c.type === "text").map((c: any) => c.text).join("");
  return json({ text, truncated: out?.stop_reason === "max_tokens" });
});
