import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

// Categories are user-editable; the type is just a string alias for clarity.
export type Category = string;

export type CategoryMeta = { emoji: string; color: string };

export type CategoryRow = {
  id: string;
  name: string;
  emoji: string;
  color: string;
  sort_order: number;
};

// Default metadata used as a fallback when looking up a category by name
// (e.g. the row hasn't loaded yet, or an expense references a deleted one).
export const DEFAULT_CATEGORY_META: Record<string, CategoryMeta> = {
  Food:          { emoji: "🍜", color: "var(--coral)" },
  Travel:        { emoji: "✈️", color: "var(--teal)" },
  Shopping:      { emoji: "🛍️", color: "var(--primary)" },
  Fun:           { emoji: "🎉", color: "var(--lime)" },
  Rent:          { emoji: "🏠", color: "var(--amber)" },
  Subscriptions: { emoji: "📺", color: "var(--primary-glow)" },
  Health:        { emoji: "💊", color: "var(--teal)" },
};

const FALLBACK_META: CategoryMeta = { emoji: "✨", color: "var(--primary)" };

/** Build a name → meta map from category rows, falling back to defaults. */
export function buildCategoryMap(rows: CategoryRow[]): Record<string, CategoryMeta> {
  const map: Record<string, CategoryMeta> = { ...DEFAULT_CATEGORY_META };
  for (const r of rows) map[r.name] = { emoji: r.emoji, color: r.color };
  return map;
}

/** Safe lookup that always returns something renderable. */
export function getMeta(name: string, map: Record<string, CategoryMeta>): CategoryMeta {
  return map[name] ?? DEFAULT_CATEGORY_META[name] ?? FALLBACK_META;
}

/** Color palette presented in the category editor. */
export const CATEGORY_COLOR_PRESETS: { label: string; value: string }[] = [
  { label: "Purple", value: "var(--primary)" },
  { label: "Glow",   value: "var(--primary-glow)" },
  { label: "Coral",  value: "var(--coral)" },
  { label: "Teal",   value: "var(--teal)" },
  { label: "Lime",   value: "var(--lime)" },
  { label: "Amber",  value: "var(--amber)" },
];

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
  categories: CategoryRow[];
  categoryMap: Record<string, CategoryMeta>;
  loading: boolean;
  refresh: () => Promise<void>;
  addExpense: (e: Omit<Expense, "id">) => Promise<Expense>;
  deleteExpense: (id: string) => Promise<Expense | null>;
  restoreExpense: (e: Expense) => Promise<void>;
  setIncome: (n: number) => Promise<void>;
  setBudget: (c: Category, n: number) => Promise<void>;
  createCategory: (input: { name: string; emoji: string; color: string }) => Promise<CategoryRow>;
  updateCategory: (
    id: string,
    input: { name: string; emoji: string; color: string },
  ) => Promise<CategoryRow>;
  deleteCategory: (id: string, opts?: { reassignTo?: string | null }) => Promise<void>;
};

