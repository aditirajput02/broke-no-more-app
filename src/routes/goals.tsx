import { createFileRoute } from "@tanstack/react-router";
import { Flame, Lock, Trophy, Users } from "lucide-react";
import { useAppState, CATEGORY_META, type Category, inr, lastNDays } from "@/lib/store";

export const Route = createFileRoute("/goals")({
  head: () => ({ meta: [{ title: "Goals — Broke No More" }] }),
  component: GoalsPage,
});

const RANKS = ["Broke", "Saver", "Investor", "Money God"] as const;

const BADGES = [
  { name: "No-Spend Hero", icon: "🦸", unlocked: true },
  { name: "Subscription Slayer", icon: "⚔️", unlocked: true },
  { name: "Streak King", icon: "👑", unlocked: true },
  { name: "Coffee Quitter", icon: "☕", unlocked: false },
  { name: "Budget Boss", icon: "💼", unlocked: false },
  { name: "Investor", icon: "📈", unlocked: false },
];

function GoalsPage() {
  const { expenses, budgets, streak, xp } = useAppState((s) => s);
  const monthly = lastNDays(expenses, 30);

  const rankIdx = Math.min(Math.floor(xp / 1000), RANKS.length - 1);
  const rank = RANKS[rankIdx];
  const nextXp = (rankIdx + 1) * 1000;
  const xpPct = Math.min(100, Math.round((xp / nextXp) * 100));

  return (
    <div className="mx-auto max-w-xl px-5 pt-8 animate-float-up">
      <h1 className="text-2xl font-bold">Level up your money 🎮</h1>
      <p className="text-sm text-muted-foreground">Goals, streaks, badges. Get it.</p>

      <div className="mt-5 rounded-3xl p-5 bg-gradient-hero text-primary-foreground shadow-glow">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wider opacity-80">Finance Rank</p>
            <p className="text-3xl font-bold mt-1">{rank}</p>
            <p className="text-xs opacity-90 mt-1">{xp} / {nextXp} XP</p>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-1 text-3xl font-bold">
              <Flame className="h-7 w-7 animate-flame text-amber" />
              {streak}
            </div>
            <p className="text-xs opacity-80">day streak</p>
          </div>
        </div>
        <div className="mt-4 h-2.5 rounded-full bg-white/20 overflow-hidden">
          <div className="h-full bg-white rounded-full transition-all" style={{ width: `${xpPct}%` }} />
        </div>
      </div>

      <div className="mt-6">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">Active budgets</h2>
        <div className="space-y-2.5">
          {(Object.keys(budgets) as Category[]).map((c) => {
            const limit = budgets[c]!;
            const spent = monthly.filter((e) => e.category === c).reduce((s, e) => s + e.amount, 0);
            const pct = Math.min(100, (spent / limit) * 100);
            const danger = pct >= 85;
            return (
              <div key={c} className="glass rounded-2xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{CATEGORY_META[c].emoji}</span>
                    <span className="font-semibold text-sm">{c}</span>
                  </div>
                  <span className={`text-xs font-semibold ${danger ? "text-destructive" : "text-muted-foreground"}`}>
                    {inr(spent)} / {inr(limit)}
                  </span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-700" style={{
                    width: `${pct}%`,
                    background: danger ? "var(--destructive)" : `linear-gradient(90deg, ${CATEGORY_META[c].color}, var(--primary))`,
                  }} />
                </div>
                {danger && <p className="mt-1.5 text-[11px] text-destructive">Easy tiger 🐯 — {Math.round(pct)}% used</p>}
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-6">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
          <Trophy className="h-4 w-4" /> Badge shelf
        </h2>
        <div className="grid grid-cols-3 gap-3">
          {BADGES.map((b) => (
            <div key={b.name} className={`relative aspect-square rounded-2xl flex flex-col items-center justify-center gap-1 p-2 text-center ${b.unlocked ? "bg-gradient-primary text-primary-foreground shadow-glow" : "glass opacity-60"}`}>
              {!b.unlocked && <Lock className="absolute top-2 right-2 h-3.5 w-3.5" />}
              <span className="text-3xl">{b.icon}</span>
              <span className="text-[10px] font-semibold leading-tight">{b.name}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6 mb-4 glass rounded-3xl p-5 flex items-center gap-4">
        <div className="h-12 w-12 rounded-full bg-gradient-coral flex items-center justify-center shadow-coral">
          <Users className="h-6 w-6 text-primary-foreground" />
        </div>
        <div className="flex-1">
          <p className="font-semibold text-sm">Challenge a friend 🏁</p>
          <p className="text-xs text-muted-foreground">Whoever spends less this month buys coffee.</p>
        </div>
        <button className="rounded-full bg-foreground text-background text-xs font-semibold px-4 py-2">Invite</button>
      </div>
    </div>
  );
}