import { useEffect, useRef, useState, useCallback } from "react";
import { X, ChevronLeft, ChevronRight, Play, Pause, Info, Share2, Download, Maximize2, Minimize2 } from "lucide-react";
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
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const triggerRef = useRef<Element | null>(null);
  const thumbStripRef = useRef<HTMLDivElement>(null);
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

  // prefers-reduced-motion
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(mq.matches);
    update();
    mq.addEventListener?.("change", update);
    return () => mq.removeEventListener?.("change", update);
  }, []);

  // remember trigger, restore focus on close
  useEffect(() => {
    triggerRef.current = document.activeElement;
    // focus the close button when opened
    requestAnimationFrame(() => closeBtnRef.current?.focus());
    return () => {
      const el = triggerRef.current as HTMLElement | null;
      el?.focus?.();
    };
  }, []);

  // sync browser fullscreen state
  useEffect(() => {
    const onFs = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFs);
    document.addEventListener("webkitfullscreenchange", onFs as EventListener);
    return () => {
      document.removeEventListener("fullscreenchange", onFs);
      document.removeEventListener("webkitfullscreenchange", onFs as EventListener);
    };
  }, []);

  const toggleFullscreen = useCallback(async () => {
    const el = rootRef.current as (HTMLDivElement & { webkitRequestFullscreen?: () => Promise<void> }) | null;
    const doc = document as Document & {
      webkitFullscreenElement?: Element;
      webkitExitFullscreen?: () => Promise<void>;
    };
    try {
      if (!document.fullscreenElement && !doc.webkitFullscreenElement) {
        if (el?.requestFullscreen) await el.requestFullscreen();
        else if (el?.webkitRequestFullscreen) await el.webkitRequestFullscreen();
      } else {
        if (document.exitFullscreen) await document.exitFullscreen();
        else if (doc.webkitExitFullscreen) await doc.webkitExitFullscreen();
      }
    } catch { /* ignore */ }
  }, []);

  // keys + body lock + focus trap
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight") change(1);
      else if (e.key === "ArrowLeft") change(-1);
      else if (e.key === " ") { e.preventDefault(); setPlaying((p) => !p); }
      else if (e.key === "f" || e.key === "F") { toggleFullscreen(); }
      else if (e.key === "Tab") {
        const root = rootRef.current;
        if (!root) return;
        const focusables = root.querySelectorAll<HTMLElement>(
          'button, [href], [tabindex]:not([tabindex="-1"])'
        );
        if (!focusables.length) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
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
  }, [onClose, change, toggleFullscreen]);

  // autoplay
  useEffect(() => {
    if (!playing || !active || isVideoPath(active.path)) return;
    const id = window.setTimeout(() => change(1), 4000);
    return () => clearTimeout(id);
  }, [playing, i, active, change]);

  // reset on index change
  useEffect(() => { setScale(1); setTx(0); setTy(0); setLoaded(false); setShowChrome(true); }, [i]);

  // keep active thumbnail in view
  useEffect(() => {
    const strip = thumbStripRef.current;
    if (!strip) return;
    const el = strip.querySelector<HTMLElement>(`[data-thumb="${i}"]`);
    el?.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", inline: "center", block: "nearest" });
  }, [i, reducedMotion]);

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
  const dragOpacity = Math.max(0.4, 1 - dragOffset / 400);
  const bgAlpha = dragOffset > 0 ? dragOpacity : 1;
  const transitionDuration = reducedMotion ? 0.2 : 0.7;

  return (
    <div
      ref={rootRef}
      role="dialog"
      aria-modal="true"
      aria-label="Photo viewer"
      className="fixed inset-0 z-[100] select-none"
      style={{
        height: "100dvh", width: "100vw", touchAction: "none", overscrollBehavior: "contain",
        background: `linear-gradient(140deg, rgba(46,28,38,${bgAlpha}) 0%, rgba(28,18,26,${bgAlpha}) 60%, rgba(18,12,18,${bgAlpha}) 100%)`,
      }}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {/* Ambient bokeh / light-leak overlay (purely decorative) */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-24 -left-16 w-[55vw] h-[55vw] rounded-full opacity-30 blur-3xl"
             style={{ background: "radial-gradient(circle, #f5c7d4 0%, transparent 70%)" }} />
        <div className="absolute -bottom-32 -right-20 w-[60vw] h-[60vw] rounded-full opacity-25 blur-3xl"
             style={{ background: "radial-gradient(circle, #f1d9a8 0%, transparent 70%)" }} />
        <div className="absolute top-1/3 right-1/4 w-40 h-40 rounded-full opacity-20 blur-2xl"
             style={{ background: "radial-gradient(circle, #fff3e6 0%, transparent 70%)" }} />
      </div>

      {/* image stage */}
      <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
        {!loaded && !isVid && (
          <div className="absolute w-10 h-10 rounded-full border-2 border-[#f5c7d4]/40 border-t-[#f5c7d4] animate-spin" aria-hidden />
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
                transition={{ duration: transitionDuration, ease: "easeInOut" }}
                className="max-w-[92%] max-h-[82%] w-auto h-auto object-contain rounded-2xl"
                style={{
                  boxShadow: "0 30px 80px -20px rgba(0,0,0,0.7), 0 0 0 1px rgba(245,199,212,0.25), 0 0 0 6px rgba(241,217,168,0.08)",
                }}
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
                initial={{ opacity: 0, x: reducedMotion ? 0 : direction > 0 ? 40 : direction < 0 ? -40 : 0 }}
                animate={{ opacity: 1, x: tx, y: ty + dragOffset, scale }}
                exit={{ opacity: 0, x: reducedMotion ? 0 : direction > 0 ? -40 : direction < 0 ? 40 : 0 }}
                transition={
                  pinchStart.current || panStart.current
                    ? { duration: 0 }
                    : { duration: transitionDuration, ease: [0.22, 0.61, 0.36, 1] }
                }
                className="max-w-[92%] max-h-[82%] w-auto h-auto object-contain rounded-2xl will-change-transform"
                style={{
                  boxShadow: "0 30px 80px -20px rgba(0,0,0,0.75), 0 0 0 1px rgba(245,199,212,0.3), 0 0 0 6px rgba(241,217,168,0.1)",
                }}
              />
            )
          ) : null}
        </AnimatePresence>
        {/* soft vignette over the entire stage */}
        <div aria-hidden className="pointer-events-none absolute inset-0"
             style={{ background: "radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,0.45) 100%)" }} />
      </div>

      {showChrome && (
        <>
          {/* Top bar */}
          <div
            className="absolute top-0 inset-x-0 z-20 flex items-center justify-between gap-2 px-3 py-2 bg-gradient-to-b from-black/60 via-black/20 to-transparent animate-fade-in"
            style={{ paddingTop: "max(env(safe-area-inset-top), 10px)" }}
          >
            <div className="flex items-center gap-2">
              <button ref={closeBtnRef} onClick={onClose} className="w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 active:bg-white/30 backdrop-blur-md text-[#fdf2e9] border border-white/15 flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-[#f5c7d4]" aria-label="Close viewer">
                <X className="w-5 h-5" />
              </button>
              <span className="text-[#fdf2e9] text-sm tabular-nums px-3 py-1 rounded-full bg-white/10 backdrop-blur border border-white/10" style={{ fontFamily: '"Playfair Display", serif' }}>
                {i + 1} / {items.length}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <button onClick={toggleFullscreen} className="w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 text-[#fdf2e9] backdrop-blur-md border border-white/15 active:scale-95 flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-[#f5c7d4]" aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"} aria-pressed={isFullscreen}>
                {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
              </button>
              {!hideInfo && (
                <button onClick={() => setShowInfo((s) => !s)} className={`w-11 h-11 rounded-full backdrop-blur-md border border-white/15 active:scale-95 flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-[#f5c7d4] ${showInfo ? "bg-[#f5c7d4] text-[#2a1820]" : "bg-white/10 hover:bg-white/20 text-[#fdf2e9]"}`} aria-label="Photo info" aria-pressed={showInfo}>
                  <Info className="w-5 h-5" />
                </button>
              )}
              <button onClick={share} className="w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 text-[#fdf2e9] backdrop-blur-md border border-white/15 active:scale-95 flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-[#f5c7d4]" aria-label="Share photo">
                <Share2 className="w-5 h-5" />
              </button>
              <button onClick={download} className="w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 text-[#fdf2e9] backdrop-blur-md border border-white/15 active:scale-95 flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-[#f5c7d4]" aria-label="Download photo">
                <Download className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Arrows */}
          {items.length > 1 && scale === 1 && (
            <>
              <button onClick={() => change(-1)} className="hidden sm:flex absolute left-4 top-1/2 -translate-y-1/2 z-20 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 active:bg-white/30 backdrop-blur-md text-[#fdf2e9] border border-white/15 items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-[#f5c7d4]" aria-label="Previous photo">
                <ChevronLeft className="w-7 h-7" />
              </button>
              <button onClick={() => change(1)} className="hidden sm:flex absolute right-4 top-1/2 -translate-y-1/2 z-20 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 active:bg-white/30 backdrop-blur-md text-[#fdf2e9] border border-white/15 items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-[#f5c7d4]" aria-label="Next photo">
                <ChevronRight className="w-7 h-7" />
              </button>
            </>
          )}

          {/* Bottom bar: thumbnail strip + play */}
          {items.length > 1 && (
            <div
              className="absolute bottom-0 inset-x-0 z-20 flex flex-col items-center gap-3 pb-3 pt-10 bg-gradient-to-t from-black/70 via-black/30 to-transparent"
              style={{ paddingBottom: "max(env(safe-area-inset-bottom), 14px)" }}
            >
              <div ref={thumbStripRef} className="max-w-full overflow-x-auto px-4 no-scrollbar">
                <div className="flex items-center gap-2">
                  {items.map((it, idx) => {
                    const activeT = idx === i;
                    const vid = isVideoPath(it.path);
                    return (
                      <button
                        key={it.id}
                        data-thumb={idx}
                        onClick={() => { setDirection(idx > i ? 1 : -1); setI(idx); }}
                        aria-label={`Go to photo ${idx + 1}`}
                        aria-current={activeT ? "true" : undefined}
                        className={`relative shrink-0 overflow-hidden rounded-lg transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#f5c7d4] ${
                          activeT
                            ? "w-16 h-16 ring-2 ring-[#f1d9a8] shadow-[0_0_0_2px_rgba(245,199,212,0.4)]"
                            : "w-12 h-12 opacity-60 hover:opacity-100 ring-1 ring-white/20"
                        }`}
                      >
                        {it.url && !vid ? (
                          <img src={it.url} alt="" className="w-full h-full object-cover" loading="lazy" />
                        ) : (
                          <div className="w-full h-full bg-white/10" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
              <button
                onClick={() => setPlaying((p) => !p)}
                className="w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 active:bg-white/30 backdrop-blur-md text-[#fdf2e9] border border-white/15 flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-[#f5c7d4]"
                aria-label={playing ? "Pause slideshow" : "Play slideshow"} aria-pressed={playing}
              >
                {playing ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" fill="currentColor" />}
              </button>
            </div>
          )}

          {/* Info panel */}
          {showInfo && !hideInfo && (
            <div
              className="absolute left-0 right-0 bottom-0 z-30 backdrop-blur-xl p-6 pb-8 animate-fade-up rounded-t-3xl border-t border-[#f1d9a8]/20"
              style={{ paddingBottom: "max(env(safe-area-inset-bottom), 24px)" }}
              onClick={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
              onTouchEnd={(e) => e.stopPropagation()}
              onTouchMove={(e) => e.stopPropagation()}
            >
              <div aria-hidden className="absolute inset-0 -z-10 rounded-t-3xl"
                   style={{ background: "linear-gradient(180deg, rgba(46,28,38,0.92), rgba(28,18,26,0.96))" }} />
              <div className="w-10 h-1 rounded-full bg-[#f1d9a8]/40 mx-auto mb-4" />
              {active.date && (
                <p className="text-xs uppercase tracking-[0.2em] text-[#f1d9a8]/80" style={{ fontFamily: '"Playfair Display", serif' }}>{active.date}</p>
              )}
              <p className="mt-2 text-lg leading-relaxed text-[#fdf2e9]" style={{ fontFamily: '"Playfair Display", serif', fontStyle: active.caption ? "normal" : "italic" }}>
                {active.caption || <span className="text-[#fdf2e9]/50">A quiet moment, untitled.</span>}
              </p>
              <p className="mt-3 text-[11px] tracking-widest uppercase text-[#fdf2e9]/40">Photo {i + 1} of {items.length}</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}