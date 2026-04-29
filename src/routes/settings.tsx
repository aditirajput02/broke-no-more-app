import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useAppData, getMeta, inr } from "@/lib/store";
import { Bell, LogOut, Palette, Wallet } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { CenterSpinner } from "./index";

export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [{ title: "Profile — Broke No More" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const { profile, budgets, setIncome, setBudget, loading, categories, categoryMap } = useAppData();
  const { signOut, user } = useAuth();
  const nav = useNavigate();
  const [theme, setTheme] = useState<"Dark" | "Light" | "AMOLED">("Dark");
  const [notif, setNotif] = useState(true);

  if (loading) return <CenterSpinner />;
  const income = profile?.monthly_income ?? 0;
  const initial = (profile?.username ?? "U").charAt(0).toUpperCase();

  const logout = async () => {
    await signOut();
    nav({ to: "/login" });
  };

  return (
    <div className="mx-auto max-w-xl px-5 pt-8 animate-float-up">
      <div className="flex items-center gap-4">
        <div className="h-16 w-16 rounded-full bg-gradient-primary shadow-glow flex items-center justify-center text-2xl font-bold text-primary-foreground">
          {initial}
        </div>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{profile?.username ?? "You"}</h1>
          <p className="text-sm text-muted-foreground">{user?.email}</p>
        </div>
        <button onClick={logout} className="rounded-full glass p-2.5" aria-label="Sign out">
          <LogOut className="h-4 w-4" />
        </button>
      </div>

      <Section icon={<Wallet className="h-4 w-4" />} title="Monthly income">
        <div className="flex items-center gap-2 glass rounded-2xl px-4 py-3">
          <span className="text-muted-foreground">₹</span>
          <input
            type="number"
            defaultValue={income}
            onBlur={async (e) => { await setIncome(Number(e.target.value) || 0); toast.success("Income updated 💸"); }}
            className="flex-1 bg-transparent outline-none font-semibold"
          />
        </div>
        <p className="text-xs text-muted-foreground mt-2">Currently set to {inr(income)}.</p>
      </Section>

      <Section icon={<Wallet className="h-4 w-4" />} title="Category budgets">
        <div className="space-y-2">
          {categories.map((c) => {
            const meta = getMeta(c.name, categoryMap);
            return (
              <div key={c.id} className="glass rounded-2xl px-4 py-3 flex items-center gap-3">
                <span className="text-xl">{meta.emoji}</span>
                <span className="font-medium text-sm flex-1 truncate">{c.name}</span>
                <span className="text-xs text-muted-foreground">₹</span>
                <input
                  type="number"
                  defaultValue={budgets[c.name] ?? 0}
                  onBlur={async (e) => { await setBudget(c.name, Number(e.target.value) || 0); }}
                  className="w-24 bg-transparent outline-none text-right font-semibold"
                />
              </div>
            );
          })}
          {categories.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-3">
              No categories yet — add one from the Stats page.
            </p>
          )}
        </div>
      </Section>

      <Section icon={<Bell className="h-4 w-4" />} title="Notifications">
        <Toggle label="Daily spend reminders" value={notif} onChange={setNotif} />
        <Toggle label="Budget warnings" value={true} onChange={() => {}} />
        <Toggle label="Weekly AI report" value={true} onChange={() => {}} />
      </Section>

      <Section icon={<Palette className="h-4 w-4" />} title="Theme">
        <div className="grid grid-cols-3 gap-2">
          {(["Dark", "Light", "AMOLED"] as const).map((t) => (
            <button
              key={t}
              onClick={() => { setTheme(t); toast(`Theme: ${t}`, { description: t === "Dark" ? "Default vibes ✨" : t === "AMOLED" ? "Battery-saver mode 🔋" : "Coming soon ☀️" }); }}
              className={`rounded-2xl py-3 text-sm font-semibold transition-all ${theme === t ? "bg-gradient-primary text-primary-foreground shadow-glow" : "glass text-muted-foreground"}`}
            >
              {t}
            </button>
          ))}
        </div>
      </Section>

      <p className="text-center text-xs text-muted-foreground pt-8 pb-2">Made with 💜 by people who've been broke too.</p>
    </div>
  );
}

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="mt-6">
      <h2 className="text-xs uppercase tracking-wider text-muted-foreground mb-2.5 flex items-center gap-2">
        {icon} {title}
      </h2>
      {children}
    </div>
  );
}

function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!value)} className="w-full glass rounded-2xl px-4 py-3.5 flex items-center justify-between mb-2">
      <span className="text-sm font-medium">{label}</span>
      <span className={`relative h-6 w-11 rounded-full transition-colors ${value ? "bg-gradient-primary" : "bg-muted"}`}>
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${value ? "translate-x-5" : "translate-x-0.5"}`} />
      </span>
    </button>
  );
}