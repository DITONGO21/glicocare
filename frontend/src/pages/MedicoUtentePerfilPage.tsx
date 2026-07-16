import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from "recharts";
import { FileDown, FileSpreadsheet } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { StatusBadge, alertStatusLabel, alertStatusLevel } from "@/components/StatusBadge";
import { AiInsightsPanel } from "@/components/AiInsightsPanel";
import { usePatient } from "@/hooks/usePatients";
import { useMeasurements, useUpdateAlertStatus } from "@/hooks/useMeasurements";
import { useClinicalNotes, useCreateClinicalNote } from "@/hooks/useClinicalNotes";
import { useConversations, useCreateOrGetConversation, useMessages, useSendMessage } from "@/hooks/useMessages";
import { useAuth } from "@/context/AuthContext";
import { extractErrorMessage } from "@/services/api";
import { sendMessage as sendMessageRequest } from "@/services/messageService";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { exportMeasurementsToExcel, exportMeasurementsToPdf } from "@/utils/exportMeasurements";
import type { AlertStatus } from "@/types/api";

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function calcAge(dateOfBirth?: string | null): string {
  if (!dateOfBirth) return "-";
  const dob = new Date(dateOfBirth);
  const diff = Date.now() - dob.getTime();
  const age = Math.floor(diff / (365.25 * 24 * 60 * 60 * 1000));
  return `${age} anos`;
}

const noteSchema = z.object({
  content: z.string().min(3, "A nota não pode estar vazia"),
});
type NoteFormValues = z.infer<typeof noteSchema>;

