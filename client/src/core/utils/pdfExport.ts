/**
 * Módulo de exportación PDF para Acta de Aceptación y Resultado Evaluación.
 * Usa la API nativa de impresión del navegador con estilos CSS personalizados.
 * Para producción, considerar jsPDF o Puppeteer en el servidor.
 */

import type { ActaData } from "@/hooks/useFormStore";
import type { EPData, ResultadoCalculado } from "@/hooks/useFormStore";
import { formatCurrency, formatDate, formatNumber, formatPercent } from "./formatters";

/**
 * Genera y descarga el PDF del Acta de Aceptación de Servicios.
 * Crea un iframe oculto con el HTML del documento y lo imprime.
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

function buildActaHTML(acta: ActaData): string {
  const serviciosRows = acta.serviciosContratados.map((s, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>${s.unidadNegocio || "-"}</td>
      <td>${s.solucion || "-"}</td>
      <td>${s.detalleServicio || "-"}</td>
      <td>${s.tipoVenta || "-"}</td>
      <td class="text-right">${formatCurrency(s.valorUnitario)}</td>
      <td class="text-right">${s.cantidad}</td>
      <td class="text-right font-bold">${formatCurrency(s.total)}</td>
      <td>${s.plazo || "-"}</td>
    </tr>
  `).join("");

  const totalServicios = acta.serviciosContratados.reduce((sum, s) => sum + s.total, 0);

  const pagoImplRows = acta.formasPagoImplementacion.map((fp, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>${fp.tipoVenta || "-"}</td>
      <td class="text-right">${fp.nCuotas}</td>
      <td class="text-right">${formatCurrency(fp.primeraCuota.monto)}</td>
      <td>${formatDate(fp.primeraCuota.fecha)}</td>
      <td class="text-right">${formatCurrency(fp.segundaCuota.monto)}</td>
      <td>${formatDate(fp.segundaCuota.fecha)}</td>
      <td class="text-right">${formatCurrency(fp.terceraCuota.monto)}</td>
    </tr>
  `).join("");

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Acta de Aceptación N° ${acta.noActa || "S/N"}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Arial', sans-serif; font-size: 10pt; color: #1a1a2e; background: white; }
    .page { padding: 20mm 20mm 15mm 20mm; min-height: 297mm; }
    .header { display: flex; align-items: center; justify-content: space-between; padding-bottom: 12px; border-bottom: 3px solid #4338ca; margin-bottom: 16px; }
    .header-logo { display: flex; align-items: center; gap: 10px; }
    .logo-box { width: 40px; height: 40px; background: #4338ca; border-radius: 8px; display: flex; align-items: center; justify-content: center; }
    .logo-box span { color: white; font-size: 18px; font-weight: bold; }
    .company-name { font-size: 14pt; font-weight: bold; color: #4338ca; }
    .company-sub { font-size: 8pt; color: #6b7280; }
    .doc-info { text-align: right; }
    .doc-title { font-size: 16pt; font-weight: bold; color: #1a1a2e; }
    .doc-num { font-size: 10pt; color: #4338ca; font-weight: 600; }
    .doc-date { font-size: 9pt; color: #6b7280; }
    .section { margin-bottom: 14px; }
    .section-title { font-size: 9pt; font-weight: bold; text-transform: uppercase; letter-spacing: 0.05em; color: #4338ca; border-bottom: 1px solid #e5e7eb; padding-bottom: 4px; margin-bottom: 8px; }
    .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
    .grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; }
    .field { margin-bottom: 4px; }
    .field-label { font-size: 7.5pt; color: #6b7280; text-transform: uppercase; letter-spacing: 0.03em; }
    .field-value { font-size: 9.5pt; font-weight: 500; color: #1a1a2e; border-bottom: 1px solid #e5e7eb; padding-bottom: 2px; min-height: 16px; }
    table { width: 100%; border-collapse: collapse; font-size: 8.5pt; }
    th { background: #4338ca; color: white; padding: 5px 6px; text-align: left; font-size: 8pt; }
    th.text-right { text-align: right; }
    td { padding: 4px 6px; border-bottom: 1px solid #f3f4f6; }
    tr:nth-child(even) td { background: #f9fafb; }
    .text-right { text-align: right; }
    .font-bold { font-weight: bold; }
    .total-row td { background: #eef2ff !important; font-weight: bold; border-top: 2px solid #4338ca; }
    .footer { margin-top: 20px; padding-top: 12px; border-top: 1px solid #e5e7eb; }
    .signature-area { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 30px; }
    .signature-line { border-top: 1px solid #1a1a2e; padding-top: 6px; text-align: center; font-size: 8.5pt; }
    .considerations { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; padding: 10px; font-size: 8pt; color: #4b5563; }
    .considerations li { margin-bottom: 3px; margin-left: 12px; }
    @page { size: A4; margin: 0; }
    @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
  </style>
</head>
<body>
<div class="page">
  <!-- Header -->
  <div class="header">
    <div class="header-logo">
      <div class="logo-box"><span>G</span></div>
      <div>
        <div class="company-name">Gestión Administrativa</div>
        <div class="company-sub">Sistema de Documentos Empresariales</div>
      </div>
    </div>
    <div class="doc-info">
      <div class="doc-title">Acta de Aceptación de Servicios</div>
      <div class="doc-num">N° ${acta.noActa || "S/N"}</div>
      <div class="doc-date">Fecha: ${formatDate(acta.fecha)}</div>
    </div>
  </div>

  <!-- Encabezado -->
  <div class="section">
    <div class="grid-2">
      <div class="field">
        <div class="field-label">Atención a</div>
        <div class="field-value">${acta.atencion || "-"}</div>
      </div>
      <div class="field">
        <div class="field-label">Fecha del Acta</div>
        <div class="field-value">${formatDate(acta.fecha)}</div>
      </div>
    </div>
  </div>

  <!-- Datos Empresa -->
  <div class="section">
    <div class="section-title">Datos de la Empresa</div>
    <div class="grid-2">
      <div class="field"><div class="field-label">Razón Social</div><div class="field-value">${acta.razonSocial || "-"}</div></div>
      <div class="field"><div class="field-label">Nombre de Fantasía</div><div class="field-value">${acta.nombreFantasia || "-"}</div></div>
      <div class="field"><div class="field-label">${acta.tipoDocumento || "RUT"}</div><div class="field-value">${acta.rucDniRut || "-"}</div></div>
      <div class="field"><div class="field-label">Dirección Comercial</div><div class="field-value">${acta.direccionComercial || "-"}</div></div>
    </div>
  </div>

  <!-- Contactos -->
  <div class="section">
    <div class="section-title">Datos de Contacto</div>
    <div class="grid-3">
      <div>
        <div class="field-label" style="font-weight:bold;color:#4338ca;margin-bottom:4px;">Representante Legal</div>
        <div class="field"><div class="field-label">Nombre</div><div class="field-value">${acta.representanteLegal || "-"}</div></div>
        <div class="field"><div class="field-label">DNI</div><div class="field-value">${acta.representanteDni || "-"}</div></div>
        <div class="field"><div class="field-label">E-mail</div><div class="field-value">${acta.representanteEmail || "-"}</div></div>
        <div class="field"><div class="field-label">Teléfono</div><div class="field-value">${acta.representanteFono || "-"}</div></div>
      </div>
      <div>
        <div class="field-label" style="font-weight:bold;color:#4338ca;margin-bottom:4px;">Contacto Técnico</div>
        <div class="field"><div class="field-label">Nombre</div><div class="field-value">${acta.contactoTecnico || "-"}</div></div>
        <div class="field"><div class="field-label">E-mail</div><div class="field-value">${acta.contactoTecnicoEmail || "-"}</div></div>
        <div class="field"><div class="field-label">Teléfono</div><div class="field-value">${acta.contactoTecnicoFono || "-"}</div></div>
      </div>
      <div>
        <div class="field-label" style="font-weight:bold;color:#4338ca;margin-bottom:4px;">Contacto Facturación</div>
        <div class="field"><div class="field-label">Nombre</div><div class="field-value">${acta.contactoFacturacion || "-"}</div></div>
        <div class="field"><div class="field-label">E-mail</div><div class="field-value">${acta.contactoFacturacionEmail || "-"}</div></div>
        <div class="field"><div class="field-label">Teléfono</div><div class="field-value">${acta.contactoFacturacionFono || "-"}</div></div>
      </div>
    </div>
  </div>

  <!-- Servicios -->
  <div class="section">
    <div class="section-title">Servicios Contratados</div>
    <table>
      <thead>
        <tr>
          <th>#</th><th>Unidad Negocio</th><th>Solución</th><th>Detalle Servicio</th>
          <th>Tipo Venta</th><th class="text-right">Valor Unit.</th>
          <th class="text-right">Cant.</th><th class="text-right">Total</th><th>Plazo</th>
        </tr>
      </thead>
      <tbody>
        ${serviciosRows}
        <tr class="total-row">
          <td colspan="7" class="text-right">TOTAL SERVICIOS</td>
          <td class="text-right">${formatCurrency(totalServicios)}</td>
          <td></td>
        </tr>
      </tbody>
    </table>
  </div>

  <!-- Formas de Pago -->
  ${pagoImplRows ? `
  <div class="section">
    <div class="section-title">Formas de Pago — Implementación</div>
    <table>
      <thead>
        <tr>
          <th>#</th><th>Tipo Venta</th><th class="text-right">N° Cuotas</th>
          <th class="text-right">1ª Cuota</th><th>Fecha</th>
          <th class="text-right">2ª Cuota</th><th>Fecha</th>
          <th class="text-right">3ª Cuota</th>
        </tr>
      </thead>
      <tbody>${pagoImplRows}</tbody>
    </table>
  </div>` : ""}

  <!-- Consideraciones -->
  <div class="section">
    <div class="section-title">Consideraciones y Alcances Comerciales</div>
    <div class="considerations">
      <ul>
        <li>Valores expresados en dólares.</li>
        <li>Valores NO incluyen impuestos ni comisiones bancarias o de transferencia.</li>
        <li>El servicio no incluye hardware.</li>
        <li>Se considera un descuento del 50% en las dos primeras cuotas de mantención.</li>
        <li>La forma de pago de la mantención es mes vencido a partir de la entrega del servicio.</li>
      </ul>
    </div>
  </div>

  <!-- Firma -->
  <div class="footer">
    <div class="signature-area">
      <div class="signature-line">
        <div>__________________________</div>
        <div>Firma Representante Legal</div>
        <div>${acta.representanteLegal || "___________________"}</div>
      </div>
      <div class="signature-line">
        <div>__________________________</div>
        <div>Firma Ejecutivo Comercial</div>
        <div>Gestión Administrativa</div>
      </div>
    </div>
  </div>
</div>
</body>
</html>`;
}

function buildResultadoHTML(ep: EPData, r: ResultadoCalculado): string {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Resultado Evaluación — ${ep.propuestaNumero || "S/N"}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, sans-serif; font-size: 10pt; color: #1a1a2e; background: white; }
    .page { padding: 20mm; }
    .header { display: flex; align-items: center; justify-content: space-between; padding-bottom: 12px; border-bottom: 3px solid #4338ca; margin-bottom: 16px; }
    .logo-box { width: 40px; height: 40px; background: #4338ca; border-radius: 8px; display: flex; align-items: center; justify-content: center; }
    .logo-box span { color: white; font-size: 18px; font-weight: bold; }
    .doc-title { font-size: 16pt; font-weight: bold; color: #1a1a2e; }
    .section { margin-bottom: 14px; }
    .section-title { font-size: 9pt; font-weight: bold; text-transform: uppercase; letter-spacing: 0.05em; color: #4338ca; border-bottom: 1px solid #e5e7eb; padding-bottom: 4px; margin-bottom: 8px; }
    table { width: 100%; border-collapse: collapse; font-size: 9pt; }
    th { background: #4338ca; color: white; padding: 6px 8px; text-align: left; }
    th.text-right { text-align: right; }
    td { padding: 5px 8px; border-bottom: 1px solid #f3f4f6; }
    tr:nth-child(even) td { background: #f9fafb; }
    .text-right { text-align: right; }
    .total-row td { background: #eef2ff !important; font-weight: bold; border-top: 2px solid #4338ca; }
    .positive { color: #059669; font-weight: bold; }
    .negative { color: #dc2626; font-weight: bold; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; margin-bottom: 12px; }
    .info-item { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; padding: 8px; }
    .info-label { font-size: 7.5pt; color: #6b7280; text-transform: uppercase; }
    .info-value { font-size: 10pt; font-weight: 600; color: #1a1a2e; }
    @page { size: A4; margin: 0; }
    @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
  </style>
</head>
<body>
<div class="page">
  <div class="header">
    <div style="display:flex;align-items:center;gap:10px;">
      <div class="logo-box"><span>G</span></div>
      <div>
        <div style="font-size:14pt;font-weight:bold;color:#4338ca;">Gestión Administrativa</div>
        <div style="font-size:8pt;color:#6b7280;">Evaluación de Proyectos</div>
      </div>
    </div>
    <div style="text-align:right;">
      <div class="doc-title">Resultado Evaluación</div>
      <div style="font-size:9pt;color:#4338ca;font-weight:600;">Propuesta N° ${ep.propuestaNumero || "S/N"}</div>
    </div>
  </div>

  <!-- Info General -->
  <div class="info-grid">
    <div class="info-item"><div class="info-label">Cliente</div><div class="info-value">${ep.nombreCliente || "-"}</div></div>
    <div class="info-item"><div class="info-label">Empresa</div><div class="info-value">${ep.empresa || "-"}</div></div>
    <div class="info-item"><div class="info-label">Monto Proyecto</div><div class="info-value">${formatCurrency(ep.montoProyecto)}</div></div>
    <div class="info-item"><div class="info-label">Unidad de Negocio</div><div class="info-value">${ep.unidadNegocios || "-"}</div></div>
    <div class="info-item"><div class="info-label">Solución</div><div class="info-value">${ep.solucion || "-"}</div></div>
    <div class="info-item"><div class="info-label">Plazo</div><div class="info-value">${ep.plazoImplementacion || "-"}</div></div>
  </div>

  <!-- Resumen Evaluación -->
  <div class="section">
    <div class="section-title">Resumen Evaluación — Gastos por Mes</div>
    <table>
      <thead>
        <tr>
          <th>Tipo de Gasto</th>
          <th class="text-right">Mes 1</th>
          <th class="text-right">Mes 2</th>
          <th class="text-right">Mes 3</th>
        </tr>
      </thead>
      <tbody>
        <tr><td>Hardware</td><td class="text-right">${formatCurrency(r.resumen.hardware.mes1)}</td><td class="text-right">${formatCurrency(r.resumen.hardware.mes2)}</td><td class="text-right">${formatCurrency(r.resumen.hardware.mes3)}</td></tr>
        <tr><td>Materiales</td><td class="text-right">${formatCurrency(r.resumen.materiales.mes1)}</td><td class="text-right">${formatCurrency(r.resumen.materiales.mes2)}</td><td class="text-right">${formatCurrency(r.resumen.materiales.mes3)}</td></tr>
        <tr><td>RRHH</td><td class="text-right">${formatCurrency(r.resumen.rh.mes1)}</td><td class="text-right">${formatCurrency(r.resumen.rh.mes2)}</td><td class="text-right">${formatCurrency(r.resumen.rh.mes3)}</td></tr>
        <tr><td>Otros</td><td class="text-right">${formatCurrency(r.resumen.otros.mes1)}</td><td class="text-right">${formatCurrency(r.resumen.otros.mes2)}</td><td class="text-right">${formatCurrency(r.resumen.otros.mes3)}</td></tr>
        <tr class="total-row"><td>Total Gastos Imputados</td><td class="text-right">${formatCurrency(r.resumen.totalGastos.mes1)}</td><td class="text-right">${formatCurrency(r.resumen.totalGastos.mes2)}</td><td class="text-right">${formatCurrency(r.resumen.totalGastos.mes3)}</td></tr>
      </tbody>
    </table>
  </div>

  <!-- Resultado -->
  <div class="section">
    <div class="section-title">Resultado Evaluación (${r.nCuotas} Cuotas)</div>
    <table>
      <thead>
        <tr><th></th><th class="text-right">Mes 1</th><th class="text-right">Mes 2</th><th class="text-right">Mes 3</th></tr>
      </thead>
      <tbody>
        <tr><td>Ingreso</td><td class="text-right">${formatCurrency(r.ingreso.mes1)}</td><td class="text-right">${formatCurrency(r.ingreso.mes2)}</td><td class="text-right">${formatCurrency(r.ingreso.mes3)}</td></tr>
        <tr><td>Gastos</td><td class="text-right">${formatCurrency(r.gastos.mes1)}</td><td class="text-right">${formatCurrency(r.gastos.mes2)}</td><td class="text-right">${formatCurrency(r.gastos.mes3)}</td></tr>
        <tr class="total-row">
          <td>Resultado</td>
          <td class="text-right ${r.resultado.mes1 >= 0 ? 'positive' : 'negative'}">${formatCurrency(r.resultado.mes1)}</td>
          <td class="text-right ${r.resultado.mes2 >= 0 ? 'positive' : 'negative'}">${formatCurrency(r.resultado.mes2)}</td>
          <td class="text-right ${r.resultado.mes3 >= 0 ? 'positive' : 'negative'}">${formatCurrency(r.resultado.mes3)}</td>
        </tr>
        <tr><td>GIM (${formatPercent(r.distribucion.gim.porcentaje)})</td><td class="text-right">${formatCurrency(r.distribucion.gim.mes1)}</td><td class="text-right">${formatCurrency(r.distribucion.gim.mes2)}</td><td class="text-right">${formatCurrency(r.distribucion.gim.mes3)}</td></tr>
        <tr><td>GP (${formatPercent(r.distribucion.gp.porcentaje)})</td><td class="text-right">${formatCurrency(r.distribucion.gp.mes1)}</td><td class="text-right">${formatCurrency(r.distribucion.gp.mes2)}</td><td class="text-right">${formatCurrency(r.distribucion.gp.mes3)}</td></tr>
      </tbody>
    </table>
  </div>

  <!-- Facturación -->
  <div class="section">
    <div class="section-title">Facturación Inter-Empresa</div>
    <table>
      <thead>
        <tr><th></th><th class="text-right">Mes 1</th><th class="text-right">Mes 2</th><th class="text-right">Mes 3</th></tr>
      </thead>
      <tbody>
        <tr><td>Bruto</td><td class="text-right">${formatCurrency(r.facturacion.bruto.mes1)}</td><td class="text-right">${formatCurrency(r.facturacion.bruto.mes2)}</td><td class="text-right">${formatCurrency(r.facturacion.bruto.mes3)}</td></tr>
        <tr><td>Impuesto (${formatPercent(r.facturacion.impuesto.tasa)})</td><td class="text-right">${formatCurrency(r.facturacion.impuesto.mes1)}</td><td class="text-right">${formatCurrency(r.facturacion.impuesto.mes2)}</td><td class="text-right">${formatCurrency(r.facturacion.impuesto.mes3)}</td></tr>
        <tr class="total-row"><td>Neto</td><td class="text-right">${formatCurrency(r.facturacion.neto.mes1)}</td><td class="text-right">${formatCurrency(r.facturacion.neto.mes2)}</td><td class="text-right">${formatCurrency(r.facturacion.neto.mes3)}</td></tr>
      </tbody>
    </table>
  </div>
</div>
</body>
</html>`;
}

// ─── Print helper ─────────────────────────────────────────────────────────────

function printHTML(html: string, filename: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.top = "-9999px";
    iframe.style.left = "-9999px";
    iframe.style.width = "210mm";
    iframe.style.height = "297mm";
    document.body.appendChild(iframe);

    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!doc) {
      document.body.removeChild(iframe);
      reject(new Error("Could not access iframe document"));
      return;
    }

    doc.open();
    doc.write(html);
    doc.close();

    iframe.onload = () => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        setTimeout(() => {
          document.body.removeChild(iframe);
          resolve();
        }, 1000);
      } catch (e) {
        document.body.removeChild(iframe);
        reject(e);
      }
    };
  });
}
