import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { AppGate } from "@/components/AppGate";
import { BottomNav } from "@/components/BottomNav";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Heart, Send, Copy, Check, ImagePlus, X, Link2, Reply, Pencil, Trash2, SmilePlus } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

export const Route = createFileRoute("/chat")({
  head: () => ({ meta: [{ title: "Chat · Couple Memories Lock" }] }),
  component: () => <AppGate><ChatGate /></AppGate>,
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

type Pair = { id: string; user_a: string; user_b: string };
type Reactions = Record<string, string[]>;
type Message = {
  id: string; pair_id: string; sender_id: string; content: string; image_path: string | null; created_at: string;
  edited_at: string | null; deleted_at: string | null; reply_to_id: string | null; reactions: Reactions; read_at: string | null;
};

const EMOJIS = ["❤️", "😂", "😮", "😢", "🔥", "👏"];

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
      const { error } = await db.rpc("redeem_couple_invite", { _code: code });
      if (error) throw error;
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
  const [editing, setEditing] = useState<Message | null>(null);
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [menuFor, setMenuFor] = useState<Message | null>(null);
  const [partnerTyping, setPartnerTyping] = useState(false);
  const typingTimer = useRef<number | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: messages = [] } = useQuery({
    queryKey: ["messages", pair.id],
    queryFn: async () => {
      const { data, error } = await db.from("messages").select("*").eq("pair_id", pair.id).order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Message[];
    },
  });

  const messageMap = useMemo(() => {
    const m = new Map<string, Message>();
    messages.forEach((x) => m.set(x.id, x));
    return m;
  }, [messages]);

  useEffect(() => {
    const ch = supabase.channel(`messages-${pair.id}`, { config: { broadcast: { self: false } } })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `pair_id=eq.${pair.id}` }, (payload) => {
        const msg = payload.new as Message;
        qc.setQueryData<Message[]>(["messages", pair.id], (prev = []) => prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]);
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "messages", filter: `pair_id=eq.${pair.id}` }, (payload) => {
        const msg = payload.new as Message;
        qc.setQueryData<Message[]>(["messages", pair.id], (prev = []) => prev.map((m) => m.id === msg.id ? msg : m));
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "messages", filter: `pair_id=eq.${pair.id}` }, (payload) => {
        const old = payload.old as Message;
        qc.setQueryData<Message[]>(["messages", pair.id], (prev = []) => prev.filter((m) => m.id !== old.id));
      })
      .on("broadcast", { event: "typing" }, ({ payload }) => {
        if (payload?.userId && payload.userId !== user?.id) {
          setPartnerTyping(true);
          if (typingTimer.current) window.clearTimeout(typingTimer.current);
          typingTimer.current = window.setTimeout(() => setPartnerTyping(false), 2500);
        }
      })
      .subscribe();
    channelRef.current = ch;
    return () => { supabase.removeChannel(ch); channelRef.current = null; };
  }, [pair.id, qc, user?.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  // mark latest partner message as seen
  useEffect(() => {
    if (!user) return;
    const last = [...messages].reverse().find((m) => m.sender_id !== user.id && !m.read_at && !m.deleted_at);
    if (last) db.from("messages").update({ read_at: new Date().toISOString() }).eq("id", last.id).then(() => {});
  }, [messages, user]);

  function broadcastTyping() {
    channelRef.current?.send({ type: "broadcast", event: "typing", payload: { userId: user?.id } });
  }

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    if (editing) return saveEdit();
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
      const { error } = await db.from("messages").insert({
        pair_id: pair.id, sender_id: user.id, content: text.trim(), image_path,
        reply_to_id: replyTo?.id ?? null,
      });
      if (error) throw error;
      setText("");
      setFile(null);
      setReplyTo(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to send");
    } finally { setBusy(false); }
  }

  async function saveEdit() {
    if (!editing || !user) return;
    setBusy(true);
    try {
      const { error } = await db.from("messages").update({ content: text.trim(), edited_at: new Date().toISOString() }).eq("id", editing.id);
      if (error) throw error;
      setEditing(null); setText("");
    } catch (err) { toast.error(err instanceof Error ? err.message : "Could not edit"); }
    finally { setBusy(false); }
  }

  async function deleteMsg(m: Message) {
    setMenuFor(null);
    if (!confirm("Delete this message for everyone?")) return;
    const { error } = await db.from("messages").update({ deleted_at: new Date().toISOString(), content: "", image_path: null }).eq("id", m.id);
    if (error) toast.error(error.message);
  }

  async function toggleReaction(m: Message, emoji: string) {
    if (!user) return;
    const cur: Reactions = m.reactions ?? {};
    const list = cur[emoji] ?? [];
    const next = list.includes(user.id) ? list.filter((u) => u !== user.id) : [...list, user.id];
    const updated: Reactions = { ...cur };
    if (next.length) updated[emoji] = next; else delete updated[emoji];
    const { error } = await db.from("messages").update({ reactions: updated }).eq("id", m.id);
    if (error) toast.error(error.message);
  }

  function startEdit(m: Message) {
    setMenuFor(null);
    setReplyTo(null);
    setEditing(m);
    setText(m.content);
    setTimeout(() => inputRef.current?.focus(), 50);
  }

  function startReply(m: Message) {
    setMenuFor(null);
    setEditing(null);
    setReplyTo(m);
    setTimeout(() => inputRef.current?.focus(), 50);
  }

  async function unpair() {
    if (!confirm("Unpair from your partner? All messages will be deleted.")) return;
    const { error } = await db.from("couple_pairs").delete().eq("id", pair.id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["my-pair", user?.id] });
  }

  const lastMine = [...messages].reverse().find((m) => m.sender_id === user?.id && !m.deleted_at);

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
          <Bubble
            key={m.id}
            m={m}
            mine={m.sender_id === user?.id}
            replyTo={m.reply_to_id ? messageMap.get(m.reply_to_id) ?? null : null}
            isLastMine={m.id === lastMine?.id}
            onOpenMenu={() => setMenuFor(m)}
            onDoubleTap={() => toggleReaction(m, "❤️")}
            onToggleReaction={(em) => toggleReaction(m, em)}
            currentUserId={user?.id ?? ""}
          />
        ))}
        {partnerTyping && (
          <div className="flex justify-start">
            <div className="glass-strong rounded-3xl rounded-bl-md px-4 py-2.5">
              <span className="inline-flex gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "120ms" }} />
                <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "240ms" }} />
              </span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={send} className="fixed bottom-0 inset-x-0 z-20 px-3 pb-[calc(env(safe-area-inset-bottom)+12px)] pt-2">
        {(replyTo || editing) && (
          <div className="mb-2 mx-1 flex items-center gap-2 glass-strong rounded-2xl p-2.5 text-xs animate-fade-up">
            <div className="w-1 self-stretch rounded-full bg-primary" />
            <div className="flex-1 min-w-0">
              <p className="text-[10px] uppercase tracking-widest text-primary font-medium">{editing ? "Editing" : "Replying to"}</p>
              <p className="truncate text-foreground/80">{(editing ?? replyTo)?.content || "Photo"}</p>
            </div>
            <button type="button" onClick={() => { setReplyTo(null); setEditing(null); setText(""); }} className="w-6 h-6 rounded-full bg-black/20 text-white flex items-center justify-center"><X className="w-3 h-3" /></button>
          </div>
        )}
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
            ref={inputRef}
            value={text}
            onChange={(e) => { setText(e.target.value); broadcastTyping(); }}
            placeholder={editing ? "Edit your message…" : "Type a love note…"}
            className="flex-1 bg-transparent outline-none text-base px-1"
            maxLength={2000}
          />
          <button type="submit" disabled={busy || (!text.trim() && !file)} className="w-10 h-10 rounded-xl romance-gradient text-white flex items-center justify-center disabled:opacity-40" aria-label="Send">
            <Send className="w-4 h-4" />
          </button>
        </div>
      </form>

      {menuFor && (
        <MessageMenu
          m={menuFor}
          mine={menuFor.sender_id === user?.id}
          onClose={() => setMenuFor(null)}
          onReply={() => startReply(menuFor)}
          onEdit={() => startEdit(menuFor)}
          onDelete={() => deleteMsg(menuFor)}
          onReact={(em) => { toggleReaction(menuFor, em); setMenuFor(null); }}
        />
      )}
    </div>
  );
}

