/**
 * Módulo de exportación PDF para Acta de Aceptación y Resultado Evaluación.
 *
 * Acta (F1):
 *   - Genera PDF real con jsPDF + jspdf-autotable.
 *   - Fusiona los PDFs de cláusulas legales (vinculadas a las unidades de
 *     negocio en serviciosContratados) al final usando pdf-lib.
 *   - Descarga un único archivo.
 *
 * Resultado EP (F2):
 *   - Sigue usando window.print() del HTML estilizado (no se ha pedido cambio).
 */

import type { ActaData } from "@/hooks/useFormStore";
import type { EPData, ResultadoCalculado } from "@/hooks/useFormStore";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { PDFDocument } from "pdf-lib";
import { formatCurrency, formatDate, getCurrencyCode } from "./formatters";

const CDLATAM_LOGO = "https://files.manuscdn.com/user_upload_by_module/session_file/310519663142649407/FDtlcTtkjZpRheHR.png";
// Color turquesa corporativo CDLatam
const BRAND_COLOR = "#00c2b2";
const BRAND_DARK  = "#009e90";
const TEXT_DARK   = "#0f2027";

/** Cláusula legal lista para anexar al PDF del Acta. */
export interface ClausulaParaPdf {
  id: number;
  valor: string;
  filePath: string;
  fileName: string;
}

/**
 * Genera y descarga el PDF del Acta de Aceptación de Servicios.
 * Si se pasan `clausulas`, sus PDFs se anexan al final en un solo archivo.
 *
 * Si una cláusula falla al cargar (PDF inválido, encriptado, 404), se omite y
 * se sigue con el resto. El acta siempre se descarga; los errores parciales
 * se pueden propagar al caller via la callback `onClausulaError`.
 */
