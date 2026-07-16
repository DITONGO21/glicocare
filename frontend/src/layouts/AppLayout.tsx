import { useState, type ReactNode } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  Stethoscope,
  Activity,
  MessageSquare,
  Bell,
  LogOut,
  Menu,
  X,
  Link2,
  History,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { RoleName } from "@/types/api";

interface NavItem {
  label: string;
  to: string;
  icon: ReactNode;
}

const NAV_ITEMS: Record<RoleName, NavItem[]> = {
  Admin: [
    { label: "Dashboard", to: "/admin", icon: <LayoutDashboard className="h-4 w-4" /> },
    { label: "Médicos", to: "/admin/medicos", icon: <Stethoscope className="h-4 w-4" /> },
    { label: "Utentes", to: "/admin/utentes", icon: <Users className="h-4 w-4" /> },
    { label: "Associações", to: "/admin/associacoes", icon: <Link2 className="h-4 w-4" /> },
  ],
  Doctor: [
    { label: "Dashboard", to: "/medico", icon: <LayoutDashboard className="h-4 w-4" /> },
    { label: "Utentes", to: "/medico/utentes", icon: <Users className="h-4 w-4" /> },
    { label: "Mensagens", to: "/medico/mensagens", icon: <MessageSquare className="h-4 w-4" /> },
  ],
  Patient: [
    { label: "Dashboard", to: "/utente", icon: <LayoutDashboard className="h-4 w-4" /> },
    { label: "Registos", to: "/utente/registos", icon: <Activity className="h-4 w-4" /> },
    { label: "Histórico", to: "/utente/historico", icon: <History className="h-4 w-4" /> },
    { label: "Mensagens", to: "/utente/mensagens", icon: <MessageSquare className="h-4 w-4" /> },
  ],
};

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export function AppLayout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  if (!user) return null;

  const items = NAV_ITEMS[user.role];

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <div className="flex min-h-screen bg-background">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/30 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-sidebar-border bg-sidebar transition-transform md:static md:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-16 items-center justify-between px-5 border-b border-sidebar-border">
          <span className="text-lg font-semibold text-sidebar-foreground">GlicoCare</span>
          <button
            className="md:hidden text-sidebar-foreground"
            onClick={() => setMobileOpen(false)}
            aria-label="Fechar menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-sidebar-primary text-sidebar-primary-foreground"
                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                )
              }
            >
              {item.icon}
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-sidebar-border p-3">
          <Button variant="ghost" className="w-full justify-start gap-3" onClick={handleLogout}>
            <LogOut className="h-4 w-4" />
            Sair
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex min-h-screen flex-1 flex-col md:pl-0">
        <header className="flex h-16 items-center justify-between border-b border-border bg-card px-4 md:px-8">
          <button
            className="md:hidden"
            onClick={() => setMobileOpen(true)}
            aria-label="Abrir menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="hidden md:block" />
          <div className="flex items-center gap-4">
            <button className="relative text-muted-foreground hover:text-foreground" aria-label="Notificações">
              <Bell className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-2">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                  {initials(user.fullName)}
                </AvatarFallback>
              </Avatar>
              <div className="hidden text-sm sm:block">
                <p className="font-medium leading-none">{user.fullName}</p>
                <p className="text-xs text-muted-foreground">{user.role}</p>
              </div>
            </div>
          </div>
        </header>
        <main className="flex-1 p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}
