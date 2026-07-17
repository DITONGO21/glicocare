import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { useActivityLogs } from "@/hooks/useActivityLogs";

const PAGE_SIZE = 20;

export function AdminLogsPage() {
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState("");
  const { data, isLoading } = useActivityLogs(page, PAGE_SIZE);

  const filteredItems = useMemo(() => {
    const term = filter.trim().toLowerCase();
    if (!term) return data?.items ?? [];
    return (data?.items ?? []).filter(
      (log) => log.action.toLowerCase().includes(term) || log.userName.toLowerCase().includes(term)
    );
  }, [data, filter]);

  const totalCount = data?.totalCount ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Logs de Auditoria</h1>
        <p className="text-sm text-muted-foreground">
          Registo de atividade da plataforma (mais recente primeiro).
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Atividade</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filtrar por ação ou utilizador..."
            className="max-w-sm"
          />
          {isLoading ? (
            <LoadingSkeleton rows={6} />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data/Hora</TableHead>
                    <TableHead>Utilizador</TableHead>
                    <TableHead>Ação</TableHead>
                    <TableHead>Detalhes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredItems.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>{new Date(log.createdAt).toLocaleString("pt-PT")}</TableCell>
                      <TableCell className="font-medium">{log.userName}</TableCell>
                      <TableCell>{log.action}</TableCell>
                      <TableCell className="max-w-80 truncate text-muted-foreground">
                        {log.details ?? "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredItems.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground">
                        {filter ? "Nenhum registo corresponde ao filtro." : "Sem registos de atividade."}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
              <div className="flex items-center justify-between gap-2 pt-2">
                <p className="text-xs text-muted-foreground">
                  Página {page} de {totalPages} ({totalCount} registos)
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="icon-sm"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    aria-label="Página anterior"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon-sm"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    aria-label="Página seguinte"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