export async function generateActaPDF(
  acta: ActaData,
  clausulas: ClausulaParaPdf[] = [],
  opts: { onClausulaError?: (c: ClausulaParaPdf, err: unknown) => void } = {},
): Promise<void> {
  const baseBytes = await buildActaPdfBytes(acta);
  const merged = await PDFDocument.load(baseBytes);

  for (const c of clausulas) {
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

  const out = await merged.save();
  const filename = `Acta_${acta.noActa || "sin_numero"}_${slug(acta.razonSocial)}.pdf`;
  triggerDownload(out, filename);
}

/**
 * Genera y descarga el PDF del Resultado Evaluación.
 */
export async function generateResultadoPDF(ep: EPData, resultado: ResultadoCalculado): Promise<void> {
  const html = buildResultadoHTML(ep, resultado);
  return printHTML(html, `Resultado_EP_${ep.propuestaNumero || "sin_numero"}_${ep.nombreCliente || "cliente"}`);
}

// ─── Helpers genéricos ────────────────────────────────────────────────────────

function slug(s: string | undefined): string {
  return (s || "cliente").trim().replace(/\s+/g, "_").replace(/[^\w\-]/g, "").slice(0, 40) || "cliente";
}

function triggerDownload(bytes: Uint8Array, filename: string) {
  // Construimos un ArrayBuffer fresco. Pasar `bytes.buffer` directo al Blob
  // dispara TS2322 porque el tipo de `.buffer` es `ArrayBuffer | SharedArrayBuffer`
  // y SharedArrayBuffer no es BlobPart. Copiar la región cubre ambos casos.
  const buf = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buf).set(bytes);
  const blob = new Blob([buf], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ─── Builders del Acta (jsPDF) ───────────────────────────────────────────────

// Convierte HEX a tupla [r,g,b] que jsPDF acepta en setFillColor / setTextColor.
const hex = (h: string): [number, number, number] => {
  const m = h.replace("#", "");
  return [
    parseInt(m.slice(0, 2), 16),
    parseInt(m.slice(2, 4), 16),
    parseInt(m.slice(4, 6), 16),
  ];
};

const COLOR_BRAND = hex(BRAND_COLOR);
const COLOR_BRAND_DARK = hex(BRAND_DARK);
const COLOR_TEXT = hex(TEXT_DARK);
const COLOR_GRAY = hex("#6b7280");
const COLOR_LIGHT = hex("#f3f4f6");

/**
 * Carga una imagen vía fetch y la convierte a data URL para que jsPDF la
 * pueda incrustar con `addImage`. Devuelve null si falla, así el PDF puede
 * generarse sin logo (no bloqueante).
 */
async function loadImageAsDataUrl(url: string): Promise<string | null> {
  try {
    if (url.startsWith("data:")) return url;
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise<string>((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result as string);
      r.onerror = () => reject(r.error);
      r.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

const CONSIDERACIONES_FIJAS = [
  "Activación nueva.",
  "Valores expresados en dólares.",
  "Valores NO incluyen impuestos ni comisiones bancarias o de transferencia.",
  "El servicio no incluye hardware.",
  "Se considera un descuento del 50% en las dos primeras cuotas de mantención.",
  "La forma de pago de la mantención es mes vencido a partir de la entrega del servicio.",
];

/**
 * Construye los bytes del PDF base del Acta usando jsPDF + autotable.
 * Estructura:
 *   1. Header con logo + título + N° + fecha
 *   2. Sres / Atención / Fecha + texto introductorio
 *   3. Datos de la empresa
 *   4. Datos de contacto (representante legal, técnico, facturación)
 *   5. Servicios contratados (autoTable)
 *   6. Formas de pago — Implementación (autoTable, opcional)
 *   7. Formas de pago — Mantención (autoTable, opcional)
 *   8. Consideraciones fijas + personalizadas
 *   9. Cláusulas legales texto libre (si las hay)
 *  10. Firma del Representante Legal
 *  11. Footer en cada página
 */
async function buildActaPdfBytes(acta: ActaData): Promise<Uint8Array> {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;

  const currencyCode = getCurrencyCode(acta.moneda ?? "");
  const fmt = (v: number) => formatCurrency(v, currencyCode);
  const totalServicios = acta.serviciosContratados.reduce((sum, s) => sum + s.total, 0);

  let y = margin;

  // ── 1. Header ───────────────────────────────────────────────────────────
  const logo = await loadImageAsDataUrl(CDLATAM_LOGO);
  if (logo) {
    doc.setFillColor(...COLOR_TEXT);
    doc.roundedRect(margin, y, 38, 14, 2, 2, "F");
    try {
      doc.addImage(logo, "PNG", margin + 4, y + 2, 30, 10, undefined, "FAST");
    } catch {
      // Si la imagen no se puede agregar, dejamos el chip vacío.
    }
  }

  doc.setTextColor(...COLOR_TEXT);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("Acta de Aceptación de Servicios", pageWidth - margin, y + 5, { align: "right" });
  doc.setTextColor(...COLOR_BRAND_DARK);
  doc.setFontSize(10);
  doc.text(`N° ${acta.noActa || "S/N"}`, pageWidth - margin, y + 10, { align: "right" });
  doc.setTextColor(...COLOR_GRAY);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text(`Fecha: ${formatDate(acta.fecha)}`, pageWidth - margin, y + 14, { align: "right" });
  y += 16;

  doc.setDrawColor(...COLOR_BRAND);
  doc.setLineWidth(0.7);
  doc.line(margin, y, pageWidth - margin, y);
  y += 5;

  // ── 2. Encabezado: Sres / Atención / Fecha + intro ──────────────────────
  y = drawFieldRow(doc, [
    { label: "Sres.", value: acta.sres },
    { label: "Atención", value: acta.atencion },
    { label: "Fecha", value: formatDate(acta.fecha) },
  ], margin, y, contentWidth);

  const textoIntro =
    (acta as { textoIntroductorio?: string }).textoIntroductorio ||
    "Tengo el agrado de comunicar nuestra aceptación a la propuesta comercial número en las condiciones y términos de la misma.";
  y = drawIntroBox(doc, textoIntro, margin, y, contentWidth);

  // ── 3. Datos de la empresa ──────────────────────────────────────────────
  y = drawSectionTitle(doc, "Datos de la Empresa", margin, y);
  y = drawFieldRow(doc, [
    { label: "Razón Social", value: acta.razonSocial },
    { label: "Nombre de Fantasía", value: acta.nombreFantasia },
  ], margin, y, contentWidth);
  y = drawFieldRow(doc, [
    { label: acta.tipoDocumento || "RUT", value: acta.rucDniRut },
    { label: "Moneda", value: acta.moneda },
  ], margin, y, contentWidth);
  y = drawFieldRow(doc, [
    { label: "Dirección Comercial", value: acta.direccionComercial },
  ], margin, y, contentWidth);

  // ── 4. Datos de contacto ────────────────────────────────────────────────
  y = drawSectionTitle(doc, "Datos de Contacto", margin, y);
  y = drawContactGroup(doc, "Representante Legal", [
    { label: "Nombre", value: acta.representanteLegal },
    { label: "DNI / Cédula", value: acta.representanteDni },
    { label: "E-mail", value: acta.representanteEmail },
    { label: "Teléfono", value: acta.representanteFono },
  ], margin, y, contentWidth);
  y = drawContactGroup(doc, "Contacto Técnico", [
    { label: "Nombre", value: acta.contactoTecnico },
    { label: "E-mail", value: acta.contactoTecnicoEmail },
    { label: "Teléfono", value: acta.contactoTecnicoFono },
  ], margin, y, contentWidth);
  y = drawContactGroup(doc, "Contacto Facturación", [
    { label: "Nombre", value: acta.contactoFacturacion },
    { label: "E-mail", value: acta.contactoFacturacionEmail },
    { label: "Teléfono", value: acta.contactoFacturacionFono },
  ], margin, y, contentWidth);

  // ── 5. Servicios contratados ────────────────────────────────────────────
  y = drawSectionTitle(doc, "Servicios Contratados", margin, y);
  const servicioRows = acta.serviciosContratados.map((s, i) => [
    String(i + 1),
    s.unidadNegocio || "",
    s.solucion || "",
    s.detalleServicio || "",
    s.tipoVenta || "",
    fmt(s.valorUnitario),
    String(s.cantidad),
    fmt(s.total),
    s.plazo || "",
  ]);
  servicioRows.push([
    "", "", "", "", "", "", "TOTAL", fmt(totalServicios), "",
  ]);
  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [["#", "Unidad Negocio", "Solución", "Detalle Servicio", "Tipo Venta", "Valor Unit.", "Cant.", "Total", "Plazo"]],
    body: servicioRows,
    styles: { fontSize: 7, cellPadding: 1.5, textColor: COLOR_TEXT },
    headStyles: { fillColor: COLOR_BRAND, textColor: [255, 255, 255], fontStyle: "bold" },
    alternateRowStyles: { fillColor: [249, 250, 251] },
    columnStyles: {
      0: { cellWidth: 6, halign: "center" },
      5: { halign: "right" },
      6: { halign: "right" },
      7: { halign: "right", fontStyle: "bold" },
    },
    didParseCell: (hookData) => {
      if (hookData.section === "body" && hookData.row.index === servicioRows.length - 1) {
        hookData.cell.styles.fillColor = [230, 250, 248];
        hookData.cell.styles.fontStyle = "bold";
      }
    },
  });
  y = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y;
  y += 4;

  // ── 6. Formas de pago — Implementación ──────────────────────────────────
  if (acta.formasPagoImplementacion?.length) {
    y = ensureSpace(doc, y, 30);
    y = drawSectionTitle(doc, "Formas de Pago — Implementación", margin, y);
    y = drawPagoTable(doc, acta.formasPagoImplementacion, margin, y, fmt);
  }

  // ── 7. Formas de pago — Mantención ──────────────────────────────────────
  if (acta.formasPagoMantencion?.length) {
    y = ensureSpace(doc, y, 30);
    y = drawSectionTitle(doc, "Formas de Pago — Mantención", margin, y);
    y = drawPagoTable(doc, acta.formasPagoMantencion, margin, y, fmt);
  }

  // ── 8. Consideraciones (fijas + personalizadas) ─────────────────────────
  y = ensureSpace(doc, y, 30);
  y = drawSectionTitle(doc, "Consideraciones y Alcances Comerciales", margin, y);
  y = drawBulletList(doc, CONSIDERACIONES_FIJAS, margin, y, contentWidth);
  const personalizadas = (acta as { consideracionesPersonalizadas?: string[] }).consideracionesPersonalizadas ?? [];
  if (personalizadas.length) {
    y += 1;
    y = drawBulletList(doc, personalizadas, margin, y, contentWidth);
  }

  // ── 9. Cláusulas legales texto libre ───────────────────────────────────
  const clausulasLegales = (acta as { clausulasLegales?: string }).clausulasLegales ?? "";
  if (clausulasLegales.trim()) {
    y = ensureSpace(doc, y, 25);
    y = drawSectionTitle(doc, "Cláusulas Legales", margin, y);
    doc.setFontSize(8.5);
    doc.setTextColor(...COLOR_TEXT);
    doc.setFont("helvetica", "normal");
    const lines = doc.splitTextToSize(clausulasLegales.trim(), contentWidth);
    for (const line of lines) {
      y = ensureSpace(doc, y, 5);
      doc.text(line, margin, y);
      y += 4;
    }
  }

  // ── 10. Firma del Representante Legal ───────────────────────────────────
  y = ensureSpace(doc, y, 50);
  y += 4;
  y = drawSectionTitle(doc, "Firma del Representante Legal", margin, y);
  const firmaImagen = (acta as { firmaImagen?: string }).firmaImagen;
  const firmaW = 70, firmaH = 24;
  if (firmaImagen?.startsWith("data:")) {
    try {
      doc.addImage(firmaImagen, "PNG", margin, y, firmaW, firmaH, undefined, "FAST");
    } catch {
      doc.setDrawColor(...COLOR_GRAY);
      doc.setLineDashPattern([1, 1], 0);
      doc.rect(margin, y, firmaW, firmaH);
      doc.setLineDashPattern([], 0);
    }
  } else {
    doc.setDrawColor(...COLOR_GRAY);
    doc.setLineDashPattern([1, 1], 0);
    doc.rect(margin, y, firmaW, firmaH);
    doc.setLineDashPattern([], 0);
  }
  y += firmaH + 2;
  doc.setDrawColor(...COLOR_TEXT);
  doc.setLineWidth(0.3);
  doc.line(margin, y, margin + firmaW, y);
  y += 4;
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLOR_TEXT);
  doc.text(acta.representanteLegal || "___________________________", margin + firmaW / 2, y, { align: "center" });
  y += 4;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...COLOR_GRAY);
  doc.text("Representante Legal", margin + firmaW / 2, y, { align: "center" });

  // ── 11. Footer en cada página ───────────────────────────────────────────
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    const fy = pageHeight - 8;
    doc.setDrawColor(...COLOR_LIGHT);
    doc.setLineWidth(0.2);
    doc.line(margin, fy - 3, pageWidth - margin, fy - 3);
    doc.setFontSize(7);
    doc.setTextColor(...COLOR_GRAY);
    doc.setFont("helvetica", "normal");
    doc.text("CDLatam — Transformación Digital en Latinoamérica", margin, fy);
    doc.text(
      `Generado el ${new Date().toLocaleDateString("es-CL")}  ·  pág. ${p}/${totalPages}`,
      pageWidth - margin,
      fy,
      { align: "right" },
    );
  }

  return new Uint8Array(doc.output("arraybuffer"));
}

