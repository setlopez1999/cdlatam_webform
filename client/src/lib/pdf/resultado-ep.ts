import type { EPData, ResultadoCalculado } from "@/hooks/useFormStore";
import { TEXT_DARK, BRAND_COLOR, BRAND_DARK } from "./constants";
import { formatCurrency } from "../formatters";
import cdlatamLogoDataUrl from "@/assets/cdlatam-logo.png";

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
    <div class="section-title">Facturaci\u00f3n Inter-Empresa (Mes 1)</div>
    <table>
      <thead><tr><th>Concepto</th><th class="text-right">Monto</th></tr></thead>
      <tbody>
        <tr><td>Distribuci\u00f3n ${etiquetaGim} (${pctGim}%)</td><td class="text-right">${fmt(resultado.distribucion?.gim?.mes1||0)}</td></tr>
        <tr><td>GROUPALNET SPA (${pctGp}%)</td><td class="text-right">${fmt(resultado.distribucion?.gp?.mes1||0)}</td></tr>
        <tr><td>Facturaci\u00f3n Bruto</td><td class="text-right">${fmt(resultado.facturacion?.bruto?.mes1||0)}</td></tr>
        <tr><td>IVA (${pctIva}%)</td><td class="text-right">${fmt(resultado.facturacion?.impuesto?.mes1||0)}</td></tr>
        <tr class="total-row"><td>Facturaci\u00f3n Neto</td><td class="text-right">${fmt(resultado.facturacion?.neto?.mes1||0)}</td></tr>
      </tbody>
    </table>
  </div>`
    : `
  <div class="section">
    <div class="section-title">Facturaci\u00f3n Inter-Empresa</div>
    <p style="font-size:9pt;color:#6b7280;">Disponible cuando el Acta de Aceptaci\u00f3n (F1) est\u00e9 guardada.</p>
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
    @page { size: Letter; margin: 0; }
    @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
  </style>
</head>
<body>
<div class="page">
  <div class="header">
    <div><img src="${logoUrl}" alt="CDLatam" style="height:38px;object-fit:contain;" /></div>
    <div style="text-align:right;">
      <div class="doc-title">Resultado Evaluaci\u00f3n de Proyecto</div>
      <div class="doc-num">EP N° ${ep.propuestaNumero || "S/N"}</div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Informaci\u00f3n del Proyecto</div>
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
    <div class="section-title">Distribuci\u00f3n por Mes</div>
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
    <span>CDLatam — Transformaci\u00f3n Digital en Latinoam\u00e9rica</span>
    <span>Generado el ${new Date().toLocaleDateString("es-CL")}</span>
  </div>
</div>
</body>
</html>`;
}

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

export async function generateResultadoPDF(
  ep: EPData,
  resultado: ResultadoCalculado,
  pdfOpts?: {
    mostrarDistribucionYFacturacion?: boolean;
    etiquetaBloqueGim?: string;
  },
): Promise<void> {
  const html = buildResultadoHTML(ep, resultado, pdfOpts);
  return printHTML(html, `Resultado_EP_${ep.propuestaNumero || "sin_numero"}_${ep.nombreCliente || "cliente"}`);
}
