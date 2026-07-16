import { Users, Stethoscope, Activity, AlertTriangle } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from "recharts";
import { StatCard } from "@/components/StatCard";
import { StatusBadge } from "@/components/StatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const mockTrend = [
  { name: "Seg", medicoes: 120 },
  { name: "Ter", medicoes: 145 },
  { name: "Qua", medicoes: 132 },
  { name: "Qui", medicoes: 160 },
  { name: "Sex", medicoes: 151 },
  { name: "Sáb", medicoes: 98 },
  { name: "Dom", medicoes: 87 },
];

const recentUsers = [
  { name: "Ana Ferreira", role: "Utente", date: "Hoje" },
  { name: "Dr. Bruno Costa", role: "Médico", date: "Ontem" },
  { name: "Carla Nunes", role: "Utente", date: "2 dias atrás" },
];

export function AdminDashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Painel de Administração</h1>
        <p className="text-sm text-muted-foreground">Visão geral da plataforma GlicoCare.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total de Médicos" value={3} icon={<Stethoscope className="h-4 w-4" />} />
        <StatCard title="Total de Utentes" value={10} icon={<Users className="h-4 w-4" />} />
        <StatCard title="Medições Registadas" value={842} icon={<Activity className="h-4 w-4" />} />
        <StatCard
          title="Alertas Ativos"
          value={4}
          icon={<AlertTriangle className="h-4 w-4" />}
          hint="2 críticos, 2 em atenção"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Medições da última semana</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
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
            <CardTitle className="text-base">Utilizadores recentes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentUsers.map((u) => (
              <div key={u.name} className="flex items-center justify-between text-sm">
                <div>
                  <p className="font-medium">{u.name}</p>
                  <p className="text-xs text-muted-foreground">{u.role}</p>
                </div>
                <span className="text-xs text-muted-foreground">{u.date}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Estado da plataforma</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-6 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">API:</span>
            <StatusBadge status="normal" label="Operacional" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Base de Dados:</span>
            <StatusBadge status="normal" label="Operacional" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Alertas de Sistema:</span>
            <StatusBadge status="warning" label="2 em atenção" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