// ─── Subdibujantes ────────────────────────────────────────────────────────────

interface FieldDef { label: string; value: string | number | undefined | null; }

function ensureSpace(doc: jsPDF, y: number, needed: number): number {
  const pageHeight = doc.internal.pageSize.getHeight();
  if (y + needed > pageHeight - 14) {
    doc.addPage();
    return 15;
  }
  return y;
}

function drawSectionTitle(doc: jsPDF, title: string, x: number, y: number): number {
  y = ensureSpace(doc, y, 8);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLOR_BRAND_DARK);
  doc.text(title.toUpperCase(), x, y);
  doc.setDrawColor(...COLOR_BRAND);
  doc.setLineWidth(0.4);
  doc.line(x, y + 1.2, x + 100, y + 1.2);
  return y + 5;
}

function drawIntroBox(doc: jsPDF, text: string, x: number, y: number, width: number): number {
  doc.setFontSize(8.5);
  doc.setFont("helvetica", "italic");
  doc.setTextColor(...COLOR_TEXT);
  const lines = doc.splitTextToSize(text, width - 8);
  const boxHeight = lines.length * 4 + 4;
  y = ensureSpace(doc, y, boxHeight + 2);
  doc.setFillColor(240, 253, 251);
  doc.rect(x, y, width, boxHeight, "F");
  doc.setDrawColor(...COLOR_BRAND);
  doc.setLineWidth(0.8);
  doc.line(x, y, x, y + boxHeight);
  doc.text(lines, x + 4, y + 4.5);
  doc.setFont("helvetica", "normal");
  return y + boxHeight + 3;
}

