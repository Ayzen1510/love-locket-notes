import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { AppGate } from "@/components/AppGate";
import { BottomNav } from "@/components/BottomNav";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Heart, Send, Copy, Check, ImagePlus, X, Link2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

export const Route = createFileRoute("/chat")({
  head: () => ({ meta: [{ title: "Chat · Couple Memories Lock" }] }),
  component: () => <AppGate><ChatGate /></AppGate>,
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

type Pair = { id: string; user_a: string; user_b: string };
type Message = { id: string; pair_id: string; sender_id: string; content: string; image_path: string | null; created_at: string };

function ChatGate() {
  const { user } = useAuth();
  const { data: pair, isLoading, refetch } = useQuery({
    queryKey: ["my-pair", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await db.from("couple_pairs").select("*").maybeSingle();
      if (error) throw error;
      return data as Pair | null;
    },
  });

  if (isLoading) return <div className="min-h-screen flex items-center justify-center"><Heart className="w-8 h-8 text-primary animate-heart-pop" fill="currentColor" /></div>;
  if (!pair) return <PairingScreen onPaired={() => refetch()} />;
  return <ChatScreen pair={pair} />;
}

function makeCode() {
  const a = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 6; i++) s += a[Math.floor(Math.random() * a.length)];
  return s;
}

function PairingScreen({ onPaired }: { onPaired: () => void }) {
  const { user } = useAuth();
  const [myCode, setMyCode] = useState<string | null>(null);
  const [entered, setEntered] = useState("");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!user) return;
    let active = true;
    (async () => {
      const { data } = await db.from("couple_invites").select("code").eq("inviter_id", user.id).is("used_at", null).order("created_at", { ascending: false }).limit(1).maybeSingle();
      if (active && data?.code) setMyCode(data.code);
    })();
    return () => { active = false; };
  }, [user]);

  async function generate() {
    if (!user) return;
    setBusy(true);
    try {
      const code = makeCode();
      const { error } = await db.from("couple_invites").insert({ code, inviter_id: user.id });
      if (error) throw error;
      setMyCode(code);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not create code");
    } finally { setBusy(false); }
  }

  async function redeem(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    const code = entered.trim().toUpperCase();
    if (!code) return;
    setBusy(true);
    try {
      const { data: inv, error: e1 } = await db.from("couple_invites").select("*").eq("code", code).maybeSingle();
      if (e1) throw e1;
      if (!inv) throw new Error("Invalid code");
      if (inv.used_at) throw new Error("Code already used");
      if (inv.inviter_id === user.id) throw new Error("That's your own code 😊");
      const { error: e2 } = await db.from("couple_pairs").insert({ user_a: inv.inviter_id, user_b: user.id });
      if (e2) throw e2;
      await db.from("couple_invites").update({ used_at: new Date().toISOString() }).eq("code", code);
      toast.success("Paired! 💞");
      onPaired();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not pair");
    } finally { setBusy(false); }
  }

  async function copy() {
    if (!myCode) return;
    await navigator.clipboard.writeText(myCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="min-h-screen pb-32">
      <header className="px-5 pt-10">
        <p className="text-sm text-muted-foreground">Private messenger</p>
        <h1 className="text-3xl font-display romance-text">Pair with your love</h1>
      </header>

      <section className="px-5 mt-6 space-y-4">
        <div className="glass-strong rounded-3xl p-5 text-center">
          <div className="w-14 h-14 rounded-2xl romance-gradient mx-auto flex items-center justify-center shadow-[var(--shadow-romance)]">
            <Link2 className="w-6 h-6 text-white" />
          </div>
          <h2 className="font-display text-xl mt-3">Your invite code</h2>
          <p className="text-xs text-muted-foreground mt-1">Share this with your partner to start chatting privately.</p>
          {myCode ? (
            <button onClick={copy} className="mt-4 w-full glass rounded-2xl py-4 flex items-center justify-center gap-3">
              <span className="text-3xl font-display tracking-[0.4em] romance-text">{myCode}</span>
              {copied ? <Check className="w-4 h-4 text-primary" /> : <Copy className="w-4 h-4 text-muted-foreground" />}
            </button>
          ) : (
            <Button onClick={generate} disabled={busy} className="mt-4 btn-romance rounded-2xl h-11 w-full">
              {busy ? "Creating…" : "Generate code"}
            </Button>
          )}
        </div>

        <div className="glass-strong rounded-3xl p-5">
          <h2 className="font-display text-xl">Have a code?</h2>
          <p className="text-xs text-muted-foreground mt-1">Enter the 6-character code your partner shared.</p>
          <form onSubmit={redeem} className="mt-4 flex gap-2">
            <Input
              value={entered}
              onChange={(e) => setEntered(e.target.value.toUpperCase())}
              placeholder="ABC123"
              maxLength={6}
              className="h-12 rounded-2xl glass border-0 text-center text-lg tracking-[0.4em] font-display"
            />
            <Button type="submit" disabled={busy || entered.trim().length < 4} className="h-12 px-5 btn-romance rounded-2xl">Pair</Button>
          </form>
        </div>
      </section>
      <BottomNav />
    </div>
  );
}

