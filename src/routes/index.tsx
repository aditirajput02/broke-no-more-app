import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef } from "react";
import { Bar, BarChart, ResponsiveContainer, XAxis, Cell } from "recharts";
import { Sparkles, TrendingUp, AlertTriangle, Check, Flame, ScrollText, Swords } from "lucide-react";
import { toast } from "sonner";
import {
  useAppData, totalSpent, lastNDays, weeklyBars, spentByCategory, inr,
  CATEGORY_META, projectWeeklyOverspend, startOfWeek, type Category,
} from "@/lib/store";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [{ title: "Broke No More — Quest for Gold" }] }),
  component: Home,
});

// Finance Ranks as RPG classes
const RANKS = [
  { name: "Broke Peasant", min: 0,    max: 250 },
  { name: "Coin Saver",    min: 250,  max: 750 },
  { name: "Investor Mage", min: 750,  max: 2000 },
  { name: "Money God",     min: 2000, max: 99999 },
];
function getRank(xp: number) {
  const r = RANKS.find((x) => xp >= x.min && xp < x.max) ?? RANKS[RANKS.length - 1];
  const idx = RANKS.indexOf(r);
  const pct = Math.min(100, ((xp - r.min) / (r.max - r.min)) * 100);
  return { ...r, level: idx + 1, pct, intoRank: xp - r.min, span: r.max - r.min };
}

