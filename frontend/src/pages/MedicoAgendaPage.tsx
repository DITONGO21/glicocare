import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Plus, Trash2, CalendarClock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { useAuth } from "@/context/AuthContext";
import {
  useCreateDoctorAvailability,
  useDeleteDoctorAvailability,
  useDoctorAvailability,
} from "@/hooks/useDoctorAvailability";
import { extractErrorMessage } from "@/services/api";

const WEEKDAYS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

const slotSchema = z
  .object({
    weekday: z.string().min(1, "Escolha um dia"),
    startTime: z.string().min(1, "Hora de início obrigatória"),
    endTime: z.string().min(1, "Hora de fim obrigatória"),
  })
  .refine((v) => v.endTime > v.startTime, {
    message: "A hora de fim deve ser depois da hora de início",
    path: ["endTime"],
  });
type SlotFormValues = z.infer<typeof slotSchema>;

export function MedicoAgendaPage() {
  const { user } = useAuth();
  const doctorId = user?.profileId ?? undefined;
  const { data: slots, isLoading } = useDoctorAvailability(doctorId);
  const createMutation = useCreateDoctorAvailability(doctorId);
  const deleteMutation = useDeleteDoctorAvailability(doctorId);
  const [weekdayValue, setWeekdayValue] = useState("");

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<SlotFormValues>({
    resolver: zodResolver(slotSchema),
    defaultValues: { weekday: "", startTime: "", endTime: "" },
  });

  const onSubmit = async (values: SlotFormValues) => {
    try {
      await createMutation.mutateAsync({
        weekday: Number(values.weekday),
        startTime: `${values.startTime}:00`,
        endTime: `${values.endTime}:00`,
      });
      toast.success("Horário adicionado.");
      reset();
      setWeekdayValue("");
    } catch (error) {
      toast.error(extractErrorMessage(error, "Não foi possível guardar o horário."));
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteMutation.mutateAsync(id);
      toast.success("Horário removido.");
    } catch (error) {
      toast.error(extractErrorMessage(error));
    }
  };

  const grouped = (slots ?? [])
    .slice()
    .sort((a, b) => a.weekday - b.weekday || a.startTime.localeCompare(b.startTime));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Agenda / Disponibilidade</h1>
        <p className="text-sm text-muted-foreground">
          Defina os seus horários disponíveis por dia da semana. Os utentes associados verão
          estes horários como sugestão ao agendar uma consulta.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Novo bloco de horário</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="grid grid-cols-1 gap-3 sm:grid-cols-4 sm:items-end"
            onSubmit={handleSubmit(onSubmit)}
            noValidate
          >
            <div className="space-y-1.5">
              <span className="text-sm font-medium">Dia da semana</span>
              <Select
                value={weekdayValue}
                onValueChange={(value) => {
                  setWeekdayValue(value as string);
                  setValue("weekday", value as string, { shouldValidate: true });
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecione o dia">
                    {(value: string) => WEEKDAYS[Number(value)] ?? "Selecione o dia"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {WEEKDAYS.map((label, idx) => (
                    <SelectItem key={idx} value={String(idx)}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.weekday && <p className="text-xs text-destructive">{errors.weekday.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="startTime">Início</Label>
              <Input id="startTime" type="time" {...register("startTime")} />
              {errors.startTime && <p className="text-xs text-destructive">{errors.startTime.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="endTime">Fim</Label>
              <Input id="endTime" type="time" {...register("endTime")} />
              {errors.endTime && <p className="text-xs text-destructive">{errors.endTime.message}</p>}
            </div>
            <Button type="submit" disabled={createMutation.isPending} className="gap-2">
              <Plus className="h-4 w-4" />
              Adicionar
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <CalendarClock className="h-4 w-4" /> Horários definidos
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <LoadingSkeleton rows={3} />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Dia</TableHead>
                  <TableHead>Início</TableHead>
                  <TableHead>Fim</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {grouped.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{WEEKDAYS[s.weekday]}</TableCell>
                    <TableCell>{s.startTime.slice(0, 5)}</TableCell>
                    <TableCell>{s.endTime.slice(0, 5)}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label="Remover"
                        onClick={() => handleDelete(s.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {grouped.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground">
                      Ainda não definiu horários de disponibilidade.
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
