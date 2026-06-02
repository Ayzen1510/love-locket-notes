import { Link, useLocation } from "@tanstack/react-router";
import { Heart, Home, User, Plus, MessageCircle } from "lucide-react";

export function BottomNav() {
  const { pathname } = useLocation();
  const Item = ({ to, icon: Icon, label }: { to: string; icon: typeof Home; label: string }) => {
    const active = pathname === to;
    return (
      <Link to={to} className="flex flex-col items-center gap-1 flex-1 py-2">
        <Icon className={`w-5 h-5 ${active ? "text-primary" : "text-muted-foreground"}`} fill={active && label === "Favorites" ? "currentColor" : "none"} />
        <span className={`text-[10px] ${active ? "text-primary font-medium" : "text-muted-foreground"}`}>{label}</span>
      </Link>
    );
  };
  return (
    <nav className="fixed bottom-0 inset-x-0 z-30 pb-[env(safe-area-inset-bottom)]">
      <div className="mx-3 mb-3 glass-strong rounded-2xl flex items-center px-2 relative">
        <Item to="/" icon={Home} label="Home" />
        <Item to="/favorites" icon={Heart} label="Favorites" />
        <Link
          to="/memory/new"
          aria-label="Add memory"
          className="-mt-7 w-14 h-14 rounded-full romance-gradient flex items-center justify-center shadow-[var(--shadow-romance)] hover:scale-105 active:scale-95 transition-transform"
        >
          <Plus className="w-7 h-7 text-white" />
        </Link>
        <Item to="/chat" icon={MessageCircle} label="Chat" />
        <Item to="/profile" icon={User} label="You" />
      </div>
    </nav>
  );
}