function Bubble({
  m, mine, replyTo, isLastMine, onOpenMenu, onDoubleTap, onToggleReaction, currentUserId,
}: {
  m: Message; mine: boolean; replyTo: Message | null; isLastMine: boolean;
  onOpenMenu: () => void; onDoubleTap: () => void; onToggleReaction: (emoji: string) => void;
  currentUserId: string;
}) {
  const [imgUrl, setImgUrl] = useState<string | null>(null);
  const pressTimer = useRef<number | null>(null);
  const lastTapRef = useRef(0);

  useEffect(() => {
    if (!m.image_path) return;
    let alive = true;
    supabase.storage.from("chat-media").createSignedUrl(m.image_path, 60 * 60).then(({ data }) => {
      if (alive) setImgUrl(data?.signedUrl ?? null);
    });
    return () => { alive = false; };
  }, [m.image_path]);

  function handleTap() {
    const now = Date.now();
    if (now - lastTapRef.current < 280) {
      onDoubleTap();
      lastTapRef.current = 0;
    } else {
      lastTapRef.current = now;
    }
  }
  function startPress() {
    if (m.deleted_at) return;
    pressTimer.current = window.setTimeout(() => onOpenMenu(), 450);
  }
  function cancelPress() {
    if (pressTimer.current) { window.clearTimeout(pressTimer.current); pressTimer.current = null; }
  }

  const reactionEntries = Object.entries(m.reactions ?? {}).filter(([, ids]) => ids.length);

  if (m.deleted_at) {
    return (
      <div className={`flex ${mine ? "justify-end" : "justify-start"}`}>
        <div className="max-w-[78%] rounded-3xl px-4 py-2 bg-muted/40 text-muted-foreground text-xs italic">
          Message deleted
        </div>
      </div>
    );
  }

  return (
    <div className={`flex ${mine ? "justify-end" : "justify-start"}`}>
      <div className="max-w-[80%] flex flex-col items-end">
        <div
          className={`relative rounded-3xl px-4 py-2.5 ${mine ? "romance-gradient text-white rounded-br-md" : "glass-strong rounded-bl-md"}`}
          onClick={handleTap}
          onContextMenu={(e) => { e.preventDefault(); onOpenMenu(); }}
          onTouchStart={startPress}
          onTouchEnd={cancelPress}
          onTouchMove={cancelPress}
          onMouseDown={startPress}
          onMouseUp={cancelPress}
          onMouseLeave={cancelPress}
        >
          {replyTo && (
            <div className={`mb-1.5 rounded-xl px-2.5 py-1.5 text-[12px] border-l-2 ${mine ? "bg-white/15 border-white/70" : "bg-foreground/5 border-primary"}`}>
              <p className={`text-[10px] ${mine ? "text-white/70" : "text-muted-foreground"} mb-0.5`}>Reply</p>
              <p className="truncate opacity-90">{replyTo.deleted_at ? "Original deleted" : (replyTo.content || "Photo")}</p>
            </div>
          )}
          {imgUrl && (
            <img src={imgUrl} alt="" className="rounded-2xl mb-1 max-h-72 object-cover" />
          )}
          {m.content && <p className="whitespace-pre-wrap break-words text-[15px] leading-snug">{m.content}</p>}
          <p className={`text-[10px] mt-1 flex items-center gap-1 ${mine ? "text-white/70 justify-end" : "text-muted-foreground"}`}>
            {format(new Date(m.created_at), "p")}
            {m.edited_at && <span className="italic">· edited</span>}
          </p>
        </div>
        {reactionEntries.length > 0 && (
          <div className={`-mt-1.5 flex gap-1 ${mine ? "self-end mr-2" : "self-start ml-2"}`}>
            {reactionEntries.map(([em, ids]) => (
              <button
                key={em}
                onClick={() => onToggleReaction(em)}
                className={`px-1.5 py-0.5 rounded-full text-xs bg-background border border-border shadow-sm flex items-center gap-1 ${ids.includes(currentUserId) ? "ring-1 ring-primary" : ""}`}
              >
                <span>{em}</span>
                {ids.length > 1 && <span className="text-[10px] text-muted-foreground">{ids.length}</span>}
              </button>
            ))}
          </div>
        )}
        {mine && isLastMine && m.read_at && (
          <p className="text-[10px] text-muted-foreground mt-1 mr-2">Seen</p>
        )}
      </div>
    </div>
  );
}

