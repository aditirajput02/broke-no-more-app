import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export type Category =
  | "Food" | "Travel" | "Shopping" | "Fun" | "Rent" | "Subscriptions" | "Health" | "Custom";

export const CATEGORY_META: Record<Category, { emoji: string; color: string; tone: string }> = {
  Food:          { emoji: "🍜", color: "var(--coral)",  tone: "coral" },
  Travel:        { emoji: "✈️", color: "var(--teal)",   tone: "teal" },
  Shopping:      { emoji: "🛍️", color: "var(--primary)",tone: "primary" },
  Fun:           { emoji: "🎉", color: "var(--lime)",   tone: "lime" },
  Rent:          { emoji: "🏠", color: "var(--amber)",  tone: "amber" },
  Subscriptions: { emoji: "📺", color: "var(--primary-glow)", tone: "primary" },
  Health:        { emoji: "💊", color: "var(--teal)",   tone: "teal" },
  Custom:        { emoji: "✨", color: "var(--coral)",  tone: "coral" },
};

export type Expense = {
  id: string;
  amount: number;
  category: Category;
  note: string;
  date: string;
};

export type Profile = {
  id: string;
  username: string;
  monthly_income: number;
  theme: string;
};

export type Stats = {
  xp: number;
  streak: number;
  last_log_date: string | null;
};

export type AppData = {
  expenses: Expense[];
  budgets: Partial<Record<Category, number>>;
  profile: Profile | null;
  stats: Stats;
  loading: boolean;
  refresh: () => Promise<void>;
  addExpense: (e: Omit<Expense, "id">) => Promise<Expense>;
  deleteExpense: (id: string) => Promise<Expense | null>;
  restoreExpense: (e: Expense) => Promise<void>;
  setIncome: (n: number) => Promise<void>;
  setBudget: (c: Category, n: number) => Promise<void>;
};

export function useAppData(): AppData {
  const { user } = useAuth();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [budgets, setBudgets] = useState<Partial<Record<Category, number>>>({});
  const [profile, setProfile] = useState<Profile | null>(null);
  const [stats, setStats] = useState<Stats>({ xp: 0, streak: 0, last_log_date: null });
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    setLoading(true);
    const [exp, bud, prof, st] = await Promise.all([
      supabase.from("expenses").select("*").eq("user_id", user.id).order("date", { ascending: false }),
      supabase.from("budgets").select("*").eq("user_id", user.id),
      supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
      supabase.from("user_stats").select("*").eq("user_id", user.id).maybeSingle(),
    ]);
    setExpenses((exp.data ?? []).map((r: any) => ({
      id: r.id, amount: Number(r.amount), category: r.category as Category, note: r.note ?? "", date: r.date,
    })));
    const bMap: Partial<Record<Category, number>> = {};
    for (const b of bud.data ?? []) bMap[b.category as Category] = Number(b.amount);
    setBudgets(bMap);
    if (prof.data) setProfile({
      id: prof.data.id, username: prof.data.username,
      monthly_income: Number(prof.data.monthly_income), theme: prof.data.theme,
    });
    if (st.data) setStats({
      xp: st.data.xp, streak: st.data.streak, last_log_date: st.data.last_log_date,
    });
    setLoading(false);
  }, [user]);

  useEffect(() => { refresh(); }, [refresh]);

  const addExpense = useCallback(async (e: Omit<Expense, "id">) => {
    if (!user) throw new Error("Not signed in");
    const { data, error } = await supabase.from("expenses").insert({
      user_id: user.id, amount: e.amount, category: e.category, note: e.note, date: e.date,
    }).select().single();
    if (error || !data) throw error;
    const created: Expense = {
      id: data.id, amount: Number(data.amount), category: data.category as Category, note: data.note ?? "", date: data.date,
    };
    setExpenses((prev) => [created, ...prev]);
    // XP + streak update
    const today = new Date().toISOString().slice(0, 10);
    const last = stats.last_log_date;
    let newStreak = stats.streak;
    let bonus = 0;
    if (last === today) {
      // same-day, no streak change
    } else {
      const lastD = last ? new Date(last) : null;
      const diff = lastD ? Math.floor((Date.now() - lastD.getTime()) / 86400000) : 99;
      newStreak = diff === 1 ? stats.streak + 1 : 1;
      if (newStreak > 0 && newStreak % 7 === 0) bonus = 100;
    }
    const newXp = stats.xp + 10 + bonus;
    const { data: sData } = await supabase.from("user_stats")
      .upsert({ user_id: user.id, xp: newXp, streak: newStreak, last_log_date: today }, { onConflict: "user_id" })
      .select().single();
    if (sData) setStats({ xp: sData.xp, streak: sData.streak, last_log_date: sData.last_log_date });
    return created;
  }, [user, stats]);

  const setIncome = useCallback(async (n: number) => {
    if (!user) return;
    await supabase.from("profiles").update({ monthly_income: n }).eq("id", user.id);
    setProfile((p) => p ? { ...p, monthly_income: n } : p);
  }, [user]);

  const setBudget = useCallback(async (c: Category, n: number) => {
    if (!user) return;
    await supabase.from("budgets").upsert({ user_id: user.id, category: c, amount: n }, { onConflict: "user_id,category" });
    setBudgets((b) => ({ ...b, [c]: n }));
  }, [user]);

  const deleteExpense = useCallback(async (id: string) => {
    if (!user) return null;
    const target = expenses.find((e) => e.id === id) ?? null;
    setExpenses((prev) => prev.filter((e) => e.id !== id));
    const { error } = await supabase.from("expenses").delete().eq("id", id).eq("user_id", user.id);
    if (error) {
      // rollback
      if (target) setExpenses((prev) => [target, ...prev]);
      throw error;
    }
    return target;
  }, [user, expenses]);

  const restoreExpense = useCallback(async (e: Expense) => {
    if (!user) return;
    const { data, error } = await supabase.from("expenses").insert({
      id: e.id, user_id: user.id, amount: e.amount, category: e.category, note: e.note, date: e.date,
    }).select().single();
    if (error || !data) throw error;
    setExpenses((prev) => {
      if (prev.some((x) => x.id === data.id)) return prev;
      const next = [{ id: data.id, amount: Number(data.amount), category: data.category as Category, note: data.note ?? "", date: data.date }, ...prev];
      return next.sort((a, b) => +new Date(b.date) - +new Date(a.date));
    });
  }, [user]);

  return { expenses, budgets, profile, stats, loading, refresh, addExpense, deleteExpense, restoreExpense, setIncome, setBudget };
}