function ChatScreen({ pair }: { pair: Pair }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const { data: messages = [] } = useQuery({
    queryKey: ["messages", pair.id],
    queryFn: async () => {
      const { data, error } = await db.from("messages").select("*").eq("pair_id", pair.id).order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Message[];
    },
  });

  useEffect(() => {
    const ch = supabase.channel(`messages-${pair.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `pair_id=eq.${pair.id}` }, (payload) => {
        const msg = payload.new as Message;
        qc.setQueryData<Message[]>(["messages", pair.id], (prev = []) => prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]);
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "messages", filter: `pair_id=eq.${pair.id}` }, (payload) => {
        const old = payload.old as Message;
        qc.setQueryData<Message[]>(["messages", pair.id], (prev = []) => prev.filter((m) => m.id !== old.id));
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [pair.id, qc]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    if (!text.trim() && !file) return;
    setBusy(true);
    try {
      let image_path: string | null = null;
      if (file) {
        const ext = file.name.split(".").pop() || "jpg";
        const path = `${pair.id}/${user.id}/${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage.from("chat-media").upload(path, file, { contentType: file.type });
        if (upErr) throw upErr;
        image_path = path;
      }
      const { error } = await db.from("messages").insert({ pair_id: pair.id, sender_id: user.id, content: text.trim(), image_path });
      if (error) throw error;
      setText("");
      setFile(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to send");
    } finally { setBusy(false); }
  }

  async function unpair() {
    if (!confirm("Unpair from your partner? All messages will be deleted.")) return;
    const { error } = await db.from("couple_pairs").delete().eq("id", pair.id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["my-pair", user?.id] });
  }

  return (
    <div className="min-h-screen flex flex-col pb-[calc(env(safe-area-inset-bottom)+96px)]">
      <header className="px-5 pt-10 pb-3 flex items-center justify-between sticky top-0 z-10 glass-strong">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Private chat</p>
          <h1 className="text-2xl font-display romance-text">Us 💌</h1>
        </div>
        <button onClick={unpair} className="text-xs text-muted-foreground underline">Unpair</button>
      </header>

      <div className="flex-1 px-4 py-4 space-y-2 overflow-y-auto">
        {messages.length === 0 && (
          <div className="text-center text-sm text-muted-foreground py-12">Say something sweet 💕</div>
        )}
        {messages.map((m) => (
          <Bubble key={m.id} m={m} mine={m.sender_id === user?.id} />
        ))}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={send} className="fixed bottom-0 inset-x-0 z-20 px-3 pb-[calc(env(safe-area-inset-bottom)+12px)] pt-2">
        {file && (
          <div className="mb-2 mx-1 flex items-center gap-2 glass rounded-2xl p-2 text-xs">
            <img src={URL.createObjectURL(file)} alt="" className="w-10 h-10 rounded-lg object-cover" />
            <span className="truncate flex-1">{file.name}</span>
            <button type="button" onClick={() => setFile(null)} className="w-6 h-6 rounded-full bg-black/40 text-white flex items-center justify-center"><X className="w-3 h-3" /></button>
          </div>
        )}
        <div className="glass-strong rounded-2xl flex items-center gap-2 p-2">
          <button type="button" onClick={() => fileRef.current?.click()} className="w-10 h-10 rounded-xl flex items-center justify-center text-muted-foreground hover:text-primary" aria-label="Attach image">
            <ImagePlus className="w-5 h-5" />
          </button>
          <input ref={fileRef} type="file" hidden accept="image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Type a love note…"
            className="flex-1 bg-transparent outline-none text-base px-1"
            maxLength={2000}
          />
          <button type="submit" disabled={busy || (!text.trim() && !file)} className="w-10 h-10 rounded-xl romance-gradient text-white flex items-center justify-center disabled:opacity-40" aria-label="Send">
            <Send className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  );
}

function Bubble({ m, mine }: { m: Message; mine: boolean }) {
  const [imgUrl, setImgUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!m.image_path) return;
    let alive = true;
    supabase.storage.from("chat-media").createSignedUrl(m.image_path, 60 * 60).then(({ data }) => {
      if (alive) setImgUrl(data?.signedUrl ?? null);
    });
    return () => { alive = false; };
  }, [m.image_path]);

  return (
    <div className={`flex ${mine ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[78%] rounded-3xl px-4 py-2.5 ${mine ? "romance-gradient text-white rounded-br-md" : "glass-strong rounded-bl-md"}`}>
        {imgUrl && (
          <img src={imgUrl} alt="" className="rounded-2xl mb-1 max-h-72 object-cover" />
        )}
        {m.content && <p className="whitespace-pre-wrap break-words text-[15px] leading-snug">{m.content}</p>}
        <p className={`text-[10px] mt-1 ${mine ? "text-white/70" : "text-muted-foreground"}`}>{format(new Date(m.created_at), "p")}</p>
      </div>
    </div>
  );
}