export function useAppData(): AppData {
  const { user } = useAuth();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [budgets, setBudgets] = useState<Partial<Record<Category, number>>>({});
  const [profile, setProfile] = useState<Profile | null>(null);
  const [stats, setStats] = useState<Stats>({ xp: 0, streak: 0, last_log_date: null });
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    setLoading(true);
    const [exp, bud, prof, st, cats] = await Promise.all([
      supabase.from("expenses").select("*").eq("user_id", user.id).order("date", { ascending: false }),
      supabase.from("budgets").select("*").eq("user_id", user.id),
      supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
      supabase.from("user_stats").select("*").eq("user_id", user.id).maybeSingle(),
      supabase.from("categories").select("*").eq("user_id", user.id).order("sort_order", { ascending: true }),
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
    setCategories((cats.data ?? []).map((r: any) => ({
      id: r.id, name: r.name, emoji: r.emoji, color: r.color, sort_order: r.sort_order ?? 0,
    })));
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

  const createCategory = useCallback(async (input: { name: string; emoji: string; color: string }) => {
    if (!user) throw new Error("Not signed in");
    const name = input.name.trim();
    if (!name) throw new Error("Name required");
    const maxOrder = categories.reduce((m, c) => Math.max(m, c.sort_order), 0);
    const { data, error } = await supabase.from("categories").insert({
      user_id: user.id, name, emoji: input.emoji || "✨", color: input.color || "var(--primary)",
      sort_order: maxOrder + 10,
    }).select().single();
    if (error || !data) throw error ?? new Error("Could not create");
    const row: CategoryRow = {
      id: data.id, name: data.name, emoji: data.emoji, color: data.color, sort_order: data.sort_order ?? 0,
    };
    setCategories((prev) => [...prev, row].sort((a, b) => a.sort_order - b.sort_order));
    return row;
  }, [user, categories]);

  const updateCategory = useCallback(async (
    id: string,
    input: { name: string; emoji: string; color: string },
  ) => {
    if (!user) throw new Error("Not signed in");
    const existing = categories.find((c) => c.id === id);
    if (!existing) throw new Error("Category not found");
    const newName = input.name.trim();
    if (!newName) throw new Error("Name required");

    // If renaming, propagate to expenses + budgets first (RLS-scoped to this user).
    if (newName !== existing.name) {
      const { error: expErr } = await supabase
        .from("expenses").update({ category: newName })
        .eq("user_id", user.id).eq("category", existing.name);
      if (expErr) throw expErr;
      // Budgets: insert/upsert under the new name and remove the old one.
      const oldBudget = budgets[existing.name];
      if (typeof oldBudget === "number") {
        await supabase.from("budgets").upsert(
          { user_id: user.id, category: newName, amount: oldBudget },
          { onConflict: "user_id,category" },
        );
        await supabase.from("budgets")
          .delete().eq("user_id", user.id).eq("category", existing.name);
      }
    }

    const { data, error } = await supabase.from("categories").update({
      name: newName, emoji: input.emoji || "✨", color: input.color || "var(--primary)",
    }).eq("id", id).eq("user_id", user.id).select().single();
    if (error || !data) throw error ?? new Error("Could not update");

    const updated: CategoryRow = {
      id: data.id, name: data.name, emoji: data.emoji, color: data.color, sort_order: data.sort_order ?? 0,
    };
    setCategories((prev) => prev.map((c) => c.id === id ? updated : c));
    if (newName !== existing.name) {
      setExpenses((prev) => prev.map((e) => e.category === existing.name ? { ...e, category: newName } : e));
      setBudgets((prev) => {
        const next = { ...prev };
        if (typeof next[existing.name] === "number") {
          next[newName] = next[existing.name];
          delete next[existing.name];
        }
        return next;
      });
    }
    return updated;
  }, [user, categories, budgets]);

  const deleteCategory = useCallback(async (
    id: string,
    opts: { reassignTo?: string | null } = {},
  ) => {
    if (!user) throw new Error("Not signed in");
    const existing = categories.find((c) => c.id === id);
    if (!existing) return;
    const target = opts.reassignTo ?? null;

    if (target) {
      // Move expenses + budget over to the target category.
      await supabase.from("expenses").update({ category: target })
        .eq("user_id", user.id).eq("category", existing.name);
      const oldBudget = budgets[existing.name];
      if (typeof oldBudget === "number") {
        const targetBudget = budgets[target] ?? 0;
        await supabase.from("budgets").upsert(
          { user_id: user.id, category: target, amount: targetBudget + oldBudget },
          { onConflict: "user_id,category" },
        );
      }
    } else {
      // No reassignment: delete the expenses and budget tied to this name.
      await supabase.from("expenses").delete()
        .eq("user_id", user.id).eq("category", existing.name);
    }
    await supabase.from("budgets").delete()
      .eq("user_id", user.id).eq("category", existing.name);

    const { error } = await supabase.from("categories").delete()
      .eq("id", id).eq("user_id", user.id);
    if (error) throw error;

    setCategories((prev) => prev.filter((c) => c.id !== id));
    setExpenses((prev) =>
      target
        ? prev.map((e) => e.category === existing.name ? { ...e, category: target } : e)
        : prev.filter((e) => e.category !== existing.name),
    );
    setBudgets((prev) => {
      const next = { ...prev };
      const oldAmt = next[existing.name];
      delete next[existing.name];
      if (target && typeof oldAmt === "number") {
        next[target] = (next[target] ?? 0) + oldAmt;
      }
      return next;
    });
  }, [user, categories, budgets]);

  const categoryMap = buildCategoryMap(categories);

  return {
    expenses, budgets, profile, stats, categories, categoryMap, loading, refresh,
    addExpense, deleteExpense, restoreExpense, setIncome, setBudget,
    createCategory, updateCategory, deleteCategory,
  };
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