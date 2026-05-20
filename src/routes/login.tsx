import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { AuthShell } from "@/components/AuthShell";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Sign in · Couple Memories Lock" }] }),
  component: LoginPage,
});

function LoginPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (user) navigate({ to: "/" });
  }, [user, navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) toast.error(error.message);
    else { toast.success("Welcome back 💕"); navigate({ to: "/" }); }
  }

  return (
    <AuthShell title="Welcome back" subtitle="Sign in to your love diary">
      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-1.5">
          <Label>Email</Label>
          <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@love.com" />
        </div>
        <div className="space-y-1.5">
          <Label>Password</Label>
          <Input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <Button type="submit" disabled={busy} className="w-full h-11 btn-romance rounded-xl">
          {busy ? "Signing in…" : "Sign in"}
        </Button>
        <div className="flex justify-between text-sm pt-1">
          <Link to="/forgot" className="text-muted-foreground hover:text-primary">Forgot password?</Link>
          <Link to="/signup" className="text-primary font-medium hover:underline">Create account</Link>
        </div>
      </form>
    </AuthShell>
  );
}