import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Users, Stethoscope, Activity, AlertTriangle, FileSpreadsheet } from "lucide-react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from "recharts";
import { StatCard } from "@/components/StatCard";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useDoctors } from "@/hooks/useDoctors";
import { usePatients } from "@/hooks/usePatients";
import { useAssociations } from "@/hooks/useAssociations";
import { fetchDoctorRegistrations, fetchPatientRegistrations } from "@/services/adminStatsService";

// Illustrative only: the Admin role has no legitimate access to clinical data (glucose
// measurements, alerts) by design — see database/supabase/002_rls_policies.sql, which
// deliberately excludes Admin from glucose_measurements. A real per-week trend for this
// card would need a dedicated, privacy-safe aggregate endpoint, which is out of scope here.
const mockTrend = [
  { name: "Seg", medicoes: 120 },
  { name: "Ter", medicoes: 145 },
  { name: "Qua", medicoes: 132 },
  { name: "Qui", medicoes: 160 },
  { name: "Sex", medicoes: 151 },
  { name: "Sáb", medicoes: 98 },
  { name: "Dom", medicoes: 87 },
];

function dayKey(iso: string) {
  return iso.slice(0, 10);
}

function last30DaysSeries(doctorRows: { createdAt: string }[], patientRows: { createdAt: string }[]) {
  const days: string[] = [];
  const now = new Date();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().slice(0, 10));
  }
  const doctorsByDay = new Map<string, number>();
  doctorRows.forEach((r) => doctorsByDay.set(dayKey(r.createdAt), (doctorsByDay.get(dayKey(r.createdAt)) ?? 0) + 1));
  const patientsByDay = new Map<string, number>();
  patientRows.forEach((r) => patientsByDay.set(dayKey(r.createdAt), (patientsByDay.get(dayKey(r.createdAt)) ?? 0) + 1));

  return days.map((day) => ({
    day: day.slice(5),
    médicos: doctorsByDay.get(day) ?? 0,
    utentes: patientsByDay.get(day) ?? 0,
  }));
}

