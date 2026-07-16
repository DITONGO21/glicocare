import type { GlucoseMeasurementDto } from "@/types/api";
import { alertStatusLabel } from "@/components/StatusBadge";

function sourceLabel(source: GlucoseMeasurementDto["source"]) {
  return source === "ESP32Simulado" ? "ESP32" : "Manual";
}

function rowsFor(measurements: GlucoseMeasurementDto[]) {
  return measurements
    .slice()
    .sort((a, b) => new Date(b.measuredAt).getTime() - new Date(a.measuredAt).getTime())
    .map((m) => ({
      "Data/Hora": new Date(m.measuredAt).toLocaleString("pt-PT"),
      "Valor (mg/dL)": m.valueMgDl,
      Origem: sourceLabel(m.source),
      Estado: alertStatusLabel(m.alertStatus),
      Notas: m.notes ?? "",
    }));
}

// xlsx and jspdf are heavy libraries only needed when the user actually exports, so they
// are dynamically imported here instead of bundled into the page chunk that renders the
// export buttons (keeps the initial route chunk small; see Fase 5 performance requirement).
export async function exportMeasurementsToExcel(measurements: GlucoseMeasurementDto[], patientName: string) {
  const XLSX = await import("xlsx");
  const rows = rowsFor(measurements);
  const worksheet = XLSX.utils.json_to_sheet(rows);
  worksheet["!cols"] = [{ wch: 20 }, { wch: 14 }, { wch: 10 }, { wch: 16 }, { wch: 40 }];
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Medições");
  const fileName = `glicocare-historico-${patientName.replace(/\s+/g, "_")}.xlsx`;
  XLSX.writeFile(workbook, fileName);
}

export async function exportMeasurementsToPdf(measurements: GlucoseMeasurementDto[], patientName: string) {
  const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);
  const doc = new jsPDF();
  doc.setFontSize(14);
  doc.text("GlicoCare - Histórico de Medições", 14, 16);
  doc.setFontSize(10);
  doc.text(`Utente: ${patientName}`, 14, 23);
  doc.text(`Gerado em: ${new Date().toLocaleString("pt-PT")}`, 14, 28);

  const rows = rowsFor(measurements).map((r) => [
    r["Data/Hora"],
    String(r["Valor (mg/dL)"]),
    r.Origem,
    r.Estado,
    r.Notas,
  ]);

  autoTable(doc, {
    startY: 34,
    head: [["Data/Hora", "Valor (mg/dL)", "Origem", "Estado", "Notas"]],
    body: rows,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [16, 116, 106] },
  });

  const fileName = `glicocare-historico-${patientName.replace(/\s+/g, "_")}.pdf`;
  doc.save(fileName);
}