function Home() {
  const { expenses, budgets, profile, stats, loading } = useAppData();
  const income = profile?.monthly_income ?? 0;
  const week = lastNDays(expenses, 7);
  const weekTotal = totalSpent(week);
  const monthTotal = totalSpent(lastNDays(expenses, 30));
  const net = income - monthTotal;
  const bars = useMemo(() => weeklyBars(expenses), [expenses]);
  const top3 = spentByCategory(week).slice(0, 3);
  const topCat = top3[0]?.[0];
  const initial = (profile?.username ?? "U").charAt(0).toUpperCase();
  const rank = getRank(stats.xp);

  const projections = useMemo(() => projectWeeklyOverspend(expenses, budgets), [expenses, budgets]);

  const weeklyBudgetRows = useMemo(() => {
    const start = startOfWeek().getTime();
    const spentByCat = new Map<Category, number>();
    for (const e of expenses) {
      if (new Date(e.date).getTime() < start) continue;
      spentByCat.set(e.category, (spentByCat.get(e.category) ?? 0) + e.amount);
    }
    return (Object.keys(budgets) as Category[])
      .map((c) => {
        const monthlyLimit = budgets[c] ?? 0;
        const weeklyLimit = (monthlyLimit * 7) / 30;
        const spent = spentByCat.get(c) ?? 0;
        const pct = weeklyLimit > 0 ? (spent / weeklyLimit) * 100 : 0;
        return { category: c, weeklyLimit, spent, pct };
      })
      .filter((r) => r.weeklyLimit > 0)
      .sort((a, b) => b.pct - a.pct);
  }, [expenses, budgets]);

  // Daily quests
  const today = new Date().toDateString();
  const loggedToday = expenses.some((e) => new Date(e.date).toDateString() === today);
  const foodLimitWeekly = ((budgets.Food ?? 0) * 7) / 30;
  const foodSpentWeek = week.filter((e) => e.category === "Food").reduce((s, e) => s + e.amount, 0);
  const foodUnder = foodLimitWeekly > 0 && foodSpentWeek <= foodLimitWeekly;
  const streakAlive = stats.streak >= 1;
  const quests = [
    { id: "log",    label: "Log an expense today",         xp: 10,  done: loggedToday },
    { id: "food",   label: "Stay under Food budget",       xp: 50,  done: foodUnder },
    { id: "streak", label: "Keep your logging streak alive", xp: 100, done: streakAlive },
  ];
  const questsDone = quests.filter((q) => q.done).length;

  const notifiedRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (loading) return;
    for (const p of projections) {
      const key = `${p.category}:${new Date().toISOString().slice(0,10)}`;
      if (notifiedRef.current.has(key)) continue;
      notifiedRef.current.add(key);
      toast.warning(`⚠️ ${p.category} quest is failing`, {
        description: `Projected ${inr(Math.round(p.projected))} this week (limit ${inr(p.limit)}). Retreat! 🛑`,
        duration: 6000,
      });
    }
  }, [projections, loading]);

  if (loading) return <CenterSpinner />;

  return (
    <div className="mx-auto max-w-xl px-5 pt-6 pb-32 animate-float-up space-y-5">
      {/* === Character header / Avatar XP bar === */}
      <section className="quest-panel p-5">
        <div className="flex items-center gap-4">
          <div className="relative shrink-0">
            <div className="h-16 w-16 rounded-2xl bg-gradient-primary flex items-center justify-center text-2xl font-bold text-primary-foreground shadow-glow ring-2 ring-[var(--gold)]/60">
              {initial}
            </div>
            <div className="absolute -bottom-1 -right-1 h-7 w-7 rounded-full bg-gradient-gold text-[var(--gold-foreground)] text-xs font-bold flex items-center justify-center shadow-gold ring-2 ring-background">
              {rank.level}
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Adventurer</p>
            <p className="text-base font-bold truncate">{profile?.username ?? "Hero"}</p>
            <p className="text-xs text-gradient-gold font-semibold">{rank.name}</p>
          </div>
          {streakAlive && (
            <div className="flex items-center gap-1 text-amber font-bold">
              <Flame className="h-4 w-4 animate-flame" />
              <span className="text-sm">{stats.streak}</span>
            </div>
          )}
        </div>

        <div className="mt-4">
          <div className="flex items-center justify-between text-[11px] mb-1.5">
            <span className="uppercase tracking-wider text-muted-foreground">XP</span>
            <span className="font-semibold text-[var(--gold)]">
              {rank.intoRank} / {rank.span === 99999 ? "∞" : rank.span}
            </span>
          </div>
          <div className="rpg-bar">
            <div className="fill" style={{ width: `${rank.pct}%`, background: "var(--gradient-xp)" }} />
          </div>
        </div>
      </section>

      {/* === Net balance hero === */}
      <section className="quest-panel p-6 bg-gradient-hero relative overflow-hidden">
        <div className="absolute -top-10 -right-10 h-40 w-40 rounded-full bg-[var(--gold)]/10 blur-2xl" />
        <p className="text-[10px] uppercase tracking-[0.25em] text-[var(--gold)]/80">Treasury Balance</p>
        <p className="text-5xl font-bold mt-2 font-display">{inr(net)}</p>
        <p className="text-sm opacity-90 mt-2">
          {net > 0 ? `Your hoard grows, brave one ⚔️` : `The dragon has emptied your vault 🐉`}
        </p>
        <div className="mt-4 flex flex-wrap gap-2 text-xs">
          <span className="rounded-full bg-black/30 border border-[var(--gold)]/30 px-3 py-1">
            <span className="text-[var(--gold)]">Income</span> {inr(income)}
          </span>
          <span className="rounded-full bg-black/30 border border-[var(--gold)]/30 px-3 py-1">
            <span className="text-coral">Spent</span> {inr(monthTotal)}
          </span>
        </div>
      </section>

      {/* === Daily Quests === */}
      <section className="quest-panel p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <ScrollText className="h-4 w-4 text-[var(--gold)]" />
            <p className="text-sm font-bold uppercase tracking-wider text-gradient-gold">Daily Quests</p>
          </div>
          <span className="text-[11px] font-semibold text-muted-foreground">
            {questsDone}/{quests.length}
          </span>
        </div>
        <ul className="space-y-2">
          {quests.map((q) => (
            <li
              key={q.id}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 border transition-colors ${
                q.done
                  ? "border-[var(--gold)]/40 bg-[var(--gold)]/5"
                  : "border-border bg-black/20 hover:bg-black/30"
              }`}
            >
              <span
                className={`h-6 w-6 shrink-0 rounded-md flex items-center justify-center border ${
                  q.done
                    ? "bg-gradient-gold border-[var(--gold)] text-[var(--gold-foreground)]"
                    : "border-muted-foreground/40 text-transparent"
                }`}
              >
                <Check className="h-4 w-4" strokeWidth={3} />
              </span>
              <span className={`flex-1 text-sm ${q.done ? "line-through text-muted-foreground" : "font-medium"}`}>
                {q.label}
              </span>
              <span className={`text-[11px] font-bold ${q.done ? "text-[var(--gold)]" : "text-muted-foreground"}`}>
                +{q.xp} XP
              </span>
            </li>
          ))}
        </ul>
      </section>

      {/* === Budget Alert === */}
      {projections.length > 0 && (
        <section className="quest-panel p-4 border-destructive/50">
          <div className="flex items-start gap-3">
            <div className="h-9 w-9 rounded-xl bg-destructive/20 flex items-center justify-center shrink-0 border border-destructive/40">
              <AlertTriangle className="h-5 w-5 text-destructive" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-widest text-destructive">⚠ Quest Failing</p>
              <p className="text-sm font-semibold mt-0.5">
                {projections.length === 1
                  ? `${CATEGORY_META[projections[0].category].emoji} ${projections[0].category} will breach the limit`
                  : `${projections.length} categories projected to bust their weekly limit`}
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

      {/* === This week chart === */}
      <section className="quest-panel p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Battle Log — 7 days</p>
            <p className="text-2xl font-bold font-display">{inr(weekTotal)}</p>
          </div>
          <Link to="/dashboard" className="text-xs font-semibold text-[var(--gold)] flex items-center gap-1 hover:underline">
            World map <TrendingUp className="h-3.5 w-3.5" />
          </Link>
        </div>
        <div className="h-28 mt-3 -mx-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={bars}>
              <XAxis dataKey="day" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "oklch(0.72 0.04 285)" }} />
              <Bar dataKey="total" radius={[6, 6, 6, 6]}>
                {bars.map((_, i) => (
                  <Cell key={i} fill={i === bars.length - 1 ? "var(--gold)" : "var(--primary)"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* === Quest objectives: category budgets as HP/MP-style bars === */}
      <section className="quest-panel p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Swords className="h-4 w-4 text-[var(--gold)]" />
            <div>
              <p className="text-sm font-bold uppercase tracking-wider text-gradient-gold">Quest Objectives</p>
              <p className="text-[11px] text-muted-foreground">This week's category battles</p>
            </div>
          </div>
          <Link to="/settings" className="text-xs font-semibold text-[var(--gold)] hover:underline">Edit</Link>
        </div>
        {weeklyBudgetRows.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No quests assigned. Set budgets in the Guild Hall ✨
          </p>
        ) : (
          <ul className="space-y-3.5">
            {weeklyBudgetRows.map((r) => {
              const over = r.spent > r.weeklyLimit;
              const danger = r.pct >= 85;
              const complete = r.pct < 50; // doing well
              const fillPct = Math.min(100, r.pct);
              const barBg = over
                ? "var(--gradient-hp)"
                : danger
                  ? "linear-gradient(90deg, var(--amber), var(--coral))"
                  : "var(--gradient-mp)";
              return (
                <li key={r.category}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span
                        className={`h-5 w-5 shrink-0 rounded-md flex items-center justify-center border ${
                          over
                            ? "border-destructive/60 bg-destructive/20 text-destructive"
                            : complete
                              ? "border-[var(--gold)]/60 bg-[var(--gold)]/10 text-[var(--gold)]"
                              : "border-muted-foreground/30 text-transparent"
                        }`}
                      >
                        {over ? <AlertTriangle className="h-3 w-3" /> : <Check className="h-3.5 w-3.5" strokeWidth={3} />}
                      </span>
                      <span className="text-base leading-none">{CATEGORY_META[r.category].emoji}</span>
                      <span className="text-sm font-semibold">{r.category}</span>
                    </div>
                    <span className={`text-xs font-bold tabular-nums ${over ? "text-destructive" : danger ? "text-amber" : "text-muted-foreground"}`}>
                      {inr(Math.round(r.spent))} / {inr(Math.round(r.weeklyLimit))}
                    </span>
                  </div>
                  <div className="rpg-bar">
                    <div className="fill" style={{ width: `${fillPct}%`, background: barBg }} />
                  </div>
                  {over && (
                    <p className="mt-1 text-[11px] text-destructive">
                      💀 Defeated by {inr(Math.round(r.spent - r.weeklyLimit))} — boss won this round
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* === Top categories — guild trophies === */}
      <section>
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2.5">Top Spenders</p>
        <div className="grid grid-cols-3 gap-2.5">
          {top3.map(([c, v]) => (
            <div
              key={c}
              className="quest-panel p-3 text-center"
              style={{ background: `linear-gradient(160deg, ${CATEGORY_META[c].color}33, oklch(0.16 0.04 285 / 0.9))` }}
            >
              <div className="text-2xl">{CATEGORY_META[c].emoji}</div>
              <p className="mt-1.5 text-[10px] font-semibold opacity-90 uppercase tracking-wider">{c}</p>
              <p className="font-bold text-sm text-[var(--gold)]">{inr(v)}</p>
            </div>
          ))}
          {top3.length === 0 && (
            <div className="col-span-3 quest-panel p-4 text-sm text-muted-foreground text-center">
              No battles fought this week. Legendary restraint. 🌟
            </div>
          )}
        </div>
      </section>

      {/* === AI Insight === */}
      <Link to="/insights" className="block quest-panel p-4 hover:scale-[1.01] transition-transform border-[var(--gold)]/40">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-primary flex items-center justify-center shrink-0 shadow-glow ring-1 ring-[var(--gold)]/50">
            <Sparkles className="h-5 w-5 text-primary-foreground" />
          </div>
          <div className="flex-1">
            <p className="text-[10px] font-bold uppercase tracking-widest text-gradient-gold">Oracle Whispers</p>
            <p className="text-sm font-semibold mt-0.5">
              {topCat
                ? `Your gold flows into ${topCat} ${CATEGORY_META[topCat].emoji} — perhaps tame this beast?`
                : `The realm is quiet. Your treasury rests peacefully 🐱`}
            </p>
          </div>
        </div>
      </Link>
    </div>
  );
}

export function CenterSpinner() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="h-10 w-10 rounded-full border-2 border-[var(--gold)] border-t-transparent animate-spin" />
    </div>
  );
}
