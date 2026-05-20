import { createFileRoute } from "@tanstack/react-router";
import { AppGate } from "@/components/AppGate";
import { BottomNav } from "@/components/BottomNav";
import { LOVE_QUOTES } from "@/lib/memories";
import { HeartParticles } from "@/components/HeartParticles";
import { Heart } from "lucide-react";

export const Route = createFileRoute("/quotes")({
  head: () => ({ meta: [{ title: "Love quotes · Couple Memories Lock" }] }),
  component: () => <AppGate><Quotes /></AppGate>,
});

function Quotes() {
  return (
    <div className="min-h-screen pb-32 relative">
      <HeartParticles count={6} />
      <header className="px-5 pt-10 pb-2">
        <p className="text-sm text-muted-foreground">A little reminder</p>
        <h1 className="text-3xl font-display romance-text">Love quotes</h1>
      </header>
      <ul className="px-5 mt-5 space-y-3">
        {LOVE_QUOTES.map((q, i) => (
          <li
            key={i}
            className="glass-strong rounded-3xl p-5 animate-fade-up"
            style={{ animationDelay: `${i * 40}ms` }}
          >
            <Heart className="w-5 h-5 text-primary mb-2" fill="currentColor" />
            <p className="font-display text-lg leading-snug">"{q}"</p>
          </li>
        ))}
      </ul>
      <BottomNav />
    </div>
  );
}