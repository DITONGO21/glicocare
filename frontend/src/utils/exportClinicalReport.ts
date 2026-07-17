import type { ClinicalNoteDto, GlucoseMeasurementDto, PatientDetailDto } from "@/types/api";
import { alertStatusLabel } from "@/components/StatusBadge";

function calcAge(dateOfBirth?: string | null): string {
  if (!dateOfBirth) return "-";
  const dob = new Date(dateOfBirth);
  const diff = Date.now() - dob.getTime();
  const age = Math.floor(diff / (365.25 * 24 * 60 * 60 * 1000));
  return `${age} anos`;
}

const LAST_N_MEASUREMENTS = 30;

// Same dynamic-import pattern as exportMeasurements.ts: jspdf/jspdf-autotable are only
// pulled in when the doctor actually clicks "Exportar Relatório Clínico".
export async function exportClinicalReportToPdf(
  patient: PatientDetailDto,
  measurements: GlucoseMeasurementDto[],
  notes: ClinicalNoteDto[]
) {
  const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);
  const doc = new jsPDF();

  doc.setFontSize(16);
  doc.text("GlicoCare - Relatório Clínico", 14, 16);
  doc.setFontSize(10);
  doc.text(`Gerado em: ${new Date().toLocaleString("pt-PT")}`, 14, 22);

  doc.setFontSize(12);
  doc.text("Dados do Utente", 14, 32);
  autoTable(doc, {
    startY: 36,
    theme: "plain",
    styles: { fontSize: 9 },
    body: [
      ["Nome", patient.fullName],
      ["Idade", calcAge(patient.dateOfBirth)],
      ["Tipo de Diabetes", patient.diabetesType ?? "-"],
      [
        "Alvo Glicémico",
        `${patient.targetGlucoseMin ?? "-"} - ${patient.targetGlucoseMax ?? "-"} mg/dL`,
      ],
    ],
  });

  const values = measurements.map((m) => m.valueMgDl);
  const average = values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
  const min = values.length ? Math.min(...values) : 0;
  const max = values.length ? Math.max(...values) : 0;
  const alertsCount = measurements.filter((m) => m.alertStatus !== "None").length;

  const afterPatientTable = (doc as any).lastAutoTable.finalY + 10;
  doc.setFontSize(12);
  doc.text("Resumo Estatístico do Histórico", 14, afterPatientTable);
  autoTable(doc, {
    startY: afterPatientTable + 4,
    theme: "plain",
    styles: { fontSize: 9 },
    body: [
      ["Nº de medições", String(measurements.length)],
      ["Média (mg/dL)", average ? average.toFixed(1) : "-"],
      ["Mínimo (mg/dL)", values.length ? String(min) : "-"],
      ["Máximo (mg/dL)", values.length ? String(max) : "-"],
      ["Nº de alertas", String(alertsCount)],
    ],
  });

  const recentMeasurements = measurements
    .slice()
    .sort((a, b) => new Date(b.measuredAt).getTime() - new Date(a.measuredAt).getTime())
    .slice(0, LAST_N_MEASUREMENTS);

  const afterStatsTable = (doc as any).lastAutoTable.finalY + 10;
  doc.setFontSize(12);
  doc.text(`Últimas ${recentMeasurements.length} Medições`, 14, afterStatsTable);
  autoTable(doc, {
    startY: afterStatsTable + 4,
    head: [["Data/Hora", "Valor (mg/dL)", "Estado"]],
    body: recentMeasurements.map((m) => [
      new Date(m.measuredAt).toLocaleString("pt-PT"),
      String(m.valueMgDl),
      alertStatusLabel(m.alertStatus),
    ]),
    styles: { fontSize: 8 },
    headStyles: { fillColor: [16, 116, 106] },
  });

  const afterMeasurementsTable = (doc as any).lastAutoTable.finalY + 10;
  doc.setFontSize(12);
  doc.text("Notas Clínicas do Médico", 14, afterMeasurementsTable);
  autoTable(doc, {
    startY: afterMeasurementsTable + 4,
    head: [["Data", "Nota"]],
    body:
      notes.length > 0
        ? notes.map((n) => [new Date(n.createdAt).toLocaleString("pt-PT"), n.content])
        : [["-", "Sem notas registadas."]],
    styles: { fontSize: 8, cellWidth: "wrap" },
    columnStyles: { 1: { cellWidth: 140 } },
    headStyles: { fillColor: [16, 116, 106] },
  });

  const fileName = `glicocare-relatorio-clinico-${patient.fullName.replace(/\s+/g, "_")}.pdf`;
  doc.save(fileName);
}
