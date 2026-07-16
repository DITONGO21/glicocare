import { lazy, Suspense } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppLayout } from "@/layouts/AppLayout";
import { LoginPage } from "@/pages/LoginPage";
import { AcessoNegadoPage } from "@/pages/AcessoNegadoPage";
import { homeForRole } from "@/utils/roleHome";

const AdminDashboardPage = lazy(() => import("@/pages/AdminDashboardPage").then((m) => ({ default: m.AdminDashboardPage })));
const AdminMedicosPage = lazy(() => import("@/pages/AdminMedicosPage").then((m) => ({ default: m.AdminMedicosPage })));
const AdminUtentesPage = lazy(() => import("@/pages/AdminUtentesPage").then((m) => ({ default: m.AdminUtentesPage })));
const AdminAssociacoesPage = lazy(() => import("@/pages/AdminAssociacoesPage").then((m) => ({ default: m.AdminAssociacoesPage })));

const MedicoDashboardPage = lazy(() => import("@/pages/MedicoDashboardPage").then((m) => ({ default: m.MedicoDashboardPage })));
const MedicoUtentesListPage = lazy(() => import("@/pages/MedicoUtentesListPage").then((m) => ({ default: m.MedicoUtentesListPage })));
const MedicoUtentePerfilPage = lazy(() => import("@/pages/MedicoUtentePerfilPage").then((m) => ({ default: m.MedicoUtentePerfilPage })));

const UtenteDashboardPage = lazy(() => import("@/pages/UtenteDashboardPage").then((m) => ({ default: m.UtenteDashboardPage })));
const UtenteRegistosPage = lazy(() => import("@/pages/UtenteRegistosPage").then((m) => ({ default: m.UtenteRegistosPage })));
const UtenteHistoricoPage = lazy(() => import("@/pages/UtenteHistoricoPage").then((m) => ({ default: m.UtenteHistoricoPage })));
const UtenteCalendarioPage = lazy(() => import("@/pages/UtenteCalendarioPage").then((m) => ({ default: m.UtenteCalendarioPage })));
const UtenteDiarioPage = lazy(() => import("@/pages/UtenteDiarioPage").then((m) => ({ default: m.UtenteDiarioPage })));

const MensagensPage = lazy(() => import("@/pages/MensagensPage").then((m) => ({ default: m.MensagensPage })));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function RootRedirect() {
  const { user, isLoading } = useAuth();
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        A carregar...
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={homeForRole(user.role)} replace />;
}

function PageFallback() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center text-sm text-muted-foreground">
      A carregar...
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <BrowserRouter>
          <AuthProvider>
            <Suspense fallback={<PageFallback />}>
              <Routes>
                <Route path="/" element={<RootRedirect />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/acesso-negado" element={<AcessoNegadoPage />} />

                <Route
                  path="/admin"
                  element={
                    <ProtectedRoute allowedRoles={["Admin"]}>
                      <AppLayout>
                        <AdminDashboardPage />
                      </AppLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/medicos"
                  element={
                    <ProtectedRoute allowedRoles={["Admin"]}>
                      <AppLayout>
                        <AdminMedicosPage />
                      </AppLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/utentes"
                  element={
                    <ProtectedRoute allowedRoles={["Admin"]}>
                      <AppLayout>
                        <AdminUtentesPage />
                      </AppLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/associacoes"
                  element={
                    <ProtectedRoute allowedRoles={["Admin"]}>
                      <AppLayout>
                        <AdminAssociacoesPage />
                      </AppLayout>
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/medico"
                  element={
                    <ProtectedRoute allowedRoles={["Doctor"]}>
                      <AppLayout>
                        <MedicoDashboardPage />
                      </AppLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/medico/utentes"
                  element={
                    <ProtectedRoute allowedRoles={["Doctor"]}>
                      <AppLayout>
                        <MedicoUtentesListPage />
                      </AppLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/medico/utentes/:id"
                  element={
                    <ProtectedRoute allowedRoles={["Doctor"]}>
                      <AppLayout>
                        <MedicoUtentePerfilPage />
                      </AppLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/medico/mensagens"
                  element={
                    <ProtectedRoute allowedRoles={["Doctor"]}>
                      <AppLayout>
                        <MensagensPage />
                      </AppLayout>
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/utente"
                  element={
                    <ProtectedRoute allowedRoles={["Patient"]}>
                      <AppLayout>
                        <UtenteDashboardPage />
                      </AppLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/utente/registos"
                  element={
                    <ProtectedRoute allowedRoles={["Patient"]}>
                      <AppLayout>
                        <UtenteRegistosPage />
                      </AppLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/utente/historico"
                  element={
                    <ProtectedRoute allowedRoles={["Patient"]}>
                      <AppLayout>
                        <UtenteHistoricoPage />
                      </AppLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/utente/calendario"
                  element={
                    <ProtectedRoute allowedRoles={["Patient"]}>
                      <AppLayout>
                        <UtenteCalendarioPage />
                      </AppLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/utente/diario"
                  element={
                    <ProtectedRoute allowedRoles={["Patient"]}>
                      <AppLayout>
                        <UtenteDiarioPage />
                      </AppLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/utente/mensagens"
                  element={
                    <ProtectedRoute allowedRoles={["Patient"]}>
                      <AppLayout>
                        <MensagensPage />
                      </AppLayout>
                    </ProtectedRoute>
                  }
                />

                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;