function MessageMenu({
  m, mine, onClose, onReply, onEdit, onDelete, onReact,
}: {
  m: Message; mine: boolean; onClose: () => void;
  onReply: () => void; onEdit: () => void; onDelete: () => void; onReact: (emoji: string) => void;
}) {
  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center animate-fade-in" onClick={onClose}>
      <div className="w-full sm:max-w-sm bg-background rounded-t-3xl sm:rounded-3xl p-3 animate-fade-up" onClick={(e) => e.stopPropagation()}>
        <div className="w-10 h-1 rounded-full bg-muted mx-auto mb-3 sm:hidden" />
        <div className="flex justify-around p-2 mb-2 rounded-2xl bg-muted/40">
          {EMOJIS.map((em) => (
            <button key={em} onClick={() => onReact(em)} className="text-2xl active:scale-125 transition-transform p-1" aria-label={`React ${em}`}>{em}</button>
          ))}
        </div>
        <button onClick={onReply} className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl hover:bg-muted text-left">
          <Reply className="w-5 h-5 text-muted-foreground" /> <span>Reply</span>
        </button>
        {mine && m.content && !m.image_path && (
          <button onClick={onEdit} className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl hover:bg-muted text-left">
            <Pencil className="w-5 h-5 text-muted-foreground" /> <span>Edit</span>
          </button>
        )}
        {mine && (
          <button onClick={onDelete} className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl hover:bg-muted text-left text-destructive">
            <Trash2 className="w-5 h-5" /> <span>Unsend</span>
          </button>
        )}
        <button onClick={() => { navigator.clipboard.writeText(m.content); toast.success("Copied"); onClose(); }} className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl hover:bg-muted text-left">
          <Copy className="w-5 h-5 text-muted-foreground" /> <span>Copy</span>
        </button>
      </div>
    </div>
  );
}