import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { Bar, BarChart, ResponsiveContainer, XAxis, Cell } from "recharts";
import { Sparkles, Plus, TrendingUp } from "lucide-react";
import { useAppState, totalSpent, lastNDays, weeklyBars, spentByCategory, inr, CATEGORY_META } from "@/lib/store";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [{ title: "Broke No More — Slay your budget" }] }),
  component: Home,
});

function Home() {
  const { income, expenses } = useAppState((s) => s);
  const week = lastNDays(expenses, 7);
  const weekTotal = totalSpent(week);
  const monthTotal = totalSpent(lastNDays(expenses, 30));
  const net = income - monthTotal;
  const bars = useMemo(() => weeklyBars(expenses), [expenses]);
  const top3 = spentByCategory(week).slice(0, 3);
  const topCat = top3[0]?.[0];

  return (
    <div className="mx-auto max-w-xl px-5 pt-8 animate-float-up">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Hey, spender 👋</p>
          <h1 className="text-xl font-bold">Broke No More</h1>
        </div>
        <Link to="/settings" className="h-10 w-10 rounded-full bg-gradient-primary flex items-center justify-center text-primary-foreground font-bold shadow-glow">U</Link>
      </header>

      <section className="mt-6 rounded-3xl p-6 bg-gradient-hero text-primary-foreground shadow-glow relative overflow-hidden">
        <div className="absolute -top-10 -right-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
        <p className="text-xs uppercase tracking-widest opacity-80">Net balance</p>
        <p className="text-5xl font-bold mt-2">{inr(net)}</p>
        <p className="text-sm opacity-90 mt-2">
          {net > 0 ? `Slay the budget, not your savings 💅` : `Your wallet called. It's sobbing. 😭`}
        </p>
        <div className="mt-4 flex gap-2 text-xs">
          <span className="rounded-full bg-white/15 px-3 py-1">Income {inr(income)}</span>
          <span className="rounded-full bg-white/15 px-3 py-1">Spent {inr(monthTotal)}</span>
        </div>
      </section>

      <section className="mt-5 glass rounded-3xl p-5 shadow-card">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">This week</p>
            <p className="text-2xl font-bold">{inr(weekTotal)}</p>
          </div>
          <Link to="/dashboard" className="text-xs font-semibold text-primary flex items-center gap-1">
            See all <TrendingUp className="h-3.5 w-3.5" />
          </Link>
        </div>
        <div className="h-28 mt-3 -mx-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={bars}>
              <XAxis dataKey="day" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "oklch(0.7 0.03 280)" }} />
              <Bar dataKey="total" radius={[8, 8, 8, 8]}>
                {bars.map((_, i) => (
                  <Cell key={i} fill={i === bars.length - 1 ? "var(--primary)" : "var(--accent)"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="mt-5">
        <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2.5">Top categories</p>
        <div className="grid grid-cols-3 gap-2.5">
          {top3.map(([c, v]) => (
            <div key={c} className="rounded-2xl p-3 text-primary-foreground shadow-card"
              style={{ background: `linear-gradient(135deg, ${CATEGORY_META[c].color}, var(--primary))` }}>
              <div className="text-2xl">{CATEGORY_META[c].emoji}</div>
              <p className="mt-2 text-[11px] font-semibold opacity-90">{c}</p>
              <p className="font-bold text-sm">{inr(v)}</p>
            </div>
          ))}
          {top3.length === 0 && (
            <div className="col-span-3 glass rounded-2xl p-4 text-sm text-muted-foreground text-center">
              No spending this week. Iconic. 🌟
            </div>
          )}
        </div>
      </section>

      <Link to="/insights" className="mt-5 block glass rounded-3xl p-4 shadow-card border border-primary/30 hover:scale-[1.01] transition-transform">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-2xl bg-gradient-primary flex items-center justify-center shrink-0 shadow-glow">
            <Sparkles className="h-5 w-5 text-primary-foreground" />
          </div>
          <div className="flex-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-primary">AI Insight</p>
            <p className="text-sm font-semibold mt-0.5">
              {topCat
                ? `You're spending the most on ${topCat} ${CATEGORY_META[topCat].emoji} this week — maybe chill?`
                : `Quiet week. Your bank account is purring 🐱`}
            </p>
          </div>
        </div>
      </Link>

      <Link
        to="/add"
        className="md:hidden fixed bottom-24 right-5 z-30 h-14 w-14 rounded-full bg-gradient-coral shadow-coral flex items-center justify-center text-primary-foreground active:scale-95 transition-transform"
      >
        <Plus className="h-7 w-7" />
      </Link>
    </div>
  );
}
