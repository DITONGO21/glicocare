import { Users, AlertTriangle, Activity, MessageSquare } from "lucide-react";
import { StatCard } from "@/components/StatCard";
import { StatusBadge, glucoseStatus } from "@/components/StatusBadge";
import { LoadingSkeleton, CardGridSkeleton } from "@/components/LoadingSkeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { usePatients } from "@/hooks/usePatients";
import { useDoctorRecentMeasurements } from "@/hooks/useMeasurements";
import { useConversations } from "@/hooks/useMessages";

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("pt-PT");
}

export function MedicoDashboardPage() {
  const { data: patients, isLoading, isError } = usePatients();
  const { data: measurements, isLoading: measurementsLoading } = useDoctorRecentMeasurements();
  const { data: conversations, isLoading: conversationsLoading } = useConversations();

  const activeAlertsCount = (measurements ?? []).filter((m) => m.alertStatus === "UnderObservation").length;
  const averageGlucose =
    (measurements ?? []).length > 0
      ? Math.round((measurements ?? []).reduce((sum, m) => sum + m.valueMgDl, 0) / (measurements ?? []).length)
      : null;
  const unreadMessagesCount = (conversations ?? []).reduce((sum, c) => sum + c.unreadCount, 0);

  const statsLoading = isLoading || measurementsLoading || conversationsLoading;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Painel do Médico</h1>
        <p className="text-sm text-muted-foreground">Resumo dos seus utentes e atividade recente.</p>
      </div>

      {statsLoading ? (
        <CardGridSkeleton count={4} />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard title="Utentes" value={patients?.length ?? 0} icon={<Users className="h-4 w-4" />} />
          <StatCard
            title="Alertas Importantes"
            value={activeAlertsCount}
            icon={<AlertTriangle className="h-4 w-4" />}
          />
          <StatCard
            title="Glicemia Média"
            value={averageGlucose !== null ? `${averageGlucose} mg/dL` : "—"}
            icon={<Activity className="h-4 w-4" />}
          />
          <StatCard title="Mensagens por ler" value={unreadMessagesCount} icon={<MessageSquare className="h-4 w-4" />} />
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Utentes associados</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading && <LoadingSkeleton rows={4} />}
          {isError && (
            <p className="text-sm text-status-critical">Não foi possível carregar a lista de utentes.</p>
          )}
          {!isLoading && !isError && (patients?.length ?? 0) === 0 && (
            <p className="text-sm text-muted-foreground">Ainda não tem utentes associados.</p>
          )}
          {!isLoading && !isError && patients && patients.length > 0 && (
            <div className="divide-y divide-border">
              {patients.map((p) => {
                const latest = (measurements ?? []).find((m) => m.patientId === p.id);
                return (
                  <div key={p.id} className="flex items-center justify-between py-3">
                    <div>
                      <p className="text-sm font-medium">{p.fullName}</p>
                      <p className="text-xs text-muted-foreground">
                        {p.diabetesType ?? "Tipo não especificado"} · Nasc. {formatDate(p.dateOfBirth)}
                      </p>
                    </div>
                    {latest ? (
                      <StatusBadge status={glucoseStatus(latest.valueMgDl)} />
                    ) : (
                      <span className="text-xs text-muted-foreground">Sem medições</span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
