/**
 * Historial / Expedientes — Lista de todos los expedientes guardados.
 * Cada expediente agrupa F1 (Acta), F2 (EP) y sus Resultados.
 *
 * Usa el nuevo store (features/expedientes/store.ts) con la clave
 * cdlatam_expedientes y el formato {f1, f2, f3}.
 */

import { useState, useMemo, useEffect } from "react";
import { useLocation } from "wouter";
import {
  FolderOpen, Trash2, Plus, AlertTriangle, Search, ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useExpedienteStore } from "@/features/expedientes/store";
import { mapResumenRowToExpediente } from "@/features/expedientes/fromServer";
import type { Expediente } from "@/features/expedientes/types";
import { trpc } from "@/lib/trpc";
import { calcularResultadoF3 } from "@/features/expedientes/types";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { PageLayout } from "@/components/PageLayout";

// ─── Helpers ──────────────────────────────────────────────────────────────────

type EstadoDoc = "guardado" | "borrador" | "ausente";

/** Mapea el FormStatus del nuevo store a EstadoDoc para mostrar en la tarjeta */
function getEstadoF1(exp: Expediente): EstadoDoc {
  if (exp.f1.status === "guardado") return "guardado";
  if (exp.f1.status === "sin_guardar") return "borrador";
  return "ausente";
}

function getEstadoF2(exp: Expediente): EstadoDoc {
  if (exp.f2.status === "guardado") return "guardado";
  if (exp.f2.status === "sin_guardar") return "borrador";
  return "ausente";
}

const ESTADO_STYLES: Record<EstadoDoc, string> = {
  guardado: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  borrador: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  ausente:  "bg-muted text-muted-foreground border-border",
};

const ESTADO_LABELS: Record<EstadoDoc, string> = {
  guardado: "Guardado",
  borrador: "Borrador",
  ausente:  "—",
};

function EstadoBadge({ estado, label }: { estado: EstadoDoc; label: string }) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
      <Badge variant="outline" className={cn("text-xs", ESTADO_STYLES[estado])}>
        {ESTADO_LABELS[estado]}
      </Badge>
    </div>
  );
}

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

// ─── Tablas de resultados expandibles ────────────────────────────────────────

