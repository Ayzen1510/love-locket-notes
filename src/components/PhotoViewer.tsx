import { useEffect, useRef, useState, useCallback } from "react";
import { X, ChevronLeft, ChevronRight, Play, Pause, Info, Share2, Download } from "lucide-react";
import { isVideoPath } from "@/lib/memories";
import { toast } from "sonner";
import { AnimatePresence, motion } from "framer-motion";

export type ViewerItem = {
  id: string;
  path: string;
  url: string | null;
  caption?: string | null;
  date?: string | null;
};

type Props = {
  items: ViewerItem[];
  index: number;
  onClose: () => void;
  onIndexChange?: (i: number) => void;
  hideInfo?: boolean;
};

export function PhotoViewer({ items, index, onClose, onIndexChange, hideInfo = false }: Props) {
  const [i, setI] = useState(index);
  const [playing, setPlaying] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [direction, setDirection] = useState(0);
  const [showInfo, setShowInfo] = useState(false);
  const [showChrome, setShowChrome] = useState(true);
  // zoom + pan
  const [scale, setScale] = useState(1);
  const [tx, setTx] = useState(0);
  const [ty, setTy] = useState(0);
  // touch state
  const startTouches = useRef<{ x: number; y: number; t: number }[]>([]);
  const lastTap = useRef(0);
  const pinchStart = useRef<{ dist: number; scale: number } | null>(null);
  const panStart = useRef<{ x: number; y: number; tx: number; ty: number } | null>(null);
  const dragY = useRef(0);
  const [dragOffset, setDragOffset] = useState(0);

  useEffect(() => setI(index), [index]);
  useEffect(() => { onIndexChange?.(i); }, [i, onIndexChange]);

  const active = items[i];

  const change = useCallback((delta: number) => {
    if (!items.length) return;
    setScale(1); setTx(0); setTy(0); setLoaded(false);
    setDirection(delta);
    setI((p) => (p + delta + items.length) % items.length);
  }, [items.length]);

  // keys + body lock
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight") change(1);
      else if (e.key === "ArrowLeft") change(-1);
      else if (e.key === " ") { e.preventDefault(); setPlaying((p) => !p); }
    };
    const prevO = document.body.style.overflow;
    const prevT = document.body.style.touchAction;
    document.body.style.overflow = "hidden";
    document.body.style.touchAction = "none";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevO;
      document.body.style.touchAction = prevT;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose, change]);

  // autoplay
  useEffect(() => {
    if (!playing || !active || isVideoPath(active.path)) return;
    const id = window.setTimeout(() => change(1), 4000);
    return () => clearTimeout(id);
  }, [playing, i, active, change]);

  // reset on index change
  useEffect(() => { setScale(1); setTx(0); setTy(0); setLoaded(false); setShowChrome(true); }, [i]);

  // preload neighbors
  useEffect(() => {
    if (!items.length) return;
    [1, -1].forEach((d) => {
      const n = items[(i + d + items.length) % items.length];
      if (n?.url && !isVideoPath(n.path)) {
        const img = new Image();
        img.src = n.url;
      }
    });
  }, [i, items]);

  function dist(a: React.Touch, b: React.Touch) { return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY); }

  function onTouchStart(e: React.TouchEvent) {
    const ts = Array.from(e.touches).map((t) => ({ x: t.clientX, y: t.clientY, t: Date.now() }));
    startTouches.current = ts;
    if (e.touches.length === 2) {
      pinchStart.current = { dist: dist(e.touches[0], e.touches[1]), scale };
    } else if (e.touches.length === 1) {
      panStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY, tx, ty };
      dragY.current = e.touches[0].clientY;
    }
  }

  function onTouchMove(e: React.TouchEvent) {
    if (e.touches.length === 2 && pinchStart.current) {
      const d = dist(e.touches[0], e.touches[1]);
      const next = Math.max(1, Math.min(5, pinchStart.current.scale * (d / pinchStart.current.dist)));
      setScale(next);
    } else if (e.touches.length === 1 && panStart.current) {
      const dx = e.touches[0].clientX - panStart.current.x;
      const dy = e.touches[0].clientY - panStart.current.y;
      if (scale > 1) {
        setTx(panStart.current.tx + dx);
        setTy(panStart.current.ty + dy);
      } else if (Math.abs(dy) > Math.abs(dx) && dy > 0) {
        // swipe down to dismiss preview
        setDragOffset(dy);
      }
    }
  }

  function onTouchEnd(e: React.TouchEvent) {
    const start = startTouches.current[0];
    const endT = e.changedTouches[0];
    const dt = Date.now() - (start?.t ?? 0);
    const dx = endT.clientX - (start?.x ?? 0);
    const dy = endT.clientY - (start?.y ?? 0);

    // swipe-down to dismiss
    if (scale === 1 && dragOffset > 120) { setDragOffset(0); onClose(); return; }
    setDragOffset(0);

    // tap / double-tap
    if (dt < 250 && Math.abs(dx) < 8 && Math.abs(dy) < 8 && e.touches.length === 0) {
      const now = Date.now();
      if (now - lastTap.current < 300) {
        // double tap zoom
        if (scale > 1) { setScale(1); setTx(0); setTy(0); }
        else { setScale(2.5); }
        lastTap.current = 0;
      } else {
        lastTap.current = now;
        setTimeout(() => {
          if (lastTap.current && Date.now() - lastTap.current >= 280) {
            setShowChrome((s) => !s);
            lastTap.current = 0;
          }
        }, 300);
      }
      pinchStart.current = null;
      panStart.current = null;
      return;
    }

    // horizontal swipe to navigate (only when not zoomed)
    if (scale === 1 && Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) {
      change(dx < 0 ? 1 : -1);
    }
    pinchStart.current = null;
    panStart.current = null;
  }

  async function share() {
    if (!active?.url) return;
    try {
      if (navigator.share) {
        await navigator.share({ title: active.caption || "Memory", url: active.url });
      } else {
        await navigator.clipboard.writeText(active.url);
        toast.success("Link copied");
      }
    } catch { /* user cancel */ }
  }

  async function download() {
    if (!active?.url) return;
    try {
      const res = await fetch(active.url);
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      const ext = active.path.split(".").pop() || "jpg";
      a.download = `memory-${active.id}.${ext}`;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    } catch { toast.error("Download failed"); }
  }

  if (!active) return null;
  const isVid = isVideoPath(active.path);
  const transform = `translate3d(${tx}px, ${ty + dragOffset}px, 0) scale(${scale})`;
  const dragOpacity = Math.max(0.4, 1 - dragOffset / 400);
  const bgAlpha = dragOffset > 0 ? dragOpacity : 1;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Photo viewer"
      className="fixed inset-0 z-[100] select-none bg-black"
      style={{
        height: "100dvh", width: "100vw", touchAction: "none", overscrollBehavior: "contain",
        background: `rgba(0,0,0,${bgAlpha})`,
      }}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {/* image stage */}
      <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
        {!loaded && !isVid && (
          <div className="absolute w-10 h-10 rounded-full border-2 border-white/30 border-t-white animate-spin" aria-hidden />
        )}
        <AnimatePresence initial={false} mode="wait" custom={direction}>
          {active.url ? (
            isVid ? (
              <motion.video
                key={active.id}
                src={active.url}
                controls autoPlay playsInline
                onLoadedData={() => setLoaded(true)}
                onError={() => setLoaded(true)}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25, ease: "easeInOut" }}
                className="max-w-full max-h-full w-auto h-auto object-contain"
              />
            ) : (
              <motion.img
                key={active.id}
                src={active.url}
                alt=""
                draggable={false}
                onLoad={() => setLoaded(true)}
                onError={() => setLoaded(true)}
                custom={direction}
                initial={{ opacity: 0, x: direction > 0 ? 60 : direction < 0 ? -60 : 0 }}
                animate={{ opacity: 1, x: tx, y: ty + dragOffset, scale }}
                exit={{ opacity: 0, x: direction > 0 ? -60 : direction < 0 ? 60 : 0 }}
                transition={
                  pinchStart.current || panStart.current
                    ? { duration: 0 }
                    : { duration: 0.28, ease: [0.2, 0.7, 0.2, 1] }
                }
                className="max-w-full max-h-full w-auto h-auto object-contain will-change-transform"
              />
            )
          ) : null}
        </AnimatePresence>
      </div>

      {showChrome && (
        <>
          {/* Top bar */}
          <div
            className="absolute top-0 inset-x-0 flex items-center justify-between gap-2 px-3 py-2 bg-gradient-to-b from-black/70 to-transparent animate-fade-in"
            style={{ paddingTop: "max(env(safe-area-inset-top), 10px)" }}
          >
            <div className="flex items-center gap-2">
              <button onClick={onClose} className="w-11 h-11 rounded-full bg-white/15 active:bg-white/30 text-white flex items-center justify-center" aria-label="Close">
                <X className="w-5 h-5" />
              </button>
              <span className="text-white text-sm tabular-nums px-3 py-1 rounded-full bg-white/10 backdrop-blur">
                {i + 1} / {items.length}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              {!hideInfo && (
                <button onClick={() => setShowInfo((s) => !s)} className={`w-11 h-11 rounded-full ${showInfo ? "bg-white text-black" : "bg-white/15 text-white"} active:scale-95 flex items-center justify-center`} aria-label="Info" aria-pressed={showInfo}>
                  <Info className="w-5 h-5" />
                </button>
              )}
              <button onClick={share} className="w-11 h-11 rounded-full bg-white/15 text-white active:scale-95 flex items-center justify-center" aria-label="Share">
                <Share2 className="w-5 h-5" />
              </button>
              <button onClick={download} className="w-11 h-11 rounded-full bg-white/15 text-white active:scale-95 flex items-center justify-center" aria-label="Download">
                <Download className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Arrows */}
          {items.length > 1 && scale === 1 && (
            <>
              <button onClick={() => change(-1)} className="hidden sm:flex absolute left-3 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/15 active:bg-white/30 text-white items-center justify-center" aria-label="Previous">
                <ChevronLeft className="w-7 h-7" />
              </button>
              <button onClick={() => change(1)} className="hidden sm:flex absolute right-3 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/15 active:bg-white/30 text-white items-center justify-center" aria-label="Next">
                <ChevronRight className="w-7 h-7" />
              </button>
            </>
          )}

          {/* Bottom bar */}
          {items.length > 1 && (
            <div
              className="absolute bottom-0 inset-x-0 flex items-center justify-center pb-4 pt-8 bg-gradient-to-t from-black/70 to-transparent"
              style={{ paddingBottom: "max(env(safe-area-inset-bottom), 14px)" }}
            >
              <button
                onClick={() => setPlaying((p) => !p)}
                className="w-14 h-14 rounded-full bg-white/15 active:bg-white/30 text-white flex items-center justify-center"
                aria-label={playing ? "Pause" : "Play"} aria-pressed={playing}
              >
                {playing ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" fill="currentColor" />}
              </button>
            </div>
          )}

          {/* Info panel */}
          {showInfo && !hideInfo && (
            <div
              className="absolute left-0 right-0 bottom-0 bg-black/85 backdrop-blur-xl text-white p-5 pb-8 animate-fade-up rounded-t-3xl"
              style={{ paddingBottom: "max(env(safe-area-inset-bottom), 24px)" }}
              onClick={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
              onTouchEnd={(e) => e.stopPropagation()}
              onTouchMove={(e) => e.stopPropagation()}
            >
              <div className="w-10 h-1 rounded-full bg-white/30 mx-auto mb-3" />
              {active.date && (
                <p className="text-xs uppercase tracking-widest text-white/60">{active.date}</p>
              )}
              <p className="mt-1 text-base leading-relaxed">
                {active.caption || <span className="italic text-white/50">No caption</span>}
              </p>
              <p className="mt-3 text-[11px] text-white/50">Photo {i + 1} of {items.length}</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}