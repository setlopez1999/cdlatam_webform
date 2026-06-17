import type { ActaData } from "@/hooks/useFormStore";
import type { ClausulaParaPdf, ActaPdfExportOpts, DocEntry } from "./types";
import { effectiveNoActaForPdf, resolveLayout, findBestScale } from "./layout";
import { drawHeaderSection, drawEncabezado, drawInfoLegal, drawContactSection, drawServiciosTable, drawFormasPagoSection, drawConsideracionesSection, drawClausulasSection, drawFirmaBlock, drawFooter } from "./acta-sections";
import { getCurrencyCode, formatCurrency } from "../formatters";
import { jsPDF } from "jspdf";
import { PDFDocument } from "pdf-lib";
import { LOGO_NATURAL_W_PX, LOGO_NATURAL_H_PX, fitImagePreserveAspectMm } from "./constants";
import cdlatamLogoOnBrand from "@/assets/cdlatam-logo-on-brand.png";

async function buildActaPdfBytes(acta: ActaData, opts: ActaPdfExportOpts = {}): Promise<Uint8Array> {
  const doc = new jsPDF({ unit: "mm", format: "letter" });

  let resolvedOpts = { ...opts };
  if (opts.singlePage && !opts.fontSizeScale) {
    const bestScale = findBestScale(acta, doc, opts);
    resolvedOpts.fontSizeScale = bestScale;
    resolvedOpts.compact = true;
  }

  const lo = resolveLayout(doc, resolvedOpts);
  const { margin, contentWidth, pageWidth, pageHeight, fontSize, lineHeight, spacing, sectionGap, cellPadding } = lo;

  const currencyCode = getCurrencyCode(acta.moneda ?? "");
  const fmt = (v: number) => formatCurrency(v, currencyCode);

  let y = 0;

  // 1. Header
  y = drawHeaderSection(doc, lo, acta.noActa || "", acta.fecha, margin, pageWidth, y);

  // 2. Encabezado
  y = drawEncabezado(doc, lo, acta, margin, y, contentWidth);

  // 3. Datos de la empresa
  y = drawInfoLegal(doc, lo, acta, margin, spacing, y, contentWidth);

  // 4. Datos de contacto
  y = drawContactSection(doc, lo, acta, margin, spacing, sectionGap, y, contentWidth);

  // 5. Servicios contratados
  y = drawServiciosTable(doc, lo, acta.serviciosContratados, margin, y, spacing, sectionGap, fmt, cellPadding);

  // 6-7. Formas de pago
  y = drawFormasPagoSection(doc, lo, acta, margin, y, spacing, sectionGap, fmt);

  // 8. Consideraciones
  y = drawConsideracionesSection(doc, lo, acta, margin, contentWidth, y, spacing);

  // 9. Clausulas legales
  y = drawClausulasSection(doc, lo, acta, margin, contentWidth, y, lineHeight);

  // 10. Firma
  drawFirmaBlock(doc, lo, acta.representanteLegal, acta.razonSocial, margin, pageWidth, pageHeight, lineHeight, spacing);

  // 11. Footer en cada pagina
  drawFooter(doc, lo, margin, pageWidth);

  return new Uint8Array(doc.output("arraybuffer"));
}

export async function createActaPdfBlob(
  acta: ActaData,
  clausulas: ClausulaParaPdf[] = [],
  opts: ActaPdfExportOpts = {},
): Promise<{ blob: Blob; filename: string }> {
  const noActa = effectiveNoActaForPdf(acta, opts.expedienteUuid, opts.serverNroActa, opts.serverUnidadNegocio);
  const actaForPdf: ActaData = { ...acta, noActa };
  const baseBytes = await buildActaPdfBytes(actaForPdf, opts);
  const merged = await PDFDocument.load(baseBytes);

  const clausulasOrdenadas = [...clausulas]
    .sort((a, b) => (a.ordenGlobal ?? 50) - (b.ordenGlobal ?? 50));

  const docsEnOrden: DocEntry[] = [];

  // Features Resumido siempre va primero (despues del Acta)
  if (opts.featuresResumidoBytes) {
    docsEnOrden.push({ kind: "dynamic_features_resumido" });
  }

  // Luego las clausulas en su orden global
  for (const c of clausulasOrdenadas) {
    docsEnOrden.push({ kind: "static", clausula: c });
  }

  // Dimensiones Carta (Letter) en puntos (1in = 72 pts)
  const PAGE_W = 612;
  const PAGE_H = 792;

  for (const entry of docsEnOrden) {
    if (entry.kind === "dynamic_features_resumido") {
      try {
        const pdf = await PDFDocument.load(opts.featuresResumidoBytes!, { ignoreEncryption: true });
        const pages = await merged.copyPages(pdf, pdf.getPageIndices());
        pages.forEach(p => merged.addPage(p));
      } catch (err) {
        console.warn("[pdfExport] features resumido fallo, se omite:", err);
      }
    } else {
      const c = entry.clausula;
      try {
        const res = await fetch(c.filePath, { credentials: "include" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const bytes = await res.arrayBuffer();
        const pdf = await PDFDocument.load(bytes, { ignoreEncryption: true });
        // Escalar páginas importadas a Letter para que mantengan el mismo tamaño que el acta
        const copied = await merged.copyPages(pdf, pdf.getPageIndices());
        // Logo CDLatam (ya trae fondo azul en el PNG) — mismo tamaño que acta/features
        const { drawW: logoWmm, drawH: logoHmm } = fitImagePreserveAspectMm(LOGO_NATURAL_W_PX, LOGO_NATURAL_H_PX, 72, 18);
        const logoHPt = logoHmm * 72 / 25.4;
        const HEADER_MM = 14; // padding 2mm arriba/abajo + logo ~10mm
        const HEADER_PT = HEADER_MM * 72 / 25.4;
        let headerLogo: any = null;
        if (c.tipo === "clausula") {
          try {
            const logoResp = await fetch(cdlatamLogoOnBrand);
            const logoBytes = new Uint8Array(await logoResp.arrayBuffer());
            headerLogo = await merged.embedPng(logoBytes);
          } catch { /* omitir logo si falla */ }
        }
        for (const page of copied) {
          const { width: srcW, height: srcH } = page.getSize();
          const s = Math.min(PAGE_W / srcW, PAGE_H / srcH);
          page.scale(s, s);
          page.setSize(PAGE_W, PAGE_H);
          merged.addPage(page);
          if (headerLogo) {
            const logoWPt = logoWmm * 72 / 25.4;
            const logoX = 15 * 72 / 25.4;
            const logoY = PAGE_H - HEADER_PT + (HEADER_PT - logoHPt) / 2;
            page.drawImage(headerLogo, { x: logoX, y: logoY, width: logoWPt, height: logoHPt });
          }
        }
      } catch (err) {
        console.warn("[pdfExport] clausula fallo, se omite:", c.fileName, err);
        opts.onClausulaError?.(c, err);
      }
    }
  }

  const out = await merged.save();
  const filename = `nro_acta_${noActa || "sin_numero"}.pdf`;
  const buf = new ArrayBuffer(out.byteLength);
  new Uint8Array(buf).set(out);
  return { blob: new Blob([buf], { type: "application/pdf" }), filename };
}

export function downloadPdfBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function generateActaPDF(
  acta: ActaData,
  clausulas: ClausulaParaPdf[] = [],
  opts: ActaPdfExportOpts = {},
): Promise<void> {
  const { blob, filename } = await createActaPdfBlob(acta, clausulas, opts);
  downloadPdfBlob(blob, filename);
}
