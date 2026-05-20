import { useMemo } from "react";

export function HeartParticles({ count = 14 }: { count?: number }) {
  const items = useMemo(
    () =>
      Array.from({ length: count }).map((_, i) => ({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 8,
        dur: 8 + Math.random() * 10,
        size: 10 + Math.random() * 18,
        opacity: 0.3 + Math.random() * 0.5,
        emoji: Math.random() > 0.7 ? "✨" : Math.random() > 0.5 ? "💗" : "❤",
      })),
    [count],
  );
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden -z-0" aria-hidden>
      {items.map((p) => (
        <span
          key={p.id}
          className="absolute bottom-0 animate-float-up"
          style={{
            left: `${p.left}%`,
            fontSize: `${p.size}px`,
            opacity: p.opacity,
            animationDuration: `${p.dur}s`,
            animationDelay: `${p.delay}s`,
          }}
        >
          {p.emoji}
        </span>
      ))}
    </div>
  );
}