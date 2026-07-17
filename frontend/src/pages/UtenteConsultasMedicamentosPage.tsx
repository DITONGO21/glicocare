import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Stethoscope, Pill } from "lucide-react";
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
import { useAuth } from "@/context/AuthContext";
import {
  useAppointments,
  useCreateAppointment,
  useDeleteAppointment,
  useUpdateAppointment,
} from "@/hooks/useAppointments";
import {
  useCreateMedication,
  useDeleteMedication,
  useMedications,
  useUpdateMedication,
} from "@/hooks/useMedications";
import { useDoctors } from "@/hooks/useDoctors";
import { useDoctorAvailability } from "@/hooks/useDoctorAvailability";
import { extractErrorMessage } from "@/services/api";
import type { AppointmentDto, MedicationDto } from "@/types/api";

const WEEKDAYS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

// ---------------- Appointments ----------------

const appointmentSchema = z.object({
  doctorNameFreetext: z.string().optional(),
  scheduledAt: z.string().min(1, "Data/hora obrigatória"),
  location: z.string().optional(),
  notes: z.string().optional(),
  status: z.enum(["Agendada", "Realizada", "Cancelada"]),
});
type AppointmentFormValues = z.infer<typeof appointmentSchema>;

function toDatetimeLocal(iso?: string) {
  if (!iso) return new Date().toISOString().slice(0, 16);
  return iso.slice(0, 16);
}

