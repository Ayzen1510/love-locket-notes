import { useEffect, useState } from "react";
import { signedUrl, isVideoPath } from "@/lib/memories";
import { Play } from "lucide-react";

export function MemoryThumb({ path, className }: { path?: string; className?: string }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    if (!path) { setUrl(null); return; }
    signedUrl(path).then((u) => { if (active) setUrl(u); });
    return () => { active = false; };
  }, [path]);
  if (!path) {
    return (
      <div className={`romance-gradient ${className ?? ""}`} aria-hidden />
    );
  }
  const isVid = isVideoPath(path);
  if (isVid) {
    return (
      <div className={`relative ${className ?? ""}`}>
        {url ? (
          <video src={url} className="object-cover w-full h-full" muted playsInline preload="metadata" />
        ) : (
          <div className="bg-muted animate-pulse w-full h-full" />
        )}
        <div className="absolute inset-0 flex items-center justify-center bg-black/15">
          <div className="w-8 h-8 rounded-full bg-white/80 backdrop-blur flex items-center justify-center shadow">
            <Play className="w-4 h-4 text-primary" fill="currentColor" />
          </div>
        </div>
      </div>
    );
  }
  return url ? (
    <img src={url} alt="" className={`object-cover ${className ?? ""}`} loading="lazy" />
  ) : (
    <div className={`bg-muted animate-pulse ${className ?? ""}`} />
  );
}