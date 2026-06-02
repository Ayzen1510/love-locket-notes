import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { AppGate } from "@/components/AppGate";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { TAG_OPTIONS, uploadImages, signedUrl } from "@/lib/memories";
import type { Memory, MemoryImage } from "@/lib/memories";
import { MoodPickerInline } from "@/components/MoodPicker";
import { ArrowLeft, ImagePlus, X, Heart } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/memory/$id/edit")({
  head: () => ({ meta: [{ title: "Edit memory · Couple Memories Lock" }] }),
  component: () => <AppGate><EditMemoryPage /></AppGate>,
});

function EditMemoryPage() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [date, setDate] = useState("");
  const [mood, setMood] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [existing, setExisting] = useState<(MemoryImage & { url: string | null })[]>([]);
  const [removed, setRemoved] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

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
    if (!data) return;
    const m = data.memory;
    setTitle(m.title);
    setNote(m.note);
    setDate(m.memory_date);
    setMood(m.mood ?? "");
    setTags(m.tags ?? []);
    setExisting(data.images);
  }, [data]);

  const previews = newFiles.map((f) => URL.createObjectURL(f));

  function toggleTag(t: string) {
    setTags((arr) => (arr.includes(t) ? arr.filter((x) => x !== t) : [...arr, t]));
  }

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const list = Array.from(e.target.files ?? []);
    setNewFiles((prev) => [...prev, ...list]);
    if (fileInput.current) fileInput.current.value = "";
  }

  function removeExisting(img: MemoryImage & { url: string | null }) {
    setExisting((arr) => arr.filter((x) => x.id !== img.id));
    setRemoved((arr) => [...arr, img.id]);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    if (!title.trim()) return toast.error("Add a title");
    setBusy(true);
    try {
      const { error } = await supabase
        .from("memories")
        .update({ title: title.trim(), note, memory_date: date, mood, tags })
        .eq("id", id);
      if (error) throw error;

      if (removed.length) {
        const removedRows = (data?.images ?? []).filter((im) => removed.includes(im.id));
        const paths = removedRows.map((r) => r.storage_path);
        if (paths.length) await supabase.storage.from("memory-images").remove(paths);
        await supabase.from("memory_images").delete().in("id", removed);
      }
      if (newFiles.length) await uploadImages(user.id, id, newFiles);

      await qc.invalidateQueries({ queryKey: ["memories", user.id] });
      await qc.invalidateQueries({ queryKey: ["memory", id] });
      toast.success("Memory updated 💖");
      navigate({ to: "/memory/$id", params: { id } });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setBusy(false);
    }
  }

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center"><Heart className="w-8 h-8 text-primary animate-heart-pop" fill="currentColor" /></div>;
  }

  return (
    <div className="min-h-screen pb-28">
      <header className="px-5 pt-8 pb-2 flex items-center gap-3">
        <button onClick={() => navigate({ to: "/memory/$id", params: { id } })} className="w-10 h-10 rounded-full glass flex items-center justify-center">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-2xl font-display romance-text">Edit Memory</h1>
      </header>

      <form onSubmit={save} className="px-5 space-y-5 mt-3">
        <div className="glass-strong rounded-3xl p-4 space-y-4">
          <div className="space-y-1.5">
            <Label>Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={120} />
          </div>
          <div className="space-y-1.5">
            <Label>Date</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Note</Label>
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={5} maxLength={4000} />
          </div>
        </div>

        <div className="glass-strong rounded-3xl p-4 space-y-3">
          <Label>Mood</Label>
          {user && <MoodPickerInline value={mood} onChange={setMood} userId={user.id} />}
        </div>

        <div className="glass-strong rounded-3xl p-4 space-y-3">
          <Label>Tags</Label>
          <div className="flex flex-wrap gap-2">
            {TAG_OPTIONS.map((t) => {
              const on = tags.includes(t);
              return (
                <button key={t} type="button" onClick={() => toggleTag(t)}
                  className={`px-3 py-1.5 rounded-full text-xs transition ${on ? "romance-gradient text-white" : "glass text-foreground/70"}`}>
                  {t}
                </button>
              );
            })}
          </div>
        </div>

        <div className="glass-strong rounded-3xl p-4 space-y-3">
          <Label>Photos</Label>
          <div className="grid grid-cols-3 gap-2">
            {existing.map((im) => (
              <div key={im.id} className="relative aspect-square rounded-2xl overflow-hidden">
                {im.url ? <img src={im.url} alt="" className="object-cover w-full h-full" /> : <div className="w-full h-full bg-muted animate-pulse" />}
                <button type="button" onClick={() => removeExisting(im)}
                  className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/50 text-white flex items-center justify-center">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
            {previews.map((src, i) => (
              <div key={i} className="relative aspect-square rounded-2xl overflow-hidden">
                <img src={src} alt="" className="object-cover w-full h-full" />
                <button type="button" onClick={() => setNewFiles((arr) => arr.filter((_, j) => j !== i))}
                  className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/50 text-white flex items-center justify-center">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
            <button type="button" onClick={() => fileInput.current?.click()}
              className="aspect-square rounded-2xl glass flex flex-col items-center justify-center text-muted-foreground hover:text-primary transition">
              <ImagePlus className="w-6 h-6" />
              <span className="text-[10px] mt-1">Add</span>
            </button>
          </div>
          <input ref={fileInput} type="file" multiple accept="image/*" hidden onChange={onPick} />
        </div>

        <Button type="submit" disabled={busy} className="w-full h-12 btn-romance rounded-2xl text-base">
          {busy ? "Saving…" : "Save changes 💕"}
        </Button>
      </form>
    </div>
  );
}