export function MedicoUtentePerfilPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: patient, isLoading: patientLoading } = usePatient(id);
  const { data: measurements, isLoading: measurementsLoading } = useMeasurements(id);
  const { data: notes, isLoading: notesLoading } = useClinicalNotes(id);
  const createNote = useCreateClinicalNote(id);
  const updateAlertStatus = useUpdateAlertStatus(id);

  const handleAlertStatusChange = async (measurementId: string, alertStatus: AlertStatus) => {
    try {
      await updateAlertStatus.mutateAsync({ id: measurementId, alertStatus });
      toast.success("Estado do alerta atualizado.");
    } catch (error) {
      toast.error(extractErrorMessage(error, "Não foi possível atualizar o alerta."));
    }
  };

  // Messaging: find the conversation tied to this patient, creating it on demand
  // (POST /api/conversations is idempotent server-side).
  const { data: conversations } = useConversations();
  const existingConversation = useMemo(
    () => conversations?.find((c) => c.patientId === patient?.id),
    [conversations, patient]
  );
  const createConversation = useCreateOrGetConversation();
  const [createdConversationId, setCreatedConversationId] = useState<string | undefined>(undefined);
  const conversation = existingConversation ?? (createdConversationId ? { id: createdConversationId } : undefined);
  const { data: messages, isLoading: messagesLoading } = useMessages(conversation?.id);
  const sendMessage = useSendMessage(conversation?.id);
  const [messageText, setMessageText] = useState("");

  const ensureConversation = async (): Promise<string | undefined> => {
    if (conversation?.id) return conversation.id;
    if (!user?.profileId || !patient) return undefined;
    const created = await createConversation.mutateAsync({ doctorId: user.profileId, patientId: patient.id });
    setCreatedConversationId(created.id);
    return created.id;
  };

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<NoteFormValues>({ resolver: zodResolver(noteSchema) });

  const chartData = useMemo(
    () =>
      (measurements ?? [])
        .slice()
        .sort((a, b) => new Date(a.measuredAt).getTime() - new Date(b.measuredAt).getTime())
        .map((m) => ({
          date: new Date(m.measuredAt).toLocaleDateString("pt-PT", { day: "2-digit", month: "2-digit" }),
          valor: m.valueMgDl,
        })),
    [measurements]
  );

  const onSubmitNote = async (values: NoteFormValues) => {
    try {
      await createNote.mutateAsync(values);
      toast.success("Nota clínica adicionada.");
      reset();
    } catch (error) {
      toast.error(extractErrorMessage(error, "Não foi possível guardar a nota."));
    }
  };

  const handleSendMessage = async () => {
    if (!messageText.trim()) return;
    try {
      const conversationId = await ensureConversation();
      if (!conversationId) return;
      // Send directly against the resolved id: if the conversation was just created,
      // `sendMessage` (bound to the previous render's conversation?.id) would still be stale.
      await sendMessageRequest(conversationId, { content: messageText.trim() });
      setMessageText("");
      queryClient.invalidateQueries({ queryKey: ["conversations", conversationId, "messages"] });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    } catch (error) {
      toast.error(extractErrorMessage(error, "Não foi possível enviar a mensagem."));
    }
  };

  if (patientLoading) {
    return <LoadingSkeleton rows={6} />;
  }

  if (!patient) {
    return <p className="text-sm text-muted-foreground">Utente não encontrado.</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Avatar className="h-14 w-14">
          <AvatarFallback className="bg-primary/10 text-lg font-semibold text-primary">
            {initials(patient.fullName)}
          </AvatarFallback>
        </Avatar>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{patient.fullName}</h1>
          <p className="text-sm text-muted-foreground">{patient.email}</p>
        </div>
      </div>

      <Tabs defaultValue="resumo">
        <TabsList>
          <TabsTrigger value="resumo">Resumo</TabsTrigger>
          <TabsTrigger value="historico">Histórico</TabsTrigger>
          <TabsTrigger value="graficos">Gráficos</TabsTrigger>
          <TabsTrigger value="ia">Análise IA</TabsTrigger>
          <TabsTrigger value="mensagens">Mensagens</TabsTrigger>
          <TabsTrigger value="notas">Notas Clínicas</TabsTrigger>
        </TabsList>

        <TabsContent value="resumo" className="mt-4 space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="pb-1">
                <CardTitle className="text-sm font-medium text-muted-foreground">Idade</CardTitle>
              </CardHeader>
              <CardContent className="text-xl font-semibold">{calcAge(patient.dateOfBirth)}</CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-1">
                <CardTitle className="text-sm font-medium text-muted-foreground">Tipo de Diabetes</CardTitle>
              </CardHeader>
              <CardContent className="text-xl font-semibold">{patient.diabetesType ?? "-"}</CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-1">
                <CardTitle className="text-sm font-medium text-muted-foreground">Alvo Glicémico</CardTitle>
              </CardHeader>
              <CardContent className="text-xl font-semibold">
                {patient.targetGlucoseMin ?? "-"} - {patient.targetGlucoseMax ?? "-"} mg/dL
              </CardContent>
            </Card>
          </div>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Dados pessoais</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
              <p>
                <span className="text-muted-foreground">Telefone: </span>
                {patient.phoneNumber ?? "-"}
              </p>
              <p>
                <span className="text-muted-foreground">Data de nascimento: </span>
                {patient.dateOfBirth?.slice(0, 10) ?? "-"}
              </p>
              {/* TODO: altura/peso não existem no backend (PatientDto não os expõe) - ver
                  se serão adicionados numa fase futura antes de reativar este bloco. */}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="historico" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
              <CardTitle className="text-base">Histórico de medições</CardTitle>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  disabled={(measurements ?? []).length === 0}
                  onClick={() => exportMeasurementsToExcel(measurements ?? [], patient.fullName)}
                >
                  <FileSpreadsheet className="h-4 w-4" aria-hidden="true" />
                  Excel
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  disabled={(measurements ?? []).length === 0}
                  onClick={() => exportMeasurementsToPdf(measurements ?? [], patient.fullName)}
                >
                  <FileDown className="h-4 w-4" aria-hidden="true" />
                  PDF
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {measurementsLoading ? (
                <LoadingSkeleton rows={4} />
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
                    {(measurements ?? []).map((m) => (
                      <TableRow key={m.id}>
                        <TableCell>{new Date(m.measuredAt).toLocaleString("pt-PT")}</TableCell>
                        <TableCell className="font-medium">{m.valueMgDl}</TableCell>
                        <TableCell>{m.source === "ESP32Simulado" ? "ESP32" : "Manual"}</TableCell>
                        <TableCell>
                          {m.alertStatus === "None" ? (
                            <StatusBadge status={alertStatusLevel(m.alertStatus)} label={alertStatusLabel(m.alertStatus)} />
                          ) : (
                            <Select
                              value={m.alertStatus}
                              onValueChange={(value) => handleAlertStatusChange(m.id, value as AlertStatus)}
                            >
                              <SelectTrigger size="sm" className="w-auto">
                                <SelectValue>
                                  <StatusBadge status={alertStatusLevel(m.alertStatus)} label={alertStatusLabel(m.alertStatus)} />
                                </SelectValue>
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="UnderObservation">Em observação</SelectItem>
                                <SelectItem value="Resolved">Resolvido</SelectItem>
                                <SelectItem value="Ignored">Ignorado</SelectItem>
                              </SelectContent>
                            </Select>
                          )}
                        </TableCell>
                        <TableCell className="max-w-40 truncate">{m.notes ?? "-"}</TableCell>
                      </TableRow>
                    ))}
                    {(measurements ?? []).length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground">
                          Sem medições registadas.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="graficos" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Evolução da glicemia</CardTitle>
            </CardHeader>
            <CardContent className="h-80">
              {measurementsLoading ? (
                <LoadingSkeleton rows={3} />
              ) : chartData.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sem dados suficientes para gráfico.</p>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="date" stroke="var(--muted-foreground)" fontSize={12} />
                    <YAxis stroke="var(--muted-foreground)" fontSize={12} />
                    <RechartsTooltip
                      contentStyle={{
                        backgroundColor: "var(--popover)",
                        border: "1px solid var(--border)",
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                    />
                    <Line type="monotone" dataKey="valor" stroke="var(--chart-1)" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ia" className="mt-4">
          <AiInsightsPanel patientId={patient.id} />
        </TabsContent>

        <TabsContent value="mensagens" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Mensagens</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {!conversation ? (
                <p className="text-sm text-muted-foreground">
                  Ainda não existe uma conversa com este utente.
                </p>
              ) : (
                <>
                  <div className="max-h-80 space-y-2 overflow-y-auto">
                    {messagesLoading ? (
                      <LoadingSkeleton rows={3} />
                    ) : (
                      (messages ?? []).map((msg) => (
                        <div key={msg.id} className="rounded-lg bg-muted/50 px-3 py-2 text-sm">
                          <p className="text-xs font-medium text-muted-foreground">
                            {msg.senderUserId === user?.id ? "Você" : patient.fullName}
                          </p>
                          <p>{msg.content}</p>
                        </div>
                      ))
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Escreva uma mensagem..."
                      value={messageText}
                      onChange={(e) => setMessageText(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                    />
                    <Button onClick={handleSendMessage} disabled={sendMessage.isPending}>
                      Enviar
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notas" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Nova nota clínica</CardTitle>
            </CardHeader>
            <CardContent>
              <form className="space-y-3" onSubmit={handleSubmit(onSubmitNote)} noValidate>
                <Textarea placeholder="Escreva a nota clínica..." {...register("content")} />
                {errors.content && <p className="text-xs text-destructive">{errors.content.message}</p>}
                <Button type="submit" disabled={createNote.isPending}>
                  Adicionar nota
                </Button>
              </form>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Histórico de notas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {notesLoading ? (
                <LoadingSkeleton rows={3} />
              ) : (notes ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">Sem notas registadas.</p>
              ) : (
                (notes ?? []).map((note) => (
                  <div key={note.id} className="rounded-lg border p-3 text-sm">
                    <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
                      <span>{note.doctorName}</span>
                      <span>{new Date(note.createdAt).toLocaleString("pt-PT")}</span>
                    </div>
                    <p>{note.content}</p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
