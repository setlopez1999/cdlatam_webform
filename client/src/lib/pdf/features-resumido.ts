import {
  PDF_COLOR_GLOBAL,
  PDF_COLOR_SUBTITLE,
  COLOR_GRAY,
  COLOR_TEXT,
  COLOR_LIGHT,
  resolveHeaderColor,
  USAR_LOGO_EMPRESA,
  LOGO_NATURAL_W_PX,
  LOGO_NATURAL_H_PX,
} from "./constants";
import { drawHeaderSync, getImageDimensions } from "./draw-header";
import type { LogoRenderData } from "./draw-header";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import cdlatamLogoOnBrand from "@/assets/cdlatam-logo-on-brand.png";

// ── Mostrar/ocultar columna N° en la tabla ──────────────────────────────
const MOSTRAR_NUMERACION = false;

/**
 * Genera el PDF "Especificaciones y Matriz de Features".
 * Membrete: franja del color de membrete configurado (PDF_HEADER_COLOR por defecto).
 * Tabla: N° | Módulo/Componente | Descripción | SI (verde) | NO (rojo)
 *
 * @param items        Lista de features con key, label, descripcion y estado
 * @param razonSocial  Nombre del cliente (aparece en el membrete)
 * @param headerColor  Override opcional del color de membrete (prioridad máxima)
 * @param empresaLogoBase64 Logo de la empresa (data URL) para el membrete
 */
export async function buildFeaturesUnoPdfBytes(
  items: Array<{ key: string; label: string; descripcion: string; estado: boolean }>,
  razonSocial: string,
  headerColor?: [number, number, number],
  empresaLogoBase64?: string,
): Promise<Uint8Array> {
  const doc = new jsPDF({ unit: "mm", format: "letter" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;
  const HEADER_H = 26;
  const TOP_MARGIN = 8;
  const BOTTOM_GAP = 10;

  const hColor = resolveHeaderColor(headerColor);

  // Pre-computar logo para usar tanto en draw inicial como en didDrawPage (sync)
  let logoRenderData: LogoRenderData;
  if (USAR_LOGO_EMPRESA && empresaLogoBase64) {
    const dims = await getImageDimensions(empresaLogoBase64);
    logoRenderData = { src: empresaLogoBase64, naturalW: dims.w, naturalH: dims.h };
  } else {
    logoRenderData = { src: cdlatamLogoOnBrand, naturalW: LOGO_NATURAL_W_PX, naturalH: LOGO_NATURAL_H_PX };
  }

  const lo = { fontSize: { title: 11, small: 8 } };

  const drawHeaderFn = () => {
    drawHeaderSync(doc, lo, "Especificaciones y Matriz de Features", [razonSocial], margin, pageWidth, 0, {
      headerColor: hColor,
      bandHeightMm: HEADER_H,
      topMarginMm: TOP_MARGIN,
      bottomGapMm: BOTTOM_GAP,
      fontSizeTitle: 11,
      fontSizeSubtitle: 8,
      titleOffsetY: -3,
      firstLineOffsetY: 4,
      logoRenderData,
    });
  };

  drawHeaderFn();

  // ── Tabla de features ────────────────────────────────────────────────────────
  const startY = TOP_MARGIN + HEADER_H + BOTTOM_GAP;

  const colIncluye = 18;
  const colNro = MOSTRAR_NUMERACION ? 10 : 0;
  const available = contentWidth - colNro - colIncluye;
  const colLabel = Math.floor(available * 0.28);
  const colDesc = available - colLabel;

  const tableRows = items.map((item, idx) => [
    ...(MOSTRAR_NUMERACION ? [String(idx + 1)] : []),
    item.label,
    item.descripcion || "",
    item.estado ? "SI" : "NO",
  ]);

  autoTable(doc, {
    startY,
    head: [[
      ...(MOSTRAR_NUMERACION ? ["N°"] : []),
      "Módulo / Componente",
      "Descripción",
      "Incluye",
    ]],
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
    columnStyles: (() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const cs: Record<string, any> = {};
      let ci = 0;
      if (MOSTRAR_NUMERACION) cs[ci++] = { cellWidth: colNro, halign: "center" };
      cs[ci++] = { cellWidth: colLabel };
      cs[ci++] = { cellWidth: colDesc, textColor: COLOR_GRAY as [number, number, number], fontSize: 7.5 };
      cs[ci++] = { cellWidth: colIncluye, halign: "center", fontStyle: "bold" };
      return cs;
    })(),
    alternateRowStyles: { fillColor: COLOR_LIGHT as [number, number, number] },
    didParseCell: (data) => {
      const incluyeIdx = MOSTRAR_NUMERACION ? 3 : 2;
      if (data.section === "body" && data.column.index === incluyeIdx) {
        if (data.cell.raw === "SI") {
          data.cell.styles.textColor = [16, 185, 129] as [number, number, number];
          data.cell.styles.fontStyle = "bold";
          data.cell.styles.fontSize = 9;
        } else if (data.cell.raw === "NO") {
          data.cell.styles.textColor = [239, 68, 68] as [number, number, number];
          data.cell.styles.fontStyle = "bold";
          data.cell.styles.fontSize = 9;
        }
      }
    },
    didDrawPage: () => {
      drawHeaderFn();
      doc.setFontSize(7);
      doc.setTextColor(...COLOR_GRAY);
      doc.setFont("helvetica", "normal");
      doc.text("CDLatam - Transformacion Digital en Latinoamerica", margin, pageHeight - 6);
      doc.text(new Date().toLocaleDateString("es-CL"), pageWidth - margin, pageHeight - 6, {
        align: "right",
      });
    },
  });

  return new Uint8Array(doc.output("arraybuffer"));
}

/** @deprecated Usar buildFeaturesUnoPdfBytes directamente */
export async function buildFeaturesResumidoPdfBytes(
  items: Array<{ key: string; label: string; descripcion?: string; estado: boolean }>,
  razonSocial: string,
  headerColor?: [number, number, number],
  empresaLogoBase64?: string,
): Promise<Uint8Array> {
  return buildFeaturesUnoPdfBytes(
    items.map(i => ({ ...i, descripcion: i.descripcion ?? "" })),
    razonSocial,
    headerColor,
    empresaLogoBase64,
  );
}
