import { useState } from "react";
import { Play } from "lucide-react";
import { isVideoPath } from "@/lib/memories";
import type { SlideItem } from "@/components/Slideshow";
import { PhotoViewer, type ViewerItem } from "@/components/PhotoViewer";

export function Gallery({ items, meta }: { items: SlideItem[]; meta?: { caption?: string | null; date?: string | null } }) {
  const [openIdx, setOpenIdx] = useState<number | null>(null);

  if (!items.length) return null;

  const viewerItems: ViewerItem[] = items.map((it) => ({
    id: it.id, path: it.path, url: it.url,
    caption: meta?.caption ?? null, date: meta?.date ?? null,
  }));

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

      {openIdx != null && (
        <PhotoViewer items={viewerItems} index={openIdx} onClose={() => setOpenIdx(null)} />
      )}
    </>
  );
}