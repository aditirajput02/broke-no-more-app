import { create } from "zustand";

// minimal zustand-like store without dep — using a tiny pub/sub
import { useSyncExternalStore } from "react";

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
  date: string; // ISO
};

const today = new Date();
const daysAgo = (n: number) => {
  const d = new Date(today); d.setDate(d.getDate() - n); return d.toISOString();
};

const seed: Expense[] = [
  { id: "1", amount: 450, category: "Food", note: "Swiggy late-night", date: daysAgo(0) },
  { id: "2", amount: 1299, category: "Subscriptions", note: "Spotify family", date: daysAgo(1) },
  { id: "3", amount: 220, category: "Travel", note: "Uber to office", date: daysAgo(1) },
  { id: "4", amount: 3499, category: "Shopping", note: "Sneakers 👟", date: daysAgo(2) },
  { id: "5", amount: 180, category: "Food", note: "Coffee", date: daysAgo(2) },
  { id: "6", amount: 650, category: "Fun", note: "Movie night", date: daysAgo(3) },
  { id: "7", amount: 12000, category: "Rent", note: "Monthly rent", date: daysAgo(4) },
  { id: "8", amount: 320, category: "Food", note: "Zomato dinner", date: daysAgo(4) },
  { id: "9", amount: 99, category: "Health", note: "Multivitamin", date: daysAgo(5) },
  { id: "10", amount: 540, category: "Food", note: "Brunch w/ friends", date: daysAgo(6) },
  { id: "11", amount: 280, category: "Travel", note: "Auto", date: daysAgo(7) },
  { id: "12", amount: 1499, category: "Shopping", note: "Hoodie", date: daysAgo(9) },
];

type State = {
  income: number;
  expenses: Expense[];
  budgets: Partial<Record<Category, number>>;
  streak: number;
  xp: number;
};

let state: State = {
  income: 50000,
  expenses: seed,
  budgets: { Food: 6000, Travel: 3000, Shopping: 5000, Fun: 2500, Subscriptions: 2000, Health: 1500, Rent: 12000 },
  streak: 7,
  xp: 1240,
};

const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
const subscribe = (l: () => void) => { listeners.add(l); return () => listeners.delete(l); };
const getSnapshot = () => state;

export function useAppState<T>(selector: (s: State) => T): T {
  return useSyncExternalStore(subscribe, () => selector(getSnapshot()), () => selector(getSnapshot()));
}

export const actions = {
  addExpense(e: Omit<Expense, "id">) {
    state = { ...state, expenses: [{ ...e, id: crypto.randomUUID() }, ...state.expenses], xp: state.xp + 10 };
    emit();
  },
  setIncome(n: number) { state = { ...state, income: n }; emit(); },
  setBudget(c: Category, n: number) { state = { ...state, budgets: { ...state.budgets, [c]: n } }; emit(); },
};

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
  const arr = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i));
    const dayKey = d.toDateString();
    const total = expenses
      .filter((e) => new Date(e.date).toDateString() === dayKey)
      .reduce((s, e) => s + e.amount, 0);
    return { day: days[d.getDay()], total };
  });
  return arr;
}

// shim — we don't actually use zustand
export function create<T>(_: T): T { return _ as T; }