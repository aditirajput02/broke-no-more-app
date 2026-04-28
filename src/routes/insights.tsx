import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Sparkles, Send, TrendingUp, TrendingDown, PiggyBank } from "lucide-react";
import { useAppState, lastNDays, spentByCategory, totalSpent, inr, CATEGORY_META, type Category } from "@/lib/store";

export const Route = createFileRoute("/insights")({
  head: () => ({ meta: [{ title: "AI Insights — Broke No More" }] }),
  component: InsightsPage,
});

type Msg = { role: "user" | "ai"; text: string };

function InsightsPage() {
  const expenses = useAppState((s) => s.expenses);
  const [chat, setChat] = useState<Msg[]>([
    { role: "ai", text: "Hey 👋 I'm your money bestie. Ask me anything — like 'how much did I spend on coffee this month?'" },
  ]);
  const [input, setInput] = useState("");

  const insights = useMemo(() => {
    const thisWeek = lastNDays(expenses, 7);
    const lastWeek = expenses.filter((e) => {
      const d = (Date.now() - new Date(e.date).getTime()) / 86400000;
      return d >= 7 && d < 14;
    });
    const tw = totalSpent(thisWeek), lw = totalSpent(lastWeek);
    const delta = lw === 0 ? 0 : Math.round(((tw - lw) / lw) * 100);
    const top = spentByCategory(thisWeek)[0];
    return { tw, lw, delta, top };
  }, [expenses]);

  const send = () => {
    const q = input.trim();
    if (!q) return;
    setInput("");
    setChat((c) => [...c, { role: "user", text: q }]);
    setTimeout(() => {
      setChat((c) => [...c, { role: "ai", text: replyTo(q, expenses) }]);
    }, 500);
  };

  return (
    <div className="mx-auto max-w-xl px-5 pt-8 animate-float-up">
      <div className="flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-primary" />
        <h1 className="text-2xl font-bold">AI Insights</h1>
      </div>
      <p className="text-sm text-muted-foreground">Receipts with reasoning.</p>

      <div className="mt-5 space-y-3">
        <div className="glass rounded-3xl p-5 shadow-card border border-primary/30">
          <div className="flex items-center gap-2 text-xs font-semibold text-primary uppercase tracking-wider">
            {insights.delta >= 0 ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
            This week vs last
          </div>
          <p className="mt-2 text-lg font-semibold">
            {insights.delta >= 0
              ? `You're spending ${Math.abs(insights.delta)}% more this week 👀`
              : `You cut spending by ${Math.abs(insights.delta)}% — slay 💅`}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {inr(insights.tw)} this week · {inr(insights.lw)} last week
          </p>
        </div>

        {insights.top && (
          <div className="rounded-3xl p-5 shadow-coral bg-gradient-coral text-primary-foreground">
            <p className="text-xs font-semibold uppercase tracking-wider opacity-90">Top category</p>
            <p className="mt-1 text-2xl font-bold">{CATEGORY_META[insights.top[0]].emoji} {insights.top[0]}</p>
            <p className="text-sm opacity-90">{inr(insights.top[1])} this week. Your wallet called. It's sobbing. 😭</p>
          </div>
        )}

        <div className="glass rounded-3xl p-5 shadow-card">
          <div className="flex items-center gap-2 text-xs font-semibold text-teal uppercase tracking-wider">
            <PiggyBank className="h-3.5 w-3.5" /> Smart move
          </div>
          <p className="mt-2 font-semibold">Cut 2 Swiggy orders/week = save ₹3,600/month</p>
          <p className="text-xs text-muted-foreground mt-1">That's a Spotify family + a movie night. Just saying.</p>
        </div>
      </div>

      <div className="mt-6">
        <p className="text-xs uppercase tracking-wider text-muted-foreground mb-3">Ask your money bestie</p>
        <div className="space-y-2 mb-3 max-h-72 overflow-y-auto">
          {chat.map((m, i) => (
            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"} animate-pop-in`}>
              <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${m.role === "user" ? "bg-gradient-primary text-primary-foreground" : "glass"}`}>
                {m.text}
              </div>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            placeholder="How much did I spend on food?"
            className="flex-1 glass rounded-full px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary"
          />
          <button onClick={send} className="h-12 w-12 rounded-full bg-gradient-primary flex items-center justify-center text-primary-foreground shadow-glow active:scale-95 transition-transform">
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

function replyTo(q: string, expenses: ReturnType<typeof useAppState<any>>) {
  const ql = q.toLowerCase();
  const cats = Object.keys(CATEGORY_META) as Category[];
  const matched = cats.find((c) => ql.includes(c.toLowerCase())) ||
    (ql.includes("coffee") || ql.includes("swiggy") || ql.includes("zomato") ? "Food" as Category : null);
  if (matched) {
    const total = (expenses as any[]).filter((e) => e.category === matched).reduce((s, e) => s + e.amount, 0);
    return `You've dropped ${inr(total)} on ${matched} ${CATEGORY_META[matched].emoji}. Worth it? You decide.`;
  }
  if (ql.includes("total") || ql.includes("spent") || ql.includes("how much")) {
    return `Total damage so far: ${inr(totalSpent(expenses as any[]))}. Deep breaths. 🧘`;
  }
  if (ql.includes("save")) return "Easy wins: cut 1 subscription you don't use + skip 2 takeout meals = ~₹2k/month saved 💰";
  return "Hmm, try asking about a category like 'food' or 'shopping' — I'll spill the tea ☕";
}