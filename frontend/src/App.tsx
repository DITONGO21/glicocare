import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppLayout } from "@/layouts/AppLayout";
import { LoginPage } from "@/pages/LoginPage";
import { AdminDashboardPage } from "@/pages/AdminDashboardPage";
import { MedicoDashboardPage } from "@/pages/MedicoDashboardPage";
import { UtenteDashboardPage } from "@/pages/UtenteDashboardPage";
import { AcessoNegadoPage } from "@/pages/AcessoNegadoPage";
import { AdminMedicosPage } from "@/pages/AdminMedicosPage";
import { AdminUtentesPage } from "@/pages/AdminUtentesPage";
import { AdminAssociacoesPage } from "@/pages/AdminAssociacoesPage";
import { MedicoUtentesListPage } from "@/pages/MedicoUtentesListPage";
import { MedicoUtentePerfilPage } from "@/pages/MedicoUtentePerfilPage";
import { MensagensPage } from "@/pages/MensagensPage";
import { UtenteRegistosPage } from "@/pages/UtenteRegistosPage";
import { UtenteHistoricoPage } from "@/pages/UtenteHistoricoPage";
import { homeForRole } from "@/utils/roleHome";

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
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={homeForRole(user.role)} replace />;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <BrowserRouter>
          <AuthProvider>
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
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;
