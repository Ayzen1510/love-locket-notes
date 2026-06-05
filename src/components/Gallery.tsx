import { useEffect, useRef, useState } from "react";
import { X, ChevronLeft, ChevronRight, Play } from "lucide-react";
import { isVideoPath } from "@/lib/memories";
import type { SlideItem } from "@/components/Slideshow";

export function Gallery({ items }: { items: SlideItem[] }) {
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (openIdx == null) return;
    closeBtnRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenIdx(null);
      else if (e.key === "ArrowRight") setOpenIdx((i) => (i == null ? i : (i + 1) % items.length));
      else if (e.key === "ArrowLeft") setOpenIdx((i) => (i == null ? i : (i - 1 + items.length) % items.length));
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [openIdx, items.length]);

  if (!items.length) return null;
  const active = openIdx != null ? items[openIdx] : null;

  return (
    <>
      <ul className="grid grid-cols-3 gap-1.5" role="list" aria-label="Memory gallery">
        {items.map((it, idx) => {
          const isVid = isVideoPath(it.path);
          return (
            <li key={it.id}>
              <button
                onClick={() => setOpenIdx(idx)}
                className="group relative w-full aspect-square overflow-hidden rounded-2xl bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background transition"
                aria-label={`${isVid ? "Video" : "Photo"} ${idx + 1} of ${items.length}`}
              >
                {it.url ? (
                  isVid ? (
                    <video src={it.url} muted playsInline preload="metadata" className="w-full h-full object-cover" />
                  ) : (
                    <img src={it.url} alt="" className="w-full h-full object-cover transition group-hover:scale-105" loading="lazy" />
                  )
                ) : (
                  <div className="w-full h-full animate-pulse bg-muted" />
                )}
                {isVid && (
                  <span className="absolute inset-0 flex items-center justify-center bg-black/15" aria-hidden>
                    <span className="w-9 h-9 rounded-full bg-white/85 backdrop-blur flex items-center justify-center shadow">
                      <Play className="w-4 h-4 text-primary" fill="currentColor" />
                    </span>
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>

      {active && openIdx != null && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Photo viewer"
          className="fixed inset-0 z-50 bg-black flex items-center justify-center animate-fade-up"
        >
          <button
            ref={closeBtnRef}
            onClick={() => setOpenIdx(null)}
            className="absolute top-4 right-4 w-11 h-11 rounded-full bg-white/15 hover:bg-white/30 text-white flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
            aria-label="Close viewer"
          >
            <X className="w-5 h-5" />
          </button>

          {items.length > 1 && (
            <>
              <button
                onClick={() => setOpenIdx((openIdx - 1 + items.length) % items.length)}
                className="absolute left-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/15 hover:bg-white/30 text-white flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
                aria-label="Previous"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <button
                onClick={() => setOpenIdx((openIdx + 1) % items.length)}
                className="absolute right-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/15 hover:bg-white/30 text-white flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
                aria-label="Next"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            </>
          )}

          <div className="w-screen h-screen flex items-center justify-center">
            {active.url ? (
              isVideoPath(active.path) ? (
                <video src={active.url} controls autoPlay playsInline className="w-screen h-screen object-contain" />
              ) : (
                <img src={active.url} alt="" className="w-screen h-screen object-contain select-none" draggable={false} />
              )
            ) : null}
          </div>

          <p className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/80 text-xs tabular-nums">
            {openIdx + 1} / {items.length}
          </p>
        </div>
      )}
    </>
  );
}