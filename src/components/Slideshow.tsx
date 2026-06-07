import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Pause, Play, Maximize2, X, Settings } from "lucide-react";
import { isVideoPath } from "@/lib/memories";
import { PhotoViewer, type ViewerItem } from "@/components/PhotoViewer";

export type SlideItem = { id: string; path: string; url: string | null };

type Transition = "fade" | "slide" | "zoom";
type Prefs = { transition: Transition; speed: number; playing: boolean };

const PREFS_KEY = "cml:slideshow-prefs";
const DEFAULT_PREFS: Prefs = { transition: "fade", speed: 5, playing: false };

function loadPrefs(): Prefs {
  if (typeof window === "undefined") return DEFAULT_PREFS;
  try {
    const raw = window.localStorage.getItem(PREFS_KEY);
    if (!raw) return DEFAULT_PREFS;
    const p = JSON.parse(raw);
    return {
      transition: (["fade", "slide", "zoom"] as Transition[]).includes(p.transition) ? p.transition : DEFAULT_PREFS.transition,
      speed: typeof p.speed === "number" && p.speed >= 2 && p.speed <= 12 ? p.speed : DEFAULT_PREFS.speed,
      playing: typeof p.playing === "boolean" ? p.playing : false,
    };
  } catch {
    return DEFAULT_PREFS;
  }
}

function slideClasses(t: Transition, active: boolean, dir: 1 | -1): string {
  switch (t) {
    case "slide":
      return active
        ? "opacity-100 translate-x-0 z-10"
        : `opacity-0 z-0 ${dir === 1 ? "-translate-x-8" : "translate-x-8"}`;
    case "zoom":
      return active ? "opacity-100 scale-100 z-10" : "opacity-0 scale-105 z-0";
    case "fade":
    default:
      return active ? "opacity-100 z-10" : "opacity-0 z-0";
  }
}

