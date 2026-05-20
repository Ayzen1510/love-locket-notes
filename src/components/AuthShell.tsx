import { ReactNode } from "react";
import { Heart } from "lucide-react";
import { HeartParticles } from "./HeartParticles";

export function AuthShell({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-10 relative">
      <HeartParticles count={12} />
      <div className="w-full max-w-sm glass-strong rounded-3xl p-8 relative animate-fade-up">
        <div className="flex flex-col items-center gap-3 mb-6">
          <div className="w-16 h-16 rounded-3xl romance-gradient flex items-center justify-center shadow-[var(--shadow-romance)]">
            <Heart className="w-8 h-8 text-white" fill="currentColor" />
          </div>
          <h1 className="text-3xl font-display romance-text text-center">{title}</h1>
          <p className="text-sm text-muted-foreground text-center">{subtitle}</p>
        </div>
        {children}
      </div>
      <p className="mt-6 text-xs text-muted-foreground/70">Couple Memories Lock · private by design</p>
    </div>
  );
}