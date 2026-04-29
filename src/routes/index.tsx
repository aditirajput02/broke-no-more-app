import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef } from "react";
import { Bar, BarChart, ResponsiveContainer, XAxis, Cell } from "recharts";
import { Sparkles, Plus, TrendingUp, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { useAppData, totalSpent, lastNDays, weeklyBars, spentByCategory, inr, CATEGORY_META, projectWeeklyOverspend, startOfWeek, type Category } from "@/lib/store";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [{ title: "Broke No More — Slay your budget" }] }),
  component: Home,
});

function Home() {
  const { expenses, budgets, profile, loading } = useAppData();
  const income = profile?.monthly_income ?? 0;
  const week = lastNDays(expenses, 7);
  const weekTotal = totalSpent(week);
  const monthTotal = totalSpent(lastNDays(expenses, 30));
  const net = income - monthTotal;
  const bars = useMemo(() => weeklyBars(expenses), [expenses]);
  const top3 = spentByCategory(week).slice(0, 3);
  const topCat = top3[0]?.[0];
  const initial = (profile?.username ?? "U").charAt(0).toUpperCase();

  const projections = useMemo(() => projectWeeklyOverspend(expenses, budgets), [expenses, budgets]);

  const weeklyBudgetRows = useMemo(() => {
    const start = startOfWeek().getTime();
    const spentByCat = new Map<Category, number>();
    for (const e of expenses) {
      if (new Date(e.date).getTime() < start) continue;
      spentByCat.set(e.category, (spentByCat.get(e.category) ?? 0) + e.amount);
    }
    const rows = (Object.keys(budgets) as Category[])
      .map((c) => {
        const monthlyLimit = budgets[c] ?? 0;
        const weeklyLimit = (monthlyLimit * 7) / 30;
        const spent = spentByCat.get(c) ?? 0;
        const pct = weeklyLimit > 0 ? (spent / weeklyLimit) * 100 : 0;
        return { category: c, weeklyLimit, spent, pct };
      })
      .filter((r) => r.weeklyLimit > 0)
      .sort((a, b) => b.pct - a.pct);
    return rows;
  }, [expenses, budgets]);

  const notifiedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (loading) return;
    for (const p of projections) {
      const key = `${p.category}:${new Date().toISOString().slice(0,10)}`;
      if (notifiedRef.current.has(key)) continue;
      notifiedRef.current.add(key);
      toast.warning(`${CATEGORY_META[p.category].emoji} ${p.category} is heading over budget`, {
        description: `On track for ${inr(Math.round(p.projected))} this week (limit ${inr(p.limit)}). Pump the brakes 🛑`,
        duration: 6000,
      });
    }
  }, [projections, loading]);

  if (loading) return <CenterSpinner />;

  return (
    <div className="mx-auto max-w-xl px-5 pt-8 animate-float-up">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Hey, {profile?.username ?? "spender"} 👋</p>
          <h1 className="text-xl font-bold">Broke No More</h1>
        </div>
        <Link to="/settings" className="h-10 w-10 rounded-full bg-gradient-primary flex items-center justify-center text-primary-foreground font-bold shadow-glow">{initial}</Link>
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

      {projections.length > 0 && (
        <section className="mt-5 rounded-3xl p-4 border border-destructive/40 bg-destructive/10 shadow-card">
          <div className="flex items-start gap-3">
            <div className="h-9 w-9 rounded-2xl bg-destructive/20 flex items-center justify-center shrink-0">
              <AlertTriangle className="h-5 w-5 text-destructive" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wider text-destructive">Budget alert</p>
              <p className="text-sm font-semibold mt-0.5">
                {projections.length === 1
                  ? `${CATEGORY_META[projections[0].category].emoji} ${projections[0].category} is on track to overshoot this week`
                  : `${projections.length} categories are projected to bust their weekly limit`}
              </p>
              <ul className="mt-2 space-y-1">
                {projections.slice(0, 3).map((p) => (
                  <li key={p.category} className="text-xs text-muted-foreground flex items-center gap-2">
                    <span>{CATEGORY_META[p.category].emoji}</span>
                    <span className="font-medium text-foreground">{p.category}</span>
                    <span className="ml-auto">
                      Projected <span className="font-semibold text-destructive">{inr(Math.round(p.projected))}</span> / {inr(p.limit)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      )}

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

      <section className="mt-5 glass rounded-3xl p-5 shadow-card">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Budget vs actual</p>
            <p className="text-sm font-semibold">This week's tracker 📊</p>
          </div>
          <Link to="/settings" className="text-xs font-semibold text-primary">Edit</Link>
        </div>
        {weeklyBudgetRows.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No budgets set yet. Add some in Settings to track them here ✨
          </p>
        ) : (
          <div className="space-y-3">
            {weeklyBudgetRows.map((r) => {
              const over = r.spent > r.weeklyLimit;
              const danger = r.pct >= 85;
              const fillPct = Math.min(100, r.pct);
              const overflowPct = over ? Math.min(100, ((r.spent - r.weeklyLimit) / r.weeklyLimit) * 100) : 0;
              return (
                <div key={r.category}>
                  <div className="flex items-center justify-between mb-1.5 text-xs">
                    <div className="flex items-center gap-1.5">
                      <span className="text-base leading-none">{CATEGORY_META[r.category].emoji}</span>
                      <span className="font-semibold">{r.category}</span>
                    </div>
                    <span className={`font-semibold ${over ? "text-destructive" : danger ? "text-amber" : "text-muted-foreground"}`}>
                      {inr(Math.round(r.spent))} / {inr(Math.round(r.weeklyLimit))}
                    </span>
                  </div>
                  <div className="relative h-2.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${fillPct}%`,
                        background: over
                          ? "var(--destructive)"
                          : danger
                            ? "linear-gradient(90deg, var(--amber), var(--coral))"
                            : `linear-gradient(90deg, ${CATEGORY_META[r.category].color}, var(--primary))`,
                      }}
                    />
                  </div>
                  {over && (
                    <p className="mt-1 text-[11px] text-destructive">
                      Over by {inr(Math.round(r.spent - r.weeklyLimit))} ({Math.round(overflowPct)}%) — yikes 😬
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
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

export function CenterSpinner() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="h-10 w-10 rounded-full border-2 border-primary border-t-transparent animate-spin" />
    </div>
  );
}