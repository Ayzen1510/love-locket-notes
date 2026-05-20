import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useLock } from "@/lib/lock";
import { AppGate } from "@/components/AppGate";
import { BottomNav } from "@/components/BottomNav";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { LogOut, Lock, Heart } from "lucide-react";
import { differenceInDays, format, parseISO } from "date-fns";

export const Route = createFileRoute("/profile")({
  head: () => ({ meta: [{ title: "Profile · Couple Memories Lock" }] }),
  component: () => <AppGate><Profile /></AppGate>,
});

function Profile() {
  const { user, signOut } = useAuth();
  const { lock } = useLock();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState("");
  const [partnerName, setPartnerName] = useState("");
  const [startDate, setStartDate] = useState("");

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").eq("id", user!.id).maybeSingle();
      return data;
    },
  });

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name ?? "");
      setPartnerName(profile.partner_name ?? "");
      setStartDate(profile.relationship_start_date ?? "");
    }
  }, [profile]);

  async function save() {
    if (!user) return;
    const { error } = await supabase.from("profiles").upsert({
      id: user.id,
      display_name: displayName || null,
      partner_name: partnerName || null,
      relationship_start_date: startDate || null,
    });
    if (error) toast.error(error.message);
    else { toast.success("Saved 💕"); qc.invalidateQueries({ queryKey: ["profile", user.id] }); }
  }

  const days = startDate ? Math.max(0, differenceInDays(new Date(), parseISO(startDate))) : null;

  return (
    <div className="min-h-screen pb-32">
      <header className="px-5 pt-10 pb-4">
        <p className="text-sm text-muted-foreground">Your couple</p>
        <h1 className="text-3xl font-display romance-text">Profile</h1>
      </header>

      {days !== null && (
        <div className="mx-5 mb-5 glass-strong rounded-3xl p-5 text-center">
          <Heart className="w-6 h-6 text-primary mx-auto" fill="currentColor" />
          <p className="text-5xl font-display romance-text mt-2">{days}</p>
          <p className="text-xs text-muted-foreground">days together · since {format(parseISO(startDate), "MMM d, yyyy")}</p>
        </div>
      )}

      <div className="mx-5 glass-strong rounded-3xl p-4 space-y-4">
        <div className="space-y-1.5">
          <Label>Your name</Label>
          <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Partner's name</Label>
          <Input value={partnerName} onChange={(e) => setPartnerName(e.target.value)} placeholder="Sam" />
        </div>
        <div className="space-y-1.5">
          <Label>Relationship start date</Label>
          <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </div>
        <Button onClick={save} className="w-full h-11 btn-romance rounded-xl">Save changes</Button>
      </div>

      <div className="mx-5 mt-5 glass-strong rounded-3xl p-2 divide-y divide-border/40">
        <button onClick={() => { lock(); navigate({ to: "/" }); }} className="w-full flex items-center gap-3 p-3 text-left hover:bg-secondary/40 rounded-2xl">
          <Lock className="w-5 h-5 text-primary" />
          <div className="flex-1">
            <p className="text-sm font-medium">Lock app</p>
            <p className="text-xs text-muted-foreground">Require PIN to view memories</p>
          </div>
        </button>
        <button onClick={signOut} className="w-full flex items-center gap-3 p-3 text-left hover:bg-secondary/40 rounded-2xl">
          <LogOut className="w-5 h-5 text-destructive" />
          <div className="flex-1">
            <p className="text-sm font-medium">Sign out</p>
            <p className="text-xs text-muted-foreground">You'll need to sign in again</p>
          </div>
        </button>
      </div>

      <BottomNav />
    </div>
  );
}