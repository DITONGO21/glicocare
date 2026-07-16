import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import type { RoleName } from "@/types/api";

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles?: RoleName[];
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();

  // On a hard refresh, AuthContext starts as isLoading=true while it restores the Supabase
  // session in the background. Redirecting to /login before that finishes would bounce an
  // already-authenticated user out — wait for it to settle first.
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        A carregar...
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/acesso-negado" replace />;
  }

  return <>{children}</>;
}
