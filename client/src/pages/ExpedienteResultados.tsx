/**
 * ExpedienteResultados - Muestra las 3 tablas de resultados del expediente.
 * Ruta: /expediente/:id/resultados
 */

import { useParams } from "wouter";
import { useLocation } from "wouter";
import { AlertTriangle, FileText, ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";
import ExpedienteLayout from "@/components/ExpedienteLayout";
import { useExpediente, calcularResultado } from "@/hooks/useFormStore";

function fmtCell(value: number) {
  if (value === 0) return <span className="text-muted-foreground">–</span>;
  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  return (
    <span className={value < 0 ? "text-red-400" : ""}>
      {sign}$ {abs.toLocaleString("es-CL", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
    </span>
  );
}

function ResultadosContent({ expedienteId }: { expedienteId: string }) {
  const [, navigate] = useLocation();
  const { expedientes } = useExpediente();
  const exp = expedientes.find(e => e.id === expedienteId);

  if (!exp) return null;

  //const tieneEP = !!exp.ep;
  const tieneEP = true;
  const tieneActa = !!exp.acta;

  if (!tieneEP) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4 text-center px-6">
        <AlertTriangle className="w-10 h-10 text-amber-400" />
        <p className="text-muted-foreground">
          Para ver los resultados necesitas completar el <strong>F2 — EP</strong>.
        </p>
        <Button onClick={() => navigate(`/expediente/${expedienteId}/ep`)} className="gap-2">
          <ClipboardList className="w-4 h-4" />
          Completar F2 — EP
        </Button>
      </div>
    );
  }

  const r = calcularResultado(exp.ep ?? {
    otrosGastos: [],
    hardware: [],
    materiales: [],
    rrhh: [],
    montoProyecto: 0
  } as any);
  const res = r.resumen;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Aviso si falta el Acta */}
      {!tieneActa && (
        <div className="flex items-center gap-2 text-sm text-amber-400 bg-amber-500/10 rounded-lg px-4 py-3">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>
            Tablas de resultado incompletas por falta de información en Acta (F1).{" "}
            <button
              className="underline hover:no-underline"
              onClick={() => navigate(`/expediente/${expedienteId}/acta`)}
            >
              Completar F1
            </button>
          </span>
        </div>
      )}

      {/* Tabla 1: Resumen Evaluación */}
      <div className="rounded-xl border border-border overflow-hidden">
        <div className="bg-[#00c2b2] px-4 py-2 text-center">
          <span className="text-sm font-bold text-white uppercase tracking-wide">Resumen Evaluación</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-muted/50 border-b border-border">
                <th className="px-4 py-2 text-left font-semibold">Tipo de gasto</th>
                <th className="px-4 py-2 text-center font-semibold">GASTOS MES 1</th>
                <th className="px-4 py-2 text-center font-semibold">GASTOS MES 2</th>
                <th className="px-4 py-2 text-center font-semibold">GASTOS MES 3</th>
              </tr>
            </thead>
            <tbody>
              {[
                { label: "Hardware", m1: res.hardware.mes1, m2: res.hardware.mes2, m3: res.hardware.mes3 },
                { label: "Materiales", m1: res.materiales.mes1, m2: res.materiales.mes2, m3: res.materiales.mes3 },
                { label: "RH", m1: res.rh.mes1, m2: res.rh.mes2, m3: res.rh.mes3 },
                { label: "Otros", m1: res.otros.mes1, m2: res.otros.mes2, m3: res.otros.mes3 },
              ].map((row, i) => (
                <tr key={row.label} className={`border-b border-border/30 ${i % 2 !== 0 ? "bg-muted/10" : ""}`}>
                  <td className="px-4 py-2 font-medium">{row.label}</td>
                  <td className="px-4 py-2 text-center">{fmtCell(row.m1)}</td>
                  <td className="px-4 py-2 text-center">{fmtCell(row.m2)}</td>
                  <td className="px-4 py-2 text-center">{fmtCell(row.m3)}</td>
                </tr>
              ))}
              <tr className="bg-[#00c2b2]/10 border-t-2 border-[#00c2b2]/30">
                <td className="px-4 py-2 font-bold">Total Gastos Imputados</td>
                <td className="px-4 py-2 text-center font-bold">{fmtCell(res.totalGastos.mes1)}</td>
                <td className="px-4 py-2 text-center font-bold">{fmtCell(res.totalGastos.mes2)}</td>
                <td className="px-4 py-2 text-center font-bold">{fmtCell(res.totalGastos.mes3)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Tabla 2: Resultado Evaluación */}
      <div className="rounded-xl border border-border overflow-hidden">
        <div className="bg-[#00c2b2] px-4 py-2 text-center">
          <span className="text-sm font-bold text-white uppercase tracking-wide">Resultado Evaluación</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-muted/50 border-b border-border">
                <th className="px-4 py-2 text-left font-semibold">N° Cuotas</th>
                <th className="px-4 py-2 text-center font-semibold">{r.nCuotas}</th>
                <th className="px-4 py-2 text-center font-semibold">MES 1</th>
                <th className="px-4 py-2 text-center font-semibold">MES 2</th>
                <th className="px-4 py-2 text-center font-semibold">MES 3</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-border/30">
                <td className="px-4 py-2 font-medium">Ingreso</td><td />
                <td className="px-4 py-2 text-center">{fmtCell(r.ingreso.mes1)}</td>
                <td className="px-4 py-2 text-center">{fmtCell(r.ingreso.mes2)}</td>
                <td className="px-4 py-2 text-center">{fmtCell(r.ingreso.mes3)}</td>
              </tr>
              <tr className="border-b border-border/30 bg-muted/10">
                <td className="px-4 py-2 font-medium">Gastos</td><td />
                <td className="px-4 py-2 text-center">{fmtCell(r.gastos.mes1)}</td>
                <td className="px-4 py-2 text-center">{fmtCell(r.gastos.mes2)}</td>
                <td className="px-4 py-2 text-center">{fmtCell(r.gastos.mes3)}</td>
              </tr>
              <tr className="border-b-2 border-[#00c2b2]/30 bg-[#00c2b2]/10">
                <td className="px-4 py-2 font-bold">Resultado</td><td />
                <td className="px-4 py-2 text-center font-bold">{fmtCell(r.resultado.mes1)}</td>
                <td className="px-4 py-2 text-center font-bold">{fmtCell(r.resultado.mes2)}</td>
                <td className="px-4 py-2 text-center font-bold">{fmtCell(r.resultado.mes3)}</td>
              </tr>
              <tr className="bg-muted/20">
                <td colSpan={5} className="px-4 py-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Distribución:</td>
              </tr>
              <tr className="border-b border-border/30">
                <td className="px-4 py-2 pl-6 font-medium">GIM</td>
                <td className="px-4 py-2 text-center text-muted-foreground">{(r.distribucion.gim.porcentaje * 100).toFixed(0)}%</td>
                <td className="px-4 py-2 text-center">{fmtCell(r.distribucion.gim.mes1)}</td>
                <td className="px-4 py-2 text-center">{fmtCell(r.distribucion.gim.mes2)}</td>
                <td className="px-4 py-2 text-center">{fmtCell(r.distribucion.gim.mes3)}</td>
              </tr>
              <tr className="border-b border-border/30 bg-muted/10">
                <td className="px-4 py-2 pl-6 font-medium">GP</td>
                <td className="px-4 py-2 text-center text-muted-foreground">{(r.distribucion.gp.porcentaje * 100).toFixed(0)}%</td>
                <td className="px-4 py-2 text-center">{fmtCell(r.distribucion.gp.mes1)}</td>
                <td className="px-4 py-2 text-center">{fmtCell(r.distribucion.gp.mes2)}</td>
                <td className="px-4 py-2 text-center">{fmtCell(r.distribucion.gp.mes3)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Tabla 3: Facturación Inter-Empresa */}
      <div className="rounded-xl border border-border overflow-hidden">
        <div className="bg-[#1a2a3a] px-4 py-2 text-center">
          <span className="text-sm font-bold text-white uppercase tracking-wide">Facturación Inter-Empresa</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-muted/50 border-b border-border">
                <th className="px-4 py-2 text-left font-semibold" />
                <th className="px-4 py-2 text-center font-semibold w-20" />
                <th className="px-4 py-2 text-center font-semibold">MES 1</th>
                <th className="px-4 py-2 text-center font-semibold">MES 2</th>
                <th className="px-4 py-2 text-center font-semibold">MES 3</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-border/30">
                <td className="px-4 py-2 font-medium">Bruto</td><td />
                <td className="px-4 py-2 text-center">{fmtCell(r.facturacion.bruto.mes1)}</td>
                <td className="px-4 py-2 text-center">{fmtCell(r.facturacion.bruto.mes2)}</td>
                <td className="px-4 py-2 text-center">{fmtCell(r.facturacion.bruto.mes3)}</td>
              </tr>
              <tr className="border-b border-border/30 bg-muted/10">
                <td className="px-4 py-2 font-medium">Impuesto</td>
                <td className="px-4 py-2 text-center text-muted-foreground">{r.facturacion.impuesto.tasa.toFixed(2)}</td>
                <td className="px-4 py-2 text-center">{fmtCell(r.facturacion.impuesto.mes1)}</td>
                <td className="px-4 py-2 text-center">{fmtCell(r.facturacion.impuesto.mes2)}</td>
                <td className="px-4 py-2 text-center">{fmtCell(r.facturacion.impuesto.mes3)}</td>
              </tr>
              <tr className="bg-[#1a2a3a]/10 border-t border-[#1a2a3a]/20">
                <td className="px-4 py-2 font-bold">Neto</td><td />
                <td className="px-4 py-2 text-center font-bold">{fmtCell(r.facturacion.neto.mes1)}</td>
                <td className="px-4 py-2 text-center font-bold">{fmtCell(r.facturacion.neto.mes2)}</td>
                <td className="px-4 py-2 text-center font-bold">{fmtCell(r.facturacion.neto.mes3)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default function ExpedienteResultados() {
  const params = useParams<{ id: string }>();
  const expedienteId = params.id;

  return (
    <ExpedienteLayout expedienteId={expedienteId} activeTab="resultados">
      <ResultadosContent expedienteId={expedienteId} />
    </ExpedienteLayout>
  );
}
