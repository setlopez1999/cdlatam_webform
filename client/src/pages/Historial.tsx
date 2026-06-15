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
  FolderOpen, Trash2, Plus, AlertTriangle, Search, ChevronDown, ArchiveX, RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useExpedienteStore } from "@/features/expedientes/store";
import { mapResumenRowToExpediente } from "@/features/expedientes/fromServer";
import type { Expediente } from "@/features/expedientes/types";
import { trpc } from "@/lib/trpc";
import { getMesValue, mesesActivos } from "@/features/expedientes/f1/f1ImplementacionCuotas";
import { calcularResultadoF3 } from "@/features/expedientes/types";
import type { ResumenMeses } from "@/features/expedientes/types";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { PageLayout } from "@/components/PageLayout";
import { formatCurrency, getCurrencyCode } from "@/lib/formatters";

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

function fmtCell(value: number, currencyCode = "USD") {
  if (value === 0) return <span className="text-muted-foreground">–</span>;
  return (
    <span className={value < 0 ? "text-red-400" : ""}>
      {formatCurrency(value, currencyCode)}
    </span>
  );
}

// ─── Tablas de resultados expandibles ────────────────────────────────────────

function ResultadosExpandidos({ exp }: { exp: Expediente }) {
  const tieneF2 = exp.f2.status !== "nuevo";
  if (!tieneF2) return null;

  const f1Guardado = exp.f1.status === "guardado";
  const etiquetaGim = exp.f1.data.sres?.trim() || "GIM";
  const currencyCode = exp.f1.data.moneda || "USD";

  const r = useMemo(
    () => calcularResultadoF3(exp.f2.data, exp.f1.data),
    [exp.f2.data, exp.f1.data],
  );
  const res = r.resumen;
  const meses = mesesActivos(r.nCuotas);
  const colSpanMeses = 1 + meses.length;

  const filasGasto: { label: string; values: ResumenMeses }[] = [
    { label: "Hardware", values: res.hardware },
    { label: "Materiales", values: res.materiales },
    { label: "RH", values: res.rh },
    { label: "Otros", values: res.otros },
  ];

  const filasResultado: { label: string; values: ResumenMeses; bold?: boolean }[] = [
    { label: "Ingreso", values: r.ingreso },
    { label: "Gastos", values: r.gastos },
    { label: "Resultado", values: r.resultado, bold: true },
  ];

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
                {meses.map(mes => (
                  <th key={mes} className="px-3 py-1.5 text-center font-semibold">MES {mes}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filasGasto.map((row, i) => (
                <tr key={row.label} className={cn("border-b border-border/30", i % 2 !== 0 && "bg-muted/10")}>
                  <td className="px-3 py-1.5 font-medium">{row.label}</td>
                  {meses.map(mes => (
                    <td key={mes} className="px-3 py-1.5 text-center">{fmtCell(getMesValue(row.values, mes), currencyCode)}</td>
                  ))}
                </tr>
              ))}
              <tr className="bg-[#00c2b2]/10 border-t border-[#00c2b2]/30">
                <td className="px-3 py-1.5 font-bold">Total Gastos Imputados</td>
                {meses.map(mes => (
                  <td key={mes} className="px-3 py-1.5 text-center font-bold">{fmtCell(getMesValue(res.totalGastos, mes), currencyCode)}</td>
                ))}
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
                {meses.map(mes => (
                  <th key={mes} className="px-3 py-1.5 text-center font-semibold">MES {mes}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filasResultado.map((row, i) => (
                <tr
                  key={row.label}
                  className={cn(
                    "border-b border-border/30",
                    row.bold && "border-b-2 border-[#00c2b2]/30 bg-[#00c2b2]/10",
                    !row.bold && i % 2 !== 0 && "bg-muted/10",
                  )}
                >
                  <td className={cn("px-3 py-1.5", row.bold ? "font-bold" : "font-medium")}>{row.label}</td>
                  <td />
                  {meses.map(mes => (
                    <td key={mes} className={cn("px-3 py-1.5 text-center", row.bold && "font-bold")}>
                      {fmtCell(getMesValue(row.values, mes), currencyCode)}
                    </td>
                  ))}
                </tr>
              ))}
              {f1Guardado && (
                <>
                  <tr className="bg-muted/20">
                    <td colSpan={colSpanMeses} className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Distribución:</td>
                  </tr>
                  <tr className="border-b border-border/30">
                    <td className="px-3 py-1.5 pl-5 font-medium">{etiquetaGim}</td>
                    <td className="px-3 py-1.5 text-center text-muted-foreground">{(r.distribucion.gim.porcentaje * 100).toFixed(0)}%</td>
                    {meses.map(mes => (
                      <td key={mes} className="px-3 py-1.5 text-center">{fmtCell(getMesValue(r.distribucion.gim, mes), currencyCode)}</td>
                    ))}
                  </tr>
                  <tr className="border-b border-border/30 bg-muted/10">
                    <td className="px-3 py-1.5 pl-5 font-medium">GROUPALNET SPA</td>
                    <td className="px-3 py-1.5 text-center text-muted-foreground">{(r.distribucion.gp.porcentaje * 100).toFixed(0)}%</td>
                    {meses.map(mes => (
                      <td key={mes} className="px-3 py-1.5 text-center">{fmtCell(getMesValue(r.distribucion.gp, mes), currencyCode)}</td>
                    ))}
                  </tr>
                </>
              )}
              {!f1Guardado && (
                <tr className="bg-amber-500/5">
                  <td colSpan={colSpanMeses} className="px-3 py-2 text-[11px] text-amber-700/90">
                    Guarde el Acta (F1) para ver la distribución ({etiquetaGim} / GROUPALNET SPA) y la facturación inter-empresa.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Tabla 3: Facturación Inter-Empresa — solo con F1 guardado */}
      {f1Guardado && (
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
                  {meses.map(mes => (
                    <th key={mes} className="px-3 py-1.5 text-center font-semibold">MES {mes}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-border/30">
                  <td className="px-3 py-1.5 font-medium">Bruto</td><td />
                  {meses.map(mes => (
                    <td key={mes} className="px-3 py-1.5 text-center">{fmtCell(getMesValue(r.facturacion.bruto, mes), currencyCode)}</td>
                  ))}
                </tr>
                <tr className="border-b border-border/30 bg-muted/10">
                  <td className="px-3 py-1.5 font-medium">Impuesto</td>
                  <td className="px-3 py-1.5 text-center text-muted-foreground">{r.facturacion.impuesto.tasa.toFixed(2)}</td>
                  {meses.map(mes => (
                    <td key={mes} className="px-3 py-1.5 text-center">{fmtCell(getMesValue(r.facturacion.impuesto, mes), currencyCode)}</td>
                  ))}
                </tr>
                <tr className="bg-[#1a2a3a]/10 border-t border-[#1a2a3a]/20">
                  <td className="px-3 py-1.5 font-bold">Neto</td><td />
                  {meses.map(mes => (
                    <td key={mes} className="px-3 py-1.5 text-center font-bold">{fmtCell(getMesValue(r.facturacion.neto, mes), currencyCode)}</td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Tarjeta de Expediente ────────────────────────────────────────────────────

export function ExpedienteCard({
  exp,
  onEliminar,
  creadorDisplay,
  creadorEliminado,
}: {
  exp: Expediente;
  onEliminar: () => void;
  /** Solo vista workspace admin: etiqueta del usuario creador del expediente */
  creadorDisplay?: string;
  /** true cuando el usuario creador fue eliminado del sistema */
  creadorEliminado?: boolean;
}) {
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
    if (!confirm(`¿Mover "${exp.nombre}" a la papelera?`)) return;
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
            {exp.f1.data.noActa ? <span className="font-mono text-cyan-400/80 font-medium">{exp.f1.data.noActa} · </span> : null}
            {creadorDisplay ? (
              <span className="text-foreground/80">Creador: {creadorDisplay} · </span>
            ) : creadorEliminado ? (
              <span
                className="inline-flex items-center gap-1 mr-1"
                title="El usuario que creó este expediente ya no existe en el sistema"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40 inline-block" />
              </span>
            ) : null}
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
            className="h-7 w-7 text-muted-foreground hover:text-amber-500"
            onClick={handleEliminar}
            title="Mover a papelera"
          >
            <ArchiveX className="w-3.5 h-3.5" />
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
  const { expedientes, eliminar, mergeListaDesdeServidor } = useExpedienteStore();
  const [search, setSearch] = useState("");
  const [verPapelera, setVerPapelera] = useState(false);

  const resumenQuery = trpc.expediente.listarResumen.useQuery(undefined, { staleTime: 0 });
  const papeleraQuery = trpc.expediente.listarPapelera.useQuery(undefined, { staleTime: 0 });

  // Mover a papelera (soft-delete)
  const moverAPapeleraSrv = trpc.expediente.moverAPapelera.useMutation({
    onSuccess: (_data, input) => {
      eliminar(input.id);
      void resumenQuery.refetch();
      void papeleraQuery.refetch();
      toast.success("Expediente movido a la papelera");
    },
    onError: (err) => toast.error(err.message || "No se pudo mover a papelera"),
  });

  // Restaurar desde papelera
  const restaurarSrv = trpc.expediente.restaurarDePapelera.useMutation({
    onSuccess: () => {
      void resumenQuery.refetch();
      void papeleraQuery.refetch();
      toast.success("Expediente restaurado");
    },
    onError: (err) => toast.error(err.message || "No se pudo restaurar"),
  });

  // Eliminar definitivamente
  const eliminarSrv = trpc.expediente.eliminar.useMutation({
    onSuccess: (_data, input) => {
      eliminar(input.id);
      void papeleraQuery.refetch();
      toast.success("Expediente eliminado definitivamente");
    },
    onError: (err) => toast.error(err.message || "No se pudo eliminar"),
  });

  useEffect(() => {
    if (resumenQuery.data) {
      mergeListaDesdeServidor(resumenQuery.data.map(mapResumenRowToExpediente));
    }
  }, [resumenQuery.data, mergeListaDesdeServidor]);

  const filtrados = useMemo(() => {
    if (!search.trim()) return expedientes;
    const q = search.toLowerCase();
    return expedientes.filter(e =>
      e.nombre.toLowerCase().includes(q) ||
      e.f1.data?.razonSocial?.toLowerCase().includes(q) ||
      e.f1.data?.nombreFantasia?.toLowerCase().includes(q)
    );
  }, [expedientes, search]);

  const papelera = papeleraQuery.data ?? [];

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
          <Button
            variant={verPapelera ? "secondary" : "outline"}
            className="gap-2 h-8 text-sm"
            onClick={() => setVerPapelera(v => !v)}
          >
            <Trash2 className="w-3.5 h-3.5" />
            Papelera{papelera.length > 0 ? ` (${papelera.length})` : ""}
          </Button>
          <Button className="gap-2 h-8 text-sm" onClick={() => navigate("/nuevo-expediente")}>
            <Plus className="w-4 h-4" />Nuevo
          </Button>
        </>
      }
    >
      {/* ── Vista Papelera ─────────────────────────────────────────────────── */}
      {verPapelera ? (
        <div className="flex flex-col gap-3">
          {papelera.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
              <Trash2 className="w-10 h-10 text-muted-foreground/30" />
              <p className="text-muted-foreground text-sm">La papelera está vacía.</p>
            </div>
          ) : (
            papelera.map(exp => (
              <div key={exp.id} className="rounded-xl border border-border/60 bg-muted/10 p-4 flex items-center gap-3">
                <ArchiveX className="w-5 h-5 text-muted-foreground/60 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate text-muted-foreground">{exp.nombre}</p>
                  <p className="text-xs text-muted-foreground/60">
                    #{exp.id} · Borrado el{" "}
                    {exp.deletedAt ? new Date(exp.deletedAt * 1000).toLocaleDateString("es-CL") : "—"}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs gap-1"
                    onClick={() => restaurarSrv.mutate({ id: exp.id })}
                    disabled={restaurarSrv.isPending}
                  >
                    <RotateCcw className="w-3 h-3" />Restaurar
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    title="Eliminar definitivamente"
                    onClick={() => {
                      if (!confirm(`¿Eliminar definitivamente "${exp.nombre}"? Esta acción no se puede deshacer.`)) return;
                      eliminarSrv.mutate({ id: exp.id });
                    }}
                    disabled={eliminarSrv.isPending}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        /* ── Vista Normal ──────────────────────────────────────────────────── */
        filtrados.length === 0 ? (
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
                onEliminar={() => moverAPapeleraSrv.mutate({ id: exp.id })}
              />
            ))}
          </div>
        )
      )}
    </PageLayout>
  );
}
