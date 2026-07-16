import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { StatusBadge, glucoseStatus } from "@/components/StatusBadge";
import { useAuth } from "@/context/AuthContext";
import {
  useCreateMeasurement,
  useDeleteMeasurement,
  useMeasurements,
  useUpdateMeasurement,
} from "@/hooks/useMeasurements";
import { extractErrorMessage } from "@/services/api";
import type { GlucoseMeasurementDto } from "@/types/api";

// Valores plausíveis de glicemia capilar: 20-600 mg/dL cobre hipoglicemias severas
// e hiperglicemias extremas sem permitir entradas manifestamente erradas.
const measurementSchema = z.object({
  value: z.coerce.number().min(20, "Valor mínimo: 20 mg/dL").max(600, "Valor máximo: 600 mg/dL"),
  measuredAt: z.string().min(1, "Data/hora obrigatória"),
  notes: z.string().optional(),
});
type MeasurementFormValues = z.infer<typeof measurementSchema>;

function toDatetimeLocal(iso?: string) {
  if (!iso) return new Date().toISOString().slice(0, 16);
  return iso.slice(0, 16);
}

function MeasurementFormDialog({
  measurement,
  open,
  onOpenChange,
  patientId,
}: {
  measurement?: GlucoseMeasurementDto;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patientId: string;
}) {
  const isEdit = !!measurement;
  const createMutation = useCreateMeasurement(patientId);
  const updateMutation = useUpdateMeasurement(patientId);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(measurementSchema),
    values: {
      value: measurement?.valueMgDl ?? 100,
      measuredAt: toDatetimeLocal(measurement?.measuredAt),
      notes: measurement?.notes ?? "",
    },
  });

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  const onSubmit = async (values: MeasurementFormValues) => {
    try {
      const payload = {
        valueMgDl: values.value,
        measuredAt: new Date(values.measuredAt).toISOString(),
        notes: values.notes,
      };
      if (isEdit && measurement) {
        await updateMutation.mutateAsync({ id: measurement.id, payload });
        toast.success("Medição atualizada.");
      } else {
        await createMutation.mutateAsync(payload);
        toast.success("Medição registada.");
      }
      reset();
      onOpenChange(false);
    } catch (error) {
      toast.error(extractErrorMessage(error, "Não foi possível guardar a medição."));
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) reset();
      }}
    >
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar Medição" : "Nova Medição"}</DialogTitle>
        </DialogHeader>
        <form className="space-y-3" onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="value">Valor (mg/dL)</Label>
            <Input id="value" type="number" {...register("value")} />
            {errors.value && <p className="text-xs text-destructive">{errors.value.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="measuredAt">Data e hora</Label>
            <Input id="measuredAt" type="datetime-local" {...register("measuredAt")} />
            {errors.measuredAt && <p className="text-xs text-destructive">{errors.measuredAt.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="notes">Notas (opcional)</Label>
            <Textarea id="notes" {...register("notes")} />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "A guardar..." : "Guardar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function UtenteRegistosPage() {
  const { user } = useAuth();
  const patientId = user?.profileId ?? "";
  const { data: measurements, isLoading } = useMeasurements(patientId);
  const deleteMutation = useDeleteMeasurement(patientId);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<GlucoseMeasurementDto | undefined>(undefined);

  const openCreate = () => {
    setEditing(undefined);
    setDialogOpen(true);
  };

  const openEdit = (measurement: GlucoseMeasurementDto) => {
    setEditing(measurement);
    setDialogOpen(true);
  };

  const handleDelete = async (measurement: GlucoseMeasurementDto) => {
    try {
      await deleteMutation.mutateAsync(measurement.id);
      toast.success("Medição eliminada.");
    } catch (error) {
      toast.error(extractErrorMessage(error));
    }
  };

  const sorted = (measurements ?? [])
    .slice()
    .sort((a, b) => new Date(b.measuredAt).getTime() - new Date(a.measuredAt).getTime());

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Registos de Glicemia</h1>
          <p className="text-sm text-muted-foreground">Adicione, edite ou remova as suas medições manuais.</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Nova Medição
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Medições</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <LoadingSkeleton rows={5} />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Valor (mg/dL)</TableHead>
                  <TableHead>Origem</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Notas</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sorted.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell>{new Date(m.measuredAt).toLocaleString("pt-PT")}</TableCell>
                    <TableCell className="font-medium">{m.valueMgDl}</TableCell>
                    <TableCell>{m.source === "ESP32Simulado" ? "ESP32" : "Manual"}</TableCell>
                    <TableCell>
                      <StatusBadge status={glucoseStatus(m.valueMgDl)} />
                    </TableCell>
                    <TableCell className="max-w-40 truncate">{m.notes ?? "-"}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => openEdit(m)}
                          aria-label="Editar"
                          disabled={m.source === "ESP32Simulado"}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger
                            render={
                              <Button variant="ghost" size="icon-sm" aria-label="Eliminar">
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            }
                          />
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Eliminar medição</AlertDialogTitle>
                              <AlertDialogDescription>
                                Tem a certeza que pretende eliminar este registo de {m.valueMgDl} mg/dL?
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction variant="destructive" onClick={() => handleDelete(m)}>
                                Eliminar
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {sorted.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      Ainda não tem medições registadas.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <MeasurementFormDialog
        measurement={editing}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        patientId={patientId}
      />
    </div>
  );
}
