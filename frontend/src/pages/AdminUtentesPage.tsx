import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Plus, Search, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
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
import { StatusBadge } from "@/components/StatusBadge";
import {
  useCreatePatient,
  useDeletePatient,
  usePatients,
  useSetPatientActive,
  useUpdatePatient,
} from "@/hooks/usePatients";
import { extractErrorMessage } from "@/services/api";
import type { PatientDetailDto } from "@/types/api";

// password is optional in the form type; required (min 6) only enforced when creating,
// via the manual check in onSubmit below.
const formSchema = z.object({
  fullName: z.string().min(3, "Nome obrigatório"),
  email: z.string().email("Email inválido"),
  password: z.string().optional(),
  dateOfBirth: z.string().min(1, "Data de nascimento obrigatória"),
  phoneNumber: z.string().optional(),
  diabetesType: z.string().optional(),
  targetGlucoseMin: z.coerce.number().positive().optional(),
  targetGlucoseMax: z.coerce.number().positive().optional(),
});

type CreateFormValues = z.infer<typeof formSchema>;

function PatientFormDialog({
  patient,
  open,
  onOpenChange,
}: {
  patient?: PatientDetailDto;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const isEdit = !!patient;
  const createMutation = useCreatePatient();
  const updateMutation = useUpdatePatient();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(formSchema),
    values: patient
      ? {
          fullName: patient.fullName,
          email: patient.email,
          password: "",
          dateOfBirth: patient.dateOfBirth?.slice(0, 10) ?? "",
          phoneNumber: patient.phoneNumber ?? "",
          diabetesType: patient.diabetesType ?? "",
          targetGlucoseMin: patient.targetGlucoseMin ?? undefined,
          targetGlucoseMax: patient.targetGlucoseMax ?? undefined,
        }
      : undefined,
  });

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  const onSubmit = async (values: CreateFormValues) => {
    try {
      if (isEdit && patient) {
        await updateMutation.mutateAsync({ id: patient.id, payload: values });
        toast.success("Utente atualizado com sucesso.");
      } else {
        if (!values.password || values.password.length < 6) {
          toast.error("A palavra-passe deve ter no mínimo 6 caracteres.");
          return;
        }
        await createMutation.mutateAsync({ ...values, password: values.password });
        toast.success("Utente criado com sucesso.");
      }
      reset();
      onOpenChange(false);
    } catch (error) {
      toast.error(extractErrorMessage(error, "Não foi possível guardar o utente."));
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
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar Utente" : "Novo Utente"}</DialogTitle>
        </DialogHeader>
        <form className="space-y-3" onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="fullName">Nome completo</Label>
              <Input id="fullName" {...register("fullName")} />
              {errors.fullName && <p className="text-xs text-destructive">{errors.fullName.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" {...register("email")} />
              {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
            </div>
            {!isEdit && (
              <div className="space-y-1.5">
                <Label htmlFor="password">Palavra-passe</Label>
                <Input id="password" type="password" {...register("password")} />
                {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="dateOfBirth">Data de nascimento</Label>
              <Input id="dateOfBirth" type="date" {...register("dateOfBirth")} />
              {errors.dateOfBirth && <p className="text-xs text-destructive">{errors.dateOfBirth.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="phoneNumber">Telefone</Label>
              <Input id="phoneNumber" {...register("phoneNumber")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="diabetesType">Tipo de diabetes</Label>
              <Input id="diabetesType" placeholder="Tipo 1 / Tipo 2" {...register("diabetesType")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="targetGlucoseMin">Glicemia alvo mín. (mg/dL)</Label>
              <Input id="targetGlucoseMin" type="number" {...register("targetGlucoseMin")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="targetGlucoseMax">Glicemia alvo máx. (mg/dL)</Label>
              <Input id="targetGlucoseMax" type="number" {...register("targetGlucoseMax")} />
            </div>
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

export function AdminUtentesPage() {
  const { data: patients, isLoading } = usePatients();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPatient, setEditingPatient] = useState<PatientDetailDto | undefined>(undefined);
  const setActiveMutation = useSetPatientActive();
  const deleteMutation = useDeletePatient();

  const filtered = useMemo(() => {
    const list = (patients ?? []) as PatientDetailDto[];
    if (!search.trim()) return list;
    const term = search.toLowerCase();
    return list.filter((p) => p.fullName.toLowerCase().includes(term) || p.email.toLowerCase().includes(term));
  }, [patients, search]);

  const openCreate = () => {
    setEditingPatient(undefined);
    setDialogOpen(true);
  };

  const openEdit = (patient: PatientDetailDto) => {
    setEditingPatient(patient);
    setDialogOpen(true);
  };

  const handleToggleActive = async (patient: PatientDetailDto, isActive: boolean) => {
    try {
      // Backend toggles via PATCH /api/users/{userId}/toggle-active (there is no
      // /patients/{id}/status), so we pass the linked User's id, not the Patient's id.
      await setActiveMutation.mutateAsync(patient.userId);
      toast.success(isActive ? "Utente ativado." : "Utente desativado.");
    } catch (error) {
      toast.error(extractErrorMessage(error));
    }
  };

  const handleDelete = async (patient: PatientDetailDto) => {
    try {
      await deleteMutation.mutateAsync(patient.id);
      toast.success("Utente removido.");
    } catch (error) {
      toast.error(extractErrorMessage(error));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Gestão de Utentes</h1>
          <p className="text-sm text-muted-foreground">Criar, editar e gerir contas de utentes.</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Novo Utente
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="relative max-w-sm">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Pesquisar por nome ou email..."
              className="pl-8"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <LoadingSkeleton rows={5} />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Data Nascimento</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((patient) => (
                  <TableRow key={patient.id}>
                    <TableCell className="font-medium">{patient.fullName}</TableCell>
                    <TableCell>{patient.email}</TableCell>
                    <TableCell>{patient.dateOfBirth ? patient.dateOfBirth.slice(0, 10) : "-"}</TableCell>
                    <TableCell>{patient.diabetesType ?? "-"}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={patient.isActive ?? true}
                          onCheckedChange={(checked) => handleToggleActive(patient, checked)}
                        />
                        <StatusBadge
                          status={patient.isActive === false ? "critical" : "normal"}
                          label={patient.isActive === false ? "Inativo" : "Ativo"}
                        />
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon-sm" onClick={() => openEdit(patient)} aria-label="Editar">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger
                            render={
                              <Button variant="ghost" size="icon-sm" aria-label="Remover">
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            }
                          />
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Remover utente</AlertDialogTitle>
                              <AlertDialogDescription>
                                Tem a certeza que pretende remover {patient.fullName}? Esta ação não pode ser
                                revertida.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction variant="destructive" onClick={() => handleDelete(patient)}>
                                Remover
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      Nenhum utente encontrado.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <PatientFormDialog patient={editingPatient} open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}
