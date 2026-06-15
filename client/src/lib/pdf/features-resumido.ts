import { COLOR_BRAND, COLOR_TEXT, COLOR_GRAY, COLOR_LIGHT, LOGO_NATURAL_W_PX, LOGO_NATURAL_H_PX } from "./constants";
import { fitImagePreserveAspectMm } from "./constants";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import cdlatamLogoDataUrl from "@/assets/cdlatam-logo.png";

/** Genera el PDF "Especificaciones y Matriz de Features" (antes: features_full + features_resumido).
 *  Membrete azul full-ancho con logo blanco, tabla con columnas: N° | Módulo | Descripción | SI | NO
 */
export function buildFeaturesUnoPdfBytes(
  items: Array<{ key: string; label: string; descripcion: string; estado: boolean }>,
  razonSocial: string,
): Uint8Array {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;
  const HEADER_H = 20;

  // ── Función para dibujar el header azul en cada página ──────────────────────
  const drawHeader = () => {
    // Franja azul full-ancho
    doc.setFillColor(...COLOR_BRAND);
    doc.rect(0, 0, pageWidth, HEADER_H, "F");

    // Logo blanco sobre azul
    const logo: string | null = cdlatamLogoDataUrl ?? null;
    if (logo) {
      try {
        const boxW = 42;
        const boxH = 12;
        const { drawW, drawH } = fitImagePreserveAspectMm(LOGO_NATURAL_W_PX, LOGO_NATURAL_H_PX, boxW, boxH);
        const imgX = margin + (boxW - drawW) / 2;
        const imgY = (HEADER_H - drawH) / 2;
        doc.addImage(logo, "PNG", imgX, imgY, drawW, drawH, undefined, "FAST");
      } catch { /* omitir si falla */ }
    }

    // Título a la derecha
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("Especificaciones y Matriz de Features", pageWidth - margin, HEADER_H / 2 - 1, { align: "right", baseline: "middle" });

    // Razón social debajo del título
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(220, 245, 243);
    doc.text(razonSocial || "", pageWidth - margin, HEADER_H / 2 + 4, { align: "right", baseline: "middle" });
  };

  drawHeader();

  // ── Tabla de features ────────────────────────────────────────────────────────
  const startY = HEADER_H + 8;

  // Columnas: N° | Módulo / Componente | Descripción | SI | NO
  const colNro = 10;
  const colSiNo = 12;
  const colDesc = Math.floor((contentWidth - colNro - colSiNo * 2) * 0.38);
  const colLabel = contentWidth - colNro - colDesc - colSiNo * 2;

  const tableRows = items.map((item, idx) => [
    String(idx + 1),
    item.label,
    item.descripcion || "",
    item.estado ? "✓" : "",
    item.estado ? "" : "✓",
  ]);

  autoTable(doc, {
    startY,
    head: [["N°", "Módulo / Componente", "Descripción", "SI", "NO"]],
    body: tableRows,
    margin: { left: margin, right: margin },
    tableWidth: contentWidth,
    styles: {
      fontSize: 8,
      cellPadding: 2.5,
      textColor: COLOR_TEXT as [number, number, number],
      overflow: "linebreak",
    },
    headStyles: {
      fillColor: COLOR_BRAND as [number, number, number],
      textColor: [255, 255, 255] as [number, number, number],
      fontStyle: "bold",
      halign: "center",
    },
    columnStyles: {
      0: { cellWidth: colNro, halign: "center" },
      1: { cellWidth: colLabel },
      2: { cellWidth: colDesc, textColor: COLOR_GRAY as [number, number, number] },
      3: { cellWidth: colSiNo, halign: "center", fontStyle: "bold" },
      4: { cellWidth: colSiNo, halign: "center", fontStyle: "bold" },
    },
    alternateRowStyles: { fillColor: COLOR_LIGHT as [number, number, number] },
    didParseCell: (data) => {
      if (data.section === "body") {
        if (data.column.index === 3 && data.cell.raw === "✓") {
          data.cell.styles.textColor = [16, 185, 129] as [number, number, number]; // verde
        }
        if (data.column.index === 4 && data.cell.raw === "✓") {
          data.cell.styles.textColor = [239, 68, 68] as [number, number, number]; // rojo
        }
      }
    },
    didDrawPage: () => {
      // Redibujar header en cada página nueva
      drawHeader();
      // Footer
      const totalPages = (doc.internal as any).getNumberOfPages?.() ?? 1;
      const currentPage = (doc.internal as any).getCurrentPageInfo?.()?.pageNumber ?? 1;
      doc.setFontSize(7);
      doc.setTextColor(...COLOR_GRAY);
      doc.setFont("helvetica", "normal");
      doc.text(
        `CDLatam — Transformación Digital en Latinoamérica`,
        margin,
        pageHeight - 6,
      );
      doc.text(
        `Pág. ${currentPage} / ${totalPages}`,
        pageWidth - margin,
        pageHeight - 6,
        { align: "right" },
      );
    },
  });

  return doc.output("arraybuffer") as unknown as Uint8Array;
}

/** @deprecated Usar buildFeaturesUnoPdfBytes */
export function buildFeaturesResumidoPdfBytes(
  items: Array<{ key: string; label: string; descripcion?: string; estado: boolean }>,
  razonSocial: string,
): Uint8Array {
  return buildFeaturesUnoPdfBytes(
    items.map(i => ({ ...i, descripcion: i.descripcion ?? "" })),
    razonSocial,
  );
}
