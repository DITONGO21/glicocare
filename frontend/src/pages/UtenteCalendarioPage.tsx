import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { StatusBadge, alertStatusLabel, alertStatusLevel } from "@/components/StatusBadge";
import { useAuth } from "@/context/AuthContext";
import { useMeasurements } from "@/hooks/useMeasurements";
import { cn } from "@/lib/utils";
import type { AlertStatus, GlucoseMeasurementDto } from "@/types/api";

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const MONTH_NAMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

function dateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

interface DaySummary {
  count: number;
  average: number;
  status: "normal" | "warning" | "critical";
  measurements: GlucoseMeasurementDto[];
}

// A day is "critical" if any measurement is UnderObservation, "warning" if any is Ignored,
// otherwise "normal". This mirrors alertStatusLevel's per-measurement mapping, aggregated
// to the worst status found that day.
function dayStatus(measurements: GlucoseMeasurementDto[]): "normal" | "warning" | "critical" {
  const levels = measurements.map((m) => alertStatusLevel(m.alertStatus));
  if (levels.includes("critical")) return "critical";
  if (levels.includes("warning")) return "warning";
  return "normal";
}

export function UtenteCalendarioPage() {
  const { user } = useAuth();
  const patientId = user?.profileId ?? "";
  const { data: measurements, isLoading } = useMeasurements(patientId);
  const [viewDate, setViewDate] = useState(() => new Date());
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const summaries = useMemo(() => {
    const map = new Map<string, DaySummary>();
    for (const m of measurements ?? []) {
      const key = dateKey(new Date(m.measuredAt));
      const existing = map.get(key);
      if (existing) {
        existing.measurements.push(m);
      } else {
        map.set(key, { count: 0, average: 0, status: "normal", measurements: [m] });
      }
    }
    for (const [key, summary] of map.entries()) {
      summary.count = summary.measurements.length;
      summary.average =
        summary.measurements.reduce((sum, m) => sum + m.valueMgDl, 0) / summary.measurements.length;
      summary.status = dayStatus(summary.measurements);
      map.set(key, summary);
    }
    return map;
  }, [measurements]);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstOfMonth = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startWeekday = firstOfMonth.getDay();

  const cells: (Date | null)[] = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));

  const selectedSummary = selectedDay ? summaries.get(selectedDay) : undefined;

  const today = dateKey(new Date());

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Calendário de Medições</h1>
        <p className="text-sm text-muted-foreground">
          Veja o número de medições, a média diária e o estado geral de cada dia.
        </p>
      </div>

      <Card className="max-w-2xl">
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon-sm"
              aria-label="Mês anterior"
              onClick={() => setViewDate(new Date(year, month - 1, 1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="min-w-40 text-center text-base font-medium">
              {MONTH_NAMES[month]} {year}
            </span>
            <Button
              variant="outline"
              size="icon-sm"
              aria-label="Mês seguinte"
              onClick={() => setViewDate(new Date(year, month + 1, 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setViewDate(new Date())}>
            Hoje
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <LoadingSkeleton rows={6} />
          ) : (
            <div className="grid grid-cols-7 gap-1 sm:gap-2">
              {WEEKDAYS.map((wd) => (
                <div key={wd} className="pb-1 text-center text-xs font-medium text-muted-foreground">
                  {wd}
                </div>
              ))}
              {cells.map((date, idx) => {
                if (!date) return <div key={`empty-${idx}`} />;
                const key = dateKey(date);
                const summary = summaries.get(key);
                const isToday = key === today;
                return (
                  <button
                    key={key}
                    type="button"
                    disabled={!summary}
                    onClick={() => summary && setSelectedDay(key)}
                    aria-label={
                      summary
                        ? `${date.getDate()} de ${MONTH_NAMES[month]}: ${summary.count} medições, média ${summary.average.toFixed(0)} mg/dL`
                        : `${date.getDate()} de ${MONTH_NAMES[month]}: sem medições`
                    }
                    className={cn(
                      "flex h-14 flex-col items-center justify-center gap-0.5 rounded-lg border p-1 text-xs transition-colors sm:h-20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      isToday && "ring-1 ring-primary",
                      !summary && "cursor-default text-muted-foreground/60",
                      summary && "cursor-pointer hover:opacity-80",
                      summary?.status === "normal" && "border-status-normal/30 bg-status-normal-bg text-status-normal",
                      summary?.status === "warning" && "border-status-warning/30 bg-status-warning-bg text-status-warning",
                      summary?.status === "critical" && "border-status-critical/30 bg-status-critical-bg text-status-critical"
                    )}
                  >
                    <span className="font-semibold">{date.getDate()}</span>
                    {summary && (
                      <>
                        <span className="hidden sm:inline">{summary.count}x</span>
                        <span className="hidden sm:inline">{summary.average.toFixed(0)}</span>
                      </>
                    )}
                  </button>
                );
              })}
            </div>
          )}
          <div className="mt-4 flex flex-wrap gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-status-normal" /> Normal
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-status-warning" /> Atenção
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-status-critical" /> Crítico
            </span>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!selectedDay} onOpenChange={(open) => !open && setSelectedDay(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {selectedDay ? new Date(selectedDay + "T00:00:00").toLocaleDateString("pt-PT", { dateStyle: "full" }) : ""}
            </DialogTitle>
            <DialogDescription>
              {selectedSummary
                ? `${selectedSummary.count} medição(ões) · média ${selectedSummary.average.toFixed(0)} mg/dL`
                : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-96 space-y-2 overflow-y-auto">
            {selectedSummary?.measurements
              .slice()
              .sort((a, b) => new Date(a.measuredAt).getTime() - new Date(b.measuredAt).getTime())
              .map((m) => (
                <div key={m.id} className="flex items-center justify-between gap-2 rounded-lg border p-2 text-sm">
                  <div>
                    <p className="font-medium">
                      {new Date(m.measuredAt).toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" })}
                      {" · "}
                      {m.valueMgDl} mg/dL
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {m.source === "ESP32Simulado" ? "ESP32" : "Manual"}
                      {m.notes ? ` · ${m.notes}` : ""}
                    </p>
                  </div>
                  <StatusBadge
                    status={alertStatusLevel(m.alertStatus as AlertStatus)}
                    label={alertStatusLabel(m.alertStatus as AlertStatus)}
                  />
                </div>
              ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
