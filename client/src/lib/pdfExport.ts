/**
 * Módulo de exportación PDF para Acta de Aceptación y Resultado Evaluación.
 * Usa la API nativa de impresión del navegador con estilos CSS personalizados.
 */

import type { ActaData } from "@/hooks/useFormStore";
import type { EPData, ResultadoCalculado } from "@/hooks/useFormStore";
import { formatCurrency, formatDate, getCurrencyCode } from "./formatters";

const CDLATAM_LOGO = "https://files.manuscdn.com/user_upload_by_module/session_file/310519663142649407/FDtlcTtkjZpRheHR.png";
// Color turquesa corporativo CDLatam
const BRAND_COLOR = "#00c2b2";
const BRAND_DARK  = "#009e90";
const TEXT_DARK   = "#0f2027";

/**
 * Genera y descarga el PDF del Acta de Aceptación de Servicios.
 */
export async function generateActaPDF(acta: ActaData): Promise<void> {
  const html = buildActaHTML(acta);
  return printHTML(html, `Acta_${acta.noActa || "sin_numero"}_${acta.razonSocial || "cliente"}`);
}

/**
 * Genera y descarga el PDF del Resultado Evaluación.
 */
export async function generateResultadoPDF(ep: EPData, resultado: ResultadoCalculado): Promise<void> {
  const html = buildResultadoHTML(ep, resultado);
  return printHTML(html, `Resultado_EP_${ep.propuestaNumero || "sin_numero"}_${ep.nombreCliente || "cliente"}`);
}

// ─── HTML Builders ────────────────────────────────────────────────────────────

function field(label: string, value: string | number | undefined | null): string {
  return `
    <div class="field">
      <div class="field-label">${label}</div>
      <div class="field-value">${value || "&nbsp;"}</div>
    </div>`;
}

