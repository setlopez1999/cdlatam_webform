import {
  PDF_COLOR_GLOBAL,
  COLOR_GRAY,
  COLOR_TEXT,
  COLOR_LIGHT,
  LOGO_NATURAL_W_PX,
  LOGO_NATURAL_H_PX,
  resolveHeaderColor,
  fitImagePreserveAspectMm,
} from "./constants";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
// Logo pre-compuesto sobre fondo azul CDLatam (sin transparencia → no se ve "engranado" en jsPDF)
import cdlatamLogoOnBrand from "@/assets/cdlatam-logo-on-brand.png";

/**
 * Genera el PDF "Especificaciones y Matriz de Features".
 * Membrete: franja del color de membrete configurado (PDF_HEADER_COLOR por defecto).
 * Tabla: N° | Módulo/Componente | Descripción | SI (verde) | NO (rojo)
 *
 * @param items        Lista de features con key, label, descripcion y estado
 * @param razonSocial  Nombre del cliente (aparece en el membrete)
 * @param headerColor  Override opcional del color de membrete (prioridad máxima)
 */
export function buildFeaturesUnoPdfBytes(
  items: Array<{ key: string; label: string; descripcion: string; estado: boolean }>,
  razonSocial: string,
  headerColor?: [number, number, number],
): Uint8Array {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;
  const HEADER_H = 26;  // franja más alta (igual que Acta)
  const TOP_MARGIN = 8; // margen superior del mismo color que la franja
  const BOTTOM_GAP = 10; // espacio entre membrete y tabla

  // Color de membrete: override > PDF_HEADER_COLOR > PDF_COLOR_GLOBAL
  const hColor = resolveHeaderColor(headerColor);

  // ── Función para dibujar el header en cada página ────────────────────────
  const drawHeader = () => {
    // Margen superior del mismo color que la franja
    doc.setFillColor(...hColor);
    doc.rect(0, 0, pageWidth, TOP_MARGIN, "F");

    // Franja de color de membrete, full-ancho
    doc.setFillColor(...hColor);
    doc.rect(0, TOP_MARGIN, pageWidth, HEADER_H, "F");

    // Centro de la franja
    const bandMid = TOP_MARGIN + HEADER_H / 2;

    // Logo pre-compuesto más grande (igual que Acta)
    try {
      const boxW = 72;
      const boxH = 18;
      const { drawW, drawH } = fitImagePreserveAspectMm(LOGO_NATURAL_W_PX, LOGO_NATURAL_H_PX, boxW, boxH);
      const imgX = margin;
      const imgY = TOP_MARGIN + (HEADER_H - drawH) / 2;
      doc.addImage(cdlatamLogoOnBrand, "PNG", imgX, imgY, drawW, drawH, undefined, "FAST");
    } catch { /* omitir si falla */ }

    // Título a la derecha en blanco
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(
      "Especificaciones y Matriz de Features",
      pageWidth - margin,
      bandMid - 3,
      { align: "right", baseline: "middle" },
    );

    // Razón social debajo del título
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(220, 245, 243);
    doc.text(razonSocial || "", pageWidth - margin, bandMid + 4, {
      align: "right",
      baseline: "middle",
    });
  };

  drawHeader();

  // ── Tabla de features ────────────────────────────────────────────────────────
  const startY = TOP_MARGIN + HEADER_H + BOTTOM_GAP;

  // Anchos de columna: N° | Módulo | Descripción | SI | NO
  const colNro = 10;
  const colSiNo = 12;
  const colDesc = Math.floor((contentWidth - colNro - colSiNo * 2) * 0.40);
  const colLabel = contentWidth - colNro - colDesc - colSiNo * 2;

  const tableRows = items.map((item, idx) => [
    String(idx + 1),
    item.label,
    item.descripcion || "",   // ← descripcion técnica del feature
    item.estado ? "SI" : "",
    item.estado ? "" : "NO",
  ]);

  autoTable(doc, {
    startY,
    head: [["N°", "Módulo / Componente", "Descripción", "SI", "NO"]],
    body: tableRows,
    margin: { left: margin, right: margin, top: TOP_MARGIN + HEADER_H + BOTTOM_GAP },
    tableWidth: contentWidth,
    styles: {
      fontSize: 8,
      cellPadding: 2.5,
      textColor: COLOR_TEXT as [number, number, number],
      overflow: "linebreak",
      valign: "middle",
    },
    headStyles: {
      fillColor: PDF_COLOR_GLOBAL as [number, number, number],
      textColor: [255, 255, 255] as [number, number, number],
      fontStyle: "bold",
      halign: "center",
    },
    columnStyles: {
      0: { cellWidth: colNro, halign: "center" },
      1: { cellWidth: colLabel },
      2: { cellWidth: colDesc, textColor: COLOR_GRAY as [number, number, number], fontSize: 7.5 },
      3: { cellWidth: colSiNo, halign: "center", fontStyle: "bold" },
      4: { cellWidth: colSiNo, halign: "center", fontStyle: "bold" },
    },
    alternateRowStyles: { fillColor: COLOR_LIGHT as [number, number, number] },
    didParseCell: (data) => {
      if (data.section === "body") {
        if (data.column.index === 3 && data.cell.raw === "SI") {
          data.cell.styles.textColor = [16, 185, 129] as [number, number, number]; // verde
          data.cell.styles.fontStyle = "bold";
          data.cell.styles.fontSize = 9;
        }
        if (data.column.index === 4 && data.cell.raw === "NO") {
          data.cell.styles.textColor = [239, 68, 68] as [number, number, number]; // rojo
          data.cell.styles.fontStyle = "bold";
          data.cell.styles.fontSize = 9;
        }
      }
    },
    didDrawPage: () => {
      drawHeader();
      // Footer con número de página
      const totalPages = (doc.internal as any).getNumberOfPages?.() ?? 1;
      const currentPage = (doc.internal as any).getCurrentPageInfo?.()?.pageNumber ?? 1;
      doc.setFontSize(7);
      doc.setTextColor(...COLOR_GRAY);
      doc.setFont("helvetica", "normal");
      doc.text("CDLatam — Transformación Digital en Latinoamérica", margin, pageHeight - 6);
      doc.text(`Pág. ${currentPage} / ${totalPages}`, pageWidth - margin, pageHeight - 6, {
        align: "right",
      });
    },
  });

  return doc.output("arraybuffer") as unknown as Uint8Array;
}

/** @deprecated Usar buildFeaturesUnoPdfBytes directamente */
export function buildFeaturesResumidoPdfBytes(
  items: Array<{ key: string; label: string; descripcion?: string; estado: boolean }>,
  razonSocial: string,
  headerColor?: [number, number, number],
): Uint8Array {
  return buildFeaturesUnoPdfBytes(
    items.map(i => ({ ...i, descripcion: i.descripcion ?? "" })),
    razonSocial,
    headerColor,
  );
}
