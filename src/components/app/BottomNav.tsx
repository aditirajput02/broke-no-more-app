import { Link } from "@tanstack/react-router";
import { Home, PlusCircle, PieChart, Sparkles, Trophy, User } from "lucide-react";

type Item = { to: "/" | "/dashboard" | "/add" | "/insights" | "/goals" | "/settings"; label: string; Icon: typeof Home; primary?: boolean };
const items: Item[] = [
  { to: "/", label: "Home", Icon: Home },
  { to: "/dashboard", label: "Stats", Icon: PieChart },
  { to: "/add", label: "Add", Icon: PlusCircle, primary: true },
  { to: "/insights", label: "AI", Icon: Sparkles },
  { to: "/goals", label: "Goals", Icon: Trophy },
  { to: "/settings", label: "Profile", Icon: User },
];

export function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 px-3 pb-3 pt-2">
      <div className="mx-auto max-w-xl glass rounded-3xl px-2 py-2 flex items-center justify-between shadow-card">
        {items.map(({ to, label, Icon, primary }) => (
          <Link
            key={to}
            to={to}
            activeOptions={{ exact: true }}
            className="group flex-1 flex flex-col items-center gap-0.5 py-1.5 rounded-2xl transition-colors text-muted-foreground data-[status=active]:text-foreground"
          >
            {primary ? (
              <span className="-mt-7 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-primary shadow-glow text-primary-foreground transition-transform group-hover:scale-105 group-active:scale-95">
                <Icon className="h-7 w-7" />
              </span>
            ) : (
              <Icon className="h-5 w-5 transition-transform group-data-[status=active]:scale-110" />
            )}
            {!primary && <span className="text-[10px] font-medium">{label}</span>}
          </Link>
        ))}
      </div>
    </nav>
  );
}