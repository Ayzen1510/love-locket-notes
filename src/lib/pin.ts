// Hash a PIN with the user id as salt using SHA-256
export async function hashPin(pin: string, userId: string): Promise<string> {
  const data = new TextEncoder().encode(`${userId}:${pin}`);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}