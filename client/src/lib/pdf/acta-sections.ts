import type { ActaData } from "@/hooks/useFormStore";
import type { PdfLayout } from "./types";
import {
  LOGO_NATURAL_W_PX,
  LOGO_NATURAL_H_PX,
  PDF_COLOR_GLOBAL,
  PDF_COLOR_TINT,
  PDF_COLOR_SUBTITLE,
  COLOR_TEXT,
  COLOR_GRAY,
  COLOR_LIGHT,
  resolveHeaderColor,
  fitImagePreserveAspectMm,
  drawHeaderBand,
} from "./constants";
import { ensureSpace, drawSectionTitle, drawFieldRow, drawIntroBox, drawContactGrid, drawPagoTable, drawBulletList } from "./draw-primitives";
import { formatDate } from "../formatters";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
// Logo pre-compuesto sobre fondo azul CDLatam (sin transparencia → no se ve "engranado" en jsPDF)
import cdlatamLogoOnBrand from "@/assets/cdlatam-logo-on-brand.png";

export function drawHeaderSection(
  doc: jsPDF,
  lo: PdfLayout,
  noActa: string,
  fecha: string,
  margin: number,
  pageWidth: number,
  y: number,
  /** Override opcional del color de membrete (prioridad máxima sobre PDF_HEADER_COLOR) */
  headerColor?: [number, number, number],
): number {
  const HEADER_H = 26;  // franja más alta para acomodar logo grande
  const TOP_MARGIN = 8; // margen superior del mismo color que la franja
  const BOTTOM_GAP = 10; // espacio entre membrete y contenido del acta

  // Color de membrete: override > PDF_HEADER_COLOR > PDF_COLOR_GLOBAL
  const hColor = resolveHeaderColor(headerColor);

  // Margen superior + franja (sólido o degradado según PDF_HEADER_USE_GRADIENT en constants.ts)
  drawHeaderBand(doc, 0, y, pageWidth, TOP_MARGIN, hColor);
  drawHeaderBand(doc, 0, y + TOP_MARGIN, pageWidth, HEADER_H, hColor);

  // Logo pre-compuesto más grande
  try {
    const boxW = 72;  // más ancho
    const boxH = 18;  // más alto
    const { drawW, drawH } = fitImagePreserveAspectMm(
      LOGO_NATURAL_W_PX,
      LOGO_NATURAL_H_PX,
      boxW,
      boxH,
    );
    const imgX = margin;
    // Centrar logo verticalmente dentro de la franja
    const imgY = y + TOP_MARGIN + (HEADER_H - drawH) / 2;
    doc.addImage(cdlatamLogoOnBrand, "PNG", imgX, imgY, drawW, drawH, undefined, "FAST");
  } catch {
    /* omitir si falla */
  }

  // Centro de la franja
  const bandMid = y + TOP_MARGIN + HEADER_H / 2;

  // Título a la derecha en blanco
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(lo.fontSize.title);
  doc.text("Acta de Aceptación de Servicios", pageWidth - margin, bandMid - 4, { align: "right", baseline: "middle" });

  // N° de acta
  doc.setFontSize(lo.fontSize.subtitle);
  doc.text(`N° ${noActa || "S/N"}`, pageWidth - margin, bandMid + 2, { align: "right", baseline: "middle" });

  // Fecha
  doc.setFont("helvetica", "normal");
  doc.setFontSize(lo.fontSize.small);
  doc.setTextColor(...PDF_COLOR_SUBTITLE);
  doc.text(`Fecha: ${formatDate(fecha)}`, pageWidth - margin, bandMid + 8, { align: "right", baseline: "middle" });

  // Espacio generoso entre membrete y contenido del acta
  y += TOP_MARGIN + HEADER_H + BOTTOM_GAP;

  // Restaurar color de texto
  doc.setTextColor(...COLOR_TEXT);

  return y;
}

export function drawEncabezado(
  doc: jsPDF,
  lo: PdfLayout,
  acta: ActaData,
  margin: number,
  y: number,
  contentWidth: number,
): number {
  y = drawFieldRow(doc, lo, [
    { label: "Sres.", value: acta.sres },
    { label: "Atención", value: acta.atencion },
    { label: "Fecha", value: formatDate(acta.fecha) },
  ], margin, y, contentWidth);

  const textoIntro =
    (acta as { textoIntroductorio?: string }).textoIntroductorio ||
    "Por medio de la presente, confirmo la recepción y aprobación de la propuesta comercial, en los términos y condiciones aquí expresados.";
  y = drawIntroBox(doc, lo, textoIntro, margin, y, contentWidth);

  return y;
}

