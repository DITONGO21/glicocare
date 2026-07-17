import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useNavigate } from "react-router-dom";
import { Activity, Fingerprint } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/services/supabaseClient";
import { isWebAuthnSupported, loginWithWebAuthn } from "@/services/webauthnService";

const loginSchema = z.object({
  email: z.string().min(1, "O email é obrigatório").email("Introduza um email válido"),
  password: z.string().min(1, "A palavra-passe é obrigatória"),
});

const passwordChangeSchema = z
  .object({
    newPassword: z.string().min(8, "A palavra-passe deve ter pelo menos 8 caracteres"),
    confirmPassword: z.string().min(1, "Confirme a palavra-passe"),
  })
  .refine((values) => values.newPassword === values.confirmPassword, {
    message: "As palavras-passe não coincidem",
    path: ["confirmPassword"],
  });

type LoginFormValues = z.infer<typeof loginSchema>;
type PasswordChangeFormValues = z.infer<typeof passwordChangeSchema>;

export function LoginPage() {
  const { login, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isBiometricBusy, setIsBiometricBusy] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [webauthnSupported, setWebauthnSupported] = useState(false);
  const [forcePasswordChange, setForcePasswordChange] = useState(false);
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);

  useEffect(() => {
    setWebauthnSupported(isWebAuthnSupported());
  }, []);

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  const {
    register: registerPasswordChange,
    handleSubmit: handlePasswordChangeSubmit,
    formState: { errors: passwordChangeErrors },
  } = useForm<PasswordChangeFormValues>({
    resolver: zodResolver(passwordChangeSchema),
  });

  const onSubmit = async (values: LoginFormValues) => {
    setServerError(null);
    setIsSubmitting(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: values.email,
        password: values.password,
      });
      if (error) throw error;

      const requiresPasswordChange = Boolean(data.user?.user_metadata?.must_change_password);
      if (requiresPasswordChange) {
        setPendingEmail(values.email);
        setForcePasswordChange(true);
        return;
      }

      await login(values.email, values.password);
      // RootRedirect (rendered at "/") reads the freshly-set user from AuthContext
      // and sends them to the right dashboard for their role.
      navigate("/", { replace: true });
    } catch (error) {
      setServerError(error instanceof Error ? error.message : "Não foi possível iniciar sessão.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePasswordChange = async (values: PasswordChangeFormValues) => {
    if (!pendingEmail) {
      setServerError("Não foi possível identificar a conta para atualizar a palavra-passe.");
      return;
    }

    setServerError(null);
    setIsChangingPassword(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: values.newPassword,
        data: { must_change_password: false },
      });
      if (updateError) throw updateError;

      await login(pendingEmail, values.newPassword);
      navigate("/", { replace: true });
    } catch (error) {
      setServerError(error instanceof Error ? error.message : "Não foi possível atualizar a palavra-passe.");
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleBiometricLogin = async () => {
    const email = getValues("email");
    if (!email) {
      setServerError("Introduza o seu email para entrar com biometria.");
      return;
    }
    setServerError(null);
    setIsBiometricBusy(true);
    try {
      await loginWithWebAuthn(email);
      await refreshUser();
      navigate("/", { replace: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível entrar com biometria.");
    } finally {
      setIsBiometricBusy(false);
    }
  };
  
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 px-4">
      <Card className="w-full max-w-sm shadow-sm">
        <CardHeader className="items-center text-center">
          <div className="mb-2 flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Activity className="h-6 w-6" />
          </div>
          <CardTitle className="text-xl">GlicoCare</CardTitle>
          <CardDescription>Sistema de Monitorização de Glicemia</CardDescription>
        </CardHeader>
        <CardContent>
          {forcePasswordChange ? (
            <form className="space-y-4" onSubmit={handlePasswordChangeSubmit(handlePasswordChange)} noValidate>
              <div className="space-y-2 rounded-md border border-border/70 bg-muted/50 p-3 text-sm text-muted-foreground">
                <p className="font-medium text-foreground">Atualize a sua palavra-passe</p>
                <p>Esta é a primeira vez que entra na conta. Defina uma nova palavra-passe para continuar.</p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="newPassword">Nova palavra-passe</Label>
                <Input
                  id="newPassword"
                  type="password"
                  autoComplete="new-password"
                  placeholder="••••••••"
                  {...registerPasswordChange("newPassword")}
                />
                {passwordChangeErrors.newPassword && (
                  <p className="text-xs text-destructive">{passwordChangeErrors.newPassword.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="confirmPassword">Confirmar palavra-passe</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  placeholder="••••••••"
                  {...registerPasswordChange("confirmPassword")}
                />
                {passwordChangeErrors.confirmPassword && (
                  <p className="text-xs text-destructive">{passwordChangeErrors.confirmPassword.message}</p>
                )}
              </div>
              {serverError && (
                <p className="rounded-md bg-status-critical-bg px-3 py-2 text-sm text-status-critical">
                  {serverError}
                </p>
              )}
              <Button type="submit" className="w-full" disabled={isChangingPassword}>
                {isChangingPassword ? "A atualizar..." : "Atualizar palavra-passe"}
              </Button>
            </form>
          ) : (
            <>
              <form className="space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="username"
                    placeholder="nome@exemplo.com"
                    {...register("email")}
                  />
                  {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="password">Palavra-passe</Label>
                  <Input
                    id="password"
                    type="password"
                    autoComplete="current-password"
                    placeholder="••••••••"
                    {...register("password")}
                  />
                  {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
                </div>
                {serverError && (
                  <p className="rounded-md bg-status-critical-bg px-3 py-2 text-sm text-status-critical">
                    {serverError}
                  </p>
                )}
                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? "A entrar..." : "Entrar"}
                </Button>
              </form>
              {webauthnSupported && (
                <>
                  <div className="my-4 flex items-center gap-2 text-xs text-muted-foreground">
                    <div className="h-px flex-1 bg-border" />
                    ou
                    <div className="h-px flex-1 bg-border" />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    disabled={isBiometricBusy}
                    onClick={handleBiometricLogin}
                  >
                    <Fingerprint className="h-4 w-4" />
                    {isBiometricBusy ? "A verificar..." : "Entrar com biometria"}
                  </Button>
                </>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
