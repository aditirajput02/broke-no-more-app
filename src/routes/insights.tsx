import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { Sparkles, Send, TrendingUp, TrendingDown, PiggyBank, Loader2, Share2 } from "lucide-react";
import { useAppData, lastNDays, spentByCategory, totalSpent, inr, CATEGORY_META } from "@/lib/store";
import { toPng } from "html-to-image";
import { supabase } from "@/integrations/supabase/client";
import { CenterSpinner } from "./index";
import { toast } from "sonner";

export const Route = createFileRoute("/insights")({
  head: () => ({ meta: [{ title: "AI Insights — Broke No More" }] }),
  component: InsightsPage,
});

type Msg = { role: "user" | "assistant"; content: string };

function InsightsPage() {
  const { expenses, profile, loading } = useAppData();
  const shareRef = useRef<HTMLDivElement | null>(null);
  const [sharing, setSharing] = useState(false);
  const [chat, setChat] = useState<Msg[]>([
    { role: "assistant", content: "Hey 👋 I'm your money bestie. Ask me about your spending — try 'analyze my month' or 'how much on food?'" },
  ]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);

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

  const summary = useMemo(() => ({
    income: profile?.monthly_income ?? 0,
    last30Days: spentByCategory(lastNDays(expenses, 30)).map(([c, v]) => ({ category: c, amount: v })),
    last7Days: spentByCategory(lastNDays(expenses, 7)).map(([c, v]) => ({ category: c, amount: v })),
    totalThisMonth: totalSpent(lastNDays(expenses, 30)),
    transactionCount: expenses.length,
  }), [expenses, profile]);

  const weekTopCats = useMemo(
    () => spentByCategory(lastNDays(expenses, 7)).slice(0, 4),
    [expenses],
  );

  const handleShare = async () => {
    if (!shareRef.current || sharing) return;
    setSharing(true);
    try {
      const dataUrl = await toPng(shareRef.current, {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor: "#0b0717",
      });
      const filename = `broke-no-more-week-${new Date().toISOString().slice(0, 10)}.png`;

      // Try Web Share API with file first (mobile)
      try {
        const blob = await (await fetch(dataUrl)).blob();
        const file = new File([blob], filename, { type: "image/png" });
        const navAny = navigator as any;
        if (navAny.canShare && navAny.canShare({ files: [file] })) {
          await navAny.share({ files: [file], title: "My week on Broke No More" });
          toast.success("Shared! 🎉");
          return;
        }
      } catch {/* fall through to download */}

      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = filename;
      a.click();
      toast.success("Saved your weekly flex 📸");
    } catch (e: any) {
      toast.error(e?.message ?? "Couldn't generate image");
    } finally {
      setSharing(false);
    }
  };

  const send = async (text?: string) => {
    const q = (text ?? input).trim();
    if (!q || sending) return;
    setInput("");
    const newMsgs: Msg[] = [...chat, { role: "user", content: q }];
    setChat(newMsgs);
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-insights", {
        body: { messages: newMsgs, summary },
      });
      if (error) throw error;
      if (data?.error) { toast.error(data.error); return; }
      setChat((c) => [...c, { role: "assistant", content: data.reply }]);
    } catch (e: any) {
      toast.error(e?.message ?? "AI is sleeping 💤");
    } finally { setSending(false); }
  };

  if (loading) return <CenterSpinner />;

  return (
    <div className="mx-auto max-w-xl px-5 pt-8 animate-float-up">
      <div className="flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-primary" />
        <h1 className="text-2xl font-bold">AI Insights</h1>
        <button
          onClick={handleShare}
          disabled={sharing}
          className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-gradient-primary px-3.5 py-1.5 text-xs font-semibold text-primary-foreground shadow-glow active:scale-95 transition-transform disabled:opacity-60"
        >
          {sharing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Share2 className="h-3.5 w-3.5" />}
          Share week
        </button>
      </div>
      <p className="text-sm text-muted-foreground">Receipts with reasoning.</p>

      {/* Off-screen shareable card rendered into a PNG */}
      <div className="fixed -left-[9999px] top-0" aria-hidden>
        <div
          ref={shareRef}
          style={{
            width: 540,
            padding: 32,
            background: "linear-gradient(135deg, #2a0e54 0%, #0b0717 60%, #1a0a3a 100%)",
            color: "#fff",
            fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
            borderRadius: 28,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ fontSize: 12, letterSpacing: 2, textTransform: "uppercase", opacity: 0.7 }}>
              Broke No More
            </div>
            <div style={{ fontSize: 12, opacity: 0.6 }}>
              {profile?.username ? `@${profile.username}` : "weekly recap"}
            </div>
          </div>

          <div style={{ marginTop: 18, fontSize: 14, opacity: 0.8 }}>This week I spent</div>
          <div style={{ fontSize: 64, fontWeight: 800, lineHeight: 1.05, marginTop: 4 }}>
            {inr(insights.tw)}
          </div>
          <div style={{ marginTop: 6, fontSize: 14, opacity: 0.85 }}>
            {insights.lw === 0
              ? "Fresh start. Watch me cook 👀"
              : insights.delta >= 0
                ? `${Math.abs(insights.delta)}% more than last week 😬`
                : `${Math.abs(insights.delta)}% less than last week — slay 💅`}
          </div>

          <div style={{ marginTop: 22, fontSize: 11, letterSpacing: 1.5, textTransform: "uppercase", opacity: 0.6 }}>
            Top categories
          </div>
          <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 8 }}>
            {weekTopCats.length === 0 && (
              <div style={{ fontSize: 14, opacity: 0.7 }}>No spending this week. Iconic. 🌟</div>
            )}
            {weekTopCats.map(([c, v]) => {
              const pct = insights.tw > 0 ? Math.round((v / insights.tw) * 100) : 0;
              return (
                <div key={c} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ fontSize: 22, width: 28 }}>{CATEGORY_META[c].emoji}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, fontWeight: 600 }}>
                      <span>{c}</span>
                      <span>{inr(v)}</span>
                    </div>
                    <div style={{ marginTop: 4, height: 8, background: "rgba(255,255,255,0.1)", borderRadius: 999 }}>
                      <div style={{
                        width: `${pct}%`, height: "100%", borderRadius: 999,
                        background: "linear-gradient(90deg, #c084fc, #f97171)",
                      }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ marginTop: 24, paddingTop: 16, borderTop: "1px solid rgba(255,255,255,0.1)", display: "flex", justifyContent: "space-between", fontSize: 11, opacity: 0.6 }}>
            <span>{new Date().toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</span>
            <span>brokenomore.app ✨</span>
          </div>
        </div>
      </div>

      <div className="mt-5 space-y-3">
        <div className="glass rounded-3xl p-5 shadow-card border border-primary/30">
          <div className="flex items-center gap-2 text-xs font-semibold text-primary uppercase tracking-wider">
            {insights.delta >= 0 ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
            This week vs last
          </div>
          <p className="mt-2 text-lg font-semibold">
            {insights.lw === 0
              ? `Fresh start! ${inr(insights.tw)} this week.`
              : insights.delta >= 0
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

        <button onClick={() => send("Analyze my spending this month — give me one high-spend flag, one win, and one personalized saving tip.")}
          className="w-full glass rounded-3xl p-5 shadow-card text-left hover:scale-[1.01] transition-transform">
          <div className="flex items-center gap-2 text-xs font-semibold text-teal uppercase tracking-wider">
            <PiggyBank className="h-3.5 w-3.5" /> Tap for full AI analysis
          </div>
          <p className="mt-2 font-semibold">Get flags, wins, and a personalized saving move</p>
          <p className="text-xs text-muted-foreground mt-1">Powered by Money Bestie 💜</p>
        </button>
      </div>

      <div className="mt-6">
        <p className="text-xs uppercase tracking-wider text-muted-foreground mb-3">Ask your money bestie</p>
        <div className="space-y-2 mb-3 max-h-[40vh] overflow-y-auto">
          {chat.map((m, i) => (
            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"} animate-pop-in`}>
              <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap ${m.role === "user" ? "bg-gradient-primary text-primary-foreground" : "glass"}`}>
                {m.content}
              </div>
            </div>
          ))}
          {sending && (
            <div className="flex justify-start">
              <div className="glass rounded-2xl px-4 py-2.5 text-sm flex items-center gap-2">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> thinking…
              </div>
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            placeholder="How much did I spend on food?"
            className="flex-1 glass rounded-full px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary"
          />
          <button onClick={() => send()} disabled={sending || !input.trim()}
            className="h-12 w-12 rounded-full bg-gradient-primary flex items-center justify-center text-primary-foreground shadow-glow active:scale-95 transition-transform disabled:opacity-60">
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}