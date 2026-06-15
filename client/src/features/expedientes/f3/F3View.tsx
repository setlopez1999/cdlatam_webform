/**
 * features/expedientes/f3/F3View.tsx
 *
 * F3 — Resultado Evaluación.
 * Vista calculada desde f1.data (ingreso) y f2.data (gastos) del mismo expediente.
 *
 * F3-a: El ingreso viene de la suma de serviciosContratados en F1.
 * F3-b: La fila de gastos se llama "Total Gastos Imputados".
 *
 * Distribución (Sres./GIM + GROUPALNET SPA) y facturación inter-empresa solo si F1 está guardado.
 * El % GIM/GP y la tasa de impuesto (0,5–100 %) son editables; el payload de sync coincide con calcularResultadoF3.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/FormSection";
import {
  BarChart3, TrendingUp, TrendingDown, ArrowRight, Info,
  Cpu, Package, Users, MoreHorizontal, DollarSign, PieChart,
} from "lucide-react";
import { formatCurrency, formatPercent } from "@/lib/formatters";
import { trpc } from "@/lib/trpc";
import { useExpedienteStore } from "../store";
import { getMesValue, mesesActivos, sumResumenMeses } from "../f1/f1ImplementacionCuotas";
import { calcularResultadoF3, F1_INITIAL, F2_INITIAL } from "../types";
import type { ResumenMeses } from "../types";

// ─── Componente ───────────────────────────────────────────────────────────────

interface Props {
  expedienteId: number;
  onVolverF2?: () => void;
}

export default function F3View({ expedienteId, onVolverF2 }: Props) {
  const { getExpediente, marcarF3Visto } = useExpedienteStore();
  const expediente = getExpediente(expedienteId);

  const [pctGIM, setPctGIM] = useState(10);
  const [pctGP, setPctGP] = useState(90);
  const lastSyncedPayloadJson = useRef<string | null>(null);

  const syncResultado = trpc.expediente.syncResultado.useMutation({
    onSuccess: () => {
      marcarF3Visto(expedienteId);
    },
    onError: () => {
      lastSyncedPayloadJson.current = null;
    },
  });

  useEffect(() => {
    lastSyncedPayloadJson.current = null;
  }, [expedienteId]);

  const f1Guardado = expediente?.f1.status === "guardado";
  const f2Guardado = expediente?.f2.status === "guardado";

  useEffect(() => {
    if (!f2Guardado) lastSyncedPayloadJson.current = null;
  }, [f2Guardado]);

  useEffect(() => {
    if (!expediente || !f2Guardado || !f1Guardado) return;

    const payload = calcularResultadoF3(expediente.f2.data, expediente.f1.data, {
      fraccionGIM: pctGIM / 100,
    });
    const json = JSON.stringify(payload);
    if (lastSyncedPayloadJson.current === json) return;
    lastSyncedPayloadJson.current = json;

    syncResultado.mutate({
      expedienteId,
      payload,
      f3FormStatus: "guardado",
    });
  }, [expediente, expedienteId, f1Guardado, f2Guardado, pctGIM, syncResultado]);

  const setGIM = (raw: number) => {
    const g = Math.max(0, Math.min(100, Math.round(raw)));
    setPctGIM(g);
    setPctGP(100 - g);
  };

  const setGP = (raw: number) => {
    const p = Math.max(0, Math.min(100, Math.round(raw)));
    setPctGP(p);
    setPctGIM(100 - p);
  };


  const f1 = expediente?.f1.data ?? F1_INITIAL;
  const f2 = expediente?.f2.data ?? F2_INITIAL;

  const r = useMemo(
    () =>
      calcularResultadoF3(
        f2,
        f1,
        f1Guardado
          ? { fraccionGIM: pctGIM / 100 }
          : undefined,
      ),
    [f2, f1, f1Guardado, pctGIM],
  );

  const meses = useMemo(() => mesesActivos(r.nCuotas), [r.nCuotas]);
  const totalIngreso = sumResumenMeses(r.ingreso, r.nCuotas);
  const totalGastos = sumResumenMeses(r.gastos, r.nCuotas);
  const totalResultado = sumResumenMeses(r.resultado, r.nCuotas);
  const margen = totalIngreso > 0 ? (totalResultado / totalIngreso) * 100 : 0;

  const currencyCode = f2.tipoMoneda || f1.moneda || "USD";
  const fmt    = (v: number) => formatCurrency(v, currencyCode);
  const fmtPct = (v: number) => formatPercent(v);

  const hasData = totalIngreso > 0 || totalGastos > 0;

  const etiquetaBloque = f1.sres?.trim() || "GIM";

  type FilaMes = { label: string; values: ResumenMeses; bold: boolean; color: string };

  const filas = useMemo((): FilaMes[] => {
    const base: FilaMes[] = [
      { label: "Ingreso", values: r.ingreso, bold: false, color: "text-emerald-600" },
      { label: "Total Gastos Imputados", values: r.gastos, bold: false, color: "text-rose-600" },
      { label: "Resultado", values: r.resultado, bold: true, color: "text-foreground" },
    ];
    if (!f1Guardado) return base;
    return [
      ...base,
      { label: `${etiquetaBloque} (${pctGIM}%)`, values: r.distribucion.gim, bold: false, color: "text-blue-600" },
      { label: `GROUPALNET SPA (${pctGP}%)`, values: r.distribucion.gp, bold: false, color: "text-violet-600" },
      { label: "Facturación Neta", values: r.facturacion.neto, bold: true, color: "text-emerald-700" },
    ];
  }, [r, f1Guardado, etiquetaBloque, pctGIM, pctGP]);

  if (!expediente) {
    return <div className="p-6 text-muted-foreground">Expediente no encontrado.</div>;
  }

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

      {expediente.f1.status !== "guardado" && (
        <div className="flex items-start gap-2 text-xs text-amber-700 bg-amber-500/10 rounded-lg px-3 py-2 border border-amber-500/25">
          <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          <span>
            Guarde el Acta (F1) para ver la distribución ({etiquetaBloque !== "GIM" ? `${etiquetaBloque} / ` : ""}GIM + GROUPALNET SPA) y la facturación inter-empresa. Hasta entonces solo se muestran ingreso, gastos y resultado.
          </span>
        </div>
      )}

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

          {f1Guardado && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <PieChart className="w-4 h-4 text-blue-500" />
                  Distribución {etiquetaBloque} / GROUPALNET SPA (debe sumar 100%)
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-6">
                <div className="space-y-1.5 min-w-[140px]">
                  <Label htmlFor="f3-pct-gim" className="text-xs">
                    {etiquetaBloque} (%)
                  </Label>
                  <Input
                    id="f3-pct-gim"
                    type="number"
                    min={0}
                    max={100}
                    className="font-mono h-9"
                    value={pctGIM}
                    onChange={e => setGIM(Number(e.target.value))}
                  />
                </div>
                <div className="space-y-1.5 min-w-[140px]">
                  <Label htmlFor="f3-pct-gp" className="text-xs">GROUPALNET SPA (%)</Label>
                  <Input
                    id="f3-pct-gp"
                    type="number"
                    min={0}
                    max={100}
                    className="font-mono h-9"
                    value={pctGP}
                    onChange={e => setGP(Number(e.target.value))}
                  />
                </div>
              </CardContent>
            </Card>
          )}

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
                      {meses.map(mes => (
                        <th key={mes} className="px-3 py-2 text-right font-medium border-b border-border/40">
                          Mes {mes}
                        </th>
                      ))}
                      <th className="px-3 py-2 text-right font-medium border-b border-border/40">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filas.map((row, i) => {
                      const total = sumResumenMeses(row.values, r.nCuotas);
                      return (
                        <tr key={i} className={`border-b border-border/20 last:border-b-0 ${row.bold ? "bg-muted/30" : "hover:bg-muted/10"} transition-colors`}>
                          <td className={`px-3 py-2 ${row.bold ? "font-semibold" : ""}`}>
                            {row.label}
                          </td>
                          {meses.map(mes => (
                            <td key={mes} className={`px-3 py-2 text-right font-mono ${row.color} ${row.bold ? "font-bold" : ""}`}>
                              {fmt(getMesValue(row.values, mes))}
                            </td>
                          ))}
                          <td className={`px-3 py-2 text-right font-mono ${row.color} font-bold`}>{fmt(total)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

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
                  const total = sumResumenMeses(item.data, r.nCuotas);
                  return (
                    <div key={i} className="p-3 rounded-lg bg-muted/50 border border-border/40">
                      <div className="flex items-center gap-1.5 mb-1">
                        <item.icon className={`w-3.5 h-3.5 ${item.color}`} />
                        <span className="text-xs text-muted-foreground">{item.label}</span>
                      </div>
                      <p className={`text-sm font-bold font-mono ${item.color}`}>{fmt(total)}</p>
                      <div className="mt-1.5 space-y-0.5">
                        {meses.map(mes => (
                          <div key={mes} className="flex justify-between text-xs text-muted-foreground">
                            <span>Mes {mes}</span>
                            <span className="font-mono">{fmt(getMesValue(item.data, mes))}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/30 rounded-lg p-3 border border-border/40">
            <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            <span>
              El ingreso usa los montos de cada cuota de Implementación en F1. Los gastos de F2 se imputan por cuota/mes (Hardware, Materiales, RRHH y Otros).
              {f1Guardado
                ? ` La fila «${etiquetaBloque}» corresponde a Sres. en F1; los % y el impuesto (según país) se reflejan en el payload guardado.`
                : " La distribución y facturación inter-empresa aparecen cuando el Acta (F1) está guardada."}
            </span>
          </div>
        </>
      )}
    </div>
  );
}
