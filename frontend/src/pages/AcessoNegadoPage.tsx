import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { homeForRole } from "@/utils/roleHome";

export function AcessoNegadoPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  function handleVoltar() {
    navigate(user ? homeForRole(user.role) : "/login", { replace: true });
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-muted/40 px-4 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-status-critical-bg text-status-critical">
        <ShieldAlert className="h-7 w-7" />
      </div>
      <h1 className="text-xl font-semibold">Acesso negado</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        Não tem permissões para aceder a esta área da aplicação. Contacte o administrador caso considere
        que isto é um erro.
      </p>
      <Button onClick={handleVoltar}>Voltar</Button>
    </div>
  );
}