function drawFieldRow(
  doc: jsPDF,
  fields: FieldDef[],
  x: number,
  y: number,
  width: number,
): number {
  y = ensureSpace(doc, y, 12);
  const colW = width / fields.length;
  fields.forEach((f, i) => {
    const cx = x + i * colW;
    doc.setFontSize(6.5);
    doc.setTextColor(...COLOR_GRAY);
    doc.setFont("helvetica", "normal");
    doc.text(String(f.label).toUpperCase(), cx, y);
    doc.setFontSize(8.5);
    doc.setTextColor(...COLOR_TEXT);
    doc.setFont("helvetica", "normal");
    const value = f.value == null || f.value === "" ? " " : String(f.value);
    const lines = doc.splitTextToSize(value, colW - 4);
    doc.text(lines[0] ?? " ", cx, y + 4);
    doc.setDrawColor(209, 213, 219);
    doc.setLineWidth(0.2);
    doc.line(cx, y + 5.5, cx + colW - 4, y + 5.5);
  });
  return y + 9;
}

function drawContactGroup(
  doc: jsPDF,
  title: string,
  fields: FieldDef[],
  x: number,
  y: number,
  width: number,
): number {
  y = ensureSpace(doc, y, fields.length * 6 + 6);
  doc.setFontSize(7.5);
  doc.setTextColor(...COLOR_BRAND);
  doc.setFont("helvetica", "bold");
  doc.text(title, x, y);
  y += 3.5;
  doc.setFont("helvetica", "normal");
  for (const f of fields) {
    doc.setFontSize(6.5);
    doc.setTextColor(...COLOR_GRAY);
    doc.text(`${f.label}:`, x, y);
    doc.setFontSize(8);
    doc.setTextColor(...COLOR_TEXT);
    const value = f.value == null || f.value === "" ? " " : String(f.value);
    const lines = doc.splitTextToSize(value, width - 30);
    doc.text(lines[0] ?? " ", x + 25, y);
    y += 4;
  }
  return y + 2;
}

