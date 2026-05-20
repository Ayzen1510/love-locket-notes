import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AuthShell } from "@/components/AuthShell";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/signup")({
  head: () => ({ meta: [{ title: "Create account · Couple Memories Lock" }] }),
  component: SignupPage,
});

function SignupPage() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: typeof window !== "undefined" ? window.location.origin : undefined,
        data: { display_name: name },
      },
    });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Account created 💖");
    navigate({ to: "/" });
  }

  return (
    <AuthShell title="Begin your story" subtitle="Create your private memory vault">
      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-1.5">
          <Label>Your name</Label>
          <Input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Alex" />
        </div>
        <div className="space-y-1.5">
          <Label>Email</Label>
          <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@love.com" />
        </div>
        <div className="space-y-1.5">
          <Label>Password</Label>
          <Input type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <Button type="submit" disabled={busy} className="w-full h-11 btn-romance rounded-xl">
          {busy ? "Creating…" : "Create account"}
        </Button>
        <p className="text-sm text-center text-muted-foreground">
          Already have one? <Link to="/login" className="text-primary font-medium hover:underline">Sign in</Link>
        </p>
      </form>
    </AuthShell>
  );
}