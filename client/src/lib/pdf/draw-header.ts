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
  fontSizeTitle?: number;
  fontSizeSubtitle?: number;
  titleOffsetY?: number;
  firstLineOffsetY?: number;
};

export type LogoRenderData = {
  src: string;
  naturalW: number;
  naturalH: number;
};

const DEFAULTS = {
  bandHeightMm: 26,
  topMarginMm: 8,
  bottomGapMm: 10,
};

export function getImageDimensions(src: string): Promise<{ w: number; h: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
    img.onerror = () => reject(new Error("No se pudo cargar la imagen"));
    img.src = src;
  });
}

export function drawHeaderSync(
  doc: jsPDF,
  lo: { fontSize: { title: number; small: number } },
  title: string,
  rightLines: string[],
  margin: number,
  pageWidth: number,
  y: number,
  opts?: HeaderOptions & { logoRenderData?: LogoRenderData },
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
    const logo = opts?.logoRenderData ?? {
      src: cdlatamLogoOnBrand,
      naturalW: LOGO_NATURAL_W_PX,
      naturalH: LOGO_NATURAL_H_PX,
    };
    const { drawW, drawH } = fitImagePreserveAspectMm(logo.naturalW, logo.naturalH, boxW, boxH);
    const imgX = margin;
    const imgY = y + topM + (bandH - drawH) / 2;
    doc.addImage(logo.src, "PNG", imgX, imgY, drawW, drawH, undefined, "FAST");
  } catch { /* omitir si falla */ }

  const bandMid = y + topM + bandH / 2;
  const fTitle = opts?.fontSizeTitle ?? lo.fontSize.title;
  const fSmall = opts?.fontSizeSubtitle ?? lo.fontSize.small;
  const titleOff = opts?.titleOffsetY ?? -4;
  const firstOff = opts?.firstLineOffsetY ?? 2;

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(fTitle);
  doc.text(title, pageWidth - margin, bandMid + titleOff, { align: "right", baseline: "middle" });

  let lineOffset = firstOff;
  for (const line of rightLines) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(fSmall);
    doc.setTextColor(...PDF_COLOR_SUBTITLE);
    doc.text(line, pageWidth - margin, bandMid + lineOffset, { align: "right", baseline: "middle" });
    lineOffset += 5;
  }

  doc.setTextColor(...COLOR_TEXT);
  return y + topM + bandH + botG;
}

export async function drawSharedHeader(
  doc: jsPDF,
  lo: PdfLayout,
  title: string,
  rightLines: string[],
  margin: number,
  pageWidth: number,
  y: number,
  opts?: HeaderOptions & { empresaLogoBase64?: string },
): Promise<number> {
  let logoRenderData: LogoRenderData;
  if (USAR_LOGO_EMPRESA && opts?.empresaLogoBase64) {
    const dims = await getImageDimensions(opts.empresaLogoBase64);
    logoRenderData = { src: opts.empresaLogoBase64, naturalW: dims.w, naturalH: dims.h };
  } else {
    logoRenderData = { src: cdlatamLogoOnBrand, naturalW: LOGO_NATURAL_W_PX, naturalH: LOGO_NATURAL_H_PX };
  }
  return drawHeaderSync(doc, lo, title, rightLines, margin, pageWidth, y, {
    ...opts,
    logoRenderData,
  });
}