export function drawInfoLegal(
  doc: jsPDF,
  lo: PdfLayout,
  acta: ActaData,
  margin: number,
  spacing: number,
  y: number,
  contentWidth: number,
): number {
  y += spacing - 1;
  y = drawSectionTitle(doc, lo, "Información Legal de Cliente", margin, y);
  y = drawFieldRow(doc, lo, [
    { label: "Razón Social", value: acta.razonSocial },
    { label: "Nombre de Fantasía", value: acta.nombreFantasia },
  ], margin, y, contentWidth);
  y = drawFieldRow(doc, lo, [
    { label: acta.tipoDocumento || "RUT", value: acta.rucDniRut },
    { label: "Moneda", value: acta.moneda },
  ], margin, y, contentWidth);
  y = drawFieldRow(doc, lo, [
    { label: "Dirección Comercial", value: acta.direccionComercial },
    { label: "País", value: acta.pais },
  ], margin, y, contentWidth);
  return y;
}

export function drawContactSection(
  doc: jsPDF,
  lo: PdfLayout,
  acta: ActaData,
  margin: number,
  spacing: number,
  sectionGap: number,
  y: number,
  contentWidth: number,
): number {
  y += spacing + sectionGap;
  y = drawSectionTitle(doc, lo, "Información de Contacto", margin, y);
  y = drawContactGrid(doc, lo, [
    {
      title: "Representante Legal",
      fields: [
        { label: "Nombre", value: acta.representanteLegal },
        { label: "Tipo Doc.", value: acta.representanteTipoDoc },
        { label: "N° Identificación Fiscal", value: acta.representanteDni },
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
  return y;
}

export function drawServiciosTable(
  doc: jsPDF,
  lo: PdfLayout,
  serviciosContratados: ActaData["serviciosContratados"],
  margin: number,
  y: number,
  spacing: number,
  sectionGap: number,
  fmt: (v: number) => string,
  cellPadding: number,
): number {
  y = drawSectionTitle(doc, lo, "Servicios Contratados", margin, y);

  const precioUnitarioServicio = (s: { precioUnitario?: number; valorUnitario?: number }) =>
    Number(s.precioUnitario ?? s.valorUnitario ?? 0);
  const totalServicios = serviciosContratados.reduce((sum, s) => sum + s.total, 0);

  const servicioRows = serviciosContratados.map((s, i) => [
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

  // Ancho dinámico solo para columnas angostas (4-8) — midiendo header + body
  const headCells = ["#", "U.Negocio", "Solucion", "Detalle", "Tipo Venta", "V.Unit.", "Cant.", "Total", "Plazo"];
  const narrowCols = [4, 5, 6, 7, 8];
  const narrowW: Record<number, number> = {};
  doc.setFontSize(lo.fontSize.small);
  for (const ci of narrowCols) {
    let maxW = doc.getTextWidth(headCells[ci]);
    for (const row of servicioRows) {
      const w = doc.getTextWidth(row[ci]);
      if (w > maxW) maxW = w;
    }
    narrowW[ci] = maxW + 4;
  }

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [headCells],
    body: servicioRows,
    styles: { fontSize: lo.fontSize.small, cellPadding, textColor: COLOR_TEXT },
    headStyles: { fillColor: PDF_COLOR_GLOBAL, textColor: [255, 255, 255], fontStyle: "bold" },
    alternateRowStyles: { fillColor: [249, 250, 251] },
    columnStyles: {
      0: { cellWidth: 6, halign: "center" },
      4: { cellWidth: narrowW[4] },
      5: { cellWidth: narrowW[5], halign: "right" },
      6: { cellWidth: narrowW[6], halign: "right" },
      7: { cellWidth: narrowW[7], halign: "right", fontStyle: "bold" },
      8: { cellWidth: narrowW[8] },
    },
    didParseCell: (hookData) => {
      if (hookData.section === "body" && hookData.row.index === servicioRows.length - 1) {
        hookData.cell.styles.fillColor = PDF_COLOR_TINT;
        hookData.cell.styles.fontStyle = "bold";
      }
    },
  });
  y = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y;
  y += spacing + sectionGap;

  return y;
}

export function drawFormasPagoSection(
  doc: jsPDF,
  lo: PdfLayout,
  acta: ActaData,
  margin: number,
  y: number,
  spacing: number,
  sectionGap: number,
  fmt: (v: number) => string,
): number {
  if (acta.formasPagoImplementacion?.length && lo.sections.formasPago) {
    y = ensureSpace(doc, y, 30, lo);
    y = drawSectionTitle(doc, lo, "Formas de Pago — Implementación", margin, y);
    y = drawPagoTable(doc, lo, acta.formasPagoImplementacion, margin, y, fmt);
    y += spacing + sectionGap;
  }

  if (acta.formasPagoMantencion?.length && lo.sections.formasPago) {
    y = ensureSpace(doc, y, 30, lo);
    y = drawSectionTitle(doc, lo, "Formas de Pago — Mantención", margin, y);
    y = drawPagoTable(doc, lo, acta.formasPagoMantencion, margin, y, fmt, "mantencion");
    y += spacing + sectionGap;
  }

  return y;
}

export function drawConsideracionesSection(
  doc: jsPDF,
  lo: PdfLayout,
  acta: ActaData,
  margin: number,
  contentWidth: number,
  y: number,
  spacing: number,
): number {
  if (!lo.sections.consideraciones) return y;

  y = ensureSpace(doc, y, 30, lo);
  y = drawSectionTitle(doc, lo, "Consideraciones y Alcances Comerciales", margin, y);
  const personalizadas = (acta as { consideracionesPersonalizadas?: string[] }).consideracionesPersonalizadas ?? [];
  const consideracionesPdf = personalizadas.map(s => s.trim()).filter(Boolean);
  if (consideracionesPdf.length) {
    y += 1;
    y = drawBulletList(doc, lo, consideracionesPdf, margin, y, contentWidth);
  } else {
    y += 2;
    doc.setFontSize(lo.fontSize.small);
    doc.setTextColor(...COLOR_GRAY);
    doc.setFont("helvetica", "italic");
    doc.text("(Sin consideraciones agregadas al acta.)", margin, y);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...COLOR_TEXT);
    y += spacing + 1;
  }

  return y;
}

export function drawClausulasSection(
  doc: jsPDF,
  lo: PdfLayout,
  acta: ActaData,
  margin: number,
  contentWidth: number,
  y: number,
  lineHeight: number,
): number {
  if (!lo.sections.clausulasLegales) return y;

  const clausulasLegales = (acta as { clausulasLegales?: string }).clausulasLegales ?? "";
  if (!clausulasLegales.trim()) return y;

  y = ensureSpace(doc, y, 25, lo);
  y = drawSectionTitle(doc, lo, "Cláusulas Legales", margin, y);
  doc.setFontSize(lo.fontSize.body);
  doc.setTextColor(...COLOR_TEXT);
  doc.setFont("helvetica", "normal");
  const lines = doc.splitTextToSize(clausulasLegales.trim(), contentWidth);
  for (const line of lines) {
    y = ensureSpace(doc, y, lineHeight, lo);
    doc.text(line, margin, y);
    y += lineHeight;
  }

  return y;
}

export function drawFirmaBlock(
  doc: jsPDF,
  lo: PdfLayout,
  representanteLegal: string,
  razonSocial: string,
  margin: number,
  pageWidth: number,
  pageHeight: number,
  lineHeight: number,
  spacing: number,
): void {
  const firmaW = 70;
  const firmaHeight = Math.max(4, spacing) + lineHeight + lineHeight + lineHeight + 1;
  const firmaY = pageHeight - margin - 10 - firmaHeight;
  doc.setDrawColor(...COLOR_TEXT);
  doc.setLineWidth(0.3);
  doc.line(margin, firmaY, margin + firmaW, firmaY);
  doc.setFontSize(lo.fontSize.body);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLOR_TEXT);
  doc.text(representanteLegal || "___________________________", margin + firmaW / 2, firmaY + lineHeight, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(lo.fontSize.small);
  doc.setTextColor(...COLOR_GRAY);
  doc.text("Representante Legal", margin + firmaW / 2, firmaY + lineHeight + lineHeight, { align: "center" });
  doc.text(razonSocial || "", margin + firmaW / 2, firmaY + lineHeight + lineHeight + lineHeight, { align: "center" });
}

export function drawFooter(
  doc: jsPDF,
  lo: PdfLayout,
  margin: number,
  pageWidth: number,
): void {
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    const fy = lo.pageHeight - 8;
    doc.setDrawColor(...COLOR_LIGHT);
    doc.setLineWidth(0.2);
    doc.line(margin, fy - 3, pageWidth - margin, fy - 3);
    doc.setFontSize(lo.fontSize.tiny * 0.9);
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
}
