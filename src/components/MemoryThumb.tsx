import { useEffect, useState } from "react";
import { signedUrl } from "@/lib/memories";

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
  return url ? (
    <img src={url} alt="" className={`object-cover ${className ?? ""}`} loading="lazy" />
  ) : (
    <div className={`bg-muted animate-pulse ${className ?? ""}`} />
  );
}