export function Slideshow({ items, meta }: { items: SlideItem[]; meta?: { caption?: string | null; date?: string | null } }) {
  const [prefs, setPrefs] = useState<Prefs>(() => loadPrefs());
  const [i, setI] = useState(0);
  const [dir, setDir] = useState<1 | -1>(1);
  const [fs, setFs] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const touchX = useRef<number | null>(null);
  const videoRefs = useRef<Record<string, HTMLVideoElement | null>>({});

  useEffect(() => {
    try { window.localStorage.setItem(PREFS_KEY, JSON.stringify(prefs)); } catch { /* ignore */ }
  }, [prefs]);

  useEffect(() => {
    if (i > items.length - 1) setI(Math.max(items.length - 1, 0));
  }, [items.length, i]);

  const safeI = Math.min(i, Math.max(items.length - 1, 0));
  const current = items[safeI];
  const playing = prefs.playing;
  const setPlaying = (v: boolean) => setPrefs((p) => ({ ...p, playing: v }));

  function go(delta: number) {
    if (!items.length) return;
    setDir(delta >= 0 ? 1 : -1);
    setI((p) => (p + delta + items.length) % items.length);
  }
  function jumpTo(idx: number) {
    setDir(idx >= safeI ? 1 : -1);
    setI(idx);
  }

  // autoplay
  useEffect(() => {
    if (!playing || !current) return;
    if (isVideoPath(current.path)) return;
    const id = setTimeout(() => go(1), prefs.speed * 1000);
    return () => clearTimeout(id);
  }, [playing, prefs.speed, safeI, current?.path, items.length]);

  // pause/reset inactive videos
  useEffect(() => {
    Object.entries(videoRefs.current).forEach(([id, vid]) => {
      if (!vid) return;
      if (id !== current?.id) {
        vid.pause();
        try { vid.currentTime = 0; } catch { /* ignore */ }
      }
    });
  }, [safeI, current?.id]);

  if (!items.length) return null;

  const Slide = ({ active, idx, it, contain }: { active: boolean; idx: number; it: SlideItem; contain: boolean }) => {
    const isVid = isVideoPath(it.path);
    return (
      <div
        className={`absolute inset-0 transition-all duration-700 ease-out ${slideClasses(prefs.transition, active, dir)}`}
        aria-hidden={!active}
        role="group"
        aria-roledescription="slide"
        aria-label={`${idx + 1} of ${items.length}`}
      >
        {it.url ? (
          isVid ? (
            <video
              ref={(el) => { videoRefs.current[it.id] = el; }}
              src={it.url}
              className={`w-full h-full ${contain ? "object-contain" : "object-contain"}`}
              controls={active}
              playsInline
              preload="metadata"
              onEnded={() => active && playing && go(1)}
            />
          ) : (
            <img
              src={it.url}
              alt=""
              className="w-full h-full object-contain select-none"
              draggable={false}
            />
          )
        ) : (
          <div className="w-full h-full bg-muted/40 animate-pulse" />
        )}
      </div>
    );
  };

  return (
    <>
      {/* In-page stage */}
      <div
        role="region"
        aria-label="Memory slideshow"
        aria-roledescription="carousel"
        className="relative w-full aspect-[4/5] sm:aspect-[16/10] overflow-hidden rounded-3xl glass-strong"
        onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
        onTouchEnd={(e) => {
          if (touchX.current == null) return;
          const dx = e.changedTouches[0].clientX - touchX.current;
          if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1);
          touchX.current = null;
        }}
      >
        {/* soft backdrop using current image blurred */}
        {current?.url && !isVideoPath(current.path) && (
          <div
            aria-hidden
            className="absolute inset-0 scale-110 blur-2xl opacity-50 transition-all duration-700"
            style={{ backgroundImage: `url(${current.url})`, backgroundSize: "cover", backgroundPosition: "center" }}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/20" />

        {items.map((it, idx) => (
          <button
            key={it.id}
            type="button"
            onClick={() => !isVideoPath(it.path) && idx === safeI && setFs(true)}
            className={`absolute inset-0 ${idx === safeI && !isVideoPath(it.path) ? "cursor-zoom-in" : "cursor-default"} focus:outline-none`}
            tabIndex={idx === safeI ? 0 : -1}
            aria-label={idx === safeI ? "Open image fullscreen" : undefined}
          >
            <Slide active={idx === safeI} idx={idx} it={it} contain />
          </button>
        ))}

        {items.length > 1 && (
          <>
            <button
              onClick={() => go(-1)}
              className="absolute left-2 sm:left-3 top-1/2 -translate-y-1/2 z-20 w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-white/30 hover:bg-white/50 backdrop-blur text-white flex items-center justify-center transition focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
              aria-label="Previous"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={() => go(1)}
              className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 z-20 w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-white/30 hover:bg-white/50 backdrop-blur text-white flex items-center justify-center transition focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
              aria-label="Next"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </>
        )}

        {/* Top controls */}
        <div className="absolute top-3 right-3 z-30 flex gap-2">
          {items.length > 1 && (
            <button
              onClick={() => setPlaying(!playing)}
              className="w-10 h-10 rounded-full bg-white/30 hover:bg-white/50 backdrop-blur text-white flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
              aria-label={playing ? "Pause" : "Play"}
              aria-pressed={playing}
            >
              {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" fill="currentColor" />}
            </button>
          )}
          <button
            onClick={() => setShowSettings((s) => !s)}
            className={`w-10 h-10 rounded-full backdrop-blur text-white flex items-center justify-center transition focus:outline-none focus-visible:ring-2 focus-visible:ring-white ${showSettings ? "bg-white/60" : "bg-white/30 hover:bg-white/50"}`}
            aria-label="Slideshow settings"
            aria-expanded={showSettings}
          >
            <Settings className="w-4 h-4" />
          </button>
          <button
            onClick={() => setFs(true)}
            className="w-10 h-10 rounded-full bg-white/30 hover:bg-white/50 backdrop-blur text-white flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
            aria-label="Open fullscreen"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>

        {showSettings && (
          <SettingsPanel prefs={prefs} onChange={setPrefs} onClose={() => setShowSettings(false)} />
        )}

        {/* counter */}
        <div className="absolute top-3 left-3 z-20 text-[11px] px-2.5 py-1 rounded-full bg-black/40 text-white backdrop-blur tabular-nums">
          {safeI + 1} / {items.length}
        </div>

        {/* dots */}
        {items.length > 1 && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex gap-1.5 px-3 py-1.5 rounded-full bg-black/30 backdrop-blur">
            {items.map((_, idx) => (
              <button
                key={idx}
                onClick={() => jumpTo(idx)}
                className={`h-2 rounded-full transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-white ${idx === safeI ? "w-6 bg-white" : "w-2 bg-white/50 hover:bg-white/80"}`}
                aria-label={`Slide ${idx + 1}`}
                aria-current={idx === safeI ? "true" : undefined}
              />
            ))}
          </div>
        )}

        {playing && current && !isVideoPath(current.path) && items.length > 1 && (
          <div
            key={`progress-${safeI}-${prefs.speed}`}
            className="absolute top-0 left-0 right-0 h-0.5 bg-white/80 z-20 origin-left"
            style={{ animation: `slideshow-progress ${prefs.speed}s linear forwards` }}
          />
        )}
      </div>

      {fs && (
        <PhotoViewer
          items={items.map<ViewerItem>((it) => ({ id: it.id, path: it.path, url: it.url, caption: meta?.caption ?? null, date: meta?.date ?? null }))}
          index={safeI}
          onClose={() => setFs(false)}
          onIndexChange={(idx) => setI(idx)}
        />
      )}
    </>
  );
}

function SettingsPanel({
  prefs, onChange, onClose,
}: {
  prefs: Prefs;
  onChange: (p: Prefs) => void;
  onClose: () => void;
}) {
  const transitions: { id: Transition; label: string }[] = [
    { id: "fade", label: "Fade" },
    { id: "slide", label: "Slide" },
    { id: "zoom", label: "Zoom" },
  ];
  return (
    <div className="absolute top-14 right-3 z-40 w-60 rounded-2xl bg-black/75 backdrop-blur-xl text-white p-3 shadow-2xl border border-white/10 animate-fade-up">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs uppercase tracking-widest text-white/70">Slideshow</p>
        <button onClick={onClose} aria-label="Close" className="w-6 h-6 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center">
          <X className="w-3 h-3" />
        </button>
      </div>

      <p className="text-[11px] text-white/70 mt-2 mb-1">Transition</p>
      <div className="grid grid-cols-3 gap-1">
        {transitions.map((t) => (
          <button
            key={t.id}
            onClick={() => onChange({ ...prefs, transition: t.id })}
            className={`text-[11px] py-1.5 rounded-lg transition ${prefs.transition === t.id ? "bg-white text-black font-medium" : "bg-white/10 hover:bg-white/20"}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between mt-3 mb-1">
        <p className="text-[11px] text-white/70">Speed</p>
        <p className="text-[11px] text-white">{prefs.speed}s</p>
      </div>
      <input
        type="range" min={2} max={12} step={1}
        value={prefs.speed}
        onChange={(e) => onChange({ ...prefs, speed: Number(e.target.value) })}
        className="w-full accent-white"
      />

      <label className="mt-3 flex items-center justify-between text-xs">
        <span className="text-white/80">Autoplay</span>
        <button
          type="button"
          onClick={() => onChange({ ...prefs, playing: !prefs.playing })}
          className={`w-10 h-6 rounded-full transition relative ${prefs.playing ? "bg-white" : "bg-white/25"}`}
          aria-label="Toggle autoplay"
        >
          <span className={`absolute top-0.5 ${prefs.playing ? "left-5 bg-black" : "left-0.5 bg-white"} w-5 h-5 rounded-full transition-all`} />
        </button>
      </label>

      <p className="text-[10px] text-white/40 mt-3">Saved on this device 💖</p>
    </div>
  );
}
