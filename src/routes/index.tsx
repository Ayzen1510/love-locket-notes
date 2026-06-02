import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { AppGate } from "@/components/AppGate";
import { BottomNav } from "@/components/BottomNav";
import { MemoryThumb } from "@/components/MemoryThumb";
import { HeartParticles } from "@/components/HeartParticles";
import { Input } from "@/components/ui/input";
import { Heart, Search, Calendar, Sparkles } from "lucide-react";
import { MoodDisplay } from "@/components/MoodPicker";
import type { Memory } from "@/lib/memories";
import { differenceInDays, format, parseISO } from "date-fns";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [{ title: "Home · Couple Memories Lock" }] }),
  component: () => <AppGate><Home /></AppGate>,
});

type MemoryWithThumb = Memory & { thumb?: string };

function Home() {
  const { user } = useAuth();
  const [q, setQ] = useState("");
  const [favOnly, setFavOnly] = useState(false);

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").eq("id", user!.id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: memories = [], isLoading } = useQuery({
    queryKey: ["memories", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data: mems, error } = await supabase
        .from("memories")
        .select("*")
        .order("memory_date", { ascending: false });
      if (error) throw error;
      const ids = (mems ?? []).map((m) => m.id);
      if (!ids.length) return [] as MemoryWithThumb[];
      const { data: imgs } = await supabase
        .from("memory_images")
        .select("memory_id, storage_path, position")
        .in("memory_id", ids)
        .order("position", { ascending: true });
      const firstByMem = new Map<string, string>();
      (imgs ?? []).forEach((im) => { if (!firstByMem.has(im.memory_id)) firstByMem.set(im.memory_id, im.storage_path); });
      return (mems ?? []).map((m) => ({ ...m, thumb: firstByMem.get(m.id) })) as MemoryWithThumb[];
    },
  });

  const filtered = useMemo(() => {
    return memories.filter((m) => {
      if (favOnly && !m.is_favorite) return false;
      if (!q.trim()) return true;
      const t = q.toLowerCase();
      return m.title.toLowerCase().includes(t) || m.note.toLowerCase().includes(t) || (m.tags || []).some((x) => x.toLowerCase().includes(t));
    });
  }, [memories, q, favOnly]);

  const daysTogether = profile?.relationship_start_date
    ? Math.max(0, differenceInDays(new Date(), parseISO(profile.relationship_start_date)))
    : null;

  return (
    <div className="min-h-screen pb-32 relative">
      <HeartParticles count={8} />
      <header className="px-5 pt-10 pb-4 relative">
        <p className="text-sm text-muted-foreground">Hello,</p>
        <h1 className="text-3xl font-display romance-text">
          {profile?.display_name || "Lovebird"}
          {profile?.partner_name ? <span className="text-foreground/70"> & {profile.partner_name}</span> : null}
        </h1>
      </header>

      {daysTogether !== null && (
        <Link to="/profile" className="block mx-5 mb-5 glass-strong rounded-3xl p-5 relative overflow-hidden animate-fade-up">
          <Sparkles className="absolute right-4 top-4 w-5 h-5 text-[var(--gold)] animate-sparkle" />
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Together for</p>
          <p className="text-5xl font-display romance-text mt-1 flex items-baseline gap-2">
            {daysTogether}<span className="text-base font-sans text-muted-foreground">days</span>
          </p>
          <p className="text-xs text-muted-foreground mt-1">Since {format(parseISO(profile!.relationship_start_date!), "MMMM d, yyyy")}</p>
        </Link>
      )}

      <div className="px-5 flex items-center gap-2 mb-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search memories…" className="pl-9 h-11 rounded-2xl glass border-0" />
        </div>
        <button
          onClick={() => setFavOnly((v) => !v)}
          aria-label="Show favorites only"
          className={`h-11 w-11 rounded-2xl flex items-center justify-center transition ${favOnly ? "romance-gradient text-white" : "glass text-muted-foreground"}`}
        >
          <Heart className="w-5 h-5" fill={favOnly ? "currentColor" : "none"} />
        </button>
      </div>

      <section className="px-5">
        {isLoading ? (
          <div className="space-y-3">
            {[0,1,2].map((i) => <div key={i} className="h-28 rounded-3xl bg-muted/50 animate-pulse" />)}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState hasAny={memories.length > 0} />
        ) : (
          <ul className="space-y-3">
            {filtered.map((m, i) => (
              <li key={m.id} className="animate-fade-up" style={{ animationDelay: `${i * 30}ms` }}>
                <Link
                  to="/memory/$id"
                  params={{ id: m.id }}
                  className="glass-strong rounded-3xl p-3 flex gap-3 items-center hover:scale-[1.01] transition-transform"
                >
                  <div className="relative w-20 h-20 rounded-2xl overflow-hidden shrink-0">
                    <MemoryThumb path={m.thumb} className="w-full h-full" />
                    {m.is_favorite && (
                      <div className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/30 backdrop-blur flex items-center justify-center">
                        <Heart className="w-3.5 h-3.5 text-white" fill="currentColor" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <h3 className="font-display text-lg truncate">{m.title}</h3>
                      {m.mood && <MoodDisplay mood={m.mood} size={16} />}
                    </div>
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                      <Calendar className="w-3 h-3" /> {format(parseISO(m.memory_date), "MMM d, yyyy")}
                    </p>
                    {m.note && <p className="text-sm text-foreground/70 line-clamp-2 mt-1">{m.note}</p>}
                    {m.tags?.length ? (
                      <div className="flex gap-1 mt-1.5 flex-wrap">
                        {m.tags.slice(0, 3).map((t) => (
                          <span key={t} className="text-[10px] px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground">{t}</span>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <BottomNav />
    </div>
  );
}

function EmptyState({ hasAny }: { hasAny: boolean }) {
  return (
    <div className="glass-strong rounded-3xl p-8 text-center animate-fade-up">
      <div className="w-16 h-16 rounded-3xl romance-gradient flex items-center justify-center mx-auto shadow-[var(--shadow-romance)]">
        <Heart className="w-7 h-7 text-white" fill="currentColor" />
      </div>
      <h3 className="font-display text-xl mt-4">{hasAny ? "No matching memories" : "Your story starts here"}</h3>
      <p className="text-sm text-muted-foreground mt-1">
        {hasAny ? "Try a different search or filter." : "Tap the + button to save your first memory."}
      </p>
    </div>
  );
}
