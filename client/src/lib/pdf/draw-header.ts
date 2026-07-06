import type { PdfLayout } from "./types";
import type { jsPDF } from "jspdf";
import { rgb } from "pdf-lib";
import type { PDFPage, PDFFont, PDFImage } from "pdf-lib";
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

export function drawHeaderOnPdfLibPage(
  page: PDFPage,
  font: PDFFont,
  title: string,
  rightLines: string[],
  pageW: number,
  pageH: number,
  opts?: HeaderOptions & { logoImage?: PDFImage },
): void {
  const mmToPt = (mm: number) => mm * 72 / 25.4;

  const topMarginMm = opts?.topMarginMm ?? DEFAULTS.topMarginMm;
  const bandHeightMm = opts?.bandHeightMm ?? DEFAULTS.bandHeightMm;
  const marginPt = mmToPt(15);

  const hColor = resolveHeaderColor(opts?.headerColor);
  const cRgb = rgb(hColor[0] / 255, hColor[1] / 255, hColor[2] / 255);

  const topBandPt = mmToPt(topMarginMm);
  const mainBandPt = mmToPt(bandHeightMm);

  page.drawRectangle({
    x: 0,
    y: pageH - topBandPt,
    width: pageW,
    height: topBandPt,
    color: cRgb,
  });

  page.drawRectangle({
    x: 0,
    y: pageH - topBandPt - mainBandPt,
    width: pageW,
    height: mainBandPt,
    color: cRgb,
  });

  if (opts?.logoImage) {
    const boxWmm = 72;
    const boxHmm = 18;
    const { drawW, drawH } = fitImagePreserveAspectMm(
      opts.logoImage.width,
      opts.logoImage.height,
      boxWmm,
      boxHmm,
    );
    const logoWpt = mmToPt(drawW);
    const logoHpt = mmToPt(drawH);
    page.drawImage(opts.logoImage, {
      x: marginPt,
      y: pageH - topBandPt - mainBandPt + (mainBandPt - logoHpt) / 2,
      width: logoWpt,
      height: logoHpt,
    });
  }

  const bandMid = pageH - topBandPt - mainBandPt / 2;
  const fTitle = opts?.fontSizeTitle ?? 11;
  const titleOff = opts?.titleOffsetY ?? -4;
  const titleW = font.widthOfTextAtSize(title, fTitle);
  page.drawText(title, {
    x: pageW - marginPt - titleW,
    y: bandMid + mmToPt(titleOff),
    size: fTitle,
    font,
    color: rgb(1, 1, 1),
  });

  const fSmall = opts?.fontSizeSubtitle ?? 8;
  const subColor = rgb(
    PDF_COLOR_SUBTITLE[0] / 255,
    PDF_COLOR_SUBTITLE[1] / 255,
    PDF_COLOR_SUBTITLE[2] / 255,
  );
  let lineOff = opts?.firstLineOffsetY ?? 2;
  for (const line of rightLines) {
    const lineW = font.widthOfTextAtSize(line, fSmall);
    page.drawText(line, {
      x: pageW - marginPt - lineW,
      y: bandMid + mmToPt(lineOff),
      size: fSmall,
      font,
      color: subColor,
    });
    lineOff += 5;
  }
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
