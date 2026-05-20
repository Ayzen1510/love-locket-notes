import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useLock } from "@/lib/lock";
import { hashPin } from "@/lib/pin";
import { Button } from "@/components/ui/button";
import { Heart, LogOut, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { HeartParticles } from "./HeartParticles";

const LEN = 4;

export function LockScreen() {
  const { user, signOut } = useAuth();
  const { unlock } = useLock();
  const [hasPin, setHasPin] = useState<boolean | null>(null);
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [mode, setMode] = useState<"enter" | "set" | "confirm">("enter");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!user) return;
      const { data } = await supabase.from("pin_codes").select("pin_hash").eq("user_id", user.id).maybeSingle();
      if (!active) return;
      if (data?.pin_hash) {
        setHasPin(true);
        setMode("enter");
      } else {
        setHasPin(false);
        setMode("set");
      }
    })();
    return () => { active = false; };
  }, [user]);

  const press = (n: string) => {
    const target = mode === "confirm" ? confirmPin : pin;
    if (target.length >= LEN) return;
    const next = target + n;
    if (mode === "confirm") setConfirmPin(next); else setPin(next);
    if (next.length === LEN) setTimeout(() => submit(next), 150);
  };

  const back = () => {
    if (mode === "confirm") setConfirmPin((s) => s.slice(0, -1));
    else setPin((s) => s.slice(0, -1));
  };

  async function submit(complete: string) {
    if (!user) return;
    setBusy(true);
    try {
      if (mode === "enter") {
        const { data } = await supabase.from("pin_codes").select("pin_hash").eq("user_id", user.id).single();
        const candidate = await hashPin(complete, user.id);
        if (candidate === data?.pin_hash) {
          toast.success("Welcome back 💕");
          unlock();
        } else {
          toast.error("Wrong PIN");
          setPin("");
        }
      } else if (mode === "set") {
        setMode("confirm");
      } else if (mode === "confirm") {
        if (complete !== pin) {
          toast.error("PINs don't match");
          setPin("");
          setConfirmPin("");
          setMode("set");
        } else {
          const hash = await hashPin(complete, user.id);
          const { error } = await supabase.from("pin_codes").upsert({ user_id: user.id, pin_hash: hash });
          if (error) throw error;
          toast.success("PIN set ✨");
          unlock();
        }
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Something went wrong";
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  }

  async function forgotPin() {
    if (!user) return;
    if (!confirm("Reset your PIN? You'll create a new one after signing in again.")) return;
    await supabase.from("pin_codes").delete().eq("user_id", user.id);
    await signOut();
  }

  const current = mode === "confirm" ? confirmPin : pin;
  const title = mode === "enter" ? "Enter your PIN" : mode === "set" ? "Create a 4-digit PIN" : "Confirm your PIN";
  const subtitle = mode === "enter" ? "Unlock your memories" : mode === "set" ? "Keeps your diary private" : "Type it once more";

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 relative">
      <HeartParticles count={10} />
      <div className="glass-strong rounded-3xl p-8 w-full max-w-sm flex flex-col items-center gap-6 relative animate-fade-up">
        <div className="relative">
          <div className="w-20 h-20 rounded-3xl romance-gradient flex items-center justify-center shadow-[var(--shadow-romance)]">
            <Heart className="w-10 h-10 text-white animate-heart-pop" fill="currentColor" />
          </div>
          <Sparkles className="w-5 h-5 absolute -top-1 -right-2 text-[var(--gold)] animate-sparkle" />
        </div>

        <div className="text-center">
          <h1 className="text-2xl font-display romance-text">{title}</h1>
          <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
        </div>

        <div className="flex gap-3">
          {Array.from({ length: LEN }).map((_, i) => (
            <div
              key={i}
              className={`w-4 h-4 rounded-full border-2 transition-all ${i < current.length ? "romance-gradient border-transparent scale-110" : "border-primary/40"}`}
            />
          ))}
        </div>

        <div className="grid grid-cols-3 gap-3 w-full">
          {["1","2","3","4","5","6","7","8","9"].map((n) => (
            <button
              key={n}
              disabled={busy}
              onClick={() => press(n)}
              className="h-14 rounded-2xl glass text-xl font-medium hover:scale-105 active:scale-95 transition-transform"
            >
              {n}
            </button>
          ))}
          <button onClick={forgotPin} className="h-14 rounded-2xl text-xs text-muted-foreground hover:text-primary">
            Forgot?
          </button>
          <button onClick={() => press("0")} disabled={busy} className="h-14 rounded-2xl glass text-xl hover:scale-105 active:scale-95 transition-transform">
            0
          </button>
          <button onClick={back} className="h-14 rounded-2xl text-sm hover:bg-secondary/50">
            ⌫
          </button>
        </div>

        <Button variant="ghost" size="sm" onClick={signOut} className="text-muted-foreground">
          <LogOut className="w-4 h-4 mr-2" /> Sign out
        </Button>
      </div>
    </div>
  );
}