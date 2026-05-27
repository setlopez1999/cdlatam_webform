/**
 * features/expedientes/f2/F2Form.tsx
 *
 * Formulario F2 — Evaluación de Proyecto.
 *
 * Derivación pura de filas:
 *   Las tablas de Hardware, Materiales, RRHH y Otros Gastos se derivan en cada
 *   render combinando lo que el usuario guardó en el store con nCuotasImpl (de F1).
 *   No se usa useEffect ni useRef para reconciliar — cero renders extra.
 *
 *   store.hardware  +  nCuotasImpl  →  hardwareRows  (para render y para guardar)
 */
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FormSection, PageHeader } from "@/components/FormSection";
import {
  ClipboardList, Cpu, Package, Users, MoreHorizontal,
  Save, RefreshCw, Eye, TrendingUp, RotateCcw,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { formatCurrency, getCurrencyCode } from "@/lib/formatters";
import { nanoid } from "nanoid";
import { useF2 } from "./useF2";
import { useNavGuard } from "@/hooks/useNavGuard";
import { UnsavedChangesDialog } from "@/components/UnsavedChangesDialog";
import { F2_INITIAL } from "../types";
import type { FilaCosto, FilaRRHH, FilaOtros } from "../types";
import { F2InfoGeneral, F2CostTable, F2RRHHTable, F2OtrosTable } from "./sections";

// ─── Helpers de creación ──────────────────────────────────────────────────────

function newFilaCosto(cuota: 1 | 2 | 3 | 4): FilaCosto {
  return {
    id: nanoid(), centroCosto: "", descripcionGasto: "",
    valorNeto: 0, cantidad: 1, totalNeto: 0, iva: 0, total: 0,
    tipoMoneda: "", observacion: "", cuota,
  };
}

function newFilaRRHH(cuota: 1 | 2 | 3 | 4): FilaRRHH {
  return {
    id: nanoid(), tipo: "tecnico_interno", label: "", centroCosto: "",
    valorSinImpuesto: 0, tipoMoneda: "", cantidad: 1, totalNeto: 0,
    impuesto: 0, total: 0, descripcionGasto: "", observacion: "", cuota,
  };
}

function newFilaOtros(tipo: FilaOtros["tipo"], label: string, mes: 1 | 2 | 3 | 4, moneda = "USD"): FilaOtros {
  return {
    id: nanoid(), tipo, label, descripcionGasto: label, centroCosto: "",
    tipoMoneda: moneda, valorNeto: 0, cantidad: 1, totalNeto: 0,
    iva: 0, total: 0, observacion: "", mes,
  };
}

const ITEMS_FIJOS: Array<{ tipo: FilaOtros["tipo"]; label: string }> = [
  { tipo: "comision",     label: "Comisión" },
  { tipo: "movilizacion", label: "Movilización" },
  { tipo: "viatico",      label: "Viático" },
  { tipo: "movilizacion", label: "Movilización" },
  { tipo: "viatico",      label: "Viático" },
  { tipo: "movilizacion", label: "Movilización" },
  { tipo: "alojamiento",  label: "Alojamiento" },
  { tipo: "varios",       label: "Varios" },
];

// ─── Funciones de derivación pura ─────────────────────────────────────────────
//
// Reciben lo que hay en el store + nCuotas de F1.
// Devuelven exactamente N filas: preservan las existentes por cuota,
// crean vacías para las que faltan. Sin efectos secundarios.

function deriveFilasCosto(stored: FilaCosto[], n: number): FilaCosto[] {
  return Array.from({ length: n }, (_, i) => {
    const cuota = (i + 1) as 1 | 2 | 3 | 4;
    return stored.find(r => r.cuota === cuota) ?? newFilaCosto(cuota);
  });
}

function deriveFilasRRHH(stored: FilaRRHH[], n: number): FilaRRHH[] {
  return Array.from({ length: n }, (_, i) => {
    const cuota = (i + 1) as 1 | 2 | 3 | 4;
    return stored.find(r => r.cuota === cuota) ?? newFilaRRHH(cuota);
  });
}

function deriveFilasOtros(stored: FilaOtros[], n: number, moneda: string): FilaOtros[] {
  const result: FilaOtros[] = [];
  for (let i = 1; i <= n; i++) {
    const mes = i as 1 | 2 | 3 | 4;
    const existentes = stored.filter(o => o.mes === mes);
    if (existentes.length > 0) {
      result.push(...existentes);
    } else {
      result.push(...ITEMS_FIJOS.map(item => newFilaOtros(item.tipo, item.label, mes, moneda)));
    }
  }
  return result;
}

// ─── Componente ───────────────────────────────────────────────────────────────

interface Props {
  expedienteId: string;
  onVerResultado?: () => void;
}

export default function F2Form({ expedienteId, onVerResultado }: Props) {
  const { data, status, f1Data, f1Suggestions, update, guardar, descartar, importarDesdeF1, isSyncing } = useF2(expedienteId);
  const { data: catalogs } = trpc.catalogs.getAll.useQuery();
  const [confirmRegenMes, setConfirmRegenMes] = useState<1 | 2 | 3 | 4 | null>(null);

  const { pendingTo, confirm: confirmNav, cancel: cancelNav } = useNavGuard({
    when: status === "sin_guardar",
  });

  if (!data) return <div className="p-6 text-muted-foreground">Expediente no encontrado.</div>;

  // ── nCuotas desde F1 ────────────────────────────────────────────────────────
  // Si no hay F1 guardado → 4 (el usuario puede llenar libremente hasta 4 cuotas).
  const nCuotas: number = (() => {
    const impl = f1Data?.formasPagoImplementacion?.find(fp => fp.linkedServicioId);
    if (impl && impl.nCuotas >= 1) return Math.min(4, Math.max(1, impl.nCuotas));
    return 4;
  })();

  const moneda = data.tipoMoneda || "USD";
  const currencyCode = getCurrencyCode(moneda);
  const fmt = (v: number) => formatCurrency(v, currencyCode);

  // ── Derivación pura de filas ─────────────────────────────────────────────────
  // Se recalcula en cada render. Sin efectos secundarios ni renders extra.
  const hardwareRows   = deriveFilasCosto(data.hardware,   nCuotas);
  const materialesRows = deriveFilasCosto(data.materiales, nCuotas);
  const rrhhRows       = deriveFilasRRHH(data.rrhh,        nCuotas);
  const otrosRows      = deriveFilasOtros(data.otrosGastos, nCuotas, moneda);
  const cuotasActivas  = Array.from({ length: nCuotas }, (_, i) => (i + 1) as 1 | 2 | 3 | 4);

  // ── Totales ────────────────────────────────────────────────────────────────
  const totalHardware   = hardwareRows.reduce((s, r) => s + r.total, 0);
  const totalMateriales = materialesRows.reduce((s, r) => s + r.total, 0);
  const totalRRHH       = rrhhRows.reduce((s, r) => s + r.total, 0);
  const totalOtros      = otrosRows.reduce((s, r) => s + r.total, 0);
  const totalGastos     = totalHardware + totalMateriales + totalRRHH + totalOtros;

  // ── Badge de estado ────────────────────────────────────────────────────────
  const statusBadge = {
    nuevo:       { label: "Nuevo",       className: "bg-slate-50 text-slate-600 border-slate-200" },
    sin_guardar: { label: "Sin guardar", className: "bg-amber-50 text-amber-700 border-amber-200" },
    guardado:    { label: "Guardado",    className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  }[status];

  // ── Handlers de actualización ─────────────────────────────────────────────
  // Operan sobre las filas derivadas y persisten al store.

  const updateHardwareRow = useCallback((id: string, field: keyof FilaCosto, value: string | number) => {
    const rows = deriveFilasCosto(data.hardware, nCuotas).map(r => {
      if (r.id !== id) return r;
      const u = { ...r, [field]: value };
      if (field === "valorNeto" || field === "cantidad") { u.totalNeto = u.valorNeto * u.cantidad; u.total = u.totalNeto + u.iva; }
      if (field === "iva") u.total = u.totalNeto + u.iva;
      return u;
    });
    update({ hardware: rows });
  }, [data.hardware, nCuotas, update]);

  const updateMaterialesRow = useCallback((id: string, field: keyof FilaCosto, value: string | number) => {
    const rows = deriveFilasCosto(data.materiales, nCuotas).map(r => {
      if (r.id !== id) return r;
      const u = { ...r, [field]: value };
      if (field === "valorNeto" || field === "cantidad") { u.totalNeto = u.valorNeto * u.cantidad; u.total = u.totalNeto + u.iva; }
      if (field === "iva") u.total = u.totalNeto + u.iva;
      return u;
    });
    update({ materiales: rows });
  }, [data.materiales, nCuotas, update]);

  const updateRRHHRow = useCallback((id: string, field: keyof FilaRRHH, value: string | number) => {
    const rows = deriveFilasRRHH(data.rrhh, nCuotas).map(r => {
      if (r.id !== id) return r;
      const u = { ...r, [field]: value };
      if (field === "valorSinImpuesto" || field === "cantidad") { u.totalNeto = u.valorSinImpuesto * u.cantidad; u.total = u.totalNeto + u.impuesto; }
      if (field === "impuesto") u.total = u.totalNeto + u.impuesto;
      return u;
    });
    update({ rrhh: rows });
  }, [data.rrhh, nCuotas, update]);

  const updateOtrosRow = useCallback((id: string, field: keyof FilaOtros, value: string | number) => {
    const rows = deriveFilasOtros(data.otrosGastos, nCuotas, moneda).map(r => {
      if (r.id !== id) return r;
      const u = { ...r, [field]: value };
      if (field === "valorNeto" || field === "cantidad") { u.totalNeto = u.valorNeto * u.cantidad; u.total = u.totalNeto + u.iva; }
      if (field === "iva") u.total = u.totalNeto + u.iva;
      return u;
    });
    update({ otrosGastos: rows });
  }, [data.otrosGastos, nCuotas, moneda, update]);

  const doRegenMes = (mes: 1 | 2 | 3 | 4) => {
    const sin = data.otrosGastos.filter(o => o.mes !== mes);
    const nuevos = ITEMS_FIJOS.map(item => newFilaOtros(item.tipo, item.label, mes, moneda));
    update({ otrosGastos: [...sin, ...nuevos] });
    setConfirmRegenMes(null);
    toast.success(`Ítems de la Cuota ${mes} regenerados`);
  };

  // ── Guardar ────────────────────────────────────────────────────────────────
  // Persiste las filas derivadas al store antes de guardar.
  const flushDerived = useCallback(() => {
    update({
      hardware:    hardwareRows,
      materiales:  materialesRows,
      rrhh:        rrhhRows,
      otrosGastos: otrosRows,
    });
  }, [hardwareRows, materialesRows, rrhhRows, otrosRows, update]);

  const validate = useCallback((): boolean => {
    if (!data.nombreCliente && !data.empresa) {
      toast.error("El nombre del cliente o empresa es requerido");
      return false;
    }
    return true;
  }, [data]);

  const handleSave = useCallback(async () => {
    if (!validate()) return;
    flushDerived();
    const ok = await guardar();
    if (ok) toast.success("F2 guardado correctamente");
  }, [validate, flushDerived, guardar]);

  const handleNavSave = useCallback(async (): Promise<boolean> => {
    if (!validate()) return false;
    flushDerived();
    const ok = await guardar();
    if (ok) { toast.success("F2 guardado correctamente"); confirmNav(); }
    return ok;
  }, [validate, flushDerived, guardar, confirmNav]);

  const handleNavDiscard = useCallback(async () => {
    await descartar();
    toast.info("Cambios descartados");
    confirmNav();
  }, [descartar, confirmNav]);

  const handleReset = useCallback(() => {
    update(F2_INITIAL);
    toast.info("Formulario F2 limpiado");
  }, [update]);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6" translate="no">
      <PageHeader
        title="Evaluación de Proyecto"
        subtitle="Formulario 2 — Desglose detallado de costos por categoría"
        badge="F2"
        badgeColor="bg-violet-50 text-violet-700 border-violet-200"
        icon={ClipboardList}
        actions={
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={`text-xs ${statusBadge.className}`}>
              {statusBadge.label}
            </Badge>
            {onVerResultado && (
              <Button variant="outline" size="sm" onClick={onVerResultado}>
                <Eye className="w-3.5 h-3.5 mr-1.5" /> Ver Resultado
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={handleReset}>
              <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Limpiar
            </Button>
            <Button size="sm" onClick={handleSave} disabled={isSyncing}>
              <Save className="w-3.5 h-3.5 mr-1.5" /> {isSyncing ? "Guardando..." : "Guardar"}
            </Button>
          </div>
        }
      />

      {/* Live Preview Banner */}
      <div className="bg-violet-50 border border-violet-200 rounded-xl p-3 flex items-center gap-3">
        <div className="w-7 h-7 bg-violet-100 rounded-lg flex items-center justify-center flex-shrink-0">
          <TrendingUp className="w-3.5 h-3.5 text-violet-600" />
        </div>
        <div className="flex-1 grid grid-cols-2 md:grid-cols-5 gap-2 text-xs">
          {[
            { label: "Hardware",   value: totalHardware },
            { label: "Materiales", value: totalMateriales },
            { label: "RRHH",       value: totalRRHH },
            { label: "Otros",      value: totalOtros },
            { label: "TOTAL",      value: totalGastos, bold: true },
          ].map((item, i) => (
            <div key={i} className="text-center">
              <p className="text-muted-foreground">{item.label}</p>
              <p className={`font-mono font-bold ${item.bold ? "text-violet-700" : "text-foreground"}`}>
                {fmt(item.value)}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Información General */}
      <F2InfoGeneral
        data={data} onUpdate={update}
        catalogs={{
          monedas: catalogs?.monedas as any,
          paises:  catalogs?.paises  as any,
          plazos:  catalogs?.plazos  as any,
          cecos:   catalogs?.cecos   as any,
        }}
        f1Suggestions={f1Suggestions}
        onImportarDesdeF1={importarDesdeF1}
      />

      {/* Hardware */}
      <FormSection title="Hardware" icon={Cpu} accent="violet" collapsible defaultOpen badge={fmt(totalHardware)}>
        <F2CostTable
          rows={hardwareRows} catalogs={catalogs}
          onUpdate={updateHardwareRow}
          onAdd={() => update({ hardware: [...hardwareRows, newFilaCosto((hardwareRows.length + 1) as 1 | 2 | 3 | 4)] })}
          onRemove={id => update({ hardware: hardwareRows.filter(r => r.id !== id) })}
          total={totalHardware}
          valueLabel="Valor Neto U." valueField="valorNeto"
          taxLabel="IVA" taxField="iva"
          fmt={fmt} nCuotas={nCuotas}
        />
      </FormSection>

      {/* Materiales */}
      <FormSection title="Materiales" icon={Package} accent="violet" collapsible defaultOpen badge={fmt(totalMateriales)}>
        <F2CostTable
          rows={materialesRows} catalogs={catalogs}
          onUpdate={updateMaterialesRow}
          onAdd={() => update({ materiales: [...materialesRows, newFilaCosto((materialesRows.length + 1) as 1 | 2 | 3 | 4)] })}
          onRemove={id => update({ materiales: materialesRows.filter(r => r.id !== id) })}
          total={totalMateriales}
          valueLabel="Valor Neto U." valueField="valorNeto"
          taxLabel="IVA" taxField="iva"
          fmt={fmt} nCuotas={nCuotas}
        />
      </FormSection>

      {/* RRHH */}
      <FormSection title="RRHH — Recursos Humanos" icon={Users} accent="violet" collapsible defaultOpen badge={fmt(totalRRHH)}>
        <F2RRHHTable
          rows={rrhhRows} catalogs={catalogs}
          onUpdate={updateRRHHRow}
          onAdd={() => update({ rrhh: [...rrhhRows, newFilaRRHH((rrhhRows.length + 1) as 1 | 2 | 3 | 4)] })}
          onRemove={id => update({ rrhh: rrhhRows.filter(r => r.id !== id) })}
          total={totalRRHH} fmt={fmt} nCuotas={nCuotas}
        />
      </FormSection>

      {/* Otros Gastos — secciones dinámicas según nCuotas */}
      <FormSection title="Otros Gastos" icon={MoreHorizontal} accent="violet" collapsible defaultOpen badge={fmt(totalOtros)}>
        <div className="space-y-6">
          {cuotasActivas.map(mes => {
            const mesFiltrado = otrosRows.filter(o => o.mes === mes);
            const totalMes = mesFiltrado.reduce((s, r) => s + r.total, 0);
            return (
              <div key={mes}>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Gastos Cuota {mes}
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-muted-foreground">{fmt(totalMes)}</span>
                    {confirmRegenMes === mes ? (
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-amber-600 font-medium">¿Borrar y regenerar?</span>
                        <Button size="sm" variant="destructive" className="h-6 text-xs px-2" onClick={() => doRegenMes(mes)}>Sí</Button>
                        <Button size="sm" variant="outline"     className="h-6 text-xs px-2" onClick={() => setConfirmRegenMes(null)}>No</Button>
                      </div>
                    ) : (
                      <Button size="sm" variant="outline" className="h-6 text-xs px-2 gap-1"
                        onClick={() => {
                          const tieneData = mesFiltrado.some(r => r.valorNeto > 0 || r.iva > 0 || r.descripcionGasto);
                          tieneData ? setConfirmRegenMes(mes) : doRegenMes(mes);
                        }}>
                        <RotateCcw className="w-3 h-3" /> Regenerar ítems
                      </Button>
                    )}
                  </div>
                </div>
                <F2OtrosTable
                  rows={mesFiltrado} catalogs={catalogs}
                  onUpdate={updateOtrosRow}
                  onAdd={() => update({ otrosGastos: [...otrosRows, newFilaOtros("varios", "Varios", mes, moneda)] })}
                  onRemove={id => update({ otrosGastos: otrosRows.filter(r => r.id !== id) })}
                  total={totalMes} fmt={fmt}
                />
              </div>
            );
          })}
        </div>
      </FormSection>

      {/* Resumen Total */}
      <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-violet-500" /> Resumen de Costos
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { label: "Hardware",     value: totalHardware,   color: "text-blue-600" },
            { label: "Materiales",   value: totalMateriales, color: "text-indigo-600" },
            { label: "RRHH",         value: totalRRHH,       color: "text-violet-600" },
            { label: "Otros",        value: totalOtros,      color: "text-purple-600" },
            { label: "TOTAL GASTOS", value: totalGastos,     color: "text-foreground", bold: true },
          ].map((item, i) => (
            <div key={i} className={`p-3 rounded-lg ${item.bold ? "bg-violet-50 border border-violet-200" : "bg-muted/50 border border-border/40"}`}>
              <p className="text-xs text-muted-foreground">{item.label}</p>
              <p className={`text-sm font-bold font-mono mt-1 ${item.color}`}>{fmt(item.value)}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="flex justify-end gap-3 pb-6">
        <Button variant="outline" onClick={handleReset}>
          <RefreshCw className="w-4 h-4 mr-2" /> Limpiar
        </Button>
        {onVerResultado && (
          <Button variant="outline" onClick={onVerResultado}>
            <Eye className="w-4 h-4 mr-2" /> Ver Resultado F3
          </Button>
        )}
        <Button onClick={handleSave} disabled={isSyncing}>
          <Save className="w-4 h-4 mr-2" /> {isSyncing ? "Guardando..." : "Guardar F2"}
        </Button>
      </div>

      <UnsavedChangesDialog
        open={pendingTo !== null}
        formLabel="F2"
        onSave={handleNavSave}
        onDiscard={handleNavDiscard}
        onCancel={cancelNav}
      />
    </div>
  );
}
