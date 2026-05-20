import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { AppGate } from "@/components/AppGate";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { TAG_OPTIONS, MOOD_OPTIONS, uploadImages } from "@/lib/memories";
import { toast } from "sonner";
import { ArrowLeft, ImagePlus, X } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";

export const Route = createFileRoute("/memory/new")({
  head: () => ({ meta: [{ title: "New memory · Couple Memories Lock" }] }),
  component: () => <AppGate><NewMemoryPage /></AppGate>,
});

function NewMemoryPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [mood, setMood] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const previews = files.map((f) => URL.createObjectURL(f));

  function toggleTag(t: string) {
    setTags((arr) => (arr.includes(t) ? arr.filter((x) => x !== t) : [...arr, t]));
  }

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const list = Array.from(e.target.files ?? []);
    setFiles((prev) => [...prev, ...list]);
    if (fileInput.current) fileInput.current.value = "";
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    if (!title.trim()) return toast.error("Add a title");
    setBusy(true);
    try {
      const { data: mem, error } = await supabase
        .from("memories")
        .insert({ user_id: user.id, title: title.trim(), note, memory_date: date, mood, tags })
        .select()
        .single();
      if (error) throw error;
      if (files.length) await uploadImages(user.id, mem.id, files);
      await qc.invalidateQueries({ queryKey: ["memories", user.id] });
      toast.success("Memory saved 💖");
      navigate({ to: "/memory/$id", params: { id: mem.id } });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen pb-28">
      <header className="px-5 pt-8 pb-2 flex items-center gap-3">
        <button onClick={() => navigate({ to: "/" })} className="w-10 h-10 rounded-full glass flex items-center justify-center">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-2xl font-display romance-text">New Memory</h1>
      </header>

      <form onSubmit={save} className="px-5 space-y-5 mt-3">
        <div className="glass-strong rounded-3xl p-4 space-y-4">
          <div className="space-y-1.5">
            <Label>Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Our first sunset…" required maxLength={120} />
          </div>
          <div className="space-y-1.5">
            <Label>Date</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Note</Label>
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={5} placeholder="Write your memory…" maxLength={4000} />
          </div>
        </div>

        <div className="glass-strong rounded-3xl p-4 space-y-3">
          <Label>Mood</Label>
          <div className="flex flex-wrap gap-2">
            {MOOD_OPTIONS.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMood(mood === m ? "" : m)}
                className={`h-10 w-10 rounded-2xl text-lg transition ${mood === m ? "romance-gradient scale-110" : "glass"}`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        <div className="glass-strong rounded-3xl p-4 space-y-3">
          <Label>Tags</Label>
          <div className="flex flex-wrap gap-2">
            {TAG_OPTIONS.map((t) => {
              const on = tags.includes(t);
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => toggleTag(t)}
                  className={`px-3 py-1.5 rounded-full text-xs transition ${on ? "romance-gradient text-white" : "glass text-foreground/70"}`}
                >
                  {t}
                </button>
              );
            })}
          </div>
        </div>

        <div className="glass-strong rounded-3xl p-4 space-y-3">
          <Label>Photos</Label>
          <div className="grid grid-cols-3 gap-2">
            {previews.map((src, i) => (
              <div key={i} className="relative aspect-square rounded-2xl overflow-hidden">
                <img src={src} alt="" className="object-cover w-full h-full" />
                <button
                  type="button"
                  onClick={() => setFiles((arr) => arr.filter((_, j) => j !== i))}
                  className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/50 text-white flex items-center justify-center"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => fileInput.current?.click()}
              className="aspect-square rounded-2xl glass flex flex-col items-center justify-center text-muted-foreground hover:text-primary transition"
            >
              <ImagePlus className="w-6 h-6" />
              <span className="text-[10px] mt-1">Add</span>
            </button>
          </div>
          <input ref={fileInput} type="file" multiple accept="image/*" hidden onChange={onPick} />
        </div>

        <Button type="submit" disabled={busy} className="w-full h-12 btn-romance rounded-2xl text-base">
          {busy ? "Saving…" : "Save memory 💕"}
        </Button>
      </form>
    </div>
  );
}