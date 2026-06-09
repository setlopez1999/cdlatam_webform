/**
 * Módulo de exportación PDF para Acta de Aceptación y Resultado Evaluación.
 *
 * Acta (F1):
 *   - Genera PDF con jsPDF + jspdf-autotable.
 *   - Fusiona PDFs de cláusulas con `pdf-lib`.
 *   - Vista previa en UI con `createActaPdfBlob` + `ActaPdfPreviewDialog`;
 *     `generateActaPDF` descarga al momento (compat).
 *
 * Resultado EP (F2):
 *   - Sigue usando window.print() del HTML estilizado (no se ha pedido cambio).
 */

import type { ActaData } from "@/hooks/useFormStore";
import type { EPData, ResultadoCalculado } from "@/hooks/useFormStore";
import { buildActaCodigo } from "@shared/documentCodes";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { PDFDocument } from "pdf-lib";
import { formatCurrency, formatDate, getCurrencyCode } from "./formatters";
// Logo importado estáticamente por Vite — siempre disponible sin fetch en runtime
import cdlatamLogoDataUrl from "../assets/cdlatam-logo.png";

/** Pixeles del PNG del logo (relación de aspecto al escalar en mm). */
const LOGO_NATURAL_W_PX = 1215;
const LOGO_NATURAL_H_PX = 290;
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
  /** Tipo semántico: 'clausula' | 'features' | 'features_resumido' | 'anexo_soporte' */
  tipo?: string;
  /** Orden global en el PDF final (menor = antes). Default 50. */
  ordenGlobal?: number;
}

/** Opciones de export del Acta (PDF). */
export type ActaPdfExportOpts = {
  onClausulaError?: (c: ClausulaParaPdf, err: unknown) => void;
  /** UUID del expediente: si `noActa` está vacío, se usa el mismo código que el servidor (`F1-…`). */
  expedienteUuid?: string;
  /**
   * Bytes del PDF de Features Resumido generado dinámicamente.
   * Se inserta en el orden correcto según `ordenGlobal` de las cláusulas
   * (entre el PDF de Features estático y las cláusulas legales).
   * El orden del features_resumido es 20 (entre features=10 y cláusulas=30+).
   */
  featuresResumidoBytes?: Uint8Array;
};

function effectiveNoActaForPdf(acta: ActaData, expedienteUuid?: string): string {
  const t = acta.noActa?.trim();
  if (t) return t;
  const ex = expedienteUuid?.trim();
  if (ex) return buildActaCodigo(ex);
  return "";
}
/**
 * Genera el PDF del Acta (con anexos de cláusulas) como Blob, sin descargar.
 */
export async function createActaPdfBlob(
  acta: ActaData,
  clausulas: ClausulaParaPdf[] = [],
  opts: ActaPdfExportOpts = {},
): Promise<{ blob: Blob; filename: string }> {
  const noActa = effectiveNoActaForPdf(acta, opts.expedienteUuid);
  const actaForPdf: ActaData = { ...acta, noActa };
  const baseBytes = await buildActaPdfBytes(actaForPdf);
  const merged = await PDFDocument.load(baseBytes);

  // Ordenar cláusulas por ordenGlobal (menor = antes). Default 50.
  const clausulasOrdenadas = [...clausulas].sort(
    (a, b) => (a.ordenGlobal ?? 50) - (b.ordenGlobal ?? 50),
  );

  // El PDF de Features Resumido dinámico tiene ordenGlobal=20
  // (entre features=10 y cláusulas legales=21+).
  // Se inserta como un ítem virtual en la posición correcta del array.
  const FEATURES_RESUMIDO_ORDEN = 20;

  // Construir lista final de documentos a anexar, incluyendo el Features Resumido dinámico
  type DocEntry =
    | { kind: "static"; clausula: ClausulaParaPdf }
    | { kind: "dynamic_features_resumido" };

  const docsEnOrden: DocEntry[] = [];
  let featuresResumidoInsertado = false;

  for (const c of clausulasOrdenadas) {
    // Insertar el Features Resumido dinámico antes del primer documento con ordenGlobal > 20
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

  // Si no hubo ningún documento con ordenGlobal > 20, insertar al final
  if (!featuresResumidoInsertado && opts.featuresResumidoBytes) {
    docsEnOrden.push({ kind: "dynamic_features_resumido" });
  }

  // Procesar cada documento en orden
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
  const filename = `Acta_${noActa || "sin_numero"}_${slug(acta.razonSocial)}.pdf`;
  const buf = new ArrayBuffer(out.byteLength);
  new Uint8Array(buf).set(out);
  return { blob: new Blob([buf], { type: "application/pdf" }), filename };
}

/** Dispara la descarga de un PDF ya generado (p. ej. desde la vista previa). */
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
  opts: ActaPdfExportOpts = {},
): Promise<void> {
  const { blob, filename } = await createActaPdfBlob(acta, clausulas, opts);
  downloadPdfBlob(blob, filename);
}

