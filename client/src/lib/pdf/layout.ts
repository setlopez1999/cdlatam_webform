import type { ActaData } from "@/hooks/useFormStore";
import type { ActaPdfExportOpts, PdfLayout, SectionFlags } from "./types";
import { buildActaCodigo } from "@shared/documentCodes";
import { jsPDF } from "jspdf";

function roundSize(v: number): number {
  return Math.round(v * 10) / 10;
}

export function effectiveNoActaForPdf(acta: ActaData, expedienteUuid?: string): string {
  const t = acta.noActa?.trim();
  if (t) return t;
  const ex = expedienteUuid?.trim();
  if (ex) return buildActaCodigo(ex);
  return "";
}

export function resolveLayout(doc: jsPDF, opts: ActaPdfExportOpts): PdfLayout {
  const scale = opts.fontSizeScale ?? (opts.singlePage || opts.compact ? 0.82 : 1.0);
  const margin = opts.compact || opts.singlePage ? 12 : 15;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const contentWidth = pageWidth - margin * 2;
  const compact = !!(opts.compact || opts.singlePage);

  return {
    scale,
    margin,
    contentWidth,
    pageWidth,
    pageHeight,
    fontSize: {
      title: roundSize(13 * scale),
      subtitle: roundSize(10 * scale),
      sectionTitle: roundSize(8 * scale),
      body: roundSize(8.5 * scale),
      small: roundSize(7 * scale),
      tiny: roundSize(6.5 * scale),
    },
    lineHeight: compact ? 3.2 : 4,
    spacing: compact ? 2 : 4,
    cellPadding: compact ? 0.8 : 1.5,
    compact,
    singlePage: !!opts.singlePage,
    noPageBreaks: !!opts.singlePage,
    sections: {
      formasPago: opts.sections?.formasPago ?? true,
      consideraciones: opts.sections?.consideraciones ?? true,
      clausulasLegales: opts.sections?.clausulasLegales ?? true,
    },
  };
}

export function estimateTotalHeight(
  acta: ActaData,
  layout: Pick<PdfLayout, "scale" | "margin" | "contentWidth" | "fontSize" | "lineHeight" | "spacing" | "cellPadding" | "sections">,
): number {
  const { margin, fontSize, lineHeight, spacing, cellPadding, sections } = layout;
  let y = margin;

  y += 16 + 5;
  y += 9;
  y += 12;
  y += 3;
  y += 5 + 9 * 3;
  y += 4 + 5 + 10 + 4 * 4.5 * layout.scale + 2 + 3;
  y += 5;
  const filas = acta.serviciosContratados.length + 1;
  const rowH = fontSize.body * 0.35 + cellPadding * 2 + 0.5;
  y += filas * rowH + 6;

  if (sections.formasPago) {
    if (acta.formasPagoImplementacion?.length) y += 5 + (acta.formasPagoImplementacion.length + 1) * rowH + 6;
    if (acta.formasPagoMantencion?.length) y += 5 + (acta.formasPagoMantencion.length + 1) * rowH + 6;
  }

  if (sections.consideraciones) {
    y += 5;
    const cons = (acta as { consideracionesPersonalizadas?: string[] }).consideracionesPersonalizadas ?? [];
    y += cons.length ? cons.length * (lineHeight + 1) + 2 : 5;
  }

  if (sections.clausulasLegales) {
    const cl = (acta as { clausulasLegales?: string }).clausulasLegales ?? "";
    if (cl.trim()) {
      const lineCount = Math.ceil(cl.length / 80) + 1;
      y += 5 + lineCount * lineHeight + 2;
    }
  }

  return y - margin;
}

export function findBestScale(acta: ActaData, doc: jsPDF, opts: ActaPdfExportOpts): number {
  const pageHeight = 297;
  const SIG_HEIGHT = 14;
  const usableHeight = pageHeight - 12 * 2 - 10 - SIG_HEIGHT;
  for (let s = 1.0; s >= 0.6; s -= 0.04) {
    const testLayout = buildTestLayout(doc, s, opts);
    const estimated = estimateTotalHeight(acta, testLayout);
    if (estimated <= usableHeight) return s;
  }
  return 0.6;
}

export function buildTestLayout(doc: jsPDF, scale: number, opts: ActaPdfExportOpts) {
  const margin = 12;
  const pageWidth = doc.internal.pageSize.getWidth();
  const contentWidth = pageWidth - margin * 2;
  return {
    scale,
    margin,
    contentWidth,
    fontSize: {
      title: roundSize(13 * scale),
      subtitle: roundSize(10 * scale),
      sectionTitle: roundSize(8 * scale),
      body: roundSize(8.5 * scale),
      small: roundSize(7 * scale),
      tiny: roundSize(6.5 * scale),
    },
    lineHeight: 3.2,
    spacing: 2,
    cellPadding: 0.8,
    sections: {
      formasPago: opts.sections?.formasPago ?? true,
      consideraciones: opts.sections?.consideraciones ?? true,
      clausulasLegales: opts.sections?.clausulasLegales ?? true,
    } as Required<SectionFlags>,
  };
}