export function AdminDashboardPage() {
  const { data: doctors, isLoading: doctorsLoading, isError: doctorsError } = useDoctors();
  const { data: patients, isLoading: patientsLoading, isError: patientsError } = usePatients();
  const { data: associations, isLoading: associationsLoading } = useAssociations();

  const { data: doctorRegistrations } = useQuery({
    queryKey: ["adminStats", "doctorRegistrations"],
    queryFn: fetchDoctorRegistrations,
  });
  const { data: patientRegistrations } = useQuery({
    queryKey: ["adminStats", "patientRegistrations"],
    queryFn: fetchPatientRegistrations,
  });

  const platformOk = !doctorsError && !patientsError;

  const registrationSeries = useMemo(
    () => last30DaysSeries(doctorRegistrations ?? [], patientRegistrations ?? []),
    [doctorRegistrations, patientRegistrations]
  );

  const inactiveAccountsCount =
    (doctors ?? []).filter((d) => d.isActive === false).length +
    (patients ?? []).filter((p) => p.isActive === false).length;

  const specialtyDistribution = useMemo(() => {
    const counts = new Map<string, number>();
    (doctors ?? []).forEach((d) => counts.set(d.specialty, (counts.get(d.specialty) ?? 0) + 1));
    return Array.from(counts.entries()).map(([specialty, count]) => ({ specialty, count }));
  }, [doctors]);

  const handleExportExcel = async () => {
    const XLSX = await import("xlsx");
    const workbook = XLSX.utils.book_new();

    const doctorRows = (doctors ?? []).map((d) => ({
      Nome: d.fullName,
      Email: d.email,
      Especialidade: d.specialty,
      "Nº de Cédula": d.licenseNumber,
      Estado: d.isActive === false ? "Inativo" : "Ativo",
    }));
    const doctorSheet = XLSX.utils.json_to_sheet(doctorRows);
    XLSX.utils.book_append_sheet(workbook, doctorSheet, "Médicos");

    const patientRows = (patients ?? []).map((p) => ({
      Nome: p.fullName,
      Email: p.email,
      "Tipo de Diabetes": p.diabetesType ?? "-",
      Estado: p.isActive === false ? "Inativo" : "Ativo",
    }));
    const patientSheet = XLSX.utils.json_to_sheet(patientRows);
    XLSX.utils.book_append_sheet(workbook, patientSheet, "Utentes");

    XLSX.writeFile(workbook, "glicocare-medicos-utentes.xlsx");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Painel de Administração</h1>
          <p className="text-sm text-muted-foreground">Visão geral da plataforma GlicoCare.</p>
        </div>
        <Button variant="outline" size="sm" className="gap-2" onClick={handleExportExcel}>
          <FileSpreadsheet className="h-4 w-4" aria-hidden="true" />
          Exportar Médicos e Utentes (Excel)
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total de Médicos"
          value={doctorsLoading ? "..." : (doctors ?? []).length}
          icon={<Stethoscope className="h-4 w-4" />}
        />
        <StatCard
          title="Total de Utentes"
          value={patientsLoading ? "..." : (patients ?? []).length}
          icon={<Users className="h-4 w-4" />}
        />
        <StatCard
          title="Medições Registadas"
          value="—"
          icon={<Activity className="h-4 w-4" />}
          hint="Dados clínicos não visíveis ao Admin (por desenho, ver RLS)"
        />
        <StatCard
          title="Alertas Ativos"
          value="—"
          icon={<AlertTriangle className="h-4 w-4" />}
          hint="Dados clínicos não visíveis ao Admin (por desenho, ver RLS)"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          title="Associações Ativas"
          value={associationsLoading ? "..." : (associations ?? []).length}
          icon={<Activity className="h-4 w-4" />}
        />
        <StatCard
          title="Contas Inativas"
          value={doctorsLoading || patientsLoading ? "..." : inactiveAccountsCount}
          icon={<AlertTriangle className="h-4 w-4" />}
        />
        <StatCard
          title="Especialidades Distintas"
          value={doctorsLoading ? "..." : specialtyDistribution.length}
          icon={<Stethoscope className="h-4 w-4" />}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Novos registos (últimos 30 dias)</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={registrationSeries}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="day" stroke="var(--muted-foreground)" fontSize={11} interval={4} />
                <YAxis stroke="var(--muted-foreground)" fontSize={12} allowDecimals={false} />
                <RechartsTooltip
                  contentStyle={{
                    backgroundColor: "var(--popover)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Line type="monotone" dataKey="médicos" stroke="var(--chart-2)" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="utentes" stroke="var(--chart-1)" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Médicos por Especialidade</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            {specialtyDistribution.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sem médicos registados.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={specialtyDistribution}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="specialty" stroke="var(--muted-foreground)" fontSize={11} />
                  <YAxis stroke="var(--muted-foreground)" fontSize={12} allowDecimals={false} />
                  <RechartsTooltip
                    contentStyle={{
                      backgroundColor: "var(--popover)",
                      border: "1px solid var(--border)",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                  <Bar dataKey="count" fill="var(--chart-3)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Medições da última semana</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <p className="mb-2 text-xs text-muted-foreground">
              Exemplo ilustrativo — o Admin não acede a dados clínicos reais.
            </p>
            <ResponsiveContainer width="100%" height="90%">
              <LineChart data={mockTrend}>
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
                <Line type="monotone" dataKey="medicoes" stroke="var(--chart-1)" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Médicos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {doctorsLoading && <p className="text-sm text-muted-foreground">A carregar...</p>}
            {(doctors ?? []).slice(0, 5).map((d) => (
              <div key={d.id} className="flex items-center justify-between text-sm">
                <div>
                  <p className="font-medium">{d.fullName}</p>
                  <p className="text-xs text-muted-foreground">{d.specialty}</p>
                </div>
                <StatusBadge
                  status={d.isActive === false ? "critical" : "normal"}
                  label={d.isActive === false ? "Inativo" : "Ativo"}
                />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Estado da plataforma</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex flex-wrap items-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Ligação Supabase (Auth + Base de Dados):</span>
              {doctorsLoading || patientsLoading ? (
                <StatusBadge status="warning" label="A verificar..." />
              ) : platformOk ? (
                <StatusBadge status="normal" label="Operacional" />
              ) : (
                <StatusBadge status="critical" label="Falha na ligação" />
              )}
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Este estado reflete se os pedidos reais a médicos/utentes tiveram sucesso. Alertas
            clínicos não aparecem aqui — por desenho (RLS), o Admin não tem acesso a essa
            informação, apenas Médicos e Utentes.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
