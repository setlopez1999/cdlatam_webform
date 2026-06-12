import type { PdfLayout, FieldDef } from "./types";
import { COLOR_BRAND, COLOR_BRAND_DARK, COLOR_TEXT, COLOR_GRAY, COLOR_LIGHT } from "./constants";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { formatDate } from "../formatters";

export function ensureSpace(doc: jsPDF, y: number, needed: number, lo: PdfLayout): number {
  if (lo.noPageBreaks) return y;
  const pageHeight = lo.pageHeight;
  if (y + needed > pageHeight - 14) {
    doc.addPage();
    return lo.margin;
  }
  return y;
}

export function drawSectionTitle(doc: jsPDF, lo: PdfLayout, title: string, x: number, y: number): number {
  y = ensureSpace(doc, y, 8, lo);
  doc.setFontSize(lo.fontSize.sectionTitle);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLOR_BRAND_DARK);
  doc.text(title.toUpperCase(), x, y);
  doc.setDrawColor(...COLOR_BRAND);
  doc.setLineWidth(0.4);
  doc.line(x, y + 1.2, x + 100, y + 1.2);
  return y + (lo.compact ? 4 : 5);
}

export function drawIntroBox(doc: jsPDF, lo: PdfLayout, text: string, x: number, y: number, width: number): number {
  doc.setFontSize(lo.fontSize.body);
  doc.setFont("helvetica", "italic");
  doc.setTextColor(...COLOR_TEXT);
  const lines = doc.splitTextToSize(text, width - 8);
  const lineH = lo.lineHeight;
  const boxHeight = lines.length * lineH + (lo.compact ? 2 : 4);
  y = ensureSpace(doc, y, boxHeight + 2, lo);
  doc.setFillColor(240, 253, 251);
  doc.rect(x, y, width, boxHeight, "F");
  doc.setDrawColor(...COLOR_BRAND);
  doc.setLineWidth(0.8);
  doc.line(x, y, x, y + boxHeight);
  doc.text(lines, x + 4, y + (lo.compact ? 3.5 : 4.5));
  doc.setFont("helvetica", "normal");
  return y + boxHeight + (lo.compact ? 2 : 3);
}

export function drawFieldRow(
  doc: jsPDF,
  lo: PdfLayout,
  fields: FieldDef[],
  x: number,
  y: number,
  width: number,
): number {
  const rowHeight = lo.compact ? 9 : 12;
  y = ensureSpace(doc, y, rowHeight, lo);
  const colW = width / fields.length;
  fields.forEach((f, i) => {
    const cx = x + i * colW;
    doc.setFontSize(lo.fontSize.tiny);
    doc.setTextColor(...COLOR_GRAY);
    doc.setFont("helvetica", "normal");
    doc.text(String(f.label).toUpperCase(), cx, y);
    doc.setFontSize(lo.fontSize.body);
    doc.setTextColor(...COLOR_TEXT);
    doc.setFont("helvetica", "normal");
    const value = f.value == null || f.value === "" ? " " : String(f.value);
    const lines = doc.splitTextToSize(value, colW - 4);
    doc.text(lines[0] ?? " ", cx, y + (lo.compact ? 3.5 : 4));
    doc.setDrawColor(209, 213, 219);
    doc.setLineWidth(0.2);
    doc.line(cx, y + (lo.compact ? 4.5 : 5.5), cx + colW - 4, y + (lo.compact ? 4.5 : 5.5));
  });
  return y + (lo.compact ? 7 : 9);
}

