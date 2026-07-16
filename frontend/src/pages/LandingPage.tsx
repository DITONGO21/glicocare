import { useNavigate } from "react-router-dom";
import { Activity, Wifi, Brain, MessageSquare, CalendarDays, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const FEATURES = [
  {
    icon: Wifi,
    title: "Monitorização em tempo real",
    description: "Registe medições manualmente ou simule leituras via ESP32 e acompanhe a glicemia ao longo do dia.",
  },
  {
    icon: Brain,
    title: "Análise inteligente educativa",
    description: "Relatórios diários, semanais e mensais gerados automaticamente com recomendações claras e simples.",
  },
  {
    icon: MessageSquare,
    title: "Comunicação direta com o médico",
    description: "Troque mensagens em tempo real com o seu médico responsável, sem sair da aplicação.",
  },
  {
    icon: CalendarDays,
    title: "Calendário e histórico completo",
    description: "Visualize medições, consultas e medicação num calendário único, com histórico detalhado.",
  },
  {
    icon: ShieldCheck,
    title: "Alertas de segurança",
    description: "Deteção automática de valores fora do intervalo alvo, com alertas para si e para o seu médico.",
  },
  {
    icon: Activity,
    title: "Diário de bem-estar",
    description: "Registe sintomas, refeições e notas diárias para complementar os dados clínicos.",
  },
];

export function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Activity className="h-5 w-5" />
            </div>
            <span className="text-lg font-semibold">GlicoCare</span>
          </div>
          <Button onClick={() => navigate("/login")}>Entrar</Button>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-4 py-16 text-center sm:px-6 sm:py-24">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Activity className="h-9 w-9" />
        </div>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-5xl">
          Monitorização de glicemia,<br className="hidden sm:block" /> simples e inteligente
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-balance text-base text-muted-foreground sm:text-lg">
          O GlicoCare ajuda pessoas com diabetes a acompanhar a sua glicemia diariamente, com
          análise inteligente educativa e simulação de dispositivo ESP32, mantendo utentes e
          médicos sempre em contacto direto e informados.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button size="lg" className="w-full sm:w-auto" onClick={() => navigate("/login")}>
            Entrar
          </Button>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
        <h2 className="mb-8 text-center text-2xl font-semibold tracking-tight">
          Principais funcionalidades
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature) => (
            <Card key={feature.title}>
              <CardHeader>
                <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <feature.icon className="h-5 w-5" />
                </div>
                <CardTitle className="text-base">{feature.title}</CardTitle>
                <CardDescription>{feature.description}</CardDescription>
              </CardHeader>
              <CardContent />
            </Card>
          ))}
        </div>
      </section>

      <footer className="border-t border-border py-6 text-center text-xs text-muted-foreground">
        GlicoCare — Sistema de Monitorização de Glicemia
      </footer>
    </div>
  );
}
