import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { AppGate } from "@/components/AppGate";
import { signedUrl } from "@/lib/memories";
import type { Memory, MemoryImage } from "@/lib/memories";
import { ArrowLeft, Heart, Trash2, Calendar, Pencil, Maximize2, X } from "lucide-react";
import { MoodDisplay } from "@/components/MoodPicker";
import { Slideshow } from "@/components/Slideshow";
import { Gallery } from "@/components/Gallery";
import { HeartParticles } from "@/components/HeartParticles";
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
  const [readerOpen, setReaderOpen] = useState(false);
  const [view, setView] = useState<"slideshow" | "gallery">("slideshow");

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

  useEffect(() => {
    if (!readerOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setReaderOpen(false); };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [readerOpen]);

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

  if (isLoading || !data) {
    return <div className="min-h-screen flex items-center justify-center"><Heart className="w-8 h-8 text-primary animate-heart-pop" fill="currentColor" /></div>;
  }

  const m = data.memory;

  return (
    <div className="min-h-screen pb-16 relative overflow-x-hidden">
      <HeartParticles count={6} />

      <header className="px-4 sm:px-5 pt-6 sm:pt-8 flex items-center justify-between gap-2">
        <button
          onClick={() => navigate({ to: "/" })}
          className="w-10 h-10 rounded-full glass flex items-center justify-center shrink-0"
          aria-label="Back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate({ to: "/memory/$id/edit", params: { id } })}
            className="w-10 h-10 rounded-full glass text-foreground/70 flex items-center justify-center"
            aria-label="Edit"
          >
            <Pencil className="w-4 h-4" />
          </button>
          <button
            onClick={toggleFav}
            className={`w-10 h-10 rounded-full flex items-center justify-center transition ${m.is_favorite ? "romance-gradient text-white animate-heart-pop" : "glass text-foreground/70"}`}
            aria-label="Favorite"
          >
            <Heart className="w-5 h-5" fill={m.is_favorite ? "currentColor" : "none"} />
          </button>
          <button onClick={remove} className="w-10 h-10 rounded-full glass text-destructive flex items-center justify-center" aria-label="Delete">
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Title block */}
      <article className="px-4 sm:px-5 mt-5 sm:mt-6 max-w-2xl mx-auto">
        <p className="text-[11px] uppercase tracking-widest text-muted-foreground flex items-center gap-1">
          <Calendar className="w-3 h-3" /> {format(parseISO(m.memory_date), "EEEE, MMMM d, yyyy")}
        </p>
        <h1 className="text-3xl sm:text-4xl font-display romance-text mt-1 flex items-center gap-2 animate-fade-up break-words">
          <span className="min-w-0">{m.title}</span>
          {m.mood && <MoodDisplay mood={m.mood} size={26} />}
        </h1>
        {m.tags?.length ? (
          <div className="flex gap-1.5 flex-wrap mt-3">
            {m.tags.map((t) => <span key={t} className="text-[11px] px-2.5 py-1 rounded-full bg-secondary text-secondary-foreground">{t}</span>)}
          </div>
        ) : null}
      </article>

      {/* Slideshow section */}
      {data.images.length > 0 && (
        <section className="mt-5 px-4 sm:px-5 max-w-2xl mx-auto animate-fade-up">
          <div className="flex justify-center mb-3">
            <div className="glass rounded-full p-1 inline-flex text-xs">
              <button
                onClick={() => setView("slideshow")}
                className={`px-4 py-1.5 rounded-full transition ${view === "slideshow" ? "bg-primary text-primary-foreground shadow" : "text-foreground/70 hover:text-foreground"}`}
                aria-pressed={view === "slideshow"}
              >
                Slideshow
              </button>
              <button
                onClick={() => setView("gallery")}
                className={`px-4 py-1.5 rounded-full transition ${view === "gallery" ? "bg-primary text-primary-foreground shadow" : "text-foreground/70 hover:text-foreground"}`}
                aria-pressed={view === "gallery"}
              >
                Gallery
              </button>
            </div>
          </div>
          {view === "slideshow" ? (
            <Slideshow items={data.images.map((im) => ({ id: im.id, path: im.storage_path, url: im.url }))} />
          ) : (
            <Gallery items={data.images.map((im) => ({ id: im.id, path: im.storage_path, url: im.url }))} />
          )}
        </section>
      )}

      {/* Story / text card — separate, glassmorphism, click to expand */}
      <section className="mt-6 px-4 sm:px-5 max-w-2xl mx-auto">
        <div className="glass-strong rounded-3xl p-5 sm:p-7 animate-fade-up relative group">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[11px] uppercase tracking-widest text-muted-foreground">Our story</p>
            {m.note && (
              <button
                onClick={() => setReaderOpen(true)}
                className="text-[11px] inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/10 hover:bg-primary/20 text-primary transition focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                aria-label="Open story fullscreen"
              >
                <Maximize2 className="w-3 h-3" /> Read
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={() => m.note && setReaderOpen(true)}
            disabled={!m.note}
            className="text-left w-full focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-2xl"
          >
            <p className="whitespace-pre-wrap leading-[1.8] text-[15px] sm:text-base text-foreground/90 line-clamp-[12] break-words">
              {m.note || <span className="italic text-muted-foreground">No words, just the memory.</span>}
            </p>
            {m.note && m.note.length > 280 && (
              <span className="mt-3 inline-block text-xs text-primary">Tap to read full story →</span>
            )}
          </button>
        </div>
      </section>

      {/* Fullscreen text reader */}
      {readerOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Story reader"
          className="fixed inset-0 z-50 bg-background/95 backdrop-blur-xl animate-fade-up flex flex-col"
          onClick={(e) => { if (e.target === e.currentTarget) setReaderOpen(false); }}
        >
          <div className="flex items-center justify-between px-5 py-4 border-b border-border/40">
            <div className="min-w-0">
              <p className="text-[11px] uppercase tracking-widest text-muted-foreground">
                {format(parseISO(m.memory_date), "MMMM d, yyyy")}
              </p>
              <h2 className="text-xl sm:text-2xl font-display romance-text truncate">{m.title}</h2>
            </div>
            <button
              onClick={() => setReaderOpen(false)}
              className="w-11 h-11 rounded-full glass flex items-center justify-center shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              aria-label="Close reader"
              autoFocus
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-5 sm:px-8 py-6">
            <div className="max-w-2xl mx-auto">
              <p className="whitespace-pre-wrap leading-[1.9] text-lg sm:text-xl text-foreground/90 font-light break-words">
                {m.note}
              </p>
              <div className="h-12" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