function buildActaHTML(acta: ActaData): string {
  const currencyCode = getCurrencyCode(acta.moneda ?? "");
  const fmt = (v: number) => formatCurrency(v, currencyCode);
  const textoIntro = (acta as any).textoIntroductorio ||
    "Tengo el agrado de comunicar nuestra aceptación a la propuesta comercial número en las condiciones y términos de la misma.";

  const totalServicios = acta.serviciosContratados.reduce((sum, s) => sum + s.total, 0);

  const serviciosRows = acta.serviciosContratados.map((s, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>${s.unidadNegocio || "&nbsp;"}</td>
      <td>${s.solucion || "&nbsp;"}</td>
      <td>${s.detalleServicio || "&nbsp;"}</td>
      <td>${s.tipoVenta || "&nbsp;"}</td>
      <td class="text-right">${fmt(s.valorUnitario)}</td>
      <td class="text-right">${s.cantidad}</td>
      <td class="text-right fw-bold">${fmt(s.total)}</td>
      <td>${s.plazo || "&nbsp;"}</td>
    </tr>`).join("");

  const pagoImplRows = acta.formasPagoImplementacion.map((fp, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>${fp.tipoVenta || "&nbsp;"}</td>
      <td class="text-right">${fp.nCuotas}</td>
      <td class="text-right">${fmt(fp.primeraCuota.monto)}</td>
      <td>${formatDate(fp.primeraCuota.fecha)}</td>
      <td class="text-right">${fmt(fp.segundaCuota.monto)}</td>
      <td>${formatDate(fp.segundaCuota.fecha)}</td>
      <td class="text-right">${fmt(fp.terceraCuota.monto)}</td>
      <td>${formatDate(fp.terceraCuota.fecha)}</td>
    </tr>`).join("");

  const pagoMantRows = acta.formasPagoMantencion.map((fp, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>${fp.tipoVenta || "&nbsp;"}</td>
      <td class="text-right">${fp.nCuotas}</td>
      <td class="text-right">${fmt(fp.primeraCuota.monto)}</td>
      <td>${formatDate(fp.primeraCuota.fecha)}</td>
      <td class="text-right">${fmt(fp.segundaCuota.monto)}</td>
      <td>${formatDate(fp.segundaCuota.fecha)}</td>
      <td class="text-right">${fmt(fp.terceraCuota.monto)}</td>
      <td>${formatDate(fp.terceraCuota.fecha)}</td>
    </tr>`).join("");

  const consideracionesFijas = [
    "Activación nueva.",
    "Valores expresados en dólares.",
    "Valores NO incluyen impuestos ni comisiones bancarias o de transferencia.",
    "El servicio no incluye hardware.",
    "Se considera un descuento del 50% en las dos primeras cuotas de mantención.",
    "La forma de pago de la mantención es mes vencido a partir de la entrega del servicio.",
  ];

  const consideracionesItems = consideracionesFijas
    .map(c => `<li>– ${c}</li>`).join("");

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Acta de Aceptación N° ${acta.noActa || "S/N"}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, Helvetica, sans-serif; font-size: 10pt; color: ${TEXT_DARK}; background: white; }
    .page { padding: 0; min-height: 297mm; }

    /* Header */
    .header { display: flex; align-items: center; justify-content: space-between; padding-bottom: 10px; border-bottom: 3px solid ${BRAND_COLOR}; margin-bottom: 14px; }
    .header-logo { background: ${TEXT_DARK}; border-radius: 6px; padding: 8px 14px; display: inline-flex; align-items: center; }
    .header-logo img { height: 38px; object-fit: contain; }
    .doc-info { text-align: right; }
    .doc-title { font-size: 13pt; font-weight: bold; color: ${TEXT_DARK}; }
    .doc-num { font-size: 10pt; color: ${BRAND_COLOR}; font-weight: 700; }
    .doc-date { font-size: 8.5pt; color: #6b7280; }

    /* Sections */
    .section { margin-bottom: 12px; page-break-inside: avoid; break-inside: avoid; }
    .section-title { font-size: 8.5pt; font-weight: bold; text-transform: uppercase; letter-spacing: 0.06em; color: ${BRAND_DARK}; border-bottom: 1.5px solid ${BRAND_COLOR}; padding-bottom: 3px; margin-bottom: 7px; }

    /* Grids */
    .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 16px; }
    .grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 6px 12px; }
    .grid-4 { display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 6px 12px; }

    /* Fields */
    .field { margin-bottom: 5px; }
    .field-label { font-size: 7pt; color: #6b7280; text-transform: uppercase; letter-spacing: 0.04em; margin-bottom: 1px; }
    .field-value { font-size: 9pt; font-weight: 500; color: ${TEXT_DARK}; border-bottom: 1px solid #d1d5db; padding-bottom: 2px; min-height: 15px; }
    .contact-group-title { font-size: 8pt; font-weight: bold; color: ${BRAND_COLOR}; margin-bottom: 5px; margin-top: 2px; }

    /* Intro text */
    .intro-text { font-size: 9pt; color: #374151; font-style: italic; padding: 8px 10px; background: #f0fdfb; border-left: 3px solid ${BRAND_COLOR}; border-radius: 0 4px 4px 0; margin-bottom: 10px; }

    /* Tables */
    table { width: 100%; border-collapse: collapse; font-size: 8pt; margin-top: 4px; }
    th { background: ${BRAND_COLOR}; color: white; padding: 4px 5px; text-align: left; font-size: 7.5pt; font-weight: 600; }
    th.text-right { text-align: right; }
    td { padding: 3.5px 5px; border-bottom: 1px solid #f3f4f6; vertical-align: middle; }
    tr:nth-child(even) td { background: #f9fafb; }
    .text-right { text-align: right; }
    .fw-bold { font-weight: bold; }
    .total-row td { background: #e6faf8 !important; font-weight: bold; border-top: 1.5px solid ${BRAND_COLOR}; }

    /* Considerations */
    .considerations { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 4px; padding: 8px 10px; font-size: 8pt; color: #4b5563; page-break-inside: avoid; break-inside: avoid; }
    .considerations ul { list-style: none; }
    .considerations li { margin-bottom: 3px; padding-left: 2px; }

    /* Signature */
    .signature-section { margin-top: 24px; padding-top: 12px; border-top: 1px solid #e5e7eb; page-break-inside: avoid; break-inside: avoid; }
    .signature-block { display: inline-block; width: 260px; }
    .signature-img { width: 240px; height: 70px; object-fit: contain; border: 1px solid #d1d5db; border-radius: 4px; background: #fafafa; display: block; margin-bottom: 6px; }
    .signature-empty { width: 240px; height: 70px; border: 1px dashed #d1d5db; border-radius: 4px; background: #fafafa; display: block; margin-bottom: 6px; }
    .signature-line { border-top: 1px solid ${TEXT_DARK}; padding-top: 4px; text-align: center; font-size: 8pt; margin-top: 4px; }

    /* Footer */
    .page-footer { margin-top: 16px; padding-top: 8px; border-top: 1px solid #e5e7eb; display: flex; justify-content: space-between; font-size: 7pt; color: #9ca3af; }

    @page { size: A4; margin: 18mm 18mm 14mm 18mm; }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .section { page-break-inside: avoid !important; break-inside: avoid !important; }
      .considerations { page-break-inside: avoid !important; break-inside: avoid !important; }
      .signature-section { page-break-inside: avoid !important; break-inside: avoid !important; }
    }
  </style>
</head>
<body>
<div class="page">

  <!-- Header con logo CDLatam -->
  <div class="header">
    <div class="header-logo">
      <img src="${CDLATAM_LOGO}" alt="CDLatam" />
    </div>
    <div class="doc-info">
      <div class="doc-title">Acta de Aceptación de Servicios</div>
      <div class="doc-num">N° ${acta.noActa || "S/N"}</div>
      <div class="doc-date">Fecha: ${formatDate(acta.fecha)}</div>
    </div>
  </div>

  <!-- Encabezado: Sres + Atención + Texto introductorio -->
  <div class="section">
    <div class="grid-4" style="margin-bottom:8px;">
      ${field("Sres.", acta.sres)}
      ${field("Atención", acta.atencion)}
      ${field("Fecha", formatDate(acta.fecha))}
      ${field("N° Acta", acta.noActa)}
    </div>
    <div class="intro-text">${textoIntro}</div>
  </div>

  <!-- Datos de la Empresa -->
  <div class="section">
    <div class="section-title">Datos de la Empresa</div>
    <div class="grid-2">
      ${field("Razón Social", acta.razonSocial)}
      ${field("Nombre de Fantasía", acta.nombreFantasia)}
      ${field(acta.tipoDocumento || "RUT", acta.rucDniRut)}
      ${field("Moneda", acta.moneda)}
    </div>
    <div style="margin-top:5px;">
      ${field("Dirección Comercial", acta.direccionComercial)}
    </div>
  </div>

  <!-- Datos de Contacto -->
  <div class="section">
    <div class="section-title">Datos de Contacto</div>
    <div class="grid-3">
      <div>
        <div class="contact-group-title">Representante Legal</div>
        ${field("Nombre", acta.representanteLegal)}
        ${field("DNI / Cédula", acta.representanteDni)}
        ${field("E-mail", acta.representanteEmail)}
        ${field("Teléfono", acta.representanteFono)}
      </div>
      <div>
        <div class="contact-group-title">Contacto Técnico</div>
        ${field("Nombre", acta.contactoTecnico)}
        ${field("E-mail", acta.contactoTecnicoEmail)}
        ${field("Teléfono", acta.contactoTecnicoFono)}
      </div>
      <div>
        <div class="contact-group-title">Contacto Facturación</div>
        ${field("Nombre", acta.contactoFacturacion)}
        ${field("E-mail", acta.contactoFacturacionEmail)}
        ${field("Teléfono", acta.contactoFacturacionFono)}
      </div>
    </div>
  </div>

  <!-- Servicios Contratados -->
  <div class="section">
    <div class="section-title">Servicios Contratados</div>
    <table>
      <thead>
        <tr>
          <th>#</th>
          <th>Unidad Negocio</th>
          <th>Solución</th>
          <th>Detalle Servicio</th>
          <th>Tipo Venta</th>
          <th class="text-right">Valor Unit.</th>
          <th class="text-right">Cant.</th>
          <th class="text-right">Total</th>
          <th>Plazo</th>
        </tr>
      </thead>
      <tbody>
        ${serviciosRows}
        <tr class="total-row">
          <td colspan="7" class="text-right">TOTAL SERVICIOS</td>
          <td class="text-right">${fmt(totalServicios)}</td>
          <td></td>
        </tr>
      </tbody>
    </table>
  </div>

  <!-- Formas de Pago — Implementación -->
  <div class="section">
    <div class="section-title">Formas de Pago — Implementación</div>
    <table>
      <thead>
        <tr>
          <th>#</th><th>Tipo Venta</th><th class="text-right">N° Cuotas</th>
          <th class="text-right">1ª Cuota</th><th>Fecha</th>
          <th class="text-right">2ª Cuota</th><th>Fecha</th>
          <th class="text-right">3ª Cuota</th><th>Fecha</th>
        </tr>
      </thead>
      <tbody>${pagoImplRows || "<tr><td colspan='9' style='text-align:center;color:#9ca3af;'>—</td></tr>"}</tbody>
    </table>
  </div>

  <!-- Formas de Pago — Mantención -->
  <div class="section">
    <div class="section-title">Formas de Pago — Mantención</div>
    <table>
      <thead>
        <tr>
          <th>#</th><th>Tipo Venta</th><th class="text-right">N° Cuotas</th>
          <th class="text-right">1ª Cuota</th><th>Fecha</th>
          <th class="text-right">2ª Cuota</th><th>Fecha</th>
          <th class="text-right">3ª Cuota en adelante</th><th>Fecha</th>
        </tr>
      </thead>
      <tbody>${pagoMantRows || "<tr><td colspan='9' style='text-align:center;color:#9ca3af;'>—</td></tr>"}</tbody>
    </table>
  </div>

  <!-- Consideraciones -->
  <div class="section">
    <div class="section-title">Consideraciones y Alcances Comerciales</div>
    <div class="considerations">
      <ul>${consideracionesItems}</ul>
    </div>
  </div>

  <!-- Firma del Representante Legal -->
  <div class="signature-section">
    <div class="section-title" style="margin-bottom:12px;">Firma del Representante Legal</div>
    <div class="signature-block">
      ${acta.firmaImagen
        ? `<img class="signature-img" src="${acta.firmaImagen}" alt="Firma" />`
        : `<div class="signature-empty"></div>`
      }
      <div class="signature-line">
        <div style="font-weight:600;">${acta.representanteLegal || "___________________________"}</div>
        <div style="color:#6b7280;font-size:7.5pt;">Representante Legal</div>
      </div>
    </div>
  </div>

  <!-- Footer -->
  <div class="page-footer">
    <span>CDLatam — Transformación Digital en Latinoamérica</span>
    <span>Generado el ${new Date().toLocaleDateString("es-CL")}</span>
  </div>

</div>
</body>
</html>`;
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

// ─── Print Helper ─────────────────────────────────────────────────────────────

function printHTML(html: string, filename: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const iframe = document.createElement("iframe");
    iframe.style.cssText = "position:fixed;top:-9999px;left:-9999px;width:210mm;height:297mm;border:none;";
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
