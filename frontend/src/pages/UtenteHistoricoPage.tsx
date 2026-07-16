import { useMemo, useState } from "react";
import { FileDown, FileSpreadsheet } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { StatusBadge, alertStatusLabel, alertStatusLevel } from "@/components/StatusBadge";
import { useAuth } from "@/context/AuthContext";
import { useMeasurements } from "@/hooks/useMeasurements";
import { exportMeasurementsToExcel, exportMeasurementsToPdf } from "@/utils/exportMeasurements";

export function UtenteHistoricoPage() {
  const { user } = useAuth();
  const patientId = user?.profileId ?? "";
  const { data: measurements, isLoading } = useMeasurements(patientId);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const filtered = useMemo(() => {
    const list = (measurements ?? []).slice();
    return list
      .filter((m) => {
        const date = new Date(m.measuredAt);
        if (startDate && date < new Date(startDate)) return false;
        if (endDate && date > new Date(`${endDate}T23:59:59`)) return false;
        return true;
      })
      .sort((a, b) => new Date(b.measuredAt).getTime() - new Date(a.measuredAt).getTime());
  }, [measurements, startDate, endDate]);

  const patientName = user?.fullName ?? "utente";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Histórico de Medições</h1>
          <p className="text-sm text-muted-foreground">Consulte e filtre o seu histórico por intervalo de datas.</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            disabled={filtered.length === 0}
            onClick={() => exportMeasurementsToExcel(filtered, patientName)}
          >
            <FileSpreadsheet className="h-4 w-4" aria-hidden="true" />
            Exportar Excel
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            disabled={filtered.length === 0}
            onClick={() => exportMeasurementsToPdf(filtered, patientName)}
          >
            <FileDown className="h-4 w-4" aria-hidden="true" />
            Exportar PDF
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="startDate">De</Label>
              <Input id="startDate" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="endDate">Até</Label>
              <Input id="endDate" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <LoadingSkeleton rows={6} />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Valor (mg/dL)</TableHead>
                  <TableHead>Origem</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Notas</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell>{new Date(m.measuredAt).toLocaleString("pt-PT")}</TableCell>
                    <TableCell className="font-medium">{m.valueMgDl}</TableCell>
                    <TableCell>{m.source === "ESP32Simulado" ? "ESP32" : "Manual"}</TableCell>
                    <TableCell>
                      <StatusBadge
                        status={alertStatusLevel(m.alertStatus)}
                        label={alertStatusLabel(m.alertStatus)}
                      />
                    </TableCell>
                    <TableCell className="max-w-52 truncate">{m.notes ?? "-"}</TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      Nenhuma medição encontrada para o intervalo selecionado.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
