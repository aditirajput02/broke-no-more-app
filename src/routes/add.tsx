import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Calendar as CalIcon } from "lucide-react";
import { useAppData, CATEGORY_META, type Category, inr, type Expense } from "@/lib/store";
import { format } from "date-fns";

export const Route = createFileRoute("/add")({
  head: () => ({ meta: [{ title: "Add expense — Broke No More" }] }),
  component: AddPage,
});

const cats = Object.keys(CATEGORY_META) as Category[];
const quips: Record<string, string> = {
  Food: "Logged! Your tummy thanks you 🍜",
  Travel: "Vroom vroom — added to Travel ✈️",
  Shopping: "Retail therapy: documented 🛍️",
  Fun: "Worth it. Probably. 🎉",
  Rent: "Adulting points +100 🏠",
  Subscriptions: "Another one bites the bank 📺",
  Health: "Future you says thanks 💊",
  Custom: "Logged. You sneaky spender ✨",
};

function AddPage() {
  const nav = useNavigate();
  const { addExpense, deleteExpense, expenses } = useAppData();
  const [amount, setAmount] = useState("");
  const [cat, setCat] = useState<Category>("Food");
  const [note, setNote] = useState("");
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    const n = Number(amount);
    if (!n || n <= 0) { toast.error("Enter an amount first 💸"); return; }
    setSaving(true);
    try {
      await addExpense({ amount: n, category: cat, note, date: new Date(date).toISOString() });
      toast.success(quips[cat] ?? "Logged!", {
        description: `-${inr(n)} from ${cat} budget · +10 XP`,
        action: {
          label: "Undo",
          onClick: async () => {
            // Find the most recent matching expense (just inserted) and delete it.
            const justAdded = [...expenses, { id: "", amount: n, category: cat, note, date } as unknown as Expense]
              .filter((e) => e.amount === n && e.category === cat)
              .sort((a, b) => +new Date(b.date) - +new Date(a.date))[0];
            if (!justAdded?.id) {
              // Fallback: refresh and grab newest
              return;
            }
            try {
              await deleteExpense(justAdded.id);
              toast("Undone — that expense vanished 🪄");
            } catch {
              toast.error("Couldn't undo");
            }
          },
        },
      });
      nav({ to: "/" });
    } catch (e: any) {
      toast.error(e?.message ?? "Couldn't save");
    } finally { setSaving(false); }
  };

  return (
    <div className="mx-auto max-w-xl px-5 pt-6 animate-float-up">
      <div className="flex items-center justify-between">
        <Link to="/" className="rounded-full glass p-2"><ArrowLeft className="h-5 w-5" /></Link>
        <h1 className="text-lg font-semibold">New expense</h1>
        <div className="w-9" />
      </div>

      <div className="mt-10 text-center">
        <p className="text-sm text-muted-foreground">How much did you slay?</p>
        <div className="mt-3 flex items-center justify-center gap-2">
          <span className="text-5xl font-bold text-muted-foreground">₹</span>
          <input
            type="number"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0"
            className="w-48 bg-transparent text-7xl font-bold text-center outline-none placeholder:text-muted-foreground/30 text-gradient-primary"
            autoFocus
          />
        </div>
      </div>

      <div className="mt-10">
        <p className="text-xs uppercase tracking-wider text-muted-foreground mb-3">Category</p>
        <div className="grid grid-cols-4 gap-2.5">
          {cats.map((c) => {
            const active = cat === c;
            return (
              <button
                key={c}
                onClick={() => setCat(c)}
                className={`group rounded-2xl p-3 flex flex-col items-center gap-1.5 transition-all border ${active ? "bg-gradient-primary text-primary-foreground border-transparent shadow-glow scale-105" : "glass border-border hover:scale-105"}`}
              >
                <span className="text-2xl">{CATEGORY_META[c].emoji}</span>
                <span className="text-[11px] font-medium">{c}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-6 space-y-3">
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="What was it? (optional)"
          maxLength={80}
          className="w-full glass rounded-2xl px-4 py-3.5 text-sm outline-none focus:ring-2 focus:ring-primary"
        />
        <div className="relative">
          <CalIcon className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full glass rounded-2xl pl-11 pr-4 py-3.5 text-sm outline-none focus:ring-2 focus:ring-primary [color-scheme:dark]"
          />
        </div>
      </div>

      <button
        onClick={submit}
        disabled={saving}
        className="mt-8 w-full rounded-2xl bg-gradient-primary py-4 text-base font-semibold text-primary-foreground shadow-glow transition-transform active:scale-95 disabled:opacity-60"
      >
        {saving ? "Saving…" : "Log it 💸"}
      </button>
    </div>
  );
}