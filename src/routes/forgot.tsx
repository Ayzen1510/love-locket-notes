import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AuthShell } from "@/components/AuthShell";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/forgot")({
  head: () => ({ meta: [{ title: "Forgot password · Couple Memories Lock" }] }),
  component: ForgotPage,
});

function ForgotPage() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: typeof window !== "undefined" ? `${window.location.origin}/reset-password` : undefined,
    });
    setBusy(false);
    if (error) toast.error(error.message);
    else { setSent(true); toast.success("Check your inbox 💌"); }
  }

  return (
    <AuthShell title="Forgot password" subtitle="We'll email you a reset link">
      {sent ? (
        <p className="text-sm text-center text-muted-foreground">
          A reset link is on its way to <span className="text-foreground">{email}</span>.
        </p>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Email</Label>
            <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <Button type="submit" disabled={busy} className="w-full h-11 btn-romance rounded-xl">
            {busy ? "Sending…" : "Send reset link"}
          </Button>
        </form>
      )}
      <p className="text-sm text-center text-muted-foreground mt-4">
        <Link to="/login" className="hover:text-primary">← Back to sign in</Link>
      </p>
    </AuthShell>
  );
}