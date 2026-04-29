import { Link } from "@tanstack/react-router";
import { Home, PlusCircle, PieChart, Sparkles, Trophy, User } from "lucide-react";

type NavItem = { to: "/" | "/dashboard" | "/insights" | "/goals" | "/settings"; label: string; Icon: typeof Home };

const leftItems: NavItem[] = [
  { to: "/", label: "Home", Icon: Home },
  { to: "/dashboard", label: "Stats", Icon: PieChart },
];

const rightItems: NavItem[] = [
  { to: "/insights", label: "AI", Icon: Sparkles },
  { to: "/settings", label: "Profile", Icon: User },
];

function NavLinkItem({ to, label, Icon }: NavItem) {
  return (
    <Link
      to={to}
      activeOptions={{ exact: true }}
      className="group flex-1 flex flex-col items-center gap-0.5 py-1.5 rounded-2xl transition-colors text-muted-foreground data-[status=active]:text-foreground"
    >
      <Icon className="h-5 w-5 transition-transform group-data-[status=active]:scale-110" />
      <span className="text-[10px] font-medium">{label}</span>
    </Link>
  );
}

export function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 px-3 pb-3 pt-2">
      <div className="relative mx-auto max-w-xl glass rounded-3xl px-2 py-2 flex items-center shadow-card">
        <div className="flex flex-1 items-center">
          {leftItems.map((item) => (
            <NavLinkItem key={item.to} {...item} />
          ))}
        </div>

        {/* Spacer reserving room for the centered FAB */}
        <div className="w-16 shrink-0" aria-hidden="true" />

        <div className="flex flex-1 items-center">
          {rightItems.map((item) => (
            <NavLinkItem key={item.to} {...item} />
          ))}
        </div>

        {/* Absolutely-centered floating action button */}
        <Link
          to="/add"
          activeOptions={{ exact: true }}
          aria-label="Add expense"
          className="absolute left-1/2 -top-7 -translate-x-1/2 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-primary text-primary-foreground shadow-glow ring-4 ring-background transition-transform hover:scale-105 active:scale-95"
        >
          <PlusCircle className="h-7 w-7" />
        </Link>
      </div>
    </nav>
  );
}