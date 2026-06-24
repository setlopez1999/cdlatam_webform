import type { PdfLayout } from "./types";
import type { jsPDF } from "jspdf";
import {
  PDF_COLOR_SUBTITLE,
  COLOR_TEXT,
  LOGO_NATURAL_W_PX,
  LOGO_NATURAL_H_PX,
  resolveHeaderColor,
  fitImagePreserveAspectMm,
  drawHeaderBand,
  USAR_LOGO_EMPRESA,
} from "./constants";
import cdlatamLogoOnBrand from "@/assets/cdlatam-logo-on-brand.png";

export type HeaderOptions = {
  headerColor?: [number, number, number];
  bandHeightMm?: number;
  topMarginMm?: number;
  bottomGapMm?: number;
};

const DEFAULTS = {
  bandHeightMm: 26,
  topMarginMm: 8,
  bottomGapMm: 10,
};

export function drawSharedHeader(
  doc: jsPDF,
  lo: PdfLayout,
  title: string,
  rightLines: string[],
  margin: number,
  pageWidth: number,
  y: number,
  opts?: HeaderOptions & { empresaLogoBase64?: string },
): number {
  const bandH = opts?.bandHeightMm ?? DEFAULTS.bandHeightMm;
  const topM = opts?.topMarginMm ?? DEFAULTS.topMarginMm;
  const botG = opts?.bottomGapMm ?? DEFAULTS.bottomGapMm;
  const hColor = resolveHeaderColor(opts?.headerColor);

  drawHeaderBand(doc, 0, y, pageWidth, topM, hColor);
  drawHeaderBand(doc, 0, y + topM, pageWidth, bandH, hColor);

  try {
    const boxW = 72;
    const boxH = 18;
    const { drawW, drawH } = fitImagePreserveAspectMm(LOGO_NATURAL_W_PX, LOGO_NATURAL_H_PX, boxW, boxH);
    const imgX = margin;
    const imgY = y + topM + (bandH - drawH) / 2;
    if (USAR_LOGO_EMPRESA && opts?.empresaLogoBase64) {
      doc.addImage(opts.empresaLogoBase64, "PNG", imgX, imgY, drawW, drawH, undefined, "FAST");
    } else {
      doc.addImage(cdlatamLogoOnBrand, "PNG", imgX, imgY, drawW, drawH, undefined, "FAST");
    }
  } catch { /* omitir si falla */ }

  const bandMid = y + topM + bandH / 2;

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(lo.fontSize.title);
  doc.text(title, pageWidth - margin, bandMid - 4, { align: "right", baseline: "middle" });

  let lineOffset = 2;
  for (const line of rightLines) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(lo.fontSize.small);
    doc.setTextColor(...PDF_COLOR_SUBTITLE);
    doc.text(line, pageWidth - margin, bandMid + lineOffset, { align: "right", baseline: "middle" });
    lineOffset += 5;
  }

  y += topM + bandH + botG;
  doc.setTextColor(...COLOR_TEXT);
  return y;
}
