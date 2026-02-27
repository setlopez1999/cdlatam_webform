import { useCallback } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { PageHeader } from "@/components/FormSection";
import {
  BarChart3, TrendingUp, TrendingDown, Download, RefreshCw,
  Cpu, Package, Users, MoreHorizontal, DollarSign,
  Building2, ArrowRight, Info, CheckCircle2,
} from "lucide-react";
import { useEPForm } from "@/hooks/useFormStore";
import { formatCurrency, formatPercent, formatDate, getStatusColor, getStatusLabel } from "@/lib/formatters";
import { generateResultadoPDF } from "@/lib/pdfExport";
import { Link } from "wouter";

export default function ResultadoView() {
  const { ep, resultado, updateEP } = useEPForm();

  const handleExportPDF = useCallback(async () => {
    try {
      toast.loading("Generando PDF del Resultado...", { id: "pdf-result" });
      await generateResultadoPDF(ep, resultado);
      updateEP({ status: "exportado" });
      toast.success("PDF exportado correctamente", { id: "pdf-result" });
      // TODO: Conectar con API de Base de Datos aquí - trpc.evaluaciones.update.mutate({ id, status: 'exportado' })
    } catch (e) {
      toast.error("Error al exportar PDF", { id: "pdf-result" });
    }
  }, [ep, resultado, updateEP]);

  const r = resultado;
  const hasData = ep.montoProyecto > 0 || ep.nombreCliente;

  const totalGastosGlobal =
    r.resumen.hardware.mes1 + r.resumen.hardware.mes2 + r.resumen.hardware.mes3 +
    r.resumen.materiales.mes1 + r.resumen.materiales.mes2 + r.resumen.materiales.mes3 +
    r.resumen.rh.mes1 + r.resumen.rh.mes2 + r.resumen.rh.mes3 +
    r.resumen.otros.mes1 + r.resumen.otros.mes2 + r.resumen.otros.mes3;

  const totalIngreso = r.ingreso.mes1 + r.ingreso.mes2 + r.ingreso.mes3;
  const totalResultado = r.resultado.mes1 + r.resultado.mes2 + r.resultado.mes3;
  const margen = totalIngreso > 0 ? (totalResultado / totalIngreso) * 100 : 0;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <PageHeader
        title="Resultado Evaluación"
        subtitle="Formulario 3 — Auto-calculado desde el Formulario 2 en tiempo real"
        badge="F3"
        badgeColor="bg-emerald-50 text-emerald-700 border-emerald-200"
        icon={BarChart3}
        actions={
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={`text-xs ${getStatusColor(ep.status)}`}>
              {getStatusLabel(ep.status)}
            </Badge>
            <Button asChild variant="outline" size="sm">
              <Link href="/ep">
                <ArrowRight className="w-3.5 h-3.5 mr-1.5 rotate-180" /> Editar EP
              </Link>
            </Button>
            <Button size="sm" onClick={handleExportPDF} disabled={!hasData}>
              <Download className="w-3.5 h-3.5 mr-1.5" /> Exportar PDF
            </Button>
          </div>
        }
      />

      {/* Auto-fill Banner */}
      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-center gap-3">
        <div className="w-7 h-7 bg-emerald-100 rounded-lg flex items-center justify-center flex-shrink-0">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
        </div>
        <div className="flex-1">
          <p className="text-xs font-semibold text-emerald-700">Auto-fill activo</p>
          <p className="text-xs text-emerald-600">
            Este formulario se actualiza automáticamente con los datos del Formulario 2.
            {!hasData && " Completa el F2 para ver los resultados."}
          </p>
        </div>
        {hasData && (
          <div className="flex items-center gap-1 flex-shrink-0">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            <span className="text-xs text-emerald-600 font-medium">En vivo</span>
          </div>
        )}
      </div>

      {!hasData ? (
        <div className="text-center py-16 bg-card border border-border rounded-xl">
          <div className="w-16 h-16 bg-muted rounded-2xl flex items-center justify-center mx-auto mb-4">
            <BarChart3 className="w-8 h-8 text-muted-foreground/40" />
          </div>
          <h3 className="text-base font-semibold text-foreground mb-2">Sin datos para mostrar</h3>
          <p className="text-sm text-muted-foreground mb-4 max-w-sm mx-auto">
            Completa el Formulario 2 (EP) con los costos del proyecto para ver el resultado calculado automáticamente.
          </p>
          <Button asChild>
            <Link href="/ep">
              <ArrowRight className="w-4 h-4 mr-2 rotate-180" /> Ir al Formulario 2
            </Link>
          </Button>
        </div>
      ) : (
        <>
          {/* ── Info General ──────────────────────────────────────────────────── */}
          <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
              <Info className="w-4 h-4 text-emerald-500" />
              Información General del Proyecto
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <InfoField label="Cliente" value={ep.nombreCliente || "-"} />
              <InfoField label="Empresa" value={ep.empresa || "-"} />
              <InfoField label="Propuesta N°" value={ep.propuestaNumero || "-"} />
              <InfoField label="Unidad de Negocio" value={ep.unidadNegocios || "-"} />
              <InfoField label="Solución" value={ep.solucion || "-"} />
              <InfoField label="País" value={ep.paisImplementacion || "-"} />
              <InfoField label="Plazo" value={ep.plazoImplementacion || "-"} />
              <InfoField label="Monto Proyecto" value={formatCurrency(ep.montoProyecto)} highlight />
            </div>
          </div>

          {/* ── KPI Cards ─────────────────────────────────────────────────────── */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KPICard
              label="Ingreso Total"
              value={formatCurrency(totalIngreso)}
              icon={DollarSign}
              color="text-emerald-600"
              bg="bg-emerald-50"
            />
            <KPICard
              label="Total Gastos"
              value={formatCurrency(totalGastosGlobal)}
              icon={TrendingDown}
              color="text-red-500"
              bg="bg-red-50"
            />
            <KPICard
              label="Resultado Neto"
              value={formatCurrency(totalResultado)}
              icon={totalResultado >= 0 ? TrendingUp : TrendingDown}
              color={totalResultado >= 0 ? "text-emerald-600" : "text-red-600"}
              bg={totalResultado >= 0 ? "bg-emerald-50" : "bg-red-50"}
              highlight
            />
            <KPICard
              label="Margen %"
              value={`${margen.toFixed(1)}%`}
              icon={BarChart3}
              color={margen >= 0 ? "text-blue-600" : "text-red-600"}
              bg="bg-blue-50"
            />
          </div>

          {/* ── Resumen Evaluación ────────────────────────────────────────────── */}
          <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
            <div className="px-5 py-4 border-b border-border flex items-center gap-3">
              <div className="w-7 h-7 bg-emerald-50 rounded-lg flex items-center justify-center">
                <BarChart3 className="w-3.5 h-3.5 text-emerald-600" />
              </div>
              <h3 className="text-sm font-semibold text-foreground">Resumen Evaluación — Gastos por Mes</h3>
            </div>
            <div className="p-5">
              <ResumenTable r={r} />
            </div>
          </div>

          {/* ── Resultado Evaluación ──────────────────────────────────────────── */}
          <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
            <div className="px-5 py-4 border-b border-border flex items-center gap-3">
              <div className="w-7 h-7 bg-emerald-50 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
              </div>
              <h3 className="text-sm font-semibold text-foreground">
                Resultado Evaluación — {r.nCuotas} Cuotas
              </h3>
            </div>
            <div className="p-5">
              <ResultadoTable r={r} />
            </div>
          </div>

          {/* ── Distribución ──────────────────────────────────────────────────── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <DistribucionCard
              label="GIM"
              porcentaje={r.distribucion.gim.porcentaje}
              mes1={r.distribucion.gim.mes1}
              mes2={r.distribucion.gim.mes2}
              mes3={r.distribucion.gim.mes3}
              color="bg-blue-50 border-blue-200"
              textColor="text-blue-700"
            />
            <DistribucionCard
              label="GP"
              porcentaje={r.distribucion.gp.porcentaje}
              mes1={r.distribucion.gp.mes1}
              mes2={r.distribucion.gp.mes2}
              mes3={r.distribucion.gp.mes3}
              color="bg-violet-50 border-violet-200"
              textColor="text-violet-700"
            />
          </div>

          {/* ── Facturación Inter-Empresa ─────────────────────────────────────── */}
          <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
            <div className="px-5 py-4 border-b border-border flex items-center gap-3">
              <div className="w-7 h-7 bg-emerald-50 rounded-lg flex items-center justify-center">
                <Building2 className="w-3.5 h-3.5 text-emerald-600" />
              </div>
              <h3 className="text-sm font-semibold text-foreground">Facturación Inter-Empresa</h3>
              <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-200">
                IVA {formatPercent(r.facturacion.impuesto.tasa)}
              </Badge>
            </div>
            <div className="p-5">
              <FacturacionTable r={r} />
            </div>
          </div>

          {/* ── Export Footer ─────────────────────────────────────────────────── */}
          <div className="flex justify-end gap-3 pb-6">
            <Button asChild variant="outline">
              <Link href="/ep">
                <ArrowRight className="w-4 h-4 mr-2 rotate-180" /> Volver al EP
              </Link>
            </Button>
            <Button onClick={handleExportPDF}>
              <Download className="w-4 h-4 mr-2" /> Exportar PDF Membretado
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function InfoField({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-sm font-medium mt-0.5 ${highlight ? "text-emerald-600 font-bold" : "text-foreground"}`}>
        {value}
      </p>
    </div>
  );
}

function KPICard({ label, value, icon: Icon, color, bg, highlight }: {
  label: string; value: string; icon: React.ElementType;
  color: string; bg: string; highlight?: boolean;
}) {
  return (
    <div className={`p-4 rounded-xl border ${highlight ? "border-emerald-200 bg-emerald-50" : "border-border bg-card"} shadow-sm`}>
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs text-muted-foreground">{label}</p>
        <div className={`w-7 h-7 ${bg} rounded-lg flex items-center justify-center`}>
          <Icon className={`w-3.5 h-3.5 ${color}`} />
        </div>
      </div>
      <p className={`text-lg font-bold font-mono ${color}`}>{value}</p>
    </div>
  );
}

function ResumenTable({ r }: { r: any }) {
  const rows = [
    { label: "Hardware", icon: Cpu, color: "text-blue-600", data: r.resumen.hardware },
    { label: "Materiales", icon: Package, color: "text-indigo-600", data: r.resumen.materiales },
    { label: "RRHH", icon: Users, color: "text-violet-600", data: r.resumen.rh },
    { label: "Otros", icon: MoreHorizontal, color: "text-purple-600", data: r.resumen.otros },
    { label: "Total Gastos Imputados", icon: TrendingDown, color: "text-foreground", data: r.resumen.totalGastos, bold: true },
  ];

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left py-2 pr-4 text-xs font-medium text-muted-foreground">Tipo de Gasto</th>
            <th className="text-right py-2 px-3 text-xs font-medium text-muted-foreground">Mes 1</th>
            <th className="text-right py-2 px-3 text-xs font-medium text-muted-foreground">Mes 2</th>
            <th className="text-right py-2 px-3 text-xs font-medium text-muted-foreground">Mes 3</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => {
            const Icon = row.icon;
            return (
              <tr key={i} className={`border-b border-border/50 ${row.bold ? "bg-muted/50 font-semibold" : "hover:bg-muted/30"}`}>
                <td className="py-2.5 pr-4">
                  <div className="flex items-center gap-2">
                    <Icon className={`w-3.5 h-3.5 ${row.color}`} />
                    <span className={`text-xs ${row.bold ? "font-semibold text-foreground" : "text-foreground/80"}`}>
                      {row.label}
                    </span>
                  </div>
                </td>
                <td className={`text-right py-2.5 px-3 font-mono text-xs ${row.bold ? "font-bold" : ""}`}>
                  {formatCurrency(row.data.mes1)}
                </td>
                <td className={`text-right py-2.5 px-3 font-mono text-xs ${row.bold ? "font-bold" : ""}`}>
                  {formatCurrency(row.data.mes2)}
                </td>
                <td className={`text-right py-2.5 px-3 font-mono text-xs ${row.bold ? "font-bold" : ""}`}>
                  {formatCurrency(row.data.mes3)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function ResultadoTable({ r }: { r: any }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left py-2 pr-4 text-xs font-medium text-muted-foreground"></th>
            <th className="text-right py-2 px-3 text-xs font-medium text-muted-foreground">Mes 1</th>
            <th className="text-right py-2 px-3 text-xs font-medium text-muted-foreground">Mes 2</th>
            <th className="text-right py-2 px-3 text-xs font-medium text-muted-foreground">Mes 3</th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-b border-border/50 hover:bg-muted/30">
            <td className="py-2.5 pr-4 text-xs text-foreground/80">Ingreso</td>
            <td className="text-right py-2.5 px-3 font-mono text-xs text-emerald-600">{formatCurrency(r.ingreso.mes1)}</td>
            <td className="text-right py-2.5 px-3 font-mono text-xs text-emerald-600">{formatCurrency(r.ingreso.mes2)}</td>
            <td className="text-right py-2.5 px-3 font-mono text-xs text-emerald-600">{formatCurrency(r.ingreso.mes3)}</td>
          </tr>
          <tr className="border-b border-border/50 hover:bg-muted/30">
            <td className="py-2.5 pr-4 text-xs text-foreground/80">Gastos</td>
            <td className="text-right py-2.5 px-3 font-mono text-xs text-red-500">{formatCurrency(r.gastos.mes1)}</td>
            <td className="text-right py-2.5 px-3 font-mono text-xs text-red-500">{formatCurrency(r.gastos.mes2)}</td>
            <td className="text-right py-2.5 px-3 font-mono text-xs text-red-500">{formatCurrency(r.gastos.mes3)}</td>
          </tr>
          <tr className="bg-muted/50 font-semibold border-b border-border">
            <td className="py-2.5 pr-4 text-xs font-bold text-foreground">Resultado</td>
            {[r.resultado.mes1, r.resultado.mes2, r.resultado.mes3].map((val, i) => (
              <td key={i} className={`text-right py-2.5 px-3 font-mono text-xs font-bold ${val >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                {formatCurrency(val)}
              </td>
            ))}
          </tr>
          <tr className="border-b border-border/50 hover:bg-muted/30">
            <td className="py-2.5 pr-4 text-xs text-foreground/80">
              GIM ({formatPercent(r.distribucion.gim.porcentaje)})
            </td>
            <td className="text-right py-2.5 px-3 font-mono text-xs">{formatCurrency(r.distribucion.gim.mes1)}</td>
            <td className="text-right py-2.5 px-3 font-mono text-xs">{formatCurrency(r.distribucion.gim.mes2)}</td>
            <td className="text-right py-2.5 px-3 font-mono text-xs">{formatCurrency(r.distribucion.gim.mes3)}</td>
          </tr>
          <tr className="border-b border-border/50 hover:bg-muted/30">
            <td className="py-2.5 pr-4 text-xs text-foreground/80">
              GP ({formatPercent(r.distribucion.gp.porcentaje)})
            </td>
            <td className="text-right py-2.5 px-3 font-mono text-xs">{formatCurrency(r.distribucion.gp.mes1)}</td>
            <td className="text-right py-2.5 px-3 font-mono text-xs">{formatCurrency(r.distribucion.gp.mes2)}</td>
            <td className="text-right py-2.5 px-3 font-mono text-xs">{formatCurrency(r.distribucion.gp.mes3)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function FacturacionTable({ r }: { r: any }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left py-2 pr-4 text-xs font-medium text-muted-foreground"></th>
            <th className="text-right py-2 px-3 text-xs font-medium text-muted-foreground">Mes 1</th>
            <th className="text-right py-2 px-3 text-xs font-medium text-muted-foreground">Mes 2</th>
            <th className="text-right py-2 px-3 text-xs font-medium text-muted-foreground">Mes 3</th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-b border-border/50 hover:bg-muted/30">
            <td className="py-2.5 pr-4 text-xs text-foreground/80">Bruto</td>
            <td className="text-right py-2.5 px-3 font-mono text-xs">{formatCurrency(r.facturacion.bruto.mes1)}</td>
            <td className="text-right py-2.5 px-3 font-mono text-xs">{formatCurrency(r.facturacion.bruto.mes2)}</td>
            <td className="text-right py-2.5 px-3 font-mono text-xs">{formatCurrency(r.facturacion.bruto.mes3)}</td>
          </tr>
          <tr className="border-b border-border/50 hover:bg-muted/30">
            <td className="py-2.5 pr-4 text-xs text-foreground/80">
              Impuesto ({formatPercent(r.facturacion.impuesto.tasa)})
            </td>
            <td className="text-right py-2.5 px-3 font-mono text-xs text-amber-600">{formatCurrency(r.facturacion.impuesto.mes1)}</td>
            <td className="text-right py-2.5 px-3 font-mono text-xs text-amber-600">{formatCurrency(r.facturacion.impuesto.mes2)}</td>
            <td className="text-right py-2.5 px-3 font-mono text-xs text-amber-600">{formatCurrency(r.facturacion.impuesto.mes3)}</td>
          </tr>
          <tr className="bg-muted/50 font-semibold">
            <td className="py-2.5 pr-4 text-xs font-bold text-foreground">Neto</td>
            <td className="text-right py-2.5 px-3 font-mono text-xs font-bold text-emerald-600">{formatCurrency(r.facturacion.neto.mes1)}</td>
            <td className="text-right py-2.5 px-3 font-mono text-xs font-bold text-emerald-600">{formatCurrency(r.facturacion.neto.mes2)}</td>
            <td className="text-right py-2.5 px-3 font-mono text-xs font-bold text-emerald-600">{formatCurrency(r.facturacion.neto.mes3)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function DistribucionCard({ label, porcentaje, mes1, mes2, mes3, color, textColor }: {
  label: string; porcentaje: number;
  mes1: number; mes2: number; mes3: number;
  color: string; textColor: string;
}) {
  return (
    <div className={`rounded-xl border p-4 ${color}`}>
      <div className="flex items-center justify-between mb-3">
        <h4 className={`text-sm font-semibold ${textColor}`}>{label}</h4>
        <Badge variant="outline" className={`text-xs ${color} ${textColor} border-current`}>
          {formatPercent(porcentaje)}
        </Badge>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {[{ label: "Mes 1", value: mes1 }, { label: "Mes 2", value: mes2 }, { label: "Mes 3", value: mes3 }].map((m, i) => (
          <div key={i} className="text-center">
            <p className={`text-xs ${textColor} opacity-70`}>{m.label}</p>
            <p className={`text-sm font-bold font-mono ${textColor} mt-0.5`}>{formatCurrency(m.value)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