function drawPagoTable(
  doc: jsPDF,
  formas: Array<{ tipoVenta: string; nCuotas: number; cuotas?: Array<{ monto: number; fecha: string }> }>,
  x: number,
  y: number,
  fmt: (v: number) => string,
): number {
  const maxCuotas = Math.min(4, Math.max(1, ...formas.map(i => i.nCuotas || 0)));
  const head = ["#", "Tipo Venta", "N° Cuotas"];
  for (let i = 0; i < maxCuotas; i++) head.push(`${i + 1}ª Cuota`, "Fecha");

  const body = formas.map((fp, i) => {
    const row: string[] = [
      String(i + 1),
      fp.tipoVenta || "",
      String(fp.nCuotas),
    ];
    for (let idx = 0; idx < maxCuotas; idx++) {
      const cuota = fp.cuotas?.[idx];
      const enabled = idx < (fp.nCuotas || 1);
      row.push(enabled ? fmt(cuota?.monto || 0) : "-");
      row.push(enabled ? formatDate(cuota?.fecha || "") : "-");
    }
    return row;
  });

  autoTable(doc, {
    startY: y,
    margin: { left: x, right: x },
    head: [head],
    body,
    styles: { fontSize: 7, cellPadding: 1.4, textColor: COLOR_TEXT },
    headStyles: { fillColor: COLOR_BRAND, textColor: [255, 255, 255], fontStyle: "bold" },
    alternateRowStyles: { fillColor: [249, 250, 251] },
  });
  const finalY = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y;
  return finalY + 4;
}

function drawBulletList(
  doc: jsPDF,
  items: string[],
  x: number,
  y: number,
  width: number,
): number {
  doc.setFontSize(8.5);
  doc.setTextColor(...COLOR_TEXT);
  doc.setFont("helvetica", "normal");
  for (const item of items) {
    const lines = doc.splitTextToSize(item, width - 6);
    const needed = lines.length * 4 + 1;
    y = ensureSpace(doc, y, needed);
    doc.text("–", x, y);
    doc.text(lines, x + 4, y);
    y += needed;
  }
  return y;
}

// ─── Resultado PDF (sin cambios estructurales) ────────────────────────────────

