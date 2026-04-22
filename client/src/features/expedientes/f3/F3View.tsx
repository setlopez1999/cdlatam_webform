/**
 * features/expedientes/f3/F3View.tsx
 *
 * F3 — Resultado Evaluación.
 * Vista de solo lectura, calculada automáticamente desde f2.data del mismo expediente.
 * No tiene estado propio ni endpoint — es un derivado puro de F2.
 */
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
import { formatCurrency, formatPercent, formatDate } from "@/lib/formatters";
import { useExpedienteStore } from "../store";
import { calcularResultadoF3 } from "../types";

// ─── Componente ───────────────────────────────────────────────────────────────

interface Props {
  expedienteId: string;
  onVolverF2?: () => void;
}

export default function F3View({ expedienteId, onVolverF2 }: Props) {
  const { getExpediente } = useExpedienteStore();
  const expediente = getExpediente(expedienteId);

  if (!expediente) {
    return <div className="p-6 text-muted-foreground">Expediente no encontrado.</div>;
  }

  const f2 = expediente.f2.data;
  const r  = calcularResultadoF3(f2);

  const hasData = f2.montoProyecto > 0 || f2.nombreCliente;

  const currencyCode = f2.tipoMoneda || "USD";
  const fmt = (v: number) => formatCurrency(v, currencyCode);
  const fmtPct = (v: number) => formatPercent(v);

  const totalGastosGlobal =
    r.resumen.totalGastos.mes1 + r.resumen.totalGastos.mes2 + r.resumen.totalGastos.mes3;
  const totalIngreso  = r.ingreso.mes1  + r.ingreso.mes2  + r.ingreso.mes3;
  const totalResultado = r.resultado.mes1 + r.resultado.mes2 + r.resultado.mes3;
  const margen = totalIngreso > 0 ? (totalResultado / totalIngreso) * 100 : 0;

  // ── Render ─────────────────────────────────────────────────────────────────
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
            {onVolverF2 && (
              <Button variant="outline" size="sm" onClick={onVolverF2}>
                <ArrowRight className="w-3.5 h-3.5 mr-1.5 rotate-180" /> Volver a F2
              </Button>
            )}
          </div>
        }
      />

      {/* Sin datos */}
      {!hasData && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
            <BarChart3 className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">Sin datos para calcular</h3>
          <p className="text-sm text-muted-foreground max-w-sm">
            Completa el Formulario 2 con el monto del proyecto y los costos para ver el resultado.
          </p>
          {onVolverF2 && (
            <Button className="mt-4" onClick={onVolverF2}>
              Ir a F2 <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          )}
        </div>
      )}

      {hasData && (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Ingreso Total",    value: fmt(totalIngreso),    icon: DollarSign,  color: "text-emerald-600", bg: "bg-emerald-50 border-emerald-200" },
              { label: "Gastos Totales",   value: fmt(totalGastosGlobal), icon: TrendingDown, color: "text-rose-600",    bg: "bg-rose-50 border-rose-200"       },
              { label: "Resultado Neto",   value: fmt(totalResultado),  icon: TrendingUp,  color: totalResultado >= 0 ? "text-emerald-600" : "text-rose-600", bg: totalResultado >= 0 ? "bg-emerald-50 border-emerald-200" : "bg-rose-50 border-rose-200" },
              { label: "Margen",           value: fmtPct(margen / 100), icon: BarChart3,   color: margen >= 0 ? "text-blue-600" : "text-rose-600", bg: "bg-blue-50 border-blue-200" },
            ].map((kpi, i) => (
              <div key={i} className={`p-4 rounded-xl border ${kpi.bg} flex flex-col gap-1`}>
                <div className="flex items-center gap-2">
                  <kpi.icon className={`w-4 h-4 ${kpi.color}`} />
                  <span className="text-xs text-muted-foreground">{kpi.label}</span>
                </div>
                <p className={`text-xl font-bold font-mono ${kpi.color}`}>{kpi.value}</p>
              </div>
            ))}
          </div>

          {/* Tabla por mes */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-emerald-500" />
                Resultado por Mes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-muted/60 text-muted-foreground">
                      <th className="px-3 py-2 text-left font-medium border-b border-border/40">Concepto</th>
                      <th className="px-3 py-2 text-right font-medium border-b border-border/40">Mes 1</th>
                      <th className="px-3 py-2 text-right font-medium border-b border-border/40">Mes 2</th>
                      <th className="px-3 py-2 text-right font-medium border-b border-border/40">Mes 3</th>
                      <th className="px-3 py-2 text-right font-medium border-b border-border/40">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { label: "Ingreso",          data: r.ingreso,   bold: false, color: "text-emerald-600" },
                      { label: "Gastos",            data: r.gastos,    bold: false, color: "text-rose-600"    },
                      { label: "Resultado",         data: r.resultado, bold: true,  color: "text-foreground"  },
                      { label: "GIM (10%)",         data: r.distribucion.gim, bold: false, color: "text-blue-600"   },
                      { label: "GP (90%)",          data: r.distribucion.gp,  bold: false, color: "text-violet-600" },
                      { label: "Facturación Bruta", data: r.facturacion.bruto, bold: false, color: "text-foreground" },
                      { label: "Impuesto (19%)",    data: r.facturacion.impuesto, bold: false, color: "text-amber-600" },
                      { label: "Facturación Neta",  data: r.facturacion.neto, bold: true, color: "text-emerald-700" },
                    ].map((row, i) => {
                      const total = row.data.mes1 + row.data.mes2 + row.data.mes3;
                      return (
                        <tr key={i} className={`border-b border-border/20 last:border-b-0 ${row.bold ? "bg-muted/30" : "hover:bg-muted/10"} transition-colors`}>
                          <td className={`px-3 py-2 ${row.bold ? "font-semibold" : ""}`}>{row.label}</td>
                          <td className={`px-3 py-2 text-right font-mono ${row.color} ${row.bold ? "font-bold" : ""}`}>{fmt(row.data.mes1)}</td>
                          <td className={`px-3 py-2 text-right font-mono ${row.color} ${row.bold ? "font-bold" : ""}`}>{fmt(row.data.mes2)}</td>
                          <td className={`px-3 py-2 text-right font-mono ${row.color} ${row.bold ? "font-bold" : ""}`}>{fmt(row.data.mes3)}</td>
                          <td className={`px-3 py-2 text-right font-mono ${row.color} font-bold`}>{fmt(total)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Desglose de gastos */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <TrendingDown className="w-4 h-4 text-rose-500" />
                Desglose de Gastos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: "Hardware",   data: r.resumen.hardware,   icon: Cpu,           color: "text-blue-600"   },
                  { label: "Materiales", data: r.resumen.materiales, icon: Package,       color: "text-indigo-600" },
                  { label: "RRHH",       data: r.resumen.rh,         icon: Users,         color: "text-violet-600" },
                  { label: "Otros",      data: r.resumen.otros,      icon: MoreHorizontal, color: "text-purple-600" },
                ].map((item, i) => {
                  const total = item.data.mes1 + item.data.mes2 + item.data.mes3;
                  return (
                    <div key={i} className="p-3 rounded-lg bg-muted/50 border border-border/40">
                      <div className="flex items-center gap-1.5 mb-1">
                        <item.icon className={`w-3.5 h-3.5 ${item.color}`} />
                        <span className="text-xs text-muted-foreground">{item.label}</span>
                      </div>
                      <p className={`text-sm font-bold font-mono ${item.color}`}>{fmt(total)}</p>
                      <div className="mt-1.5 space-y-0.5">
                        {[1, 2, 3].map(mes => (
                          <div key={mes} className="flex justify-between text-xs text-muted-foreground">
                            <span>Mes {mes}</span>
                            <span className="font-mono">{fmt(item.data[`mes${mes}` as keyof typeof item.data] as number)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Nota */}
          <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/30 rounded-lg p-3 border border-border/40">
            <Info className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
            <span>
              Este resultado se calcula automáticamente en tiempo real desde los datos del Formulario 2.
              Cualquier cambio en F2 se refleja aquí de inmediato.
            </span>
          </div>
        </>
      )}
    </div>
  );
}
