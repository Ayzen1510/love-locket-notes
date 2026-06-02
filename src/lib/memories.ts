import { supabase } from "@/integrations/supabase/client";

export type Memory = {
  id: string;
  user_id: string;
  title: string;
  note: string;
  memory_date: string;
  mood: string | null;
  tags: string[];
  is_favorite: boolean;
  created_at: string;
  updated_at: string;
};

export type MemoryImage = {
  id: string;
  memory_id: string;
  user_id: string;
  storage_path: string;
  position: number;
};

export async function signedUrl(path: string): Promise<string | null> {
  const { data } = await supabase.storage.from("memory-images").createSignedUrl(path, 60 * 60);
  return data?.signedUrl ?? null;
}

export async function uploadImages(userId: string, memoryId: string, files: File[]) {
  const rows: { memory_id: string; user_id: string; storage_path: string; position: number }[] = [];
  let i = 0;
  for (const file of files) {
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${userId}/${memoryId}/${Date.now()}-${i}.${ext}`;
    const { error } = await supabase.storage.from("memory-images").upload(path, file, {
      contentType: file.type,
      upsert: false,
    });
    if (error) throw error;
    rows.push({ memory_id: memoryId, user_id: userId, storage_path: path, position: i });
    i++;
  }
  if (rows.length) {
    const { error } = await supabase.from("memory_images").insert(rows);
    if (error) throw error;
  }
}

export const TAG_OPTIONS = ["Love", "Travel", "Birthday", "First Meet", "Special Day", "Anniversary", "Date Night", "Adventure"];
export const MOOD_OPTIONS = ["❤️", "😊", "🥰", "🌙", "✨", "💐", "🍷", "🎂"];

// Mood values can be:
//  - a plain emoji string like "❤️"
//  - or a sticker reference "sticker:<storage_path>"
export function isStickerMood(mood: string | null | undefined): mood is string {
  return !!mood && mood.startsWith("sticker:");
}
export function stickerPath(mood: string): string {
  return mood.replace(/^sticker:/, "");
}

export async function uploadMoodSticker(userId: string, file: File): Promise<string> {
  const ext = file.name.split(".").pop() || "png";
  const path = `${userId}/_mood/${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from("memory-images").upload(path, file, {
    contentType: file.type,
    upsert: false,
  });
  if (error) throw error;
  return `sticker:${path}`;
}

export const LOVE_QUOTES = [
  "In all the world, there is no heart for me like yours.",
  "I love you not only for what you are, but for what I am when I am with you.",
  "Every love story is beautiful, but ours is my favorite.",
  "You are my today and all of my tomorrows.",
  "Whatever our souls are made of, his and mine are the same.",
  "I have found the one whom my soul loves.",
  "You're the closest to heaven that I'll ever be.",
];