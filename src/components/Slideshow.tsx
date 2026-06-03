import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Pause, Play, Maximize2, X, Settings } from "lucide-react";
import { isVideoPath } from "@/lib/memories";

export type SlideItem = { id: string; path: string; url: string | null };

type Transition = "fade" | "slide" | "zoom" | "flip";
type Prefs = { transition: Transition; speed: number; playing: boolean };

const PREFS_KEY = "cml:slideshow-prefs";
const DEFAULT_PREFS: Prefs = { transition: "fade", speed: 4, playing: true };

function loadPrefs(): Prefs {
  if (typeof window === "undefined") return DEFAULT_PREFS;
  try {
    const raw = window.localStorage.getItem(PREFS_KEY);
    if (!raw) return DEFAULT_PREFS;
    const p = JSON.parse(raw);
    return {
      transition: (["fade", "slide", "zoom", "flip"] as Transition[]).includes(p.transition) ? p.transition : DEFAULT_PREFS.transition,
      speed: typeof p.speed === "number" && p.speed >= 2 && p.speed <= 12 ? p.speed : DEFAULT_PREFS.speed,
      playing: typeof p.playing === "boolean" ? p.playing : true,
    };
  } catch {
    return DEFAULT_PREFS;
  }
}

function transitionClasses(t: Transition, active: boolean, dir: 1 | -1): string {
  switch (t) {
    case "slide":
      return active
        ? "opacity-100 translate-x-0 z-10"
        : `opacity-0 z-0 ${dir === 1 ? "-translate-x-full" : "translate-x-full"}`;
    case "zoom":
      return active ? "opacity-100 scale-100 z-10" : "opacity-0 scale-125 z-0";
    case "flip":
      return active
        ? "opacity-100 [transform:rotateY(0deg)] z-10"
        : "opacity-0 [transform:rotateY(90deg)] z-0";
    case "fade":
    default:
      return active ? "opacity-100 scale-100 z-10" : "opacity-0 scale-105 z-0";
  }
}

export function Slideshow({ items }: { items: SlideItem[] }) {
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

  // autoplay (skip when current is a video — videos advance via onEnded)
  useEffect(() => {
    if (!playing || !current) return;
    if (isVideoPath(current.path)) return;
    const id = setTimeout(() => go(1), prefs.speed * 1000);
    return () => clearTimeout(id);
  }, [playing, prefs.speed, safeI, current?.path, items.length]);

  // pause inactive videos & reset active video to start
  useEffect(() => {
    Object.entries(videoRefs.current).forEach(([id, vid]) => {
      if (!vid) return;
      if (id !== current?.id) {
        vid.pause();
      }
      try { vid.currentTime = 0; } catch { /* ignore */ }
    });
  }, [safeI, current?.id]);

  useEffect(() => {
    if (!fs) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setFs(false);
      else if (e.key === "ArrowRight") go(1);
      else if (e.key === "ArrowLeft") go(-1);
      else if (e.key === " ") { e.preventDefault(); setPlaying(!playing); }
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [fs, playing]);

  if (!items.length) return null;

  const Stage = (
    <div
      className={`relative w-full ${fs ? "h-screen rounded-none" : "aspect-[4/5] rounded-3xl"} overflow-hidden bg-black/20 [perspective:1200px]`}
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
        const tCls = transitionClasses(prefs.transition, active, dir);
        return (
          <div
            key={it.id}
            className={`absolute inset-0 transition-all duration-700 ease-out [transform-style:preserve-3d] ${tCls}`}
            aria-hidden={!active}
          >
            {it.url ? (
              isVid ? (
                <video
                  ref={(el) => { videoRefs.current[it.id] = el; }}
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

      {items.length > 1 && (
        <>
          <button
            onClick={() => go(-1)}
            className="absolute left-2 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-white/25 hover:bg-white/40 backdrop-blur text-white flex items-center justify-center transition"
            aria-label="Previous"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={() => go(1)}
            className="absolute right-2 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-white/25 hover:bg-white/40 backdrop-blur text-white flex items-center justify-center transition"
            aria-label="Next"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </>
      )}

      <div className="absolute top-3 right-3 z-30 flex gap-2">
        <button
          onClick={() => setPlaying(!playing)}
          className="w-9 h-9 rounded-full bg-white/25 hover:bg-white/40 backdrop-blur text-white flex items-center justify-center"
          aria-label={playing ? "Pause" : "Play"}
        >
          {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" fill="currentColor" />}
        </button>
        <button
          onClick={() => setShowSettings((s) => !s)}
          className={`w-9 h-9 rounded-full backdrop-blur text-white flex items-center justify-center transition ${showSettings ? "bg-white/50" : "bg-white/25 hover:bg-white/40"}`}
          aria-label="Slideshow settings"
        >
          <Settings className="w-4 h-4" />
        </button>
        <button
          onClick={() => setFs((v) => !v)}
          className="w-9 h-9 rounded-full bg-white/25 hover:bg-white/40 backdrop-blur text-white flex items-center justify-center"
          aria-label="Fullscreen"
        >
          {fs ? <X className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>
      </div>

      {showSettings && (
        <SettingsPanel
          prefs={prefs}
          onChange={(p) => setPrefs(p)}
          onClose={() => setShowSettings(false)}
        />
      )}

      {items.length > 1 && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex gap-1.5">
          {items.map((_, idx) => (
            <button
              key={idx}
              onClick={() => jumpTo(idx)}
              className={`h-1.5 rounded-full transition-all ${idx === safeI ? "w-6 bg-white" : "w-1.5 bg-white/50 hover:bg-white/80"}`}
              aria-label={`Slide ${idx + 1}`}
            />
          ))}
        </div>
      )}

      {playing && current && !isVideoPath(current.path) && items.length > 1 && (
        <div
          key={`progress-${safeI}-${prefs.speed}`}
          className="absolute top-0 left-0 h-1 bg-white/80 z-20 origin-left"
          style={{ animation: `slideshow-progress ${prefs.speed}s linear forwards` }}
        />
      )}
    </div>
  );

  if (fs) {
    return (
      <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4">
        <div className="w-full max-w-4xl">{Stage}</div>
      </div>
    );
  }
  return Stage;
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
    { id: "flip", label: "Flip" },
  ];
  return (
    <div className="absolute top-14 right-3 z-40 w-64 rounded-2xl bg-black/75 backdrop-blur-xl text-white p-3 shadow-2xl border border-white/10 animate-fade-up">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs uppercase tracking-widest text-white/70">Slideshow</p>
        <button onClick={onClose} aria-label="Close" className="w-6 h-6 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center">
          <X className="w-3 h-3" />
        </button>
      </div>

      <p className="text-[11px] text-white/70 mt-2 mb-1">Transition</p>
      <div className="grid grid-cols-4 gap-1">
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
        type="range"
        min={2}
        max={12}
        step={1}
        value={prefs.speed}
        onChange={(e) => onChange({ ...prefs, speed: Number(e.target.value) })}
        className="w-full accent-white"
      />
      <div className="flex justify-between text-[10px] text-white/50 mt-0.5">
        <span>Fast</span><span>Slow</span>
      </div>

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