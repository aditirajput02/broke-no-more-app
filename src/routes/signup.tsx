import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { AuthShell, Field, Divider, GoogleIcon } from "./login";

export const Route = createFileRoute("/signup")({
  head: () => ({ meta: [{ title: "Sign up — Broke No More" }] }),
  component: SignupPage,
});

const schema = z.object({
  username: z.string().trim().min(2, "At least 2 characters").max(30, "Max 30 characters"),
  email: z.string().email("Enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

function SignupPage() {
  const nav = useNavigate();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ username?: string; email?: string; password?: string }>({});

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse({ username, email, password });
    if (!parsed.success) {
      const fe: any = {};
      parsed.error.issues.forEach((i) => { fe[i.path[0] as string] = i.message; });
      setErrors(fe);
      return;
    }
    setErrors({});
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email, password,
      options: {
        emailRedirectTo: window.location.origin,
        data: { username },
      },
    });
    setLoading(false);
    if (error) {
      if (error.message.toLowerCase().includes("registered")) toast.error("Email already in use");
      else toast.error(error.message);
      return;
    }
    toast.success(`Welcome aboard, ${username} 💜`);
    nav({ to: "/" });
  };

  const google = async () => {
    const res = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (res.error) toast.error("Google sign-in failed");
  };

  return <AuthShell title="Create account" subtitle="Get rich (or at least less broke)">
    <form onSubmit={submit} className="space-y-3">
      <Field label="Username" error={errors.username}>
        <input value={username} onChange={(e) => setUsername(e.target.value)}
          placeholder="yourname"
          className="w-full glass rounded-2xl px-4 py-3.5 text-sm outline-none focus:ring-2 focus:ring-primary" />
      </Field>
      <Field label="Email" error={errors.email}>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
          placeholder="you@broke.no.more"
          className="w-full glass rounded-2xl px-4 py-3.5 text-sm outline-none focus:ring-2 focus:ring-primary" />
      </Field>
      <Field label="Password" error={errors.password}>
        <div className="relative">
          <input type={show ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)}
            placeholder="6+ characters"
            className="w-full glass rounded-2xl px-4 py-3.5 pr-12 text-sm outline-none focus:ring-2 focus:ring-primary" />
          <button type="button" onClick={() => setShow((s) => !s)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
            {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </Field>
      <button type="submit" disabled={loading}
        className="w-full rounded-2xl bg-gradient-primary py-4 text-base font-semibold text-primary-foreground shadow-glow active:scale-95 transition-transform disabled:opacity-60">
        {loading ? <Loader2 className="h-5 w-5 animate-spin mx-auto" /> : "Sign up"}
      </button>
    </form>
    <Divider />
    <button onClick={google} className="w-full glass rounded-2xl py-3.5 text-sm font-semibold flex items-center justify-center gap-2 hover:scale-[1.01] transition-transform">
      <GoogleIcon /> Continue with Google
    </button>
    <p className="mt-5 text-center text-sm text-muted-foreground">
      Already have an account? <Link to="/login" className="text-primary font-semibold">Login</Link>
    </p>
  </AuthShell>;
}