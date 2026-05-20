import { ReactNode, useEffect } from "react";
import { useNavigate, useLocation } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { useLock } from "@/lib/lock";
import { LockScreen } from "./LockScreen";
import { Heart } from "lucide-react";

export function AppGate({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const { unlocked } = useLock();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!loading && !user) {
      navigate({ to: "/login", search: { from: location.pathname } as never });
    }
  }, [loading, user, navigate, location.pathname]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Heart className="w-10 h-10 text-primary animate-heart-pop" fill="currentColor" />
      </div>
    );
  }

  if (!unlocked) return <LockScreen />;
  return <>{children}</>;
}