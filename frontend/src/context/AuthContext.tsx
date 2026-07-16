import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { supabase, extractSupabaseErrorMessage } from "@/services/supabaseClient";
import { fetchOwnProfile } from "@/services/authService";
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
}

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
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
          setUser({
            id: profile.userId,
            profileId: profile.profileId,
            fullName: profile.fullName,
            email: profile.email,
            role: profile.role,
          });
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
          setUser({
            id: profile.userId,
            profileId: profile.profileId,
            fullName: profile.fullName,
            email: profile.email,
            role: profile.role,
          });
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
      setUser({
        id: profile.userId,
        profileId: profile.profileId,
        fullName: profile.fullName,
        email: profile.email,
        role: profile.role,
      });
    } catch (error) {
      throw new Error(extractSupabaseErrorMessage(error, "Credenciais inválidas."));
    } finally {
      setIsLoading(false);
    }
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
    }),
    [user, token, isLoading, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth deve ser usado dentro de um AuthProvider");
  return ctx;
}
