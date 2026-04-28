import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AuthShell, Field } from "./login";

export const Route = createFileRoute("/reset-password")({
  head: () => ({ meta: [{ title: "Reset password — Broke No More" }] }),
  component: ResetPage,
});

function ResetPage() {
  const nav = useNavigate();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) { toast.error("Password too short"); return; }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Password updated 💜");
    nav({ to: "/" });
  };

  return <AuthShell title="New password" subtitle="Choose something memorable">
    <form onSubmit={submit} className="space-y-3">
      <Field label="New password">
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
          placeholder="6+ characters"
          className="w-full glass rounded-2xl px-4 py-3.5 text-sm outline-none focus:ring-2 focus:ring-primary" />
      </Field>
      <button type="submit" disabled={loading}
        className="w-full rounded-2xl bg-gradient-primary py-4 text-base font-semibold text-primary-foreground shadow-glow active:scale-95 disabled:opacity-60">
        {loading ? <Loader2 className="h-5 w-5 animate-spin mx-auto" /> : "Update password"}
      </button>
    </form>
  </AuthShell>;
}