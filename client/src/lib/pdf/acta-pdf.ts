import type { ActaData } from "@/hooks/useFormStore";
import type { ClausulaParaPdf, ActaPdfExportOpts, DocEntry } from "./types";
import { FEATURES_RESUMIDO_ORDEN } from "./constants";
import { effectiveNoActaForPdf, resolveLayout, findBestScale } from "./layout";
import { drawHeaderSection, drawEncabezado, drawInfoLegal, drawContactSection, drawServiciosTable, drawFormasPagoSection, drawConsideracionesSection, drawClausulasSection, drawFirmaBlock, drawFooter } from "./acta-sections";
import { getCurrencyCode, formatCurrency } from "../formatters";
import { jsPDF } from "jspdf";
import { PDFDocument } from "pdf-lib";

async function buildActaPdfBytes(acta: ActaData, opts: ActaPdfExportOpts = {}): Promise<Uint8Array> {
  const doc = new jsPDF({ unit: "mm", format: "a4" });

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

  let y = 0; // El header empieza en el borde superior (y=0), sin margen superior

  // 1. Header
  y = drawHeaderSection(doc, lo, acta.noActa || "", acta.fecha, margin, pageWidth, y);

  // 2. Encabezado: Sres / Atención / Fecha + intro
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

  // 9. Cláusulas legales
  y = drawClausulasSection(doc, lo, acta, margin, contentWidth, y, lineHeight);

  // 10. Firma
  drawFirmaBlock(doc, lo, acta.representanteLegal, acta.razonSocial, margin, pageWidth, pageHeight, lineHeight, spacing);

  // 11. Footer en cada página
  drawFooter(doc, lo, margin, pageWidth);

  return new Uint8Array(doc.output("arraybuffer"));
}

export async function createActaPdfBlob(
  acta: ActaData,
  clausulas: ClausulaParaPdf[] = [],
  opts: ActaPdfExportOpts = {},
): Promise<{ blob: Blob; filename: string }> {
  const noActa = effectiveNoActaForPdf(acta, opts.expedienteUuid);
  const actaForPdf: ActaData = { ...acta, noActa };
  const baseBytes = await buildActaPdfBytes(actaForPdf, opts);
  const merged = await PDFDocument.load(baseBytes);

  // Filtrar el PDF estático de features (tipo 'features') ya que ahora se genera dinámicamente
  const clausulasOrdenadas = [...clausulas]
    .filter(c => c.tipo !== "features")
    .sort((a, b) => (a.ordenGlobal ?? 50) - (b.ordenGlobal ?? 50));

  const docsEnOrden: DocEntry[] = [];
  let featuresResumidoInsertado = false;

  for (const c of clausulasOrdenadas) {
    if (
      !featuresResumidoInsertado &&
      opts.featuresResumidoBytes &&
      (c.ordenGlobal ?? 50) > FEATURES_RESUMIDO_ORDEN
    ) {
      docsEnOrden.push({ kind: "dynamic_features_resumido" });
      featuresResumidoInsertado = true;
    }
    docsEnOrden.push({ kind: "static", clausula: c });
  }

  if (!featuresResumidoInsertado && opts.featuresResumidoBytes) {
    docsEnOrden.push({ kind: "dynamic_features_resumido" });
  }

  for (const entry of docsEnOrden) {
    if (entry.kind === "dynamic_features_resumido") {
      try {
        const pdf = await PDFDocument.load(opts.featuresResumidoBytes!, { ignoreEncryption: true });
        const pages = await merged.copyPages(pdf, pdf.getPageIndices());
        pages.forEach(p => merged.addPage(p));
      } catch (err) {
        console.warn("[pdfExport] features resumido falló, se omite:", err);
      }
    } else {
      const c = entry.clausula;
      try {
        const res = await fetch(c.filePath, { credentials: "include" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const bytes = await res.arrayBuffer();
        const pdf = await PDFDocument.load(bytes, { ignoreEncryption: true });
        const pages = await merged.copyPages(pdf, pdf.getPageIndices());
        pages.forEach(p => merged.addPage(p));
      } catch (err) {
        console.warn("[pdfExport] cláusula falló, se omite:", c.fileName, err);
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
