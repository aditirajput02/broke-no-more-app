// AI insights + chat using Lovable AI Gateway
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages, summary } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const system = `You are "Money Bestie" — a witty, Gen-Z financial coach for the app Broke No More.
Tone: friendly, slightly sassy, uses emojis sparingly. Keep replies under 4 sentences.
The user's spending data this month is below as JSON. Use it to ground every answer.
If asked for analysis, give: 1) one top high-spend flag, 2) one low-spend win, 3) one personalized saving tip.
Currency is INR (₹).

SPENDING_CONTEXT:
${JSON.stringify(summary)}`;

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [{ role: "system", content: system }, ...messages],
      }),
    });

    if (!resp.ok) {
      if (resp.status === 429) return json({ error: "Rate limit hit. Try again in a sec." }, 429);
      if (resp.status === 402) return json({ error: "AI credits exhausted. Add credits in Settings → Workspace → Usage." }, 402);
      const t = await resp.text();
      console.error("AI gateway error", resp.status, t);
      return json({ error: "AI gateway error" }, 500);
    }

    const data = await resp.json();
    const reply = data.choices?.[0]?.message?.content ?? "Hmm, I'm speechless 🤐";
    return json({ reply });
  } catch (e) {
    console.error("ai-insights error:", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}