// helpers
export const inr = (n: number) => "₹" + n.toLocaleString("en-IN", { maximumFractionDigits: 0 });

export function totalSpent(expenses: Expense[]) {
  return expenses.reduce((s, e) => s + e.amount, 0);
}

export function spentByCategory(expenses: Expense[]) {
  const map = new Map<Category, number>();
  for (const e of expenses) map.set(e.category, (map.get(e.category) ?? 0) + e.amount);
  return [...map.entries()].sort((a, b) => b[1] - a[1]);
}

export function lastNDays(expenses: Expense[], n: number) {
  const cutoff = Date.now() - n * 86400000;
  return expenses.filter((e) => new Date(e.date).getTime() >= cutoff);
}

export function weeklyBars(expenses: Expense[]) {
  const days = ["S","M","T","W","T","F","S"];
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i));
    const dayKey = d.toDateString();
    const total = expenses
      .filter((e) => new Date(e.date).toDateString() === dayKey)
      .reduce((s, e) => s + e.amount, 0);
    return { day: days[d.getDay()], total };
  });
}

// Projection: get start of current week (Mon) and project category spend to week end.
export function startOfWeek(d: Date = new Date()): Date {
  const day = d.getDay(); // 0 Sun..6 Sat
  const diff = (day + 6) % 7; // days since Mon
  const r = new Date(d); r.setHours(0,0,0,0); r.setDate(r.getDate() - diff);
  return r;
}

export type Projection = {
  category: Category;
  spent: number;
  limit: number;
  projected: number;
  willExceed: boolean;
  daysIntoWeek: number;
};

export function projectWeeklyOverspend(
  expenses: Expense[],
  budgets: Partial<Record<Category, number>>,
): Projection[] {
  const start = startOfWeek();
  const now = new Date();
  const elapsedMs = now.getTime() - start.getTime();
  const daysElapsed = Math.max(1, elapsedMs / 86400000); // avoid /0
  const totalDays = 7;
  const out: Projection[] = [];
  for (const [catRaw, limit] of Object.entries(budgets)) {
    const cat = catRaw as Category;
    if (!limit || limit <= 0) continue;
    const spent = expenses
      .filter((e) => e.category === cat && new Date(e.date).getTime() >= start.getTime())
      .reduce((s, e) => s + e.amount, 0);
    if (spent <= 0) continue;
    const projected = (spent / daysElapsed) * totalDays;
    out.push({
      category: cat, spent, limit, projected,
      willExceed: projected > limit && spent < limit, // not yet exceeded but on track to
      daysIntoWeek: Math.ceil(daysElapsed),
    });
  }
  return out.filter((p) => p.willExceed).sort((a, b) => (b.projected / b.limit) - (a.projected / a.limit));
}