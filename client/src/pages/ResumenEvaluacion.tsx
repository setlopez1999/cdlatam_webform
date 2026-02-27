import { useMemo } from "react";
import { useLocation } from "wouter";
import {
  loadEPDraft,
  calcularResultado,
  createDefaultEP,
} from "@/hooks/useFormStore";
import { AlertTriangle, TrendingUp, FileText, ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";

function fmt(value: number, currency = "USD") {
  if (value === 0) return <span className="text-muted-foreground">$ –</span>;
  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  return (
    <span className={value < 0 ? "text-red-500" : ""}>
      {sign}$ {abs.toLocaleString("es-CL", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
    </span>
  );
}

export default function ResumenEvaluacion() {
  const [, navigate] = useLocation();

  const ep = useMemo(() => loadEPDraft() ?? createDefaultEP(), []);
  const resultado = useMemo(() => calcularResultado(ep), [ep]);

  const hasData = ep.montoProyecto > 0 ||
    ep.hardware.some(h => h.total > 0) ||
    ep.materiales.some(m => m.total > 0) ||
    ep.rrhh.some(r => r.total > 0) ||
    ep.otrosGastos.some(o => o.total > 0);

  const r = resultado.resumen;

  const rows = [
    { label: "Hardware",   mes1: r.hardware.mes1,   mes2: r.hardware.mes2,   mes3: r.hardware.mes3 },
    { label: "Materiales", mes1: r.materiales.mes1, mes2: r.materiales.mes2, mes3: r.materiales.mes3 },
    { label: "RH",         mes1: r.rh.mes1,         mes2: r.rh.mes2,         mes3: r.rh.mes3 },
    { label: "Otros",      mes1: r.otros.mes1,      mes2: r.otros.mes2,      mes3: r.otros.mes3 },
  ];

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-emerald-500/10">
          <TrendingUp className="w-5 h-5 text-emerald-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground">Resumen de Evaluación</h1>
          <p className="text-sm text-muted-foreground">Gastos imputados por categoría y mes — calculado desde el EP (F2)</p>
        </div>
      </div>

      {/* Aviso si faltan datos */}
      {!hasData && (
        <Alert className="border-amber-200 bg-amber-50 dark:bg-amber-950/20">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-700 dark:text-amber-400">
            Tablas de resultado incompletas por falta de información. Complete el{" "}
            <button
              className="underline font-medium hover:no-underline"
              onClick={() => navigate("/ep")}
            >
              Formulario EP (F2)
            </button>{" "}
            para ver los resultados.
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

      {/* Tabla Resumen Evaluación */}
      <div className="rounded-xl border border-border overflow-hidden shadow-sm">
        <div className="bg-[#00c2b2] px-4 py-2.5 text-center">
          <h2 className="text-sm font-bold text-white tracking-wide uppercase">Resumen Evaluación</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-muted/60 border-b border-border">
                <th className="px-4 py-2 text-left font-semibold text-foreground w-[180px]">Tipo de gasto</th>
                <th className="px-4 py-2 text-center font-semibold text-foreground">GASTOS MES 1</th>
                <th className="px-4 py-2 text-center font-semibold text-foreground">GASTOS MES 2</th>
                <th className="px-4 py-2 text-center font-semibold text-foreground">GASTOS MES 3</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={row.label} className={`border-b border-border/40 ${i % 2 === 0 ? "bg-background" : "bg-muted/20"}`}>
                  <td className="px-4 py-2 font-medium text-foreground">{row.label}</td>
                  <td className="px-4 py-2 text-center font-mono">{fmt(row.mes1)}</td>
                  <td className={`px-4 py-2 text-center font-mono ${row.mes2 === 0 && row.label !== "Otros" ? "bg-orange-100 dark:bg-orange-950/30" : ""}`}>
                    {row.mes2 === 0 && row.label !== "Otros" ? (
                      <span className="text-muted-foreground/40">—</span>
                    ) : fmt(row.mes2)}
                  </td>
                  <td className={`px-4 py-2 text-center font-mono ${row.mes3 === 0 && row.label !== "Otros" ? "bg-orange-100 dark:bg-orange-950/30" : ""}`}>
                    {row.mes3 === 0 && row.label !== "Otros" ? (
                      <span className="text-muted-foreground/40">—</span>
                    ) : fmt(row.mes3)}
                  </td>
                </tr>
              ))}
              {/* Total */}
              <tr className="bg-[#00c2b2]/10 border-t-2 border-[#00c2b2]/40">
                <td className="px-4 py-2.5 font-bold text-foreground">Total Gastos Imputados</td>
                <td className="px-4 py-2.5 text-center font-bold font-mono">{fmt(r.totalGastos.mes1)}</td>
                <td className="px-4 py-2.5 text-center font-bold font-mono">{fmt(r.totalGastos.mes2)}</td>
                <td className="px-4 py-2.5 text-center font-bold font-mono">{fmt(r.totalGastos.mes3)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Info de fuente */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Badge variant="outline" className="text-xs">EP (F2)</Badge>
        <span>Los valores se calculan automáticamente desde el Formulario de Evaluación de Proyecto.</span>
      </div>
    </div>
  );
}
