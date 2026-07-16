import { useEffect, useRef, useState } from "react";
import { Bell } from "lucide-react";
import { useMarkAllNotificationsAsRead, useMarkNotificationAsRead, useNotifications } from "@/hooks/useNotifications";
import { cn } from "@/lib/utils";

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return "agora";
  if (minutes < 60) return `há ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `há ${hours}h`;
  const days = Math.floor(hours / 24);
  return `há ${days}d`;
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const { data: notifications, isLoading } = useNotifications();
  const markAsRead = useMarkNotificationAsRead();
  const markAllAsRead = useMarkAllNotificationsAsRead();

  const unreadCount = (notifications ?? []).filter((n) => !n.isRead).length;

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

  return (
    <div ref={containerRef} className="relative">
      <button
        className="relative text-muted-foreground hover:text-foreground"
        aria-label="Notificações"
        onClick={() => setOpen((prev) => !prev)}
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-status-critical px-1 text-[10px] font-medium text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-80 rounded-lg border border-border bg-popover text-popover-foreground shadow-md">
          <div className="flex items-center justify-between border-b border-border px-3 py-2">
            <span className="text-sm font-medium">Notificações</span>
            {unreadCount > 0 && (
              <button
                className="text-xs text-primary hover:underline"
                onClick={() => markAllAsRead.mutate()}
                disabled={markAllAsRead.isPending}
              >
                Marcar todas como lidas
              </button>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {isLoading && <p className="p-3 text-sm text-muted-foreground">A carregar...</p>}
            {!isLoading && (notifications ?? []).length === 0 && (
              <p className="p-3 text-sm text-muted-foreground">Sem notificações.</p>
            )}
            {(notifications ?? []).map((n) => (
              <button
                key={n.id}
                onClick={() => !n.isRead && markAsRead.mutate(n.id)}
                className={cn(
                  "flex w-full flex-col gap-0.5 border-b border-border px-3 py-2 text-left text-sm last:border-0 hover:bg-muted/50",
                  !n.isRead && "bg-primary/5"
                )}
              >
                <span className="flex items-center gap-2 font-medium">
                  {!n.isRead && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />}
                  {n.title}
                </span>
                <span className="text-xs text-muted-foreground">{n.message}</span>
                <span className="text-[10px] text-muted-foreground">{timeAgo(n.createdAt)}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
