import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Pause, Play, Maximize2, X } from "lucide-react";
import { isVideoPath } from "@/lib/memories";

export type SlideItem = { id: string; path: string; url: string | null };

export function Slideshow({ items, interval = 4200 }: { items: SlideItem[]; interval?: number }) {
  const [i, setI] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [fs, setFs] = useState(false);
  const touchX = useRef<number | null>(null);

  const safeI = Math.min(i, Math.max(items.length - 1, 0));
  const current = items[safeI];

  function go(delta: number) {
    if (!items.length) return;
    setI((p) => (p + delta + items.length) % items.length);
  }

  // autoplay only on images
  useEffect(() => {
    if (!playing || !current) return;
    if (isVideoPath(current.path)) return;
    const id = setTimeout(() => go(1), interval);
    return () => clearTimeout(id);
  }, [playing, safeI, current?.path, interval, items.length]);

  useEffect(() => {
    if (!fs) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setFs(false);
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = ""; window.removeEventListener("keydown", onKey); };
  }, [fs]);

  if (!items.length) return null;

  const Stage = (
    <div
      className={`relative w-full ${fs ? "h-screen" : "aspect-[4/5]"} overflow-hidden rounded-3xl group bg-black/20`}
      onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
      onTouchEnd={(e) => {
        if (touchX.current == null) return;
        const dx = e.changedTouches[0].clientX - touchX.current;
        if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1);
        touchX.current = null;
      }}
    >
      {items.map((it, idx) => {
        const active = idx === safeI;
        const isVid = isVideoPath(it.path);
        return (
          <div
            key={it.id}
            className={`absolute inset-0 transition-all duration-700 ease-out ${active ? "opacity-100 scale-100 z-10" : "opacity-0 scale-105 z-0"}`}
            aria-hidden={!active}
          >
            {it.url ? (
              isVid ? (
                <video
                  src={it.url}
                  className="w-full h-full object-cover"
                  controls={active}
                  playsInline
                  preload="metadata"
                  onEnded={() => active && playing && go(1)}
                />
              ) : (
                <img src={it.url} alt="" className="w-full h-full object-cover" />
              )
            ) : (
              <div className="w-full h-full bg-muted animate-pulse" />
            )}
            {!isVid && (
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-black/10" />
            )}
          </div>
        );
      })}

      {/* controls */}
      {items.length > 1 && (
        <>
          <button
            onClick={() => go(-1)}
            className="absolute left-2 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-white/25 hover:bg-white/40 backdrop-blur text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
            aria-label="Previous"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={() => go(1)}
            className="absolute right-2 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-white/25 hover:bg-white/40 backdrop-blur text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
            aria-label="Next"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </>
      )}

      <div className="absolute top-3 right-3 z-20 flex gap-2">
        <button
          onClick={() => setPlaying((p) => !p)}
          className="w-9 h-9 rounded-full bg-white/25 hover:bg-white/40 backdrop-blur text-white flex items-center justify-center"
          aria-label={playing ? "Pause" : "Play"}
        >
          {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" fill="currentColor" />}
        </button>
        <button
          onClick={() => setFs((v) => !v)}
          className="w-9 h-9 rounded-full bg-white/25 hover:bg-white/40 backdrop-blur text-white flex items-center justify-center"
          aria-label="Fullscreen"
        >
          {fs ? <X className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>
      </div>

      {/* progress dots */}
      {items.length > 1 && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex gap-1.5">
          {items.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setI(idx)}
              className={`h-1.5 rounded-full transition-all ${idx === safeI ? "w-6 bg-white" : "w-1.5 bg-white/50 hover:bg-white/80"}`}
              aria-label={`Slide ${idx + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );

  if (fs) {
    return (
      <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center">
        <div className="w-full max-w-4xl">{Stage}</div>
      </div>
    );
  }

  return Stage;
}