function buildResultadoHTML(ep: EPData, resultado: ResultadoCalculado): string {
  const fmt = (v: number) => formatCurrency(v, "USD");

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Resultado EP — ${ep.propuestaNumero || "S/N"}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, sans-serif; font-size: 10pt; color: ${TEXT_DARK}; background: white; }
    .page { padding: 18mm 18mm 14mm 18mm; }
    .header { display: flex; align-items: center; justify-content: space-between; padding-bottom: 10px; border-bottom: 3px solid ${BRAND_COLOR}; margin-bottom: 14px; }
    .header-logo { background: ${TEXT_DARK}; border-radius: 6px; padding: 8px 14px; display: inline-flex; align-items: center; }
    .header-logo img { height: 38px; object-fit: contain; }
    .doc-title { font-size: 13pt; font-weight: bold; color: ${TEXT_DARK}; }
    .doc-num { font-size: 10pt; color: ${BRAND_COLOR}; font-weight: 700; }
    .section { margin-bottom: 14px; }
    .section-title { font-size: 8.5pt; font-weight: bold; text-transform: uppercase; letter-spacing: 0.06em; color: ${BRAND_DARK}; border-bottom: 1.5px solid ${BRAND_COLOR}; padding-bottom: 3px; margin-bottom: 7px; }
    .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 16px; }
    .field { margin-bottom: 5px; }
    .field-label { font-size: 7pt; color: #6b7280; text-transform: uppercase; letter-spacing: 0.04em; }
    .field-value { font-size: 9pt; font-weight: 500; color: ${TEXT_DARK}; border-bottom: 1px solid #d1d5db; padding-bottom: 2px; min-height: 15px; }
    table { width: 100%; border-collapse: collapse; font-size: 8.5pt; }
    th { background: ${BRAND_COLOR}; color: white; padding: 4px 5px; text-align: left; font-size: 8pt; }
    th.text-right { text-align: right; }
    td { padding: 3.5px 5px; border-bottom: 1px solid #f3f4f6; }
    tr:nth-child(even) td { background: #f9fafb; }
    .text-right { text-align: right; }
    .total-row td { background: #e6faf8 !important; font-weight: bold; border-top: 1.5px solid ${BRAND_COLOR}; }
    .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 14px; }
    .kpi-card { border: 1px solid #e5e7eb; border-radius: 6px; padding: 8px; text-align: center; }
    .kpi-label { font-size: 7pt; color: #6b7280; text-transform: uppercase; }
    .kpi-value { font-size: 12pt; font-weight: bold; color: ${BRAND_COLOR}; margin-top: 2px; }
    .page-footer { margin-top: 16px; padding-top: 8px; border-top: 1px solid #e5e7eb; display: flex; justify-content: space-between; font-size: 7pt; color: #9ca3af; }
    @page { size: A4; margin: 0; }
    @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
  </style>
</head>
<body>
<div class="page">
  <div class="header">
    <div><img src="${CDLATAM_LOGO}" alt="CDLatam" style="height:38px;object-fit:contain;" /></div>
    <div style="text-align:right;">
      <div class="doc-title">Resultado Evaluación de Proyecto</div>
      <div class="doc-num">EP N° ${ep.propuestaNumero || "S/N"}</div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Información del Proyecto</div>
    <div class="grid-2">
      <div class="field"><div class="field-label">Cliente</div><div class="field-value">${ep.nombreCliente || "&nbsp;"}</div></div>
      <div class="field"><div class="field-label">Propuesta N°</div><div class="field-value">${ep.propuestaNumero || "&nbsp;"}</div></div>
      <div class="field"><div class="field-label">Monto del Proyecto</div><div class="field-value">${fmt(ep.montoProyecto || 0)}</div></div>
      <div class="field"><div class="field-label">Fecha</div><div class="field-value">${new Date().toLocaleDateString("es-CL")}</div></div>
    </div>
  </div>

  <div class="kpi-grid">
    <div class="kpi-card"><div class="kpi-label">Ingreso Total</div><div class="kpi-value">${fmt((resultado.ingreso?.mes1||0)+(resultado.ingreso?.mes2||0)+(resultado.ingreso?.mes3||0))}</div></div>
    <div class="kpi-card"><div class="kpi-label">Total Gastos</div><div class="kpi-value">${fmt((resultado.gastos?.mes1||0)+(resultado.gastos?.mes2||0)+(resultado.gastos?.mes3||0))}</div></div>
    <div class="kpi-card"><div class="kpi-label">Resultado Neto</div><div class="kpi-value">${fmt((resultado.resultado?.mes1||0)+(resultado.resultado?.mes2||0)+(resultado.resultado?.mes3||0))}</div></div>
    <div class="kpi-card"><div class="kpi-label">N° Cuotas</div><div class="kpi-value">${resultado.nCuotas || 0}</div></div>
  </div>

  <div class="section">
    <div class="section-title">Distribución por Mes</div>
    <table>
      <thead>
        <tr>
          <th>Concepto</th>
          <th class="text-right">Mes 1</th>
          <th class="text-right">Mes 2</th>
          <th class="text-right">Mes 3</th>
          <th class="text-right">Total</th>
        </tr>
      </thead>
      <tbody>
        <tr><td>Ingreso por Mes</td><td class="text-right">${fmt(resultado.ingreso?.mes1||0)}</td><td class="text-right">${fmt(resultado.ingreso?.mes2||0)}</td><td class="text-right">${fmt(resultado.ingreso?.mes3||0)}</td><td class="text-right">${fmt((resultado.ingreso?.mes1||0)+(resultado.ingreso?.mes2||0)+(resultado.ingreso?.mes3||0))}</td></tr>
        <tr><td>Gastos</td><td class="text-right">${fmt(resultado.gastos?.mes1||0)}</td><td class="text-right">${fmt(resultado.gastos?.mes2||0)}</td><td class="text-right">${fmt(resultado.gastos?.mes3||0)}</td><td class="text-right">${fmt((resultado.gastos?.mes1||0)+(resultado.gastos?.mes2||0)+(resultado.gastos?.mes3||0))}</td></tr>
        <tr class="total-row"><td>Resultado</td><td class="text-right">${fmt(resultado.resultado?.mes1||0)}</td><td class="text-right">${fmt(resultado.resultado?.mes2||0)}</td><td class="text-right">${fmt(resultado.resultado?.mes3||0)}</td><td class="text-right">${fmt((resultado.resultado?.mes1||0)+(resultado.resultado?.mes2||0)+(resultado.resultado?.mes3||0))}</td></tr>
      </tbody>
    </table>
  </div>

  <div class="section">
    <div class="section-title">Facturación Inter-Empresa (Mes 1)</div>
    <table>
      <thead><tr><th>Concepto</th><th class="text-right">Monto</th></tr></thead>
      <tbody>
        <tr><td>Distribución GIM (${resultado.distribucion?.gim?.porcentaje||10}%)</td><td class="text-right">${fmt(resultado.distribucion?.gim?.mes1||0)}</td></tr>
        <tr><td>Distribución GP (${resultado.distribucion?.gp?.porcentaje||90}%)</td><td class="text-right">${fmt(resultado.distribucion?.gp?.mes1||0)}</td></tr>
        <tr><td>Facturación Bruto</td><td class="text-right">${fmt(resultado.facturacion?.bruto?.mes1||0)}</td></tr>
        <tr><td>IVA (${resultado.facturacion?.impuesto?.tasa||19}%)</td><td class="text-right">${fmt(resultado.facturacion?.impuesto?.mes1||0)}</td></tr>
        <tr class="total-row"><td>Facturación Neto</td><td class="text-right">${fmt(resultado.facturacion?.neto?.mes1||0)}</td></tr>
      </tbody>
    </table>
  </div>

  <div class="page-footer">
    <span>CDLatam — Transformación Digital en Latinoamérica</span>
    <span>Generado el ${new Date().toLocaleDateString("es-CL")}</span>
  </div>
</div>
</body>
</html>`;
}

// ─── Print Helper (solo Resultado EP) ─────────────────────────────────────────

function printHTML(html: string, filename: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const iframe = document.createElement("iframe");
    iframe.style.cssText = "position:fixed;top:-9999px;left:-9999px;width:210mm;height:297mm;border:none;";
    iframe.title = filename;
    document.body.appendChild(iframe);

    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!doc) { document.body.removeChild(iframe); reject(new Error("No iframe doc")); return; }

    doc.open(); doc.write(html); doc.close();

    const cleanup = () => { try { document.body.removeChild(iframe); } catch {} resolve(); };

    iframe.onload = () => {
      setTimeout(() => {
        try {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
          setTimeout(cleanup, 1000);
        } catch (e) { cleanup(); reject(e); }
      }, 300);
    };
  });
}
