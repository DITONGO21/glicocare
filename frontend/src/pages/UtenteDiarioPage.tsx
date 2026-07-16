import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { StatusBadge, alertStatusLabel, alertStatusLevel } from "@/components/StatusBadge";
import { useAuth } from "@/context/AuthContext";
import { useMeasurements } from "@/hooks/useMeasurements";
import type { GlucoseMeasurementDto } from "@/types/api";

function groupByDay(measurements: GlucoseMeasurementDto[]) {
  const groups = new Map<string, GlucoseMeasurementDto[]>();
  for (const m of measurements) {
    const d = new Date(m.measuredAt);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const list = groups.get(key);
    if (list) list.push(m);
    else groups.set(key, [m]);
  }
  return Array.from(groups.entries())
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .map(([key, items]) => ({
      key,
      date: new Date(key + "T00:00:00"),
      items: items.slice().sort((a, b) => new Date(b.measuredAt).getTime() - new Date(a.measuredAt).getTime()),
    }));
}

export function UtenteDiarioPage() {
  const { user } = useAuth();
  const patientId = user?.profileId ?? "";
  const { data: measurements, isLoading } = useMeasurements(patientId);

  const days = useMemo(() => groupByDay(measurements ?? []), [measurements]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Diário</h1>
        <p className="text-sm text-muted-foreground">
          As suas medições organizadas em formato de diário, do dia mais recente para o mais antigo.
        </p>
      </div>

      {isLoading ? (
        <LoadingSkeleton rows={6} />
      ) : days.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Ainda não tem medições registadas.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {days.map((day) => (
            <Card key={day.key}>
              <CardHeader>
                <CardTitle className="text-base capitalize">
                  {day.date.toLocaleDateString("pt-PT", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })}
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  {day.items.length} medição(ões) · média{" "}
                  {(day.items.reduce((s, m) => s + m.valueMgDl, 0) / day.items.length).toFixed(0)} mg/dL
                </p>
              </CardHeader>
              <CardContent>
                <ol className="relative space-y-4 border-l border-border pl-5">
                  {day.items.map((m) => (
                    <li key={m.id} className="relative">
                      <span
                        className="absolute -left-[1.45rem] top-1 h-2.5 w-2.5 rounded-full border-2 border-card bg-primary"
                        aria-hidden="true"
                      />
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-medium">
                            {new Date(m.measuredAt).toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" })}
                            {" — "}
                            <span className="font-semibold">{m.valueMgDl} mg/dL</span>
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Origem: {m.source === "ESP32Simulado" ? "ESP32" : "Manual"}
                          </p>
                          {m.notes && <p className="mt-1 text-xs text-muted-foreground">Observações: {m.notes}</p>}
                        </div>
                        <StatusBadge status={alertStatusLevel(m.alertStatus)} label={alertStatusLabel(m.alertStatus)} />
                      </div>
                    </li>
                  ))}
                </ol>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
