import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { supabase, extractSupabaseErrorMessage } from "@/services/supabaseClient";
import { fetchOwnProfile, type AuthResult } from "@/services/authService";
import type { RoleName } from "@/types/api";

export interface AuthUser {
  id: string;
  // Id of the Doctor/Patient profile linked to this user (null for Admins). This is what
  // must be sent as patientId/doctorId to things like glucose-measurements, medical-notes
  // and associations — it differs from `id` (the auth user's own id).
  profileId: string | null;
  fullName: string;
  email: string;
  role: RoleName;
  avatarUrl: string | null;
}

function toAuthUser(profile: AuthResult): AuthUser {
  return {
    id: profile.userId,
    profileId: profile.profileId,
    fullName: profile.fullName,
    email: profile.email,
    role: profile.role,
    avatarUrl: profile.avatarUrl,
  };
}

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(async ({ data }) => {
      if (!mounted) return;
      if (data.session) {
        setToken(data.session.access_token);
        try {
          const profile = await fetchOwnProfile(data.session.user.id);
          if (!mounted) return;
          setUser(toAuthUser(profile));
        } catch {
          setUser(null);
        }
      }
      if (mounted) setIsLoading(false);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!mounted) return;
      if (session) {
        setToken(session.access_token);
        try {
          const profile = await fetchOwnProfile(session.user.id);
          if (!mounted) return;
          setUser(toAuthUser(profile));
        } catch {
          setUser(null);
        }
      } else {
        setToken(null);
        setUser(null);
      }
    });

    return () => {
      mounted = false;
      subscription.subscription.unsubscribe();
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      if (!data.session || !data.user) throw new Error("Credenciais inválidas.");

      const profile = await fetchOwnProfile(data.user.id);
      setToken(data.session.access_token);
      setUser(toAuthUser(profile));
      // Best-effort audit trail for the Admin logs page; never blocks login on failure.
      import("@/services/activityLogService")
        .then(({ logActivity }) => logActivity(data.user!.id, "Login"))
        .catch(() => {});
    } catch (error) {
      throw new Error(extractSupabaseErrorMessage(error, "Credenciais inválidas."));
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refreshUser = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    if (!data.session) return;
    const profile = await fetchOwnProfile(data.session.user.id);
    setUser(toAuthUser(profile));
  }, []);

  const logout = useCallback(async () => {
    try {
      await supabase.auth.signOut();
    } finally {
      setToken(null);
      setUser(null);
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      isAuthenticated: !!token && !!user,
      isLoading,
      login,
      logout,
      refreshUser,
    }),
    [user, token, isLoading, login, logout, refreshUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth deve ser usado dentro de um AuthProvider");
  return ctx;
}