/**
 * Genera y descarga el PDF del Resultado Evaluación.
 */
export async function generateResultadoPDF(
  ep: EPData,
  resultado: ResultadoCalculado,
  pdfOpts?: {
    /** Si es false, omite distribución GIM/GP y facturación inter-empresa (p. ej. Acta no guardada). Por defecto true. */
    mostrarDistribucionYFacturacion?: boolean;
    etiquetaBloqueGim?: string;
  },
): Promise<void> {
  const html = buildResultadoHTML(ep, resultado, pdfOpts);
  return printHTML(html, `Resultado_EP_${ep.propuestaNumero || "sin_numero"}_${ep.nombreCliente || "cliente"}`);
}

// ─── Helpers genéricos ────────────────────────────────────────────────────────

function slug(s: string | undefined): string {
  return (s || "cliente").trim().replace(/\s+/g, "_").replace(/[^\w\-]/g, "").slice(0, 40) || "cliente";
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

/** Escala ancho/alto en mm manteniendo proporción dentro de un rectángulo máximo. */
function fitImagePreserveAspectMm(
  naturalW: number,
  naturalH: number,
  maxW: number,
  maxH: number,
): { drawW: number; drawH: number } {
  const ratio = naturalW / naturalH;
  let drawW = maxW;
  let drawH = maxW / ratio;
  if (drawH > maxH) {
    drawH = maxH;
    drawW = maxH * ratio;
  }
  return { drawW, drawH };
}

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
 *   8. Consideraciones del acta (lista en F1)
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
  /** F1 (expedientes) usa `precioUnitario`; legado ActaData usa `valorUnitario`. */
  const precioUnitarioServicio = (s: { precioUnitario?: number; valorUnitario?: number }) =>
    Number(s.precioUnitario ?? s.valorUnitario ?? 0);
  const totalServicios = acta.serviciosContratados.reduce((sum, s) => sum + s.total, 0);

  let y = margin;

  // ── 1. Header ───────────────────────────────────────────────────────────
  // Logo importado estáticamente por Vite: siempre disponible, sin fetch en runtime
  const logo: string | null = cdlatamLogoDataUrl ?? null;
  if (logo) {
    doc.setFillColor(...COLOR_TEXT);
    doc.roundedRect(margin, y, 38, 14, 2, 2, "F");
    try {
      const innerX = margin + 4;
      const innerY = y + 2;
      const boxW = 30;
      const boxH = 10;
      const { drawW, drawH } = fitImagePreserveAspectMm(
        LOGO_NATURAL_W_PX,
        LOGO_NATURAL_H_PX,
        boxW,
        boxH,
      );
      const imgX = innerX + (boxW - drawW) / 2;
      const imgY = innerY + (boxH - drawH) / 2;
      doc.addImage(logo, "PNG", imgX, imgY, drawW, drawH, undefined, "FAST");
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
    "Por medio de la presente, confirmo la recepción y aprobación de la propuesta comercial, en los términos y condiciones aquí expresados (indicado en mail que precede).";
  y = drawIntroBox(doc, textoIntro, margin, y, contentWidth);

  // ── 3. Datos de la empresa ──────────────────────────────────────────────
  y += 3; // espacio extra entre glosa legal e Información Legal
  y = drawSectionTitle(doc, "Información Legal de Cliente", margin, y);
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
  y += 4; // espacio entre Información Legal e Información de Contacto
  y = drawSectionTitle(doc, "Información de Contacto", margin, y);
  y = drawContactGrid(doc, [
    {
      title: "Representante Legal",
      fields: [
        { label: "Nombre", value: acta.representanteLegal },
        { label: "DNI / Cédula", value: acta.representanteDni },
        { label: "E-mail", value: acta.representanteEmail },
        { label: "Teléfono", value: acta.representanteFono },
      ],
    },
    {
      title: "Contacto Técnico",
      fields: [
        { label: "Nombre", value: acta.contactoTecnico },
        { label: "E-mail", value: acta.contactoTecnicoEmail },
        { label: "Teléfono", value: acta.contactoTecnicoFono },
      ],
    },
    {
      title: "Contacto Facturación",
      fields: [
        { label: "Nombre", value: acta.contactoFacturacion },
        { label: "E-mail", value: acta.contactoFacturacionEmail },
        { label: "Teléfono", value: acta.contactoFacturacionFono },
      ],
    },
  ], margin, y, contentWidth);

  // ── 5. Servicios contratados ────────────────────────────────────────────
  y = drawSectionTitle(doc, "Servicios Contratados", margin, y);
  const servicioRows = acta.serviciosContratados.map((s, i) => [
    String(i + 1),
    s.unidadNegocio || "",
    s.solucion || "",
    s.detalleServicio || "",
    s.tipoVenta || "",
    fmt(precioUnitarioServicio(s)),
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
    y = drawPagoTable(doc, acta.formasPagoMantencion, margin, y, fmt, "mantencion");
    const ahorroMant = (acta as { total_descuento_mantencion?: number }).total_descuento_mantencion;
    if (typeof ahorroMant === "number" && ahorroMant > 0) {
      doc.setFontSize(7);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...COLOR_GRAY);
      doc.text(`Ahorro total acumulado (cuotas de gracia): ${fmt(ahorroMant)}`, margin, y);
      y += 5;
      doc.setTextColor(...COLOR_TEXT);
    }
  }

  // ── 8. Consideraciones (solo ítems incluidos en el acta — F1) ─────────────
  y = ensureSpace(doc, y, 30);
  y = drawSectionTitle(doc, "Consideraciones y Alcances Comerciales", margin, y);
  const personalizadas = (acta as { consideracionesPersonalizadas?: string[] }).consideracionesPersonalizadas ?? [];
  const consideracionesPdf = personalizadas.map(s => s.trim()).filter(Boolean);
  if (consideracionesPdf.length) {
    y += 1;
    y = drawBulletList(doc, consideracionesPdf, margin, y, contentWidth);
  } else {
    y += 2;
    doc.setFontSize(8);
    doc.setTextColor(...COLOR_GRAY);
    doc.setFont("helvetica", "italic");
    doc.text("(Sin consideraciones agregadas al acta.)", margin, y);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...COLOR_TEXT);
    y += 5;
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
  // Solo línea de firma + nombre + label (sin imagen ni marco)
  const firmaW = 70;
  y = ensureSpace(doc, y, 22);
  y += 6;
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
      `Generado el ${new Date().toLocaleDateString("es-CL")}`,
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

function drawContactGrid(
  doc: jsPDF,
  groups: { title: string; fields: FieldDef[] }[],
  x: number,
  y: number,
  width: number,
): number {
  const colW = width / groups.length;
  const maxFields = Math.max(...groups.map(g => g.fields.length));
  const rowH = 4.5;
  const gridH = 10 + maxFields * rowH + 2;
  y = ensureSpace(doc, y, gridH);
  groups.forEach((group, gi) => {
    const cx = x + gi * colW;
    doc.setFontSize(7.5);
    doc.setTextColor(...COLOR_BRAND);
    doc.setFont("helvetica", "bold");
    doc.text(String(group.title), cx + 2, y + 4);
    group.fields.forEach((f, fi) => {
      const fy = y + 7 + fi * rowH;
      doc.setFontSize(6.5);
      doc.setTextColor(...COLOR_GRAY);
      doc.setFont("helvetica", "normal");
      doc.text(`${f.label}:`, cx + 2, fy);
      doc.setFontSize(7.5);
      doc.setTextColor(...COLOR_TEXT);
      doc.setFont("helvetica", "normal");
      const value = f.value == null || f.value === "" ? " " : String(f.value);
      const labelW = 22;
      const valueW = colW - labelW - 4;
      if (valueW > 8) {
        const lines = doc.splitTextToSize(value, Math.max(1, valueW));
        doc.text(lines[0] ?? " ", cx + 2 + labelW, fy);
      } else {
        doc.text(value.length > 15 ? value.substring(0, 15) + "…" : value, cx + 2 + labelW, fy);
      }
    });
  });
  doc.setDrawColor(209, 213, 219);
  doc.setLineWidth(0.2);
  for (let gi = 1; gi < groups.length; gi++) {
    const cx = x + gi * colW;
    doc.line(cx, y + 2, cx, y + gridH - 1);
  }
  doc.line(x, y + gridH - 1, x + width, y + gridH - 1);
  return y + gridH + 3;
}

function drawPagoTable(
  doc: jsPDF,
  formas: Array<{ tipoVenta: string; nCuotas: number; cuotas?: Array<{ monto: number; fecha: string }> }>,
  x: number,
  y: number,
  fmt: (v: number) => string,
  variant: "implementacion" | "mantencion" = "implementacion",
): number {
  const maxCuotas = Math.min(4, Math.max(1, ...formas.map(i => i.nCuotas || 0)));
  const head = ["#", "Tipo Venta", variant === "mantencion" ? "N° Cuotas" : "N° Cuotas"];
  for (let i = 0; i < maxCuotas; i++) {
    const cuotaLabel = variant === "mantencion" ? `Cuota ${i + 1}` : `${i + 1}ª Cuota`;
    head.push(cuotaLabel, "Fecha");
  }

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

/** Devuelve entero 0–100 para mostrar en PDF/HTML; acepta fracción (0.1) o ya en puntos. */
function porcentajeUIMostrar(val: number | undefined, fallback: number): number {
  const v = val ?? fallback;
  if (!Number.isFinite(v)) return fallback > 0 && fallback <= 1 ? Math.round(fallback * 100) : Math.round(fallback);
  if (v > 0 && v <= 1) return Math.round(v * 100);
  return Math.round(v);
}

function buildResultadoHTML(
  ep: EPData,
  resultado: ResultadoCalculado,
  pdfOpts?: {
    mostrarDistribucionYFacturacion?: boolean;
    etiquetaBloqueGim?: string;
  },
): string {
  const logoUrl = cdlatamLogoDataUrl;
  const fmt = (v: number) => formatCurrency(v, "USD");
  const mostrarDist = pdfOpts?.mostrarDistribucionYFacturacion !== false;
  const etiquetaGim = pdfOpts?.etiquetaBloqueGim?.trim() || "GIM";
  const pctGim = porcentajeUIMostrar(resultado.distribucion?.gim?.porcentaje, 10);
  const pctGp = porcentajeUIMostrar(resultado.distribucion?.gp?.porcentaje, 90);
  const pctIva = porcentajeUIMostrar(resultado.facturacion?.impuesto?.tasa, 19);

  const bloqueFacturacion = mostrarDist
    ? `
  <div class="section">
    <div class="section-title">Facturación Inter-Empresa (Mes 1)</div>
    <table>
      <thead><tr><th>Concepto</th><th class="text-right">Monto</th></tr></thead>
      <tbody>
        <tr><td>Distribución ${etiquetaGim} (${pctGim}%)</td><td class="text-right">${fmt(resultado.distribucion?.gim?.mes1||0)}</td></tr>
        <tr><td>Groupalnet SpA (${pctGp}%)</td><td class="text-right">${fmt(resultado.distribucion?.gp?.mes1||0)}</td></tr>
        <tr><td>Facturación Bruto</td><td class="text-right">${fmt(resultado.facturacion?.bruto?.mes1||0)}</td></tr>
        <tr><td>IVA (${pctIva}%)</td><td class="text-right">${fmt(resultado.facturacion?.impuesto?.mes1||0)}</td></tr>
        <tr class="total-row"><td>Facturación Neto</td><td class="text-right">${fmt(resultado.facturacion?.neto?.mes1||0)}</td></tr>
      </tbody>
    </table>
  </div>`
    : `
  <div class="section">
    <div class="section-title">Facturación Inter-Empresa</div>
    <p style="font-size:9pt;color:#6b7280;">Disponible cuando el Acta de Aceptación (F1) esté guardada.</p>
  </div>`;

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
    <div><img src="${logoUrl}" alt="CDLatam" style="height:38px;object-fit:contain;" /></div>
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

  ${bloqueFacturacion}

  <div class="page-footer">
    <span>CDLatam — Transformación Digital en Latinoamérica</span>
    <span>Generado el ${new Date().toLocaleDateString("es-CL")}</span>
  </div>
</div>
</body>
</html>`;
}

// ─── Features Resumido PDF ───────────────────────────────────────────────────

/**
 * Genera un PDF de una página con la tabla de Features Resumido (SI/NO)
 * basado en el estado de implementación del expediente.
 *
 * @param items  Array de ImplementacionItemVM con { key, label, estado }
 * @param razonSocial  Nombre del cliente para el encabezado
 * @returns Uint8Array con los bytes del PDF generado
 */
export function buildFeaturesResumidoPdfBytes(
  items: Array<{ key: string; label: string; estado: boolean }>,
  razonSocial: string,
): Uint8Array {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  // ── Encabezado ──────────────────────────────────────────────────────────
  const logo: string | null = cdlatamLogoDataUrl ?? null;
  if (logo) {
    doc.setFillColor(...COLOR_TEXT);
    doc.roundedRect(margin, y, 38, 14, 2, 2, "F");
    try {
      const innerX = margin + 4;
      const innerY = y + 2;
      const boxW = 30;
      const boxH = 10;
      const { drawW, drawH } = fitImagePreserveAspectMm(LOGO_NATURAL_W_PX, LOGO_NATURAL_H_PX, boxW, boxH);
      const imgX = innerX + (boxW - drawW) / 2;
      const imgY = innerY + (boxH - drawH) / 2;
      doc.addImage(logo, "PNG", imgX, imgY, drawW, drawH, undefined, "FAST");
    } catch { /* omitir si falla */ }
  }

  doc.setTextColor(...COLOR_TEXT);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("Features Resumido", pageWidth - margin, y + 5, { align: "right" });
  doc.setTextColor(...COLOR_GRAY);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(razonSocial || "—", pageWidth - margin, y + 11, { align: "right" });
  y += 16;

  doc.setDrawColor(...COLOR_BRAND);
  doc.setLineWidth(0.7);
  doc.line(margin, y, pageWidth - margin, y);
  y += 6;

  // ── Tabla ───────────────────────────────────────────────────────────────
  // Agregar número de orden al label: "1. ADMINISTRACIÓN DE CONTENIDO LINEAL"
  const tableRows = items.map((item, idx) => [`${idx + 1}. ${item.label}`, item.estado ? "SI" : "NO"]);

  autoTable(doc, {
    startY: y,
    head: [["Feature / Módulo", "Incluido"]],
    body: tableRows,
    margin: { left: margin, right: margin },
    tableWidth: contentWidth,
    styles: { fontSize: 9, cellPadding: 3, textColor: [15, 32, 39] as [number, number, number] },
    headStyles: { fillColor: COLOR_BRAND, textColor: [255, 255, 255] as [number, number, number], fontStyle: "bold" },
    columnStyles: {
      0: { cellWidth: contentWidth - 30 },
      1: { cellWidth: 30, halign: "center", fontStyle: "bold" },
    },
    didParseCell: (data) => {
      if (data.section === "body" && data.column.index === 1) {
        const val = data.cell.raw as string;
        data.cell.styles.textColor = val === "SI"
          ? ([16, 185, 129] as [number, number, number])  // emerald-500
          : ([239, 68, 68] as [number, number, number]);  // red-500
      }
    },
  });

  return doc.output("arraybuffer") as unknown as Uint8Array;
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
