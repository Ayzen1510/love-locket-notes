import { createContext, useContext, useState, ReactNode, useEffect } from "react";
import { useAuth } from "./auth";

type LockCtx = {
  unlocked: boolean;
  unlock: () => void;
  lock: () => void;
};

const Ctx = createContext<LockCtx>({ unlocked: false, unlock: () => {}, lock: () => {} });

export function LockProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [unlocked, setUnlocked] = useState(false);

  // Re-lock whenever the user changes (new login, logout)
  useEffect(() => {
    setUnlocked(false);
  }, [user?.id]);

  return (
    <Ctx.Provider value={{ unlocked, unlock: () => setUnlocked(true), lock: () => setUnlocked(false) }}>
      {children}
    </Ctx.Provider>
  );
}

export const useLock = () => useContext(Ctx);