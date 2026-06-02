import { createContext, useContext, useState, ReactNode, useEffect } from "react";
import { useAuth } from "./auth";

type LockCtx = {
  unlocked: boolean;
  unlock: () => void;
  lock: () => void;
};

const Ctx = createContext<LockCtx>({ unlocked: false, unlock: () => {}, lock: () => {} });

const KEY = "cml:unlocked-for";

export function LockProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [unlocked, setUnlocked] = useState(false);

  // Restore unlocked state for this user from sessionStorage (survives remounts
  // caused by auth token refresh, tab switching, etc.)
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!user?.id) {
      setUnlocked(false);
      return;
    }
    const stored = sessionStorage.getItem(KEY);
    setUnlocked(stored === user.id);
  }, [user?.id]);

  const unlock = () => {
    if (typeof window !== "undefined" && user?.id) {
      sessionStorage.setItem(KEY, user.id);
    }
    setUnlocked(true);
  };
  const lock = () => {
    if (typeof window !== "undefined") sessionStorage.removeItem(KEY);
    setUnlocked(false);
  };

  return <Ctx.Provider value={{ unlocked, unlock, lock }}>{children}</Ctx.Provider>;
}

export const useLock = () => useContext(Ctx);