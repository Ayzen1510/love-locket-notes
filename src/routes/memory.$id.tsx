import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { AppGate } from "@/components/AppGate";
import { signedUrl } from "@/lib/memories";
import type { Memory, MemoryImage } from "@/lib/memories";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Heart, Trash2, Calendar, X } from "lucide-react";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";

export const Route = createFileRoute("/memory/$id")({
  head: () => ({ meta: [{ title: "Memory · Couple Memories Lock" }] }),
  component: () => <AppGate><MemoryDetail /></AppGate>,
});

function MemoryDetail() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [lightbox, setLightbox] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["memory", id],
    enabled: !!user,
    queryFn: async () => {
      const [{ data: mem, error: e1 }, { data: imgs, error: e2 }] = await Promise.all([
        supabase.from("memories").select("*").eq("id", id).single(),
        supabase.from("memory_images").select("*").eq("memory_id", id).order("position"),
      ]);
      if (e1) throw e1;
      if (e2) throw e2;
      const urls = await Promise.all((imgs ?? []).map(async (im) => ({ ...im, url: await signedUrl(im.storage_path) })));
      return { memory: mem as Memory, images: urls as (MemoryImage & { url: string | null })[] };
    },
  });

  async function toggleFav() {
    if (!data?.memory) return;
    const { error } = await supabase.from("memories").update({ is_favorite: !data.memory.is_favorite }).eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["memory", id] });
    qc.invalidateQueries({ queryKey: ["memories", user?.id] });
  }

  async function remove() {
    if (!confirm("Delete this memory? This can't be undone.")) return;
    const paths = data?.images.map((i) => i.storage_path) ?? [];
    if (paths.length) await supabase.storage.from("memory-images").remove(paths);
    const { error } = await supabase.from("memories").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Memory deleted");
    qc.invalidateQueries({ queryKey: ["memories", user?.id] });
    navigate({ to: "/" });
  }

  useEffect(() => {
    if (lightbox) document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, [lightbox]);

  if (isLoading || !data) {
    return <div className="min-h-screen flex items-center justify-center"><Heart className="w-8 h-8 text-primary animate-heart-pop" fill="currentColor" /></div>;
  }

  const m = data.memory;

  return (
    <div className="min-h-screen pb-12">
      <header className="px-5 pt-8 flex items-center justify-between">
        <button onClick={() => navigate({ to: "/" })} className="w-10 h-10 rounded-full glass flex items-center justify-center">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2">
          <button onClick={toggleFav} className={`w-10 h-10 rounded-full flex items-center justify-center transition ${m.is_favorite ? "romance-gradient text-white" : "glass text-foreground/70"}`}>
            <Heart className="w-5 h-5" fill={m.is_favorite ? "currentColor" : "none"} />
          </button>
          <button onClick={remove} className="w-10 h-10 rounded-full glass text-destructive flex items-center justify-center">
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      </header>

      <article className="px-5 mt-6">
        <p className="text-xs uppercase tracking-widest text-muted-foreground flex items-center gap-1">
          <Calendar className="w-3 h-3" /> {format(parseISO(m.memory_date), "EEEE, MMMM d, yyyy")}
        </p>
        <h1 className="text-3xl font-display romance-text mt-1 flex items-center gap-2">
          {m.title} {m.mood && <span className="text-2xl">{m.mood}</span>}
        </h1>
        {m.tags?.length ? (
          <div className="flex gap-1.5 flex-wrap mt-3">
            {m.tags.map((t) => <span key={t} className="text-[11px] px-2.5 py-1 rounded-full bg-secondary text-secondary-foreground">{t}</span>)}
          </div>
        ) : null}
      </article>

      {data.images.length > 0 && (
        <div className="mt-5 px-5">
          <div className="grid grid-cols-2 gap-2">
            {data.images.map((im) => (
              <button key={im.id} onClick={() => im.url && setLightbox(im.url)} className="aspect-square rounded-2xl overflow-hidden">
                {im.url ? <img src={im.url} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full bg-muted animate-pulse" />}
              </button>
            ))}
          </div>
        </div>
      )}

      <section className="px-5 mt-6">
        <div className="glass-strong rounded-3xl p-5">
          <p className="whitespace-pre-wrap leading-relaxed text-foreground/90">{m.note || <span className="italic text-muted-foreground">No words, just the memory.</span>}</p>
        </div>
      </section>

      {lightbox && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center" onClick={() => setLightbox(null)}>
          <img src={lightbox} alt="" className="max-w-full max-h-full" />
          <button className="absolute top-6 right-6 w-10 h-10 rounded-full bg-white/15 text-white flex items-center justify-center" onClick={() => setLightbox(null)}>
            <X className="w-5 h-5" />
          </button>
        </div>
      )}
    </div>
  );
}