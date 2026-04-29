import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { useAppData, CATEGORY_META, type Category, inr, lastNDays, spentByCategory, totalSpent } from "@/lib/store";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { CenterSpinner } from "./index";

export const Route = createFileRoute("/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — Broke No More" }] }),
  component: DashPage,
});

const RANGES = { Week: 7, Month: 30, Year: 365 } as const;
type RangeKey = keyof typeof RANGES;

function DashPage() {
  const { expenses, loading, deleteExpense, restoreExpense } = useAppData();
  const [range, setRange] = useState<RangeKey>("Month");
  const [filter, setFilter] = useState<Category | "All">("All");

  const scoped = useMemo(() => lastNDays(expenses, RANGES[range]), [expenses, range]);
  const total = totalSpent(scoped);
  const byCat = spentByCategory(scoped);

  const pieData = byCat.map(([c, v]) => ({ name: c, value: v, color: CATEGORY_META[c].color }));
  const visible = scoped.filter((e) => filter === "All" || e.category === filter);

  if (loading) return <CenterSpinner />;

  const handleDelete = async (id: string) => {
    try {
      const removed = await deleteExpense(id);
      if (!removed) return;
      toast("Deleted — gone but not forgotten 🫡", {
        description: `${CATEGORY_META[removed.category].emoji} ${removed.category} · ${inr(removed.amount)}`,
        action: {
          label: "Undo",
          onClick: async () => {
            try {
              await restoreExpense(removed);
              toast.success("Brought it back 🪄");
            } catch {
              toast.error("Couldn't restore");
            }
          },
        },
      });
    } catch (e: any) {
      toast.error(e?.message ?? "Couldn't delete");
    }
  };

  return (
    <div className="mx-auto max-w-xl px-5 pt-8 pb-4 animate-float-up">
      <h1 className="text-2xl font-bold">Where it all went 🔍</h1>
      <p className="text-sm text-muted-foreground">The receipts. Literally.</p>

      <div className="mt-5 inline-flex glass rounded-full p-1">
        {(Object.keys(RANGES) as RangeKey[]).map((k) => (
          <button key={k} onClick={() => setRange(k)}
            className={`px-4 py-1.5 text-xs font-semibold rounded-full transition-all ${range === k ? "bg-gradient-primary text-primary-foreground shadow-glow" : "text-muted-foreground"}`}>
            {k}
          </button>
        ))}
      </div>

      <div className="mt-6 glass rounded-3xl p-5 shadow-card">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">{range} spend</p>
            <p className="text-3xl font-bold mt-1">{inr(total)}</p>
          </div>
          <div className="text-right text-xs text-muted-foreground">
            <p>{scoped.length} transactions</p>
            <p>{byCat.length} categories</p>
          </div>
        </div>
        <div className="h-56 mt-2">
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} dataKey="value" innerRadius={55} outerRadius={88} paddingAngle={3} stroke="none">
                  {pieData.map((d, i) => <Cell key={i} fill={d.color} />)}
                </Pie>
                <Tooltip
                  contentStyle={{ background: "oklch(0.21 0.025 280)", border: "1px solid oklch(1 0 0 / 0.1)", borderRadius: 12, color: "white" }}
                  formatter={(v: number) => inr(v)}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-sm text-muted-foreground">No spending yet — flex on it 💪</div>
          )}
        </div>
        <div className="grid grid-cols-2 gap-2 mt-2">
          {byCat.slice(0, 6).map(([c, v]) => (
            <div key={c} className="flex items-center gap-2 text-xs">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: CATEGORY_META[c].color }} />
              <span className="text-muted-foreground">{c}</span>
              <span className="ml-auto font-semibold">{inr(v)}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6 flex items-center gap-2 overflow-x-auto pb-2 -mx-5 px-5 scrollbar-none">
        <button onClick={() => setFilter("All")}
          className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${filter === "All" ? "bg-foreground text-background" : "glass text-muted-foreground"}`}>
          All
        </button>
        {(Object.keys(CATEGORY_META) as Category[]).map((c) => (
          <button key={c} onClick={() => setFilter(c)}
            className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${filter === c ? "bg-foreground text-background" : "glass text-muted-foreground"}`}>
            {CATEGORY_META[c].emoji} {c}
          </button>
        ))}
      </div>

      <div className="mt-3 space-y-2">
        {visible.map((e) => (
          <div key={e.id} className="glass rounded-2xl p-3 flex items-center gap-3">
            <div className="h-11 w-11 rounded-xl flex items-center justify-center text-xl"
              style={{ background: `color-mix(in oklab, ${CATEGORY_META[e.category].color} 25%, transparent)` }}>
              {CATEGORY_META[e.category].emoji}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-sm truncate">{e.note || e.category}</p>
              <p className="text-xs text-muted-foreground">{e.category} · {format(new Date(e.date), "MMM d")}</p>
            </div>
            <p className="font-bold">-{inr(e.amount)}</p>
            <button
              onClick={() => handleDelete(e.id)}
              aria-label="Delete expense"
              className="ml-1 h-8 w-8 rounded-lg grid place-items-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
        {visible.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-8">Nothing here. Iconic. 🌟</p>
        )}
      </div>
    </div>
  );
}