function ResultadosExpandidos({ exp }: { exp: Expediente }) {
  const tieneF2 = exp.f2.status !== "nuevo";
  if (!tieneF2) return null;

  const r = useMemo(
    () => calcularResultadoF3(exp.f2.data, exp.f1.data),
    [exp.f2.data, exp.f1.data],
  );
  const res = r.resumen;

  return (
    <div className="mt-3 space-y-4 border-t border-border/40 pt-3">
      {/* Aviso si falta el Acta */}
      {exp.f1.status === "nuevo" && (
        <div className="flex items-center gap-2 text-xs text-amber-400 bg-amber-500/10 rounded-lg px-3 py-2">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
          <span>Tablas de resultado incompletas por falta de información en Acta (F1).</span>
        </div>
      )}

      {/* Tabla 1: Resumen Evaluación */}
      <div className="rounded-lg border border-border overflow-hidden">
        <div className="bg-[#00c2b2]/90 px-3 py-1.5 text-center">
          <span className="text-xs font-bold text-white uppercase tracking-wide">Resumen Evaluación</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-muted/50 border-b border-border">
                <th className="px-3 py-1.5 text-left font-semibold">Tipo de gasto</th>
                <th className="px-3 py-1.5 text-center font-semibold">MES 1</th>
                <th className="px-3 py-1.5 text-center font-semibold">MES 2</th>
                <th className="px-3 py-1.5 text-center font-semibold">MES 3</th>
              </tr>
            </thead>
            <tbody>
              {[
                { label: "Hardware",   m1: res.hardware.mes1,   m2: res.hardware.mes2,   m3: res.hardware.mes3 },
                { label: "Materiales", m1: res.materiales.mes1, m2: res.materiales.mes2, m3: res.materiales.mes3 },
                { label: "RH",         m1: res.rh.mes1,         m2: res.rh.mes2,         m3: res.rh.mes3 },
                { label: "Otros",      m1: res.otros.mes1,      m2: res.otros.mes2,      m3: res.otros.mes3 },
              ].map((row, i) => (
                <tr key={row.label} className={cn("border-b border-border/30", i % 2 !== 0 && "bg-muted/10")}>
                  <td className="px-3 py-1.5 font-medium">{row.label}</td>
                  <td className="px-3 py-1.5 text-center">{fmtCell(row.m1)}</td>
                  <td className="px-3 py-1.5 text-center">{fmtCell(row.m2)}</td>
                  <td className="px-3 py-1.5 text-center">{fmtCell(row.m3)}</td>
                </tr>
              ))}
              <tr className="bg-[#00c2b2]/10 border-t border-[#00c2b2]/30">
                <td className="px-3 py-1.5 font-bold">Total Gastos Imputados</td>
                <td className="px-3 py-1.5 text-center font-bold">{fmtCell(res.totalGastos.mes1)}</td>
                <td className="px-3 py-1.5 text-center font-bold">{fmtCell(res.totalGastos.mes2)}</td>
                <td className="px-3 py-1.5 text-center font-bold">{fmtCell(res.totalGastos.mes3)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Tabla 2: Resultado Evaluación */}
      <div className="rounded-lg border border-border overflow-hidden">
        <div className="bg-[#00c2b2]/90 px-3 py-1.5 text-center">
          <span className="text-xs font-bold text-white uppercase tracking-wide">Resultado Evaluación</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-muted/50 border-b border-border">
                <th className="px-3 py-1.5 text-left font-semibold">N° Cuotas</th>
                <th className="px-3 py-1.5 text-center font-semibold">{r.nCuotas}</th>
                <th className="px-3 py-1.5 text-center font-semibold">MES 1</th>
                <th className="px-3 py-1.5 text-center font-semibold">MES 2</th>
                <th className="px-3 py-1.5 text-center font-semibold">MES 3</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-border/30">
                <td className="px-3 py-1.5 font-medium">Ingreso</td><td />
                <td className="px-3 py-1.5 text-center">{fmtCell(r.ingreso.mes1)}</td>
                <td className="px-3 py-1.5 text-center">{fmtCell(r.ingreso.mes2)}</td>
                <td className="px-3 py-1.5 text-center">{fmtCell(r.ingreso.mes3)}</td>
              </tr>
              <tr className="border-b border-border/30 bg-muted/10">
                <td className="px-3 py-1.5 font-medium">Gastos</td><td />
                <td className="px-3 py-1.5 text-center">{fmtCell(r.gastos.mes1)}</td>
                <td className="px-3 py-1.5 text-center">{fmtCell(r.gastos.mes2)}</td>
                <td className="px-3 py-1.5 text-center">{fmtCell(r.gastos.mes3)}</td>
              </tr>
              <tr className="border-b-2 border-[#00c2b2]/30 bg-[#00c2b2]/10">
                <td className="px-3 py-1.5 font-bold">Resultado</td><td />
                <td className="px-3 py-1.5 text-center font-bold">{fmtCell(r.resultado.mes1)}</td>
                <td className="px-3 py-1.5 text-center font-bold">{fmtCell(r.resultado.mes2)}</td>
                <td className="px-3 py-1.5 text-center font-bold">{fmtCell(r.resultado.mes3)}</td>
              </tr>
              <tr className="bg-muted/20">
                <td colSpan={5} className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Distribución:</td>
              </tr>
              <tr className="border-b border-border/30">
                <td className="px-3 py-1.5 pl-5 font-medium">GIM</td>
                <td className="px-3 py-1.5 text-center text-muted-foreground">{(r.distribucion.gim.porcentaje * 100).toFixed(0)}%</td>
                <td className="px-3 py-1.5 text-center">{fmtCell(r.distribucion.gim.mes1)}</td>
                <td className="px-3 py-1.5 text-center">{fmtCell(r.distribucion.gim.mes2)}</td>
                <td className="px-3 py-1.5 text-center">{fmtCell(r.distribucion.gim.mes3)}</td>
              </tr>
              <tr className="border-b border-border/30 bg-muted/10">
                <td className="px-3 py-1.5 pl-5 font-medium">GP</td>
                <td className="px-3 py-1.5 text-center text-muted-foreground">{(r.distribucion.gp.porcentaje * 100).toFixed(0)}%</td>
                <td className="px-3 py-1.5 text-center">{fmtCell(r.distribucion.gp.mes1)}</td>
                <td className="px-3 py-1.5 text-center">{fmtCell(r.distribucion.gp.mes2)}</td>
                <td className="px-3 py-1.5 text-center">{fmtCell(r.distribucion.gp.mes3)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Tabla 3: Facturación Inter-Empresa */}
      <div className="rounded-lg border border-border overflow-hidden">
        <div className="bg-[#1a2a3a] px-3 py-1.5 text-center">
          <span className="text-xs font-bold text-white uppercase tracking-wide">Facturación Inter-Empresa</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-muted/50 border-b border-border">
                <th className="px-3 py-1.5 text-left font-semibold" />
                <th className="px-3 py-1.5 text-center font-semibold w-16" />
                <th className="px-3 py-1.5 text-center font-semibold">MES 1</th>
                <th className="px-3 py-1.5 text-center font-semibold">MES 2</th>
                <th className="px-3 py-1.5 text-center font-semibold">MES 3</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-border/30">
                <td className="px-3 py-1.5 font-medium">Bruto</td><td />
                <td className="px-3 py-1.5 text-center">{fmtCell(r.facturacion.bruto.mes1)}</td>
                <td className="px-3 py-1.5 text-center">{fmtCell(r.facturacion.bruto.mes2)}</td>
                <td className="px-3 py-1.5 text-center">{fmtCell(r.facturacion.bruto.mes3)}</td>
              </tr>
              <tr className="border-b border-border/30 bg-muted/10">
                <td className="px-3 py-1.5 font-medium">Impuesto</td>
                <td className="px-3 py-1.5 text-center text-muted-foreground">{r.facturacion.impuesto.tasa.toFixed(2)}</td>
                <td className="px-3 py-1.5 text-center">{fmtCell(r.facturacion.impuesto.mes1)}</td>
                <td className="px-3 py-1.5 text-center">{fmtCell(r.facturacion.impuesto.mes2)}</td>
                <td className="px-3 py-1.5 text-center">{fmtCell(r.facturacion.impuesto.mes3)}</td>
              </tr>
              <tr className="bg-[#1a2a3a]/10 border-t border-[#1a2a3a]/20">
                <td className="px-3 py-1.5 font-bold">Neto</td><td />
                <td className="px-3 py-1.5 text-center font-bold">{fmtCell(r.facturacion.neto.mes1)}</td>
                <td className="px-3 py-1.5 text-center font-bold">{fmtCell(r.facturacion.neto.mes2)}</td>
                <td className="px-3 py-1.5 text-center font-bold">{fmtCell(r.facturacion.neto.mes3)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── Tarjeta de Expediente ────────────────────────────────────────────────────

function ExpedienteCard({ exp, onEliminar }: { exp: Expediente; onEliminar: () => void }) {
  const [, navigate] = useLocation();
  const [expandido, setExpandido] = useState(false);

  const ef1 = getEstadoF1(exp);
  const ef2 = getEstadoF2(exp);
  const tieneF2 = exp.f2.status !== "nuevo";
  const resultadosCompletos = exp.f1.status !== "nuevo" && exp.f2.status !== "nuevo";
  const tieneContenidoF1 = exp.f1.status !== "nuevo";

  const fechaDisplay = new Date(exp.createdAt).toLocaleDateString("es-CL", {
    day: "2-digit", month: "short", year: "numeric",
  });

  // Nombre de empresa del F1 si está disponible
  const empresa = exp.f1.data?.razonSocial || exp.f1.data?.nombreFantasia || null;

  const handleEliminar = () => {
    if (!confirm(`¿Eliminar el expediente "${exp.nombre}"? Esta acción no se puede deshacer.`)) return;
    onEliminar();
  };

  return (
    <div className="rounded-xl border border-border hover:border-primary/30 transition-all overflow-hidden">
      {/* Cabecera */}
      <div className="flex items-center gap-3 p-4">
        <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <FolderOpen className="w-4 h-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate">{exp.nombre}</p>
          <p className="text-xs text-muted-foreground">
            {exp.codigo ? <span className="font-mono text-foreground/70">{exp.codigo} · </span> : null}
            {empresa ? <span className="text-foreground/70">{empresa} · </span> : null}
            {fechaDisplay}
          </p>
        </div>

        {/* Estados — desktop */}
        <div className="hidden sm:flex items-center gap-4 shrink-0">
          <EstadoBadge estado={ef1} label="Acta (F1)" />
          <EstadoBadge estado={ef2} label="EP (F2)" />
          <div className="flex flex-col items-center gap-0.5">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Resultados</span>
            <Badge variant="outline" className={cn("text-xs", tieneF2
              ? resultadosCompletos
                ? "bg-violet-500/15 text-violet-400 border-violet-500/30"
                : "bg-amber-500/15 text-amber-400 border-amber-500/30"
              : "bg-muted text-muted-foreground border-border"
            )}>
              {tieneF2 ? (resultadosCompletos ? "Disponibles" : "Incompletos") : "—"}
            </Badge>
          </div>
        </div>

        {/* Acciones */}
        <div className="flex items-center gap-1 shrink-0">
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs hidden sm:flex"
            onClick={() => navigate(`/expediente/${exp.id}/acta`)}
          >
            {tieneContenidoF1 ? "Continuar" : "Iniciar"}
          </Button>
          {tieneF2 && (
            <Button
              size="icon"
              variant="ghost"
              className={cn("h-7 w-7 transition-transform", expandido && "rotate-180")}
              onClick={() => setExpandido(v => !v)}
              title="Ver resultados"
            >
              <ChevronDown className="w-3.5 h-3.5" />
            </Button>
          )}
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7 text-muted-foreground hover:text-destructive"
            onClick={handleEliminar}
            title="Eliminar expediente"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Estados — móvil */}
      <div className="sm:hidden flex items-center gap-3 px-4 pb-3 flex-wrap">
        <EstadoBadge estado={ef1} label="Acta (F1)" />
        <EstadoBadge estado={ef2} label="EP (F2)" />
        <Button size="sm" variant="outline" className="h-7 text-xs ml-auto"
          onClick={() => navigate(`/expediente/${exp.id}/acta`)}>
          {tieneContenidoF1 ? "Continuar" : "Iniciar"}
        </Button>
      </div>

      {/* Aviso resultados incompletos */}
      {tieneF2 && !resultadosCompletos && (
        <div className="mx-4 mb-3 flex items-center gap-2 text-xs text-amber-400 bg-amber-500/10 rounded-lg px-3 py-2">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
          <span>
            Tablas de resultado incompletas por falta de información en{" "}
            {exp.f1.status === "nuevo" ? "Acta (F1)" : "EP (F2)"}.
          </span>
        </div>
      )}

      {/* Resultados expandidos */}
      {expandido && tieneF2 && (
        <div className="px-4 pb-4">
          <ResultadosExpandidos exp={exp} />
        </div>
      )}
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function Historial() {
  const [, navigate] = useLocation();
  const { expedientes, eliminar, reemplazarListaDesdeServidor } = useExpedienteStore();
  const [search, setSearch] = useState("");

  const resumenQuery = trpc.expediente.listarResumen.useQuery(undefined, { staleTime: 15_000 });
  const eliminarSrv = trpc.expediente.eliminar.useMutation({
    onSuccess: (_data, input) => {
      eliminar(input.uuid);
      void resumenQuery.refetch();
      toast.success("Expediente eliminado");
    },
    onError: (err) => {
      toast.error(err.message || "No se pudo eliminar");
    },
  });

  useEffect(() => {
    if (resumenQuery.data) {
      reemplazarListaDesdeServidor(resumenQuery.data.map(mapResumenRowToExpediente));
    }
  }, [resumenQuery.data, reemplazarListaDesdeServidor]);

  const filtrados = useMemo(() => {
    if (!search.trim()) return expedientes;
    const q = search.toLowerCase();
    return expedientes.filter(e =>
      e.nombre.toLowerCase().includes(q) ||
      e.f1.data?.razonSocial?.toLowerCase().includes(q) ||
      e.f1.data?.nombreFantasia?.toLowerCase().includes(q)
    );
  }, [expedientes, search]);

  const subtitle = expedientes.length === 0
    ? "No hay expedientes aún."
    : `${expedientes.length} expediente${expedientes.length !== 1 ? "s" : ""} registrado${expedientes.length !== 1 ? "s" : ""}`;

  return (
    <PageLayout
      title="Expedientes"
      subtitle={subtitle}
      icon={<FolderOpen className="w-6 h-6 text-primary" />}
      actions={
        <>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              placeholder="Buscar expediente..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-8 h-8 text-sm w-48"
            />
          </div>
          <Button className="gap-2 h-8 text-sm" onClick={() => navigate("/nuevo-expediente")}>
            <Plus className="w-4 h-4" />Nuevo
          </Button>
        </>
      }
    >
      {filtrados.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
          <FolderOpen className="w-12 h-12 text-muted-foreground/40" />
          {search ? (
            <p className="text-muted-foreground">No se encontraron expedientes con "{search}".</p>
          ) : (
            <>
              <p className="text-muted-foreground">Aún no has creado ningún expediente.</p>
              <Button onClick={() => navigate("/nuevo-expediente")} className="gap-2">
                <Plus className="w-4 h-4" />
                Crear primer expediente
              </Button>
            </>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filtrados.map(exp => (
            <ExpedienteCard
              key={exp.id}
              exp={exp}
              onEliminar={() => eliminarSrv.mutate({ uuid: exp.id })}
            />
          ))}
        </div>
      )}
    </PageLayout>
  );
}
