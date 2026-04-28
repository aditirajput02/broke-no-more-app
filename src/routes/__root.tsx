import { Outlet, Link, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import appCss from "../styles.css?url";
import { Toaster } from "sonner";
import { BottomNav } from "@/components/app/BottomNav";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-gradient-primary">404</h1>
        <h2 className="mt-4 text-xl font-semibold">Page got ghosted 👻</h2>
        <p className="mt-2 text-sm text-muted-foreground">This page doesn't exist (or it's broke too).</p>
        <Link to="/" className="mt-6 inline-flex rounded-full bg-gradient-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-glow">
          Take me home
        </Link>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { title: "Broke No More — Slay your budget" },
      { name: "description", content: "A Gen Z finance tracker that's actually fun. Track expenses, hit goals, and stop being broke." },
      { property: "og:title", content: "Broke No More" },
      { property: "og:description", content: "Slay the budget, not your savings." },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&display=swap" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head><HeadContent /></head>
      <body>{children}<Scripts /></body>
    </html>
  );
}

function RootComponent() {
  return (
    <div className="min-h-screen pb-28">
      <Outlet />
      <BottomNav />
      <Toaster theme="dark" position="top-center" toastOptions={{ style: { background: "oklch(0.21 0.025 280)", border: "1px solid oklch(1 0 0 / 0.08)", color: "oklch(0.98 0.005 280)" } }} />
    </div>
  );
}
