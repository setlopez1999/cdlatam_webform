import { COLOR_BRAND, COLOR_TEXT, COLOR_GRAY, LOGO_NATURAL_W_PX, LOGO_NATURAL_H_PX } from "./constants";
import { fitImagePreserveAspectMm } from "./constants";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import cdlatamLogoDataUrl from "@/assets/cdlatam-logo.png";

export function buildFeaturesResumidoPdfBytes(
  items: Array<{ key: string; label: string; estado: boolean }>,
  razonSocial: string,
): Uint8Array {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  const logo: string | null = cdlatamLogoDataUrl ?? null;
  if (logo) {
    doc.setFillColor(...COLOR_TEXT);
    doc.roundedRect(margin, y, 55, 16, 2, 2, "F");
    try {
      const innerX = margin + 4;
      const innerY = y + 2;
      const boxW = 47;
      const boxH = 12;
      const { drawW, drawH } = fitImagePreserveAspectMm(LOGO_NATURAL_W_PX, LOGO_NATURAL_H_PX, boxW, boxH);
      const imgX = innerX + (boxW - drawW) / 2;
      const imgY = innerY + (boxH - drawH) / 2;
      doc.addImage(logo, "PNG", imgX, imgY, drawW, drawH, undefined, "FAST");
    } catch { /* omitir si falla */ }
  }

  doc.setTextColor(...COLOR_TEXT);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("Features Resumido", pageWidth - margin, y + 5, { align: "right" });
  doc.setTextColor(...COLOR_GRAY);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(razonSocial || "\u2014", pageWidth - margin, y + 11, { align: "right" });
  y += 16;

  doc.setDrawColor(...COLOR_BRAND);
  doc.setLineWidth(0.7);
  doc.line(margin, y, pageWidth - margin, y);
  y += 6;

  const tableRows = items.map((item, idx) => [`${idx + 1}. ${item.label}`, item.estado ? "SI" : "NO"]);

  autoTable(doc, {
    startY: y,
    head: [["Feature / M\u00f3dulo", "Incluido"]],
    body: tableRows,
    margin: { left: margin, right: margin },
    tableWidth: contentWidth,
    styles: { fontSize: 9, cellPadding: 3, textColor: [15, 32, 39] as [number, number, number] },
    headStyles: { fillColor: COLOR_BRAND, textColor: [255, 255, 255] as [number, number, number], fontStyle: "bold" },
    columnStyles: {
      0: { cellWidth: contentWidth - 30 },
      1: { cellWidth: 30, halign: "center", fontStyle: "bold" },
    },
    didParseCell: (data) => {
      if (data.section === "body" && data.column.index === 1) {
        const val = data.cell.raw as string;
        data.cell.styles.textColor = val === "SI"
          ? ([16, 185, 129] as [number, number, number])
          : ([239, 68, 68] as [number, number, number]);
      }
    },
  });

  return doc.output("arraybuffer") as unknown as Uint8Array;
}