function AppointmentFormDialog({
  appointment,
  open,
  onOpenChange,
  patientId,
}: {
  appointment?: AppointmentDto;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patientId: string;
}) {
  const isEdit = !!appointment;
  const createMutation = useCreateAppointment(patientId);
  const updateMutation = useUpdateAppointment(patientId);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<AppointmentFormValues>({
    resolver: zodResolver(appointmentSchema),
    values: {
      doctorNameFreetext: appointment?.doctorNameFreetext ?? "",
      scheduledAt: toDatetimeLocal(appointment?.scheduledAt),
      location: appointment?.location ?? "",
      notes: appointment?.notes ?? "",
      status: appointment?.status ?? "Agendada",
    },
  });

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  // Best-effort suggestion, not a booking system: shows the associated doctor's declared
  // weekly availability for the chosen day so the patient has a hint. If the doctor has no
  // availability defined, nothing is shown and creating the appointment is never blocked.
  const { data: doctors } = useDoctors();
  const primaryDoctor = doctors?.[0];
  const { data: availability } = useDoctorAvailability(primaryDoctor?.id);
  const scheduledAtValue = watch("scheduledAt");
  const selectedWeekday = scheduledAtValue ? new Date(scheduledAtValue).getDay() : undefined;
  const slotsForDay = (availability ?? []).filter((s) => s.weekday === selectedWeekday);

  const onSubmit = async (values: AppointmentFormValues) => {
    try {
      const payload = {
        doctorNameFreetext: values.doctorNameFreetext || undefined,
        scheduledAt: new Date(values.scheduledAt).toISOString(),
        location: values.location,
        notes: values.notes,
        status: values.status,
      };
      if (isEdit && appointment) {
        await updateMutation.mutateAsync({ id: appointment.id, payload });
        toast.success("Consulta atualizada.");
      } else {
        await createMutation.mutateAsync(payload);
        toast.success("Consulta agendada.");
      }
      reset();
      onOpenChange(false);
    } catch (error) {
      toast.error(extractErrorMessage(error, "Não foi possível guardar a consulta."));
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
          <DialogTitle>{isEdit ? "Editar Consulta" : "Nova Consulta"}</DialogTitle>
        </DialogHeader>
        <form className="space-y-3" onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="doctorNameFreetext">Médico</Label>
            <Input
              id="doctorNameFreetext"
              placeholder="Nome do médico (opcional)"
              {...register("doctorNameFreetext")}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="scheduledAt">Data e hora</Label>
            <Input id="scheduledAt" type="datetime-local" {...register("scheduledAt")} />
            {errors.scheduledAt && <p className="text-xs text-destructive">{errors.scheduledAt.message}</p>}
            {primaryDoctor && selectedWeekday !== undefined && slotsForDay.length > 0 && (
              <p className="text-xs text-muted-foreground">
                Disponibilidade de {primaryDoctor.fullName} à {WEEKDAYS[selectedWeekday]}:{" "}
                {slotsForDay.map((s) => `${s.startTime.slice(0, 5)}-${s.endTime.slice(0, 5)}`).join(", ")}
              </p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="location">Local</Label>
            <Input id="location" placeholder="Ex: Hospital, Clínica..." {...register("location")} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="apptStatus">Estado</Label>
            <select
              id="apptStatus"
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs"
              {...register("status")}
            >
              <option value="Agendada">Agendada</option>
              <option value="Realizada">Realizada</option>
              <option value="Cancelada">Cancelada</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="apptNotes">Notas (opcional)</Label>
            <Textarea id="apptNotes" {...register("notes")} />
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

// ---------------- Medications ----------------

const medicationSchema = z.object({
  name: z.string().min(1, "O nome é obrigatório"),
  dosage: z.string().optional(),
  frequency: z.string().optional(),
  startDate: z.string().min(1, "Data de início obrigatória"),
  endDate: z.string().optional(),
  notes: z.string().optional(),
});
type MedicationFormValues = z.infer<typeof medicationSchema>;

function MedicationFormDialog({
  medication,
  open,
  onOpenChange,
  patientId,
}: {
  medication?: MedicationDto;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patientId: string;
}) {
  const isEdit = !!medication;
  const createMutation = useCreateMedication(patientId);
  const updateMutation = useUpdateMedication(patientId);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<MedicationFormValues>({
    resolver: zodResolver(medicationSchema),
    values: {
      name: medication?.name ?? "",
      dosage: medication?.dosage ?? "",
      frequency: medication?.frequency ?? "",
      startDate: medication?.startDate ?? new Date().toISOString().slice(0, 10),
      endDate: medication?.endDate ?? "",
      notes: medication?.notes ?? "",
    },
  });

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  const onSubmit = async (values: MedicationFormValues) => {
    try {
      const payload = {
        name: values.name,
        dosage: values.dosage,
        frequency: values.frequency,
        startDate: values.startDate,
        endDate: values.endDate || undefined,
        notes: values.notes,
      };
      if (isEdit && medication) {
        await updateMutation.mutateAsync({ id: medication.id, payload });
        toast.success("Medicamento atualizado.");
      } else {
        await createMutation.mutateAsync(payload);
        toast.success("Medicamento adicionado.");
      }
      reset();
      onOpenChange(false);
    } catch (error) {
      toast.error(extractErrorMessage(error, "Não foi possível guardar o medicamento."));
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
          <DialogTitle>{isEdit ? "Editar Medicamento" : "Novo Medicamento"}</DialogTitle>
        </DialogHeader>
        <form className="space-y-3" onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="medName">Nome</Label>
            <Input id="medName" {...register("name")} />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="dosage">Dosagem</Label>
            <Input id="dosage" placeholder="Ex: 500mg" {...register("dosage")} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="frequency">Frequência</Label>
            <Input id="frequency" placeholder="Ex: 2x ao dia" {...register("frequency")} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="startDate">Data de início</Label>
            <Input id="startDate" type="date" {...register("startDate")} />
            {errors.startDate && <p className="text-xs text-destructive">{errors.startDate.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="endDate">Data de fim (opcional, vazio = contínuo)</Label>
            <Input id="endDate" type="date" {...register("endDate")} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="medNotes">Notas (opcional)</Label>
            <Textarea id="medNotes" {...register("notes")} />
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

export function UtenteConsultasMedicamentosPage() {
  const { user } = useAuth();
  const patientId = user?.profileId ?? "";

  const { data: appointments, isLoading: loadingAppointments } = useAppointments(patientId);
  const { data: medications, isLoading: loadingMedications } = useMedications(patientId);
  const deleteAppointmentMutation = useDeleteAppointment(patientId);
  const deleteMedicationMutation = useDeleteMedication(patientId);

  const [apptDialogOpen, setApptDialogOpen] = useState(false);
  const [editingAppt, setEditingAppt] = useState<AppointmentDto | undefined>(undefined);
  const [medDialogOpen, setMedDialogOpen] = useState(false);
  const [editingMed, setEditingMed] = useState<MedicationDto | undefined>(undefined);

  const openCreateAppt = () => {
    setEditingAppt(undefined);
    setApptDialogOpen(true);
  };
  const openEditAppt = (a: AppointmentDto) => {
    setEditingAppt(a);
    setApptDialogOpen(true);
  };
  const handleDeleteAppt = async (a: AppointmentDto) => {
    try {
      await deleteAppointmentMutation.mutateAsync(a.id);
      toast.success("Consulta eliminada.");
    } catch (error) {
      toast.error(extractErrorMessage(error));
    }
  };

  const openCreateMed = () => {
    setEditingMed(undefined);
    setMedDialogOpen(true);
  };
  const openEditMed = (m: MedicationDto) => {
    setEditingMed(m);
    setMedDialogOpen(true);
  };
  const handleDeleteMed = async (m: MedicationDto) => {
    try {
      await deleteMedicationMutation.mutateAsync(m.id);
      toast.success("Medicamento eliminado.");
    } catch (error) {
      toast.error(extractErrorMessage(error));
    }
  };

  const sortedAppointments = (appointments ?? [])
    .slice()
    .sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime());
  const sortedMedications = (medications ?? [])
    .slice()
    .sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Consultas e Medicação</h1>
        <p className="text-sm text-muted-foreground">
          Gira as suas consultas médicas e medicamentos. Estes registos aparecem também no
          calendário.
        </p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Stethoscope className="h-4 w-4" /> Consultas
          </CardTitle>
          <Button size="sm" onClick={openCreateAppt}>
            <Plus className="h-4 w-4" />
            Nova Consulta
          </Button>
        </CardHeader>
        <CardContent>
          {loadingAppointments ? (
            <LoadingSkeleton rows={3} />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Médico</TableHead>
                  <TableHead>Local</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedAppointments.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell>{new Date(a.scheduledAt).toLocaleString("pt-PT")}</TableCell>
                    <TableCell>{a.doctorNameFreetext ?? "-"}</TableCell>
                    <TableCell>{a.location ?? "-"}</TableCell>
                    <TableCell>{a.status}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon-sm" onClick={() => openEditAppt(a)} aria-label="Editar">
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
                              <AlertDialogTitle>Eliminar consulta</AlertDialogTitle>
                              <AlertDialogDescription>
                                Tem a certeza que pretende eliminar esta consulta?
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction variant="destructive" onClick={() => handleDeleteAppt(a)}>
                                Eliminar
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {sortedAppointments.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      Ainda não tem consultas agendadas.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Pill className="h-4 w-4" /> Medicamentos
          </CardTitle>
          <Button size="sm" onClick={openCreateMed}>
            <Plus className="h-4 w-4" />
            Novo Medicamento
          </Button>
        </CardHeader>
        <CardContent>
          {loadingMedications ? (
            <LoadingSkeleton rows={3} />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Dosagem</TableHead>
                  <TableHead>Frequência</TableHead>
                  <TableHead>Início</TableHead>
                  <TableHead>Fim</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedMedications.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="font-medium">{m.name}</TableCell>
                    <TableCell>{m.dosage ?? "-"}</TableCell>
                    <TableCell>{m.frequency ?? "-"}</TableCell>
                    <TableCell>{new Date(m.startDate).toLocaleDateString("pt-PT")}</TableCell>
                    <TableCell>{m.endDate ? new Date(m.endDate).toLocaleDateString("pt-PT") : "Contínuo"}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon-sm" onClick={() => openEditMed(m)} aria-label="Editar">
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
                              <AlertDialogTitle>Eliminar medicamento</AlertDialogTitle>
                              <AlertDialogDescription>
                                Tem a certeza que pretende eliminar {m.name}?
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction variant="destructive" onClick={() => handleDeleteMed(m)}>
                                Eliminar
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {sortedMedications.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      Ainda não tem medicamentos registados.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <AppointmentFormDialog
        appointment={editingAppt}
        open={apptDialogOpen}
        onOpenChange={setApptDialogOpen}
        patientId={patientId}
      />
      <MedicationFormDialog
        medication={editingMed}
        open={medDialogOpen}
        onOpenChange={setMedDialogOpen}
        patientId={patientId}
      />
    </div>
  );
}
