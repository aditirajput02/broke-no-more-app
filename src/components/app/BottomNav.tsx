import { Link } from "@tanstack/react-router";
import { Castle, Map, Plus, Sparkles, Trophy, Shield } from "lucide-react";

type Item = {
  to: "/" | "/dashboard" | "/add" | "/insights" | "/goals" | "/settings";
  label: string;
  Icon: typeof Castle;
  primary?: boolean;
};

// RPG menu metaphors: Tavern (home), Map (stats), Forge (+), Magic (AI), Trophies (goals), Guild (profile)
const left: Item[] = [
  { to: "/", label: "Tavern", Icon: Castle },
  { to: "/dashboard", label: "Map", Icon: Map },
];
const right: Item[] = [
  { to: "/insights", label: "Magic", Icon: Sparkles },
  { to: "/goals", label: "Trophies", Icon: Trophy },
  { to: "/settings", label: "Guild", Icon: Shield },
];

export function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 px-3 pb-3 pt-2 pointer-events-none">
      <div className="relative mx-auto max-w-xl pointer-events-auto">
        {/* Floating Action Button — perfectly centered, elevated above the bar */}
        <Link
          to="/add"
          aria-label="Forge — log expense"
          className="absolute left-1/2 -translate-x-1/2 -top-7 z-10 h-16 w-16 rounded-full
                     bg-gradient-primary shadow-glow ring-2 ring-[var(--gold)]/60
                     flex items-center justify-center text-primary-foreground
                     transition-transform hover:scale-105 active:scale-95"
        >
          <span className="absolute inset-1 rounded-full ring-1 ring-white/15 pointer-events-none" />
          <Plus className="h-8 w-8" strokeWidth={2.5} />
        </Link>

        <div className="quest-panel rounded-3xl px-2 py-2 grid grid-cols-5 items-end">
          {left.map((it) => <NavBtn key={it.to} {...it} />)}
          {/* Spacer cell under the FAB */}
          <div aria-hidden className="h-12" />
          {right.map((it) => <NavBtn key={it.to} {...it} />)}
        </div>
      </div>
    </nav>
  );
}

function NavBtn({ to, label, Icon }: Item) {
  return (
    <Link
      to={to}
      activeOptions={{ exact: true }}
      className="group flex flex-col items-center gap-0.5 py-1.5 rounded-2xl
                 text-muted-foreground transition-colors
                 data-[status=active]:text-[var(--gold)]"
    >
      <Icon className="h-5 w-5 transition-transform group-data-[status=active]:scale-110 group-hover:scale-110" />
      <span className="text-[10px] font-medium tracking-wide uppercase">{label}</span>
    </Link>
  );
}
