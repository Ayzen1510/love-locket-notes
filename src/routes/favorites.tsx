import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { AppGate } from "@/components/AppGate";
import { BottomNav } from "@/components/BottomNav";
import { MemoryThumb } from "@/components/MemoryThumb";
import { Heart, Calendar } from "lucide-react";
import { isStickerMood } from "@/lib/memories";
import type { Memory } from "@/lib/memories";
import { format, parseISO } from "date-fns";

export const Route = createFileRoute("/favorites")({
  head: () => ({ meta: [{ title: "Favorites · Couple Memories Lock" }] }),
  component: () => <AppGate><Favorites /></AppGate>,
});

function Favorites() {
  const { user } = useAuth();
  const { data: items = [] } = useQuery({
    queryKey: ["favorites", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data: mems, error } = await supabase.from("memories").select("*").eq("is_favorite", true).order("memory_date", { ascending: false });
      if (error) throw error;
      const ids = (mems ?? []).map((m) => m.id);
      if (!ids.length) return [] as (Memory & { thumb?: string })[];
      const { data: imgs } = await supabase.from("memory_images").select("memory_id, storage_path, position").in("memory_id", ids).order("position");
      const first = new Map<string, string>();
      (imgs ?? []).forEach((im) => { if (!first.has(im.memory_id)) first.set(im.memory_id, im.storage_path); });
      return (mems ?? []).map((m) => ({ ...m, thumb: first.get(m.id) }));
    },
  });

  return (
    <div className="min-h-screen pb-32">
      <header className="px-5 pt-10 pb-2">
        <p className="text-sm text-muted-foreground">Loved most</p>
        <h1 className="text-3xl font-display romance-text">Favorites</h1>
      </header>
      <section className="px-5 mt-4">
        {items.length === 0 ? (
          <div className="glass-strong rounded-3xl p-8 text-center">
            <Heart className="w-10 h-10 mx-auto text-primary" />
            <p className="text-sm text-muted-foreground mt-3">Tap the heart on a memory to keep it here forever.</p>
          </div>
        ) : (
          <ul className="grid grid-cols-2 gap-3">
            {items.map((m) => (
              <li key={m.id}>
                <Link to="/memory/$id" params={{ id: m.id }} className="block glass-strong rounded-3xl overflow-hidden">
                  <div className="aspect-square relative">
                    <MemoryThumb path={m.thumb} className="w-full h-full" />
                    <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/60 to-transparent text-white">
                      <p className="text-sm font-display truncate">{m.title} {m.mood && !isStickerMood(m.mood) ? m.mood : ""}</p>
                      <p className="text-[10px] flex items-center gap-1 opacity-80"><Calendar className="w-3 h-3" />{format(parseISO(m.memory_date), "MMM d, yyyy")}</p>
                    </div>
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