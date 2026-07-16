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
  useCreateDoctor,
  useDeleteDoctor,
  useDoctors,
  useSetDoctorActive,
  useUpdateDoctor,
} from "@/hooks/useDoctors";
import { extractErrorMessage } from "@/services/api";
import type { DoctorDetailDto } from "@/types/api";

// password is optional in the form type; required (min 6) only enforced when creating,
// via the manual check in onSubmit below (react-hook-form typing does not play well
// with schemas that change shape based on a runtime flag).
const formSchema = z.object({
  fullName: z.string().min(3, "Nome obrigatório"),
  email: z.string().email("Email inválido"),
  password: z.string().optional(),
  specialty: z.string().min(2, "Especialidade obrigatória"),
  licenseNumber: z.string().min(2, "Nº de licença obrigatório"),
  phoneNumber: z.string().optional(),
});

type CreateFormValues = z.infer<typeof formSchema>;

function DoctorFormDialog({
  doctor,
  open,
  onOpenChange,
}: {
  doctor?: DoctorDetailDto;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const isEdit = !!doctor;
  const createMutation = useCreateDoctor();
  const updateMutation = useUpdateDoctor();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateFormValues>({
    resolver: zodResolver(formSchema),
    values: doctor
      ? {
          fullName: doctor.fullName,
          email: doctor.email,
          specialty: doctor.specialty,
          licenseNumber: doctor.licenseNumber,
          phoneNumber: doctor.phoneNumber ?? "",
          password: "",
        }
      : undefined,
  });

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  const onSubmit = async (values: CreateFormValues) => {
    try {
      if (isEdit && doctor) {
        await updateMutation.mutateAsync({
          id: doctor.id,
          // Backend UpdateDoctorRequest has no email/licenseNumber fields (only
          // fullName/specialty/phoneNumber are editable post-creation).
          payload: {
            fullName: values.fullName,
            specialty: values.specialty,
            phoneNumber: values.phoneNumber,
          },
        });
        toast.success("Médico atualizado com sucesso.");
      } else {
        if (!values.password || values.password.length < 6) {
          toast.error("A palavra-passe deve ter no mínimo 6 caracteres.");
          return;
        }
        await createMutation.mutateAsync({ ...values, password: values.password });
        toast.success("Médico criado com sucesso.");
      }
      reset();
      onOpenChange(false);
    } catch (error) {
      toast.error(extractErrorMessage(error, "Não foi possível guardar o médico."));
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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar Médico" : "Novo Médico"}</DialogTitle>
        </DialogHeader>
        <form className="space-y-3" onSubmit={handleSubmit(onSubmit)} noValidate>
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
            <Label htmlFor="specialty">Especialidade</Label>
            <Input id="specialty" {...register("specialty")} />
            {errors.specialty && <p className="text-xs text-destructive">{errors.specialty.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="licenseNumber">Nº de licença</Label>
            <Input id="licenseNumber" {...register("licenseNumber")} />
            {errors.licenseNumber && <p className="text-xs text-destructive">{errors.licenseNumber.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="phoneNumber">Telefone</Label>
            <Input id="phoneNumber" {...register("phoneNumber")} />
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

export function AdminMedicosPage() {
  const { data: doctors, isLoading } = useDoctors();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingDoctor, setEditingDoctor] = useState<DoctorDetailDto | undefined>(undefined);
  const setActiveMutation = useSetDoctorActive();
  const deleteMutation = useDeleteDoctor();

  const filtered = useMemo(() => {
    const list = (doctors ?? []) as DoctorDetailDto[];
    if (!search.trim()) return list;
    const term = search.toLowerCase();
    return list.filter(
      (d) =>
        d.fullName.toLowerCase().includes(term) ||
        d.email.toLowerCase().includes(term) ||
        d.specialty.toLowerCase().includes(term)
    );
  }, [doctors, search]);

  const openCreate = () => {
    setEditingDoctor(undefined);
    setDialogOpen(true);
  };

  const openEdit = (doctor: DoctorDetailDto) => {
    setEditingDoctor(doctor);
    setDialogOpen(true);
  };

  const handleToggleActive = async (doctor: DoctorDetailDto, isActive: boolean) => {
    try {
      // Backend toggles via PATCH /api/users/{userId}/toggle-active (there is no
      // /doctors/{id}/status), so we pass the linked User's id, not the Doctor's id.
      await setActiveMutation.mutateAsync(doctor.userId);
      toast.success(isActive ? "Médico ativado." : "Médico desativado.");
    } catch (error) {
      toast.error(extractErrorMessage(error));
    }
  };

  const handleDelete = async (doctor: DoctorDetailDto) => {
    try {
      await deleteMutation.mutateAsync(doctor.id);
      toast.success("Médico removido.");
    } catch (error) {
      toast.error(extractErrorMessage(error));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Gestão de Médicos</h1>
          <p className="text-sm text-muted-foreground">Criar, editar e gerir contas de médicos.</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Novo Médico
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="relative max-w-sm">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Pesquisar por nome, email ou especialidade..."
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
                  <TableHead>Especialidade</TableHead>
                  <TableHead>Licença</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((doctor) => (
                  <TableRow key={doctor.id}>
                    <TableCell className="font-medium">{doctor.fullName}</TableCell>
                    <TableCell>{doctor.email}</TableCell>
                    <TableCell>{doctor.specialty}</TableCell>
                    <TableCell>{doctor.licenseNumber}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={doctor.isActive ?? true}
                          onCheckedChange={(checked) => handleToggleActive(doctor, checked)}
                        />
                        <StatusBadge
                          status={doctor.isActive === false ? "critical" : "normal"}
                          label={doctor.isActive === false ? "Inativo" : "Ativo"}
                        />
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon-sm" onClick={() => openEdit(doctor)} aria-label="Editar">
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
                              <AlertDialogTitle>Remover médico</AlertDialogTitle>
                              <AlertDialogDescription>
                                Tem a certeza que pretende remover {doctor.fullName}? Esta ação não pode ser
                                revertida.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction variant="destructive" onClick={() => handleDelete(doctor)}>
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
                      Nenhum médico encontrado.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <DoctorFormDialog doctor={editingDoctor} open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}
