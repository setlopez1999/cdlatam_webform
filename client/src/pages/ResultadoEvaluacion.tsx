import { useMemo } from "react";
import { useLocation } from "wouter";
import {
  loadEPDraft,
  loadActaDraft,
  calcularResultado,
  createDefaultEP,
} from "@/hooks/useFormStore";
import { AlertTriangle, PieChart, FileText, ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";

function fmtCell(value: number) {
  if (value === 0) return <span className="text-muted-foreground font-mono">$ –</span>;
  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  return (
    <span className={`font-mono ${value < 0 ? "text-red-500" : ""}`}>
      {sign}$ {abs.toLocaleString("es-CL", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
    </span>
  );
}

function pct(value: number) {
  return `${(value * 100).toFixed(0)}%`;
}

export default function ResultadoEvaluacion() {
  const [, navigate] = useLocation();

  const ep = useMemo(() => loadEPDraft() ?? createDefaultEP(), []);
  const acta = useMemo(() => loadActaDraft(), []);
  const resultado = useMemo(() => calcularResultado(ep), [ep]);

  const hasEPData = ep.montoProyecto > 0 ||
    ep.hardware.some(h => h.total > 0) ||
    ep.materiales.some(m => m.total > 0) ||
    ep.rrhh.some(r => r.total > 0) ||
    ep.otrosGastos.some(o => o.total > 0);

  const hasActaData = !!acta && (!!acta.razonSocial || acta.formasPagoImplementacion?.length > 0);

  const r = resultado;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-violet-500/10">
          <PieChart className="w-5 h-5 text-violet-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground">Resultado de Evaluación</h1>
          <p className="text-sm text-muted-foreground">Ingreso vs Gastos, distribución GIM/GP y facturación inter-empresa</p>
        </div>
      </div>

      {/* Avisos */}
      {!hasEPData && (
        <Alert className="border-amber-200 bg-amber-50 dark:bg-amber-950/20">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-700 dark:text-amber-400">
            Tablas de resultado incompletas por falta de información. Complete el{" "}
            <button className="underline font-medium hover:no-underline" onClick={() => navigate("/ep")}>
              Formulario EP (F2)
            </button>{" "}
            para ver los resultados.
          </AlertDescription>
        </Alert>
      )}
      {!hasActaData && hasEPData && (
        <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-950/20">
          <AlertTriangle className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-700 dark:text-blue-400">
            El ingreso se calcula desde el monto del EP. Para mayor precisión, complete el{" "}
            <button className="underline font-medium hover:no-underline" onClick={() => navigate("/acta")}>
              Acta (F1)
            </button>{" "}
            con las formas de pago.
          </AlertDescription>
        </Alert>
      )}

      {/* Accesos rápidos */}
      <div className="flex gap-2 flex-wrap">
        <Button variant="outline" size="sm" onClick={() => navigate("/acta")} className="gap-1.5">
          <FileText className="w-3.5 h-3.5" /> Acta (F1)
        </Button>
        <Button variant="outline" size="sm" onClick={() => navigate("/ep")} className="gap-1.5">
          <ClipboardList className="w-3.5 h-3.5" /> EP (F2)
        </Button>
      </div>

      {/* ── Tabla 2: Resultado Evaluación ─────────────────────────────────────── */}
      <div className="rounded-xl border border-border overflow-hidden shadow-sm">
        <div className="bg-[#00c2b2] px-4 py-2.5 text-center">
          <h2 className="text-sm font-bold text-white tracking-wide uppercase">Resultado Evaluación</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-muted/60 border-b border-border">
                <th className="px-4 py-2 text-left font-semibold text-foreground w-[160px]">N° Cuotas</th>
                <th className="px-4 py-2 text-center font-semibold text-foreground w-[60px]">{r.nCuotas}</th>
                <th className="px-4 py-2 text-center font-semibold text-foreground">MES 1</th>
                <th className="px-4 py-2 text-center font-semibold text-foreground">MES 2</th>
                <th className="px-4 py-2 text-center font-semibold text-foreground">MES 3</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-border/40 bg-background">
                <td className="px-4 py-2 font-medium text-foreground">Ingreso</td>
                <td className="px-4 py-2" />
                <td className="px-4 py-2 text-center">{fmtCell(r.ingreso.mes1)}</td>
                <td className="px-4 py-2 text-center">{fmtCell(r.ingreso.mes2)}</td>
                <td className="px-4 py-2 text-center">{fmtCell(r.ingreso.mes3)}</td>
              </tr>
              <tr className="border-b border-border/40 bg-muted/20">
                <td className="px-4 py-2 font-medium text-foreground">Gastos</td>
                <td className="px-4 py-2" />
                <td className="px-4 py-2 text-center">{fmtCell(r.gastos.mes1)}</td>
                <td className="px-4 py-2 text-center">{fmtCell(r.gastos.mes2)}</td>
                <td className="px-4 py-2 text-center">{fmtCell(r.gastos.mes3)}</td>
              </tr>
              <tr className="border-b-2 border-[#00c2b2]/40 bg-[#00c2b2]/10">
                <td className="px-4 py-2.5 font-bold text-foreground">Resultado</td>
                <td className="px-4 py-2.5" />
                <td className="px-4 py-2.5 text-center font-bold">{fmtCell(r.resultado.mes1)}</td>
                <td className="px-4 py-2.5 text-center font-bold">{fmtCell(r.resultado.mes2)}</td>
                <td className="px-4 py-2.5 text-center font-bold">{fmtCell(r.resultado.mes3)}</td>
              </tr>
              {/* Distribución header */}
              <tr className="border-b border-border/40 bg-muted/40">
                <td colSpan={5} className="px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Distribución:
                </td>
              </tr>
              <tr className="border-b border-border/40 bg-background">
                <td className="px-4 py-2 font-medium text-foreground pl-6">GIM</td>
                <td className="px-4 py-2 text-center text-muted-foreground text-xs">{pct(r.distribucion.gim.porcentaje)}</td>
                <td className="px-4 py-2 text-center">{fmtCell(r.distribucion.gim.mes1)}</td>
                <td className="px-4 py-2 text-center">{fmtCell(r.distribucion.gim.mes2)}</td>
                <td className="px-4 py-2 text-center">{fmtCell(r.distribucion.gim.mes3)}</td>
              </tr>
              <tr className="border-b border-border/40 bg-muted/20">
                <td className="px-4 py-2 font-medium text-foreground pl-6">GP</td>
                <td className="px-4 py-2 text-center text-muted-foreground text-xs">{pct(r.distribucion.gp.porcentaje)}</td>
                <td className="px-4 py-2 text-center">{fmtCell(r.distribucion.gp.mes1)}</td>
                <td className="px-4 py-2 text-center">{fmtCell(r.distribucion.gp.mes2)}</td>
                <td className="px-4 py-2 text-center">{fmtCell(r.distribucion.gp.mes3)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Tabla 3: Facturación Inter-Empresa ────────────────────────────────── */}
      <div className="rounded-xl border border-border overflow-hidden shadow-sm">
        <div className="bg-[#1a2a3a] px-4 py-2.5 text-center">
          <h2 className="text-sm font-bold text-white tracking-wide uppercase">Facturación Inter-Empresa</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-muted/60 border-b border-border">
                <th className="px-4 py-2 text-left font-semibold text-foreground w-[160px]"></th>
                <th className="px-4 py-2 text-center font-semibold text-foreground w-[80px]"></th>
                <th className="px-4 py-2 text-center font-semibold text-foreground">MES 1</th>
                <th className="px-4 py-2 text-center font-semibold text-foreground">MES 2</th>
                <th className="px-4 py-2 text-center font-semibold text-foreground">MES 3</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-border/40 bg-background">
                <td className="px-4 py-2 font-medium text-foreground">Bruto</td>
                <td className="px-4 py-2" />
                <td className="px-4 py-2 text-center">{fmtCell(r.facturacion.bruto.mes1)}</td>
                <td className="px-4 py-2 text-center">{fmtCell(r.facturacion.bruto.mes2)}</td>
                <td className="px-4 py-2 text-center">{fmtCell(r.facturacion.bruto.mes3)}</td>
              </tr>
              <tr className="border-b border-border/40 bg-muted/20">
                <td className="px-4 py-2 font-medium text-foreground">Impuesto</td>
                <td className="px-4 py-2 text-center text-muted-foreground text-xs">{r.facturacion.impuesto.tasa.toFixed(2)}</td>
                <td className="px-4 py-2 text-center">{fmtCell(r.facturacion.impuesto.mes1)}</td>
                <td className="px-4 py-2 text-center">{fmtCell(r.facturacion.impuesto.mes2)}</td>
                <td className="px-4 py-2 text-center">{fmtCell(r.facturacion.impuesto.mes3)}</td>
              </tr>
              <tr className="bg-[#1a2a3a]/10 border-t-2 border-[#1a2a3a]/30">
                <td className="px-4 py-2.5 font-bold text-foreground">Neto</td>
                <td className="px-4 py-2.5" />
                <td className="px-4 py-2.5 text-center font-bold">{fmtCell(r.facturacion.neto.mes1)}</td>
                <td className="px-4 py-2.5 text-center font-bold">{fmtCell(r.facturacion.neto.mes2)}</td>
                <td className="px-4 py-2.5 text-center font-bold">{fmtCell(r.facturacion.neto.mes3)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Info de fuente */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Badge variant="outline" className="text-xs">Acta (F1) + EP (F2)</Badge>
        <span>Los valores se calculan automáticamente desde los dos formularios del expediente.</span>
      </div>
    </div>
  );
}
