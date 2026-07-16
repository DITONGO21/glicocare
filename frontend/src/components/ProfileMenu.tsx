import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "next-themes";
import { Moon, Sun, UserRound, LogOut } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { EditProfileDialog } from "@/components/EditProfileDialog";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export function ProfileMenu({ user }: { user: { fullName: string; role: string } }) {
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const { logout } = useAuth();
  const navigate = useNavigate();
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const handleLogout = async () => {
    setOpen(false);
    await logout();
    navigate("/login");
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        className="flex items-center gap-2 rounded-lg px-1 py-1 hover:bg-muted"
        onClick={() => setOpen((prev) => !prev)}
        aria-label="Menu de perfil"
      >
        <Avatar className="h-8 w-8">
          <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
            {initials(user.fullName)}
          </AvatarFallback>
        </Avatar>
        <div className="hidden text-sm sm:block">
          <p className="font-medium leading-none">{user.fullName}</p>
          <p className="text-xs text-muted-foreground">{user.role}</p>
        </div>
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-56 rounded-lg border border-border bg-popover py-1 text-popover-foreground shadow-md">
          <button
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted"
            onClick={() => {
              setOpen(false);
              setEditOpen(true);
            }}
          >
            <UserRound className="h-4 w-4" />
            Editar perfil
          </button>
          <button
            className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-muted"
            onClick={() => setTheme(isDark ? "light" : "dark")}
          >
            <span className="flex items-center gap-2">
              {isDark ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
              Modo escuro
            </span>
            <span
              className={cn(
                "relative h-5 w-9 rounded-full transition-colors",
                isDark ? "bg-primary" : "bg-muted-foreground/30"
              )}
            >
              <span
                className={cn(
                  "absolute top-0.5 h-4 w-4 rounded-full bg-background shadow transition-transform",
                  isDark ? "translate-x-4.5 left-0.5" : "translate-x-0 left-0.5"
                )}
              />
            </span>
          </button>
          <div className="my-1 border-t border-border" />
          <button
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-destructive hover:bg-muted"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4" />
            Sair
          </button>
        </div>
      )}

      <EditProfileDialog open={editOpen} onOpenChange={setEditOpen} />
    </div>
  );
}
