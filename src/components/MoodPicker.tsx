import { useEffect, useRef, useState } from "react";
import { MOOD_OPTIONS, isStickerMood, stickerPath, uploadMoodSticker, signedUrl } from "@/lib/memories";
import { ImagePlus, X } from "lucide-react";
import { toast } from "sonner";

function StickerThumb({ path, className }: { path: string; className?: string }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    signedUrl(path).then((u) => { if (alive) setUrl(u); });
    return () => { alive = false; };
  }, [path]);
  return url ? <img src={url} alt="" className={className} /> : <div className={`bg-muted animate-pulse ${className ?? ""}`} />;
}

export function MoodPickerInline({ value, onChange, userId }: { value: string; onChange: (v: string) => void; userId: string }) {
  const [custom, setCustom] = useState("");
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setBusy(true);
    try {
      const m = await uploadMoodSticker(userId, f);
      onChange(m);
      toast.success("Sticker saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2 items-center">
        {MOOD_OPTIONS.map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => onChange(value === m ? "" : m)}
            className={`h-10 w-10 rounded-2xl text-lg transition ${value === m ? "romance-gradient scale-110" : "glass"}`}
          >
            {m}
          </button>
        ))}
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={busy}
          className="h-10 w-10 rounded-2xl glass flex items-center justify-center text-muted-foreground hover:text-primary"
          aria-label="Upload custom sticker"
        >
          <ImagePlus className="w-4 h-4" />
        </button>
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={onUpload} />
      </div>

      <div className="flex items-center gap-2">
        <input
          value={custom}
          onChange={(e) => setCustom(e.target.value.slice(0, 8))}
          placeholder="Type any emoji…"
          className="flex-1 h-10 px-3 rounded-2xl glass border-0 text-base bg-transparent outline-none placeholder:text-muted-foreground"
        />
        <button
          type="button"
          disabled={!custom.trim()}
          onClick={() => { onChange(custom.trim()); setCustom(""); }}
          className="h-10 px-4 rounded-2xl romance-gradient text-white text-sm disabled:opacity-40"
        >
          Use
        </button>
      </div>

      {value && (
        <div className="flex items-center gap-3 glass rounded-2xl p-2.5">
          <span className="text-xs uppercase tracking-widest text-muted-foreground">Selected</span>
          {isStickerMood(value) ? (
            <StickerThumb path={stickerPath(value)} className="w-9 h-9 rounded-xl object-cover" />
          ) : (
            <span className="text-2xl">{value}</span>
          )}
          <button type="button" onClick={() => onChange("")} className="ml-auto w-7 h-7 rounded-full glass flex items-center justify-center" aria-label="Clear">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}

export function MoodDisplay({ mood, size = 18 }: { mood: string | null | undefined; size?: number }) {
  if (!mood) return null;
  if (isStickerMood(mood)) {
    return (
      <span className="inline-block align-middle" style={{ width: size + 6, height: size + 6 }}>
        <StickerThumb path={stickerPath(mood)} className="rounded-md object-cover w-full h-full" />
      </span>
    );
  }
  return <span style={{ fontSize: size }}>{mood}</span>;
}