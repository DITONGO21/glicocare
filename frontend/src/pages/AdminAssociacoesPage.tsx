import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Link2, Unlink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { useDoctors } from "@/hooks/useDoctors";
import { usePatients } from "@/hooks/usePatients";
import { useAssociations, useCreateAssociation, useRemoveAssociation } from "@/hooks/useAssociations";
import { extractErrorMessage } from "@/services/api";
import { cn } from "@/lib/utils";

export function AdminAssociacoesPage() {
  const { data: doctors, isLoading: doctorsLoading } = useDoctors();
  const { data: patients, isLoading: patientsLoading } = usePatients();
  const { data: associations, isLoading: associationsLoading } = useAssociations();
  const createAssociation = useCreateAssociation();
  const removeAssociation = useRemoveAssociation();

  const [selectedDoctorId, setSelectedDoctorId] = useState<string>("");
  const [selectedPatientIds, setSelectedPatientIds] = useState<Set<string>>(new Set());

  const associatedPatientIds = useMemo(() => {
    if (!selectedDoctorId) return new Set<string>();
    return new Set(
      (associations ?? []).filter((a) => a.doctorId === selectedDoctorId).map((a) => a.patientId)
    );
  }, [associations, selectedDoctorId]);

  const togglePatient = (patientId: string) => {
    setSelectedPatientIds((prev) => {
      const next = new Set(prev);
      if (next.has(patientId)) next.delete(patientId);
      else next.add(patientId);
      return next;
    });
  };

  const handleAssociate = async () => {
    if (!selectedDoctorId || selectedPatientIds.size === 0) return;
    try {
      // Backend: POST /api/associations accepts { doctorId, patientIds: [...] } in a single call.
      await createAssociation.mutateAsync({
        doctorId: selectedDoctorId,
        patientIds: Array.from(selectedPatientIds),
      });
      toast.success("Associações criadas com sucesso.");
      setSelectedPatientIds(new Set());
    } catch (error) {
      toast.error(extractErrorMessage(error, "Não foi possível associar os utentes."));
    }
  };

  const handleRemove = async (associationId: string) => {
    try {
      // Backend: DELETE /api/associations/{id:guid} — the association's own id, not a
      // doctorId/patientId pair.
      await removeAssociation.mutateAsync(associationId);
      toast.success("Associação removida.");
    } catch (error) {
      toast.error(extractErrorMessage(error));
    }
  };

  const isLoading = doctorsLoading || patientsLoading || associationsLoading;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Associações Médico-Utente</h1>
        <p className="text-sm text-muted-foreground">
          Associe utentes a médicos responsáveis pelo seu acompanhamento.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Nova associação</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="max-w-xs space-y-1.5">
            <span className="text-sm font-medium">Médico</span>
            <Select
              value={selectedDoctorId}
              onValueChange={(value) => {
                setSelectedDoctorId(value as string);
                setSelectedPatientIds(new Set());
              }}
            >
              <SelectTrigger className="w-full">
                {/* base-ui's <Select.Value> only resolves a label automatically when the
                    Root is given an `items` map; otherwise it falls back to the raw value.
                    We look the label up ourselves instead of wiring that up. */}
                <SelectValue placeholder="Selecione um médico">
                  {(value: string) => {
                    const doctor = (doctors ?? []).find((d) => d.id === value);
                    return doctor ? `${doctor.fullName} (${doctor.specialty})` : "Selecione um médico";
                  }}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {(doctors ?? []).map((doctor) => (
                  <SelectItem key={doctor.id} value={doctor.id}>
                    {doctor.fullName} ({doctor.specialty})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedDoctorId && (
            <>
              {isLoading ? (
                <LoadingSkeleton rows={3} />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10" />
                      <TableHead>Utente</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(patients ?? []).map((patient) => {
                      const alreadyAssociated = associatedPatientIds.has(patient.id);
                      const isSelected = selectedPatientIds.has(patient.id);
                      return (
                        <TableRow
                          key={patient.id}
                          onClick={() => !alreadyAssociated && togglePatient(patient.id)}
                          className={cn(
                            !alreadyAssociated && "cursor-pointer",
                            isSelected && "bg-primary/5 hover:bg-primary/10"
                          )}
                        >
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <Checkbox
                              checked={alreadyAssociated || isSelected}
                              disabled={alreadyAssociated}
                              onCheckedChange={() => togglePatient(patient.id)}
                            />
                          </TableCell>
                          <TableCell className="font-medium">{patient.fullName}</TableCell>
                          <TableCell>{patient.email}</TableCell>
                          <TableCell>
                            {alreadyAssociated ? (
                              <span className="text-xs text-muted-foreground">Já associado</span>
                            ) : null}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
              <Button
                onClick={handleAssociate}
                disabled={selectedPatientIds.size === 0 || createAssociation.isPending}
              >
                <Link2 className="h-4 w-4" />
                Associar selecionados
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Associações atuais</CardTitle>
        </CardHeader>
        <CardContent>
          {associationsLoading ? (
            <LoadingSkeleton rows={4} />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Médico</TableHead>
                  <TableHead>Utente</TableHead>
                  <TableHead>Desde</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(associations ?? []).map((assoc) => (
                  <TableRow key={assoc.id}>
                    <TableCell className="font-medium">{assoc.doctorName}</TableCell>
                    <TableCell>{assoc.patientName}</TableCell>
                    <TableCell>{new Date(assoc.assignedAt).toLocaleDateString("pt-PT")}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label="Remover associação"
                        onClick={() => handleRemove(assoc.id)}
                      >
                        <Unlink className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {(associations ?? []).length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground">
                      Nenhuma associação registada.
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
