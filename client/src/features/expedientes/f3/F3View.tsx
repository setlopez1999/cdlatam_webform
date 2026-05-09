/**
 * features/expedientes/f3/F3View.tsx
 *
 * F3 — Resultado Evaluación.
 * Vista calculada desde f1.data (ingreso) y f2.data (gastos) del mismo expediente.
 *
 * F3-a: El ingreso viene de la suma de serviciosContratados en F1.
 * F3-b: La fila de gastos se llama "Total Gastos Imputados".
 * F3-c: La distribución GIM/GP tiene porcentajes editables por el usuario.
 */
import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/FormSection";
import {
  BarChart3, TrendingUp, TrendingDown, ArrowRight, Info,
  Cpu, Package, Users, MoreHorizontal, DollarSign, Building2,
} from "lucide-react";
import { formatCurrency, formatPercent } from "@/lib/formatters";
import { trpc } from "@/lib/trpc";
import { useExpedienteStore } from "../store";
import { calcularResultadoF3 } from "../types";

// ─── Componente ───────────────────────────────────────────────────────────────

interface Props {
  expedienteId: string;
  onVolverF2?: () => void;
}

export default function F3View({ expedienteId, onVolverF2 }: Props) {
  const { getExpediente, marcarF3Visto } = useExpedienteStore();
  const expediente = getExpediente(expedienteId);

  const syncResultado = trpc.expediente.syncResultado.useMutation({
    onSuccess: () => marcarF3Visto(expedienteId),
  });
  const resultadoSyncedRef = useRef(false);

  useEffect(() => {
    resultadoSyncedRef.current = false;
  }, [expedienteId]);

  useEffect(() => {
    if (expediente?.f2.status !== "guardado") resultadoSyncedRef.current = false;
  }, [expediente?.f2.status]);

  useEffect(() => {
    if (!expediente || expediente.f2.status !== "guardado" || resultadoSyncedRef.current) return;
    resultadoSyncedRef.current = true;
    const base = calcularResultadoF3(expediente.f2.data, expediente.f1.data);
    syncResultado.mutate({
      expedienteUuid: expedienteId,
      payload: base,
      f3FormStatus: "guardado",
    });
  }, [expediente, expedienteId, syncResultado]);

  // F3-c: porcentajes editables (default 10% GIM / 90% GP)
  const [pctGIM, setPctGIM] = useState(10);
  const [pctGP,  setPctGP]  = useState(90);

  if (!expediente) {
    return <div className="p-6 text-muted-foreground">Expediente no encontrado.</div>;
  }

  const f1 = expediente.f1.data;
  const f2 = expediente.f2.data;

  // F3-a: pasar f1 para que el ingreso venga de serviciosContratados
  const r = calcularResultadoF3(f2, f1);

  // Recalcular distribución con los porcentajes editados por el usuario
  const gimFrac = pctGIM / 100;
  const gpFrac  = pctGP  / 100;

  const resMes1 = r.resultado.mes1;
  const resMes2 = r.resultado.mes2;
  const resMes3 = r.resultado.mes3;

  const gimMes1 = resMes1 * gimFrac;
  const gimMes2 = resMes2 * gimFrac;
  const gimMes3 = resMes3 * gimFrac;
  const gpMes1  = resMes1 * gpFrac;
  const gpMes2  = resMes2 * gpFrac;
  const gpMes3  = resMes3 * gpFrac;

  const TASA_IMP = 0.19;
  const brutMes1 = gpMes1; const brutMes2 = gpMes2; const brutMes3 = gpMes3;
  const impMes1  = brutMes1 * TASA_IMP; const impMes2 = brutMes2 * TASA_IMP; const impMes3 = brutMes3 * TASA_IMP;
  const netoMes1 = brutMes1 * (1 - TASA_IMP); const netoMes2 = brutMes2 * (1 - TASA_IMP); const netoMes3 = brutMes3 * (1 - TASA_IMP);

  const totalIngreso   = r.ingreso.mes1 + r.ingreso.mes2 + r.ingreso.mes3;
  const totalGastos    = r.gastos.mes1  + r.gastos.mes2  + r.gastos.mes3;
  const totalResultado = resMes1 + resMes2 + resMes3;
  const margen         = totalIngreso > 0 ? (totalResultado / totalIngreso) * 100 : 0;

  const currencyCode = f2.tipoMoneda || f1.moneda || "USD";
  const fmt    = (v: number) => formatCurrency(v, currencyCode);
  const fmtPct = (v: number) => formatPercent(v);

  const hasData = totalIngreso > 0 || totalGastos > 0;

  // Tabla por mes — F3-b: "Total Gastos Imputados"
  const filas = [
    { label: "Ingreso",                  m1: r.ingreso.mes1,  m2: r.ingreso.mes2,  m3: r.ingreso.mes3,  bold: false, color: "text-emerald-600" },
    { label: "Total Gastos Imputados",   m1: r.gastos.mes1,   m2: r.gastos.mes2,   m3: r.gastos.mes3,   bold: false, color: "text-rose-600"    },
    { label: "Resultado",                m1: resMes1,          m2: resMes2,          m3: resMes3,          bold: true,  color: "text-foreground"  },
    { label: `GIM (${pctGIM}%)`,         m1: gimMes1,          m2: gimMes2,          m3: gimMes3,          bold: false, color: "text-blue-600"   },
    { label: `GP (${pctGP}%)`,           m1: gpMes1,           m2: gpMes2,           m3: gpMes3,           bold: false, color: "text-violet-600" },
    { label: "Facturación Bruta",        m1: brutMes1,         m2: brutMes2,         m3: brutMes3,         bold: false, color: "text-foreground" },
    { label: "Impuesto (19%)",           m1: impMes1,          m2: impMes2,          m3: impMes3,          bold: false, color: "text-amber-600"  },
    { label: "Facturación Neta",         m1: netoMes1,         m2: netoMes2,         m3: netoMes3,         bold: true,  color: "text-emerald-700"},
  ];

  // Sync GP cuando cambia GIM
  const handleGIM = (val: number) => {
    const v = Math.min(Math.max(0, val), 100);
    setPctGIM(v);
    setPctGP(100 - v);
  };
  const handleGP = (val: number) => {
    const v = Math.min(Math.max(0, val), 100);
    setPctGP(v);
    setPctGIM(100 - v);
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6" translate="no">
      <PageHeader
        title="Resultado Evaluación"
        subtitle="F3 — Ingreso desde F1 · Gastos desde F2 · Calculado en tiempo real"
        badge="F3"
        badgeColor="bg-emerald-50 text-emerald-700 border-emerald-200"
        icon={BarChart3}
        actions={
          onVolverF2 && (
            <Button variant="outline" size="sm" onClick={onVolverF2}>
              <ArrowRight className="w-3.5 h-3.5 mr-1.5 rotate-180" /> Volver a F2
            </Button>
          )
        }
      />

      {(f1.total_descuento_mantencion ?? 0) > 0 && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50/90 px-3 py-2 text-xs text-emerald-950">
          <span className="font-medium">Ahorro Mantención desde F1 (cuotas de gracia): </span>
          {formatCurrency(f1.total_descuento_mantencion ?? 0, currencyCode)}
        </div>
      )}

      {/* Sin datos */}
      {!hasData && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
            <BarChart3 className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold mb-2">Sin datos para calcular</h3>
          <p className="text-sm text-muted-foreground max-w-sm">
            Agrega servicios en F1 (para el ingreso) y costos en F2 (para los gastos).
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
              { label: "Ingreso Total (F1)",   value: fmt(totalIngreso),    icon: DollarSign,  color: "text-emerald-600", bg: "bg-emerald-50 border-emerald-200" },
              { label: "Gastos Imputados",      value: fmt(totalGastos),     icon: TrendingDown, color: "text-rose-600",   bg: "bg-rose-50 border-rose-200"       },
              { label: "Resultado Neto",        value: fmt(totalResultado),  icon: TrendingUp,  color: totalResultado >= 0 ? "text-emerald-600" : "text-rose-600", bg: totalResultado >= 0 ? "bg-emerald-50 border-emerald-200" : "bg-rose-50 border-rose-200" },
              { label: "Margen",                value: fmtPct(margen / 100), icon: BarChart3,   color: margen >= 0 ? "text-blue-600" : "text-rose-600", bg: "bg-blue-50 border-blue-200" },
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

          {/* F3-c: Configuración de distribución GIM / GP */}
          <Card className="border-blue-200 bg-blue-50/30">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Building2 className="w-4 h-4 text-blue-500" />
                Distribución GIM / GP
                <span className="text-xs font-normal text-muted-foreground ml-1">— porcentajes editables</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap items-center gap-6">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-blue-700 w-10">GIM</span>
                  <Input
                    type="number" min={0} max={100} step={1}
                    className="w-20 h-8 text-sm text-center font-mono"
                    value={pctGIM}
                    onChange={e => handleGIM(Number(e.target.value))}
                  />
                  <span className="text-sm text-muted-foreground">%</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-violet-700 w-10">GP</span>
                  <Input
                    type="number" min={0} max={100} step={1}
                    className="w-20 h-8 text-sm text-center font-mono"
                    value={pctGP}
                    onChange={e => handleGP(Number(e.target.value))}
                  />
                  <span className="text-sm text-muted-foreground">%</span>
                </div>
                <span className={`text-xs font-medium px-2 py-1 rounded-full ${pctGIM + pctGP === 100 ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>
                  Total: {pctGIM + pctGP}% {pctGIM + pctGP !== 100 ? "⚠ debe sumar 100%" : "✓"}
                </span>
              </div>
            </CardContent>
          </Card>

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
                    {filas.map((row, i) => {
                      const total = row.m1 + row.m2 + row.m3;
                      return (
                        <tr key={i} className={`border-b border-border/20 last:border-b-0 ${row.bold ? "bg-muted/30" : "hover:bg-muted/10"} transition-colors`}>
                          <td className={`px-3 py-2 ${row.bold ? "font-semibold" : ""}`}>{row.label}</td>
                          <td className={`px-3 py-2 text-right font-mono ${row.color} ${row.bold ? "font-bold" : ""}`}>{fmt(row.m1)}</td>
                          <td className={`px-3 py-2 text-right font-mono ${row.color} ${row.bold ? "font-bold" : ""}`}>{fmt(row.m2)}</td>
                          <td className={`px-3 py-2 text-right font-mono ${row.color} ${row.bold ? "font-bold" : ""}`}>{fmt(row.m3)}</td>
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
                Desglose de Gastos Imputados
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: "Hardware",   data: r.resumen.hardware,   icon: Cpu,            color: "text-blue-600"   },
                  { label: "Materiales", data: r.resumen.materiales, icon: Package,        color: "text-indigo-600" },
                  { label: "RRHH",       data: r.resumen.rh,         icon: Users,          color: "text-violet-600" },
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
            <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            <span>
              El ingreso se calcula desde los servicios contratados en F1. Los gastos vienen de F2.
              Los porcentajes de distribución GIM/GP son editables y se aplican en tiempo real.
            </span>
          </div>
        </>
      )}
    </div>
  );
}
