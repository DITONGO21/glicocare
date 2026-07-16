import { Bot, Info, Loader2, RefreshCw, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAiReport, useGenerateAiReport } from "@/hooks/useAiReports";
import { extractErrorMessage } from "@/services/api";
import type { AIReportPeriod } from "@/types/api";
import { toast } from "sonner";

interface AiInsightsPanelProps {
  patientId: string | undefined;
  className?: string;
}

const PERIODS: { value: AIReportPeriod; label: string }[] = [
  { value: "daily", label: "Diário" },
  { value: "weekly", label: "Semanal" },
  { value: "monthly", label: "Mensal" },
];

function PeriodPanel({ patientId, period }: { patientId: string | undefined; period: AIReportPeriod }) {
  const { data: report, isLoading } = useAiReport(patientId, period);
  const generate = useGenerateAiReport(patientId);

  const handleGenerate = async () => {
    try {
      await generate.mutateAsync(period);
      toast.success("Análise atualizada.");
    } catch (error) {
      toast.error(extractErrorMessage(error, "Não foi possível gerar a análise."));
    }
  };

  return (
    <div className="space-y-4">
      {isLoading ? (
        <p className="text-sm text-muted-foreground">A carregar análise...</p>
      ) : report ? (
        <div className="space-y-3">
          <div>
            <h4 className="mb-1 text-sm font-semibold text-foreground">Resumo</h4>
            <p className="text-sm leading-relaxed text-muted-foreground">{report.summary}</p>
          </div>
          <div>
            <h4 className="mb-1 text-sm font-semibold text-foreground">Recomendações educativas</h4>
            <p className="text-sm leading-relaxed text-muted-foreground">{report.recommendations}</p>
          </div>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          Ainda não existe uma análise gerada para este período. Clique em "Gerar análise" para criar uma.
        </p>
      )}

      <Button
        variant="outline"
        size="sm"
        onClick={handleGenerate}
        disabled={generate.isPending || !patientId}
      >
        {generate.isPending ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <RefreshCw className="size-4" />
        )}
        Gerar análise
      </Button>
    </div>
  );
}

/**
 * Panel showing the (simulated, rule-based) AI insights for a patient: daily/weekly/monthly
 * summaries + educational recommendations. Always prominently displays the mandatory
 * disclaimer that this is educational information only, never a medical diagnosis.
 */
export function AiInsightsPanel({ patientId, className }: AiInsightsPanelProps) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Bot className="size-5 text-primary" />
          Análise Inteligente (simulação)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert variant="info">
          <Info />
          <AlertTitle>Informação apenas educativa</AlertTitle>
          <AlertDescription>
            Não substitui aconselhamento médico. Esta análise é gerada automaticamente a partir dos
            seus registos e nunca realiza diagnósticos, nem recomenda medicação ou alterações de dose.
          </AlertDescription>
        </Alert>

        <Tabs defaultValue="daily">
          <TabsList className="max-w-full justify-start overflow-x-auto">
            {PERIODS.map((p) => (
              <TabsTrigger key={p.value} value={p.value}>
                <Sparkles className="size-3.5" />
                {p.label}
              </TabsTrigger>
            ))}
          </TabsList>
          {PERIODS.map((p) => (
            <TabsContent key={p.value} value={p.value}>
              <PeriodPanel patientId={patientId} period={p.value} />
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
}