export function drawContactGrid(
  doc: jsPDF,
  lo: PdfLayout,
  groups: { title: string; fields: FieldDef[] }[],
  x: number,
  y: number,
  width: number,
): number {
  const colW = width / groups.length;
  const maxFields = Math.max(...groups.map(g => g.fields.length));
  const headerH = lo.compact ? 8 : 10;

  const valueW = Math.max(1, colW - 4);

  doc.setFontSize(lo.fontSize.small);
  doc.setFont("helvetica", "normal");
  type CellPrep = { label: string; lines: string[] };
  const grid: CellPrep[][] = groups.map(group =>
    group.fields.map(f => {
      const val = f.value == null || f.value === "" ? " " : String(f.value);
      return { label: `${f.label}:`, lines: doc.splitTextToSize(val, valueW) };
    })
  );

  const fieldRowHeights: number[] = [];
  for (let fi = 0; fi < maxFields; fi++) {
    let maxLines = 1;
    for (let gi = 0; gi < groups.length; gi++) {
      if (fi < grid[gi].length) {
        maxLines = Math.max(maxLines, grid[gi][fi].lines.length);
      }
    }
    fieldRowHeights.push(lo.lineHeight + maxLines * lo.lineHeight + 0.3);
  }

  const totalGridH = headerH + fieldRowHeights.reduce((a, b) => a + b, 0) + 2;
  y = ensureSpace(doc, y, totalGridH, lo);

  groups.forEach((group, gi) => {
    const cx = x + gi * colW;
    doc.setFontSize(lo.fontSize.small);
    doc.setTextColor(...COLOR_BRAND);
    doc.setFont("helvetica", "bold");
    doc.text(String(group.title), cx + 2, y + (lo.compact ? 3 : 4));
  });

  let cursorY = y + (lo.compact ? 6 : 7);
  for (let fi = 0; fi < maxFields; fi++) {
    for (let gi = 0; gi < groups.length; gi++) {
      if (fi >= grid[gi].length) continue;
      const cell = grid[gi][fi];
      const cx = x + gi * colW;
      doc.setFontSize(lo.fontSize.tiny);
      doc.setTextColor(...COLOR_GRAY);
      doc.setFont("helvetica", "normal");
      doc.text(cell.label, cx + 2, cursorY);
      doc.setFontSize(lo.fontSize.small);
      doc.setTextColor(...COLOR_TEXT);
      doc.setFont("helvetica", "normal");
      for (let li = 0; li < cell.lines.length; li++) {
        doc.text(cell.lines[li], cx + 2, cursorY + lo.lineHeight + li * lo.lineHeight);
      }
    }
    cursorY += fieldRowHeights[fi];
  }

  const gridEndY = y + totalGridH - 1;

  doc.setDrawColor(209, 213, 219);
  doc.setLineWidth(0.2);
  for (let gi = 1; gi < groups.length; gi++) {
    doc.line(x + gi * colW, y + 2, x + gi * colW, gridEndY);
  }
  doc.line(x, gridEndY, x + width, gridEndY);

  return gridEndY + 1 + (lo.compact ? 2 : 3);
}

export function drawPagoTable(
  doc: jsPDF,
  lo: PdfLayout,
  formas: Array<{ tipoVenta: string; nCuotas: number; cuotas?: Array<{ monto: number; fecha: string }> }>,
  x: number,
  y: number,
  fmt: (v: number) => string,
  variant: "implementacion" | "mantencion" = "implementacion",
): number {
  const maxCuotas = Math.min(4, Math.max(1, ...formas.map(i => i.nCuotas || 0)));
  const head = ["#", "Tipo Venta", "N° Cuotas"];
  for (let i = 0; i < maxCuotas; i++) {
    const cuotaLabel = variant === "mantencion" ? `Cuota ${i + 1}` : `${i + 1}\u00aa Cuota`;
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
    styles: { fontSize: lo.fontSize.small, cellPadding: lo.cellPadding, textColor: COLOR_TEXT },
    headStyles: { fillColor: COLOR_BRAND, textColor: [255, 255, 255], fontStyle: "bold" },
    alternateRowStyles: { fillColor: [249, 250, 251] },
  });
  const finalY = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y;
  return finalY + (lo.compact ? 2 : 4);
}

export function drawBulletList(
  doc: jsPDF,
  lo: PdfLayout,
  items: string[],
  x: number,
  y: number,
  width: number,
): number {
  doc.setFontSize(lo.fontSize.body);
  doc.setTextColor(...COLOR_TEXT);
  doc.setFont("helvetica", "normal");
  for (const item of items) {
    const lines = doc.splitTextToSize(item, width - 6);
    const needed = lines.length * lo.lineHeight + 1;
    y = ensureSpace(doc, y, needed, lo);
    doc.text("\u2013", x, y);
    doc.text(lines, x + 4, y);
    y += needed;
  }
  return y;
}
