import { useEffect, useRef, useState } from "react";
import { X, ChevronLeft, ChevronRight, Play, Pause } from "lucide-react";
import { isVideoPath } from "@/lib/memories";
import type { SlideItem } from "@/components/Slideshow";

export function Gallery({ items }: { items: SlideItem[] }) {
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  const [playing, setPlaying] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const touchX = useRef<number | null>(null);
  const touchY = useRef<number | null>(null);

  useEffect(() => {
    if (openIdx == null) return;
    setLoaded(false);
    closeBtnRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenIdx(null);
      else if (e.key === "ArrowRight") setOpenIdx((i) => (i == null ? i : (i + 1) % items.length));
      else if (e.key === "ArrowLeft") setOpenIdx((i) => (i == null ? i : (i - 1 + items.length) % items.length));
      else if (e.key === " ") { e.preventDefault(); setPlaying((p) => !p); }
    };
    const prevOverflow = document.body.style.overflow;
    const prevTouch = document.body.style.touchAction;
    document.body.style.overflow = "hidden";
    document.body.style.touchAction = "none";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      document.body.style.touchAction = prevTouch;
      window.removeEventListener("keydown", onKey);
    };
  }, [openIdx, items.length]);

  // autoplay
  useEffect(() => {
    if (openIdx == null || !playing) return;
    const cur = items[openIdx];
    if (cur && isVideoPath(cur.path)) return;
    const id = window.setTimeout(() => {
      setOpenIdx((i) => (i == null ? i : (i + 1) % items.length));
    }, 4000);
    return () => clearTimeout(id);
  }, [openIdx, playing, items]);

  useEffect(() => {
    if (openIdx != null && openIdx > items.length - 1) setOpenIdx(items.length ? 0 : null);
  }, [items.length, openIdx]);

  if (!items.length) return null;
  const active = openIdx != null ? items[openIdx] : null;
  const go = (delta: number) => setOpenIdx((i) => (i == null ? i : (i + delta + items.length) % items.length));

  return (
    <>
      <ul className="grid grid-cols-2 sm:grid-cols-3 gap-2" role="list" aria-label="Memory gallery">
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
                    <img src={it.url} alt="" className="w-full h-full object-cover transition-transform duration-300 group-active:scale-95 group-hover:scale-105" loading="lazy" decoding="async" />
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
          className="fixed inset-0 z-50 bg-black animate-fade-up select-none"
          style={{ height: "100dvh", width: "100vw", touchAction: "none", overscrollBehavior: "contain" }}
          onTouchStart={(e) => {
            touchX.current = e.touches[0].clientX;
            touchY.current = e.touches[0].clientY;
          }}
          onTouchEnd={(e) => {
            if (touchX.current == null || touchY.current == null) return;
            const dx = e.changedTouches[0].clientX - touchX.current;
            const dy = e.changedTouches[0].clientY - touchY.current;
            if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) go(dx < 0 ? 1 : -1);
            touchX.current = null;
            touchY.current = null;
          }}
        >
          {/* Image stage — perfectly fit inside the viewport */}
          <div className="absolute inset-0 flex items-center justify-center">
            {!loaded && (
              <div className="absolute w-10 h-10 rounded-full border-2 border-white/30 border-t-white animate-spin" aria-hidden />
            )}
            {active.url ? (
              isVideoPath(active.path) ? (
                <video
                  key={active.id}
                  src={active.url}
                  controls
                  autoPlay
                  playsInline
                  onLoadedData={() => setLoaded(true)}
                  className="max-w-full max-h-full w-auto h-auto object-contain"
                />
              ) : (
                <img
                  key={active.id}
                  src={active.url}
                  alt=""
                  draggable={false}
                  onLoad={() => setLoaded(true)}
                  className={`max-w-full max-h-full w-auto h-auto object-contain transition-opacity duration-300 ${loaded ? "opacity-100" : "opacity-0"}`}
                  style={{ WebkitUserSelect: "none" }}
                />
              )
            ) : null}
          </div>

          {/* Top bar: counter + close */}
          <div
            className="absolute top-0 inset-x-0 flex items-center justify-between px-4 py-3 bg-gradient-to-b from-black/70 to-transparent"
            style={{ paddingTop: "max(env(safe-area-inset-top), 12px)" }}
          >
            <span className="text-white text-sm tabular-nums px-3 py-1 rounded-full bg-white/10 backdrop-blur">
              {openIdx + 1} / {items.length}
            </span>
            <button
              ref={closeBtnRef}
              onClick={() => setOpenIdx(null)}
              className="w-12 h-12 rounded-full bg-white/15 active:bg-white/30 text-white flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
              aria-label="Close viewer"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Side arrows */}
          {items.length > 1 && (
            <>
              <button
                onClick={() => go(-1)}
                className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/15 active:bg-white/30 text-white flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
                aria-label="Previous"
              >
                <ChevronLeft className="w-7 h-7" />
              </button>
              <button
                onClick={() => go(1)}
                className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/15 active:bg-white/30 text-white flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
                aria-label="Next"
              >
                <ChevronRight className="w-7 h-7" />
              </button>
            </>
          )}

          {/* Bottom bar: play/pause */}
          {items.length > 1 && (
            <div
              className="absolute bottom-0 inset-x-0 flex items-center justify-center pb-4 pt-8 bg-gradient-to-t from-black/70 to-transparent"
              style={{ paddingBottom: "max(env(safe-area-inset-bottom), 16px)" }}
            >
              <button
                onClick={() => setPlaying((p) => !p)}
                className="w-14 h-14 rounded-full bg-white/15 active:bg-white/30 text-white flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
                aria-label={playing ? "Pause slideshow" : "Play slideshow"}
                aria-pressed={playing}
              >
                {playing ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" fill="currentColor" />}
              </button>
            </div>
          )}
        </div>
      )}
    </>
  );
}