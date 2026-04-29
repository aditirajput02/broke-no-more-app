import { Outlet, Link, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import appCss from "../styles.css?url";
import { Toaster } from "sonner";
import { BottomNav } from "@/components/app/BottomNav";
import { AuthProvider, useAuth } from "@/lib/auth";
import { useRouter, useLocation, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

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
      { property: "og:title", content: "Broke No More — Slay your budget" },
      { property: "og:description", content: "A Gen Z finance tracker that's actually fun. Track expenses, hit goals, and stop being broke." },
      { name: "twitter:title", content: "Broke No More — Slay your budget" },
      { name: "twitter:description", content: "A Gen Z finance tracker that's actually fun. Track expenses, hit goals, and stop being broke." },
      { property: "og:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/attachments/og-images/9dc7e996-855b-4076-ac6d-6171dd4f7dcf" },
      { name: "twitter:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/attachments/og-images/9dc7e996-855b-4076-ac6d-6171dd4f7dcf" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:type", content: "website" },
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
    <AuthProvider>
      <AppShell />
    </AuthProvider>
  );
}

const PUBLIC_ROUTES = ["/login", "/signup"];

function AppShell() {
  const { user, loading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const isPublic = PUBLIC_ROUTES.includes(location.pathname);

  useEffect(() => {
    if (loading) return;
    if (!user && !isPublic) navigate({ to: "/login" });
    if (user && isPublic) navigate({ to: "/" });
  }, [user, loading, isPublic, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="h-10 w-10 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-28">
      <Outlet />
      {user && !isPublic && <BottomNav />}
      <Toaster theme="dark" position="top-center" toastOptions={{ style: { background: "oklch(0.21 0.025 280)", border: "1px solid oklch(1 0 0 / 0.08)", color: "oklch(0.98 0.005 280)" } }} />
    </div>
  );
}
