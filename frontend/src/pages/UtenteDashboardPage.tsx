import { useMemo } from "react";
import { Droplet, TrendingUp, Bell, MessageSquare, Loader2 } from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from "recharts";
import { toast } from "sonner";
import { StatCard } from "@/components/StatCard";
import { AiInsightsPanel } from "@/components/AiInsightsPanel";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/context/AuthContext";
import { useMeasurements, useSimulateEsp32 } from "@/hooks/useMeasurements";
import { extractErrorMessage } from "@/services/api";

export function UtenteDashboardPage() {
  const { user } = useAuth();
  const patientId = user?.profileId ?? undefined;
  const { data: measurements } = useMeasurements(patientId);
  const simulate = useSimulateEsp32(patientId);

  const handleSimulate = async () => {
    try {
      const result = await simulate.mutateAsync();
      const statusLabel =
        result.alertStatus === "None" ? "dentro do intervalo alvo" : "fora do intervalo alvo (alerta gerado)";
      toast.success(`Nova medição simulada: ${result.valueMgDl} mg/dL — ${statusLabel}.`);
    } catch (error) {
      toast.error(extractErrorMessage(error, "Não foi possível gerar a medição simulada."));
    }
  };

  const sorted = useMemo(
    () => (measurements ?? []).slice().sort((a, b) => new Date(a.measuredAt).getTime() - new Date(b.measuredAt).getTime()),
    [measurements]
  );

  const chartData = useMemo(() => {
    const recent = sorted.slice(-14);
    // If every point falls on the same calendar day (e.g. a patient with only a
    // handful of measurements so far), a date-only label repeats identically for
    // every tick and reads as a bug. Fall back to time-of-day in that case.
    const distinctDays = new Set(recent.map((m) => new Date(m.measuredAt).toDateString()));
    const sameDay = distinctDays.size <= 1 && recent.length > 1;
    return recent.map((m) => ({
      name: sameDay
        ? new Date(m.measuredAt).toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" })
        : new Date(m.measuredAt).toLocaleDateString("pt-PT", { day: "2-digit", month: "2-digit" }),
      valor: m.valueMgDl,
    }));
  }, [sorted]);

  const lastMeasurement = sorted[sorted.length - 1];
  const weeklyAverage = useMemo(() => {
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const lastWeek = sorted.filter((m) => new Date(m.measuredAt).getTime() >= weekAgo);
    if (lastWeek.length === 0) return null;
    return Math.round(lastWeek.reduce((sum, m) => sum + m.valueMgDl, 0) / lastWeek.length);
  }, [sorted]);
  const alertCount = useMemo(
    () => sorted.filter((m) => m.alertStatus === "UnderObservation").length,
    [sorted]
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">O meu Painel</h1>
          <p className="text-sm text-muted-foreground">Acompanhe a sua glicemia e recomendações.</p>
        </div>
        <Button onClick={handleSimulate} disabled={simulate.isPending || !patientId}>
          {simulate.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {simulate.isPending ? "A gerar medição..." : "Gerar Medição Automática (Simulação ESP32)"}
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Última Medição"
          value={lastMeasurement ? `${lastMeasurement.valueMgDl} mg/dL` : "-"}
          icon={<Droplet className="h-4 w-4" />}
          hint={lastMeasurement ? new Date(lastMeasurement.measuredAt).toLocaleString("pt-PT") : undefined}
        />
        <StatCard
          title="Média Semanal"
          value={weeklyAverage !== null ? `${weeklyAverage} mg/dL` : "-"}
          icon={<TrendingUp className="h-4 w-4" />}
        />
        <StatCard title="Alertas" value={alertCount} icon={<Bell className="h-4 w-4" />} />
        <StatCard title="Mensagens" value={0} icon={<MessageSquare className="h-4 w-4" />} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Evolução da glicemia</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            {chartData.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sem dados suficientes para gráfico.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorValor" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--chart-1)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="var(--chart-1)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="name" stroke="var(--muted-foreground)" fontSize={12} />
                  <YAxis stroke="var(--muted-foreground)" fontSize={12} />
                  <RechartsTooltip
                    contentStyle={{
                      backgroundColor: "var(--popover)",
                      border: "1px solid var(--border)",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                  <Area type="monotone" dataKey="valor" stroke="var(--chart-1)" fill="url(#colorValor)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <AiInsightsPanel patientId={patientId} />
      </div>
    </div>
  );
}
