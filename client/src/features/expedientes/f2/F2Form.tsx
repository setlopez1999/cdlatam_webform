/**
 * features/expedientes/f2/F2Form.tsx
 *
 * Formulario F2 — Evaluación de Proyecto.
 * Usa useF2() para leer/escribir en el store y acceder a f1.data del mismo expediente.
 *
 * Para conectar con tRPC en el futuro, modificar solo guardar() en useF2.ts.
 *
 * Reconciliación automática de filas:
 *   Al cambiar nCuotasImpl (derivado de F1), hardware/materiales/RRHH se ajustan
 *   para tener exactamente N filas (una por cuota), con cuota pre-asignada.
 *   Gastos Mensuales también muestra N secciones.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FormSection, PageHeader } from "@/components/FormSection";
import { ClipboardList, Cpu, Package, Users, MoreHorizontal, Save, RefreshCw, Eye, TrendingUp, RotateCcw } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { formatCurrency, getCurrencyCode } from "@/lib/formatters";
import { nanoid } from "nanoid";
import { useF2 } from "./useF2";
import { useNavGuard } from "@/hooks/useNavGuard";
import { UnsavedChangesDialog } from "@/components/UnsavedChangesDialog";
import { F2_INITIAL } from "../types";
import type { FilaCosto, FilaRRHH, FilaOtros } from "../types";
import { F2InfoGeneral, F2CostTable, F2RRHHTable, F2OtrosTable, TotalRow } from "./sections";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function createFilaCosto(cuota?: 1 | 2 | 3 | 4): FilaCosto {
  return { id: nanoid(), centroCosto: "", descripcionGasto: "", valorNeto: 0, cantidad: 1, totalNeto: 0, iva: 0, total: 0, tipoMoneda: "", observacion: "", cuota };
}

function createFilaRRHH(tipo: FilaRRHH["tipo"] = "tecnico_interno", descripcion = "", cuota?: 1 | 2 | 3 | 4): FilaRRHH {
  return { id: nanoid(), tipo, label: "", centroCosto: "", valorSinImpuesto: 0, tipoMoneda: "", cantidad: 1, totalNeto: 0, impuesto: 0, total: 0, descripcionGasto: "", observacion: "", cuota };
}

function createFilaOtros(tipo: FilaOtros["tipo"] = "varios", descripcion = "", mes: 1 | 2 | 3 | 4 = 1): FilaOtros {
  return { id: nanoid(), tipo, label: descripcion, descripcionGasto: descripcion, centroCosto: "", tipoMoneda: "", valorNeto: 0, cantidad: 1, totalNeto: 0, iva: 0, total: 0, observacion: "", mes };
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

function createItemsFijos(mes: 1 | 2 | 3 | 4, moneda = "USD"): FilaOtros[] {
  return ITEMS_FIJOS.map(item => ({ ...createFilaOtros(item.tipo, item.label, mes), tipoMoneda: moneda }));
}

/**
 * Reconcilia un array de filas para que tenga exactamente `n` filas,
 * una por cuota (1..n). Preserva filas existentes por cuota, agrega las
 * que faltan y elimina las que superan n.
 */
function reconcileFilasCosto(rows: FilaCosto[], n: number): FilaCosto[] {
  const result: FilaCosto[] = [];
  for (let c = 1; c <= n; c++) {
    const cuota = c as 1 | 2 | 3 | 4;
    const existing = rows.find(r => r.cuota === cuota);
    result.push(existing ?? createFilaCosto(cuota));
  }
  return result;
}

function reconcileFilasRRHH(rows: FilaRRHH[], n: number): FilaRRHH[] {
  const result: FilaRRHH[] = [];
  for (let c = 1; c <= n; c++) {
    const cuota = c as 1 | 2 | 3 | 4;
    const existing = rows.find(r => r.cuota === cuota);
    result.push(existing ?? createFilaRRHH("tecnico_interno", "", cuota));
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

  // Bloqueo de navegación cuando hay cambios sin guardar.
  const { pendingTo, confirm: confirmNav, cancel: cancelNav } = useNavGuard({
    when: status === "sin_guardar",
  });

  // ── nCuotas desde F1 implementación ─────────────────────────────────────────
  // Toma el nCuotas de la primera fila de formasPagoImplementacion enlazada.
  // Retorna 0 si no hay F1 guardado, para no reconciliar con un valor ficticio.
  const nCuotasImpl: number = (() => {
    const impl = f1Data?.formasPagoImplementacion?.find(fp => fp.linkedServicioId);
    if (impl && impl.nCuotas >= 1) return Math.min(4, Math.max(1, impl.nCuotas));
    return 0; // 0 = sin F1 → no reconciliar
  })();

  // nCuotas efectivo para el CuotaSelect (mínimo 4 si no hay F1)
  const nCuotasDisplay = nCuotasImpl > 0 ? nCuotasImpl : 4;

  // ── Reconciliación automática de filas ────────────────────────────────────
  // Se dispara cuando nCuotasImpl cambia O cuando data pasa de null a disponible.
  // Dependencias: nCuotasImpl + dataReady (booleano) para capturar la carga inicial.
  const dataReady = !!data;
  const prevNCuotas = useRef<number | null>(null);

  useEffect(() => {
    if (!data || nCuotasImpl === 0) return;
    // Reconciliar si nCuotasImpl cambió o si es la primera vez que data está disponible
    if (prevNCuotas.current === nCuotasImpl) return;
    prevNCuotas.current = nCuotasImpl;

    const newHardware   = reconcileFilasCosto(data.hardware,   nCuotasImpl);
    const newMateriales = reconcileFilasCosto(data.materiales, nCuotasImpl);
    const newRRHH       = reconcileFilasRRHH(data.rrhh,        nCuotasImpl);

    // Reconciliar Gastos Mensuales: asegurar que existan ítems para cada cuota
    const monedaGlobal = data.tipoMoneda || "USD";
    let newOtros = [...data.otrosGastos];
    for (let c = 1; c <= nCuotasImpl; c++) {
      const mes = c as 1 | 2 | 3 | 4;
      if (!newOtros.some(o => o.mes === mes)) {
        newOtros = [...newOtros, ...createItemsFijos(mes, monedaGlobal)];
      }
    }
    // Eliminar secciones de meses que ya no aplican
    newOtros = newOtros.filter(o => o.mes <= nCuotasImpl);

    update({
      hardware:   newHardware,
      materiales: newMateriales,
      rrhh:       newRRHH,
      otrosGastos: newOtros,
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nCuotasImpl, dataReady]);

  if (!data) return <div className="p-6 text-muted-foreground">Expediente no encontrado.</div>;

  const monedaGlobal = data.tipoMoneda || "USD";
  const currencyCode = getCurrencyCode(monedaGlobal);
  const fmt = (v: number) => formatCurrency(v, currencyCode);

  // ── Totales ────────────────────────────────────────────────────────────────
  const totalHardware   = data.hardware.reduce((s, r) => s + r.total, 0);
  const totalMateriales = data.materiales.reduce((s, r) => s + r.total, 0);
  const totalRRHH       = data.rrhh.reduce((s, r) => s + r.total, 0);
  const totalOtros      = data.otrosGastos.reduce((s, r) => s + r.total, 0);
  const totalGastos     = totalHardware + totalMateriales + totalRRHH + totalOtros;

  // ── Badge de estado ────────────────────────────────────────────────────────
  const statusBadge = {
    nuevo:       { label: "Nuevo",       className: "bg-slate-50 text-slate-600 border-slate-200" },
    sin_guardar: { label: "Sin guardar", className: "bg-amber-50 text-amber-700 border-amber-200" },
    guardado:    { label: "Guardado",    className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  }[status];

  // ── Hardware ───────────────────────────────────────────────────────────────
  const updateHardwareRow = useCallback((id: string, field: keyof FilaCosto, value: string | number) => {
    update({ hardware: data.hardware.map(r => {
      if (r.id !== id) return r;
      const u = { ...r, [field]: value };
      if (field === "valorNeto" || field === "cantidad") { u.totalNeto = u.valorNeto * u.cantidad; u.total = u.totalNeto + u.iva; }
      if (field === "iva") u.total = u.totalNeto + u.iva;
      return u;
    })});
  }, [data.hardware, update]);

  // ── Materiales ─────────────────────────────────────────────────────────────
  const updateMaterialesRow = useCallback((id: string, field: keyof FilaCosto, value: string | number) => {
    update({ materiales: data.materiales.map(r => {
      if (r.id !== id) return r;
      const u = { ...r, [field]: value };
      if (field === "valorNeto" || field === "cantidad") { u.totalNeto = u.valorNeto * u.cantidad; u.total = u.totalNeto + u.iva; }
      if (field === "iva") u.total = u.totalNeto + u.iva;
      return u;
    })});
  }, [data.materiales, update]);

  // ── RRHH ───────────────────────────────────────────────────────────────────
  const updateRRHHRow = useCallback((id: string, field: keyof FilaRRHH, value: string | number) => {
    update({ rrhh: data.rrhh.map(r => {
      if (r.id !== id) return r;
      const u = { ...r, [field]: value };
      if (field === "valorSinImpuesto" || field === "cantidad") { u.totalNeto = u.valorSinImpuesto * u.cantidad; u.total = u.totalNeto + u.impuesto; }
      if (field === "impuesto") u.total = u.totalNeto + u.impuesto;
      return u;
    })});
  }, [data.rrhh, update]);

  // ── Otros Gastos ───────────────────────────────────────────────────────────
  const updateOtrosRow = useCallback((id: string, field: keyof FilaOtros, value: string | number) => {
    update({ otrosGastos: data.otrosGastos.map(r => {
      if (r.id !== id) return r;
      const u = { ...r, [field]: value };
      if (field === "valorNeto" || field === "cantidad") { u.totalNeto = u.valorNeto * u.cantidad; u.total = u.totalNeto + u.iva; }
      if (field === "iva") u.total = u.totalNeto + u.iva;
      return u;
    })});
  }, [data.otrosGastos, update]);

  const doRegenMes = (mes: 1 | 2 | 3 | 4) => {
    const nuevos = createItemsFijos(mes, monedaGlobal);
    const otros = data.otrosGastos.filter(o => o.mes !== mes);
    update({ otrosGastos: [...otros, ...nuevos] });
    setConfirmRegenMes(null);
    toast.success(`Ítems del Mes ${mes} regenerados`);
  };

  // ── Guardar ────────────────────────────────────────────────────────────────
  const validate = useCallback((): boolean => {
    if (!data.nombreCliente && !data.empresa) {
      toast.error("El nombre del cliente o empresa es requerido");
      return false;
    }
    return true;
  }, [data]);

  const handleSave = useCallback(async () => {
    if (!validate()) return;
    const ok = await guardar();
    if (ok) toast.success("F2 guardado correctamente");
  }, [validate, guardar]);

  const handleNavSave = useCallback(async (): Promise<boolean> => {
    if (!validate()) return false;
    const ok = await guardar();
    if (ok) {
      toast.success("F2 guardado correctamente");
      confirmNav();
    }
    return ok;
  }, [validate, guardar, confirmNav]);

  const handleNavDiscard = useCallback(async () => {
    await descartar();
    toast.info("Cambios descartados");
    confirmNav();
  }, [descartar, confirmNav]);

  const handleReset = useCallback(() => {
    update(F2_INITIAL);
    toast.info("Formulario F2 limpiado");
  }, [update]);

  // ── Cuotas activas (array dinámico 1..nCuotasImpl) ────────────────────────
  const cuotasActivas = Array.from({ length: nCuotasDisplay }, (_, i) => (i + 1) as 1 | 2 | 3 | 4);

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
            { label: "Hardware",     value: totalHardware },
            { label: "Materiales",   value: totalMateriales },
            { label: "RRHH",         value: totalRRHH },
            { label: "Otros",        value: totalOtros },
            { label: "TOTAL",        value: totalGastos, bold: true },
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
          paises: catalogs?.paises as any,
          plazos: catalogs?.plazos as any,
          cecos: catalogs?.cecos as any,
        }}
        f1Suggestions={f1Suggestions}
        onImportarDesdeF1={importarDesdeF1}
      />

      {/* Hardware */}
      <FormSection title="Hardware" icon={Cpu} accent="violet" collapsible defaultOpen badge={fmt(totalHardware)}>
        <F2CostTable
          rows={data.hardware} catalogs={catalogs}
          onUpdate={updateHardwareRow}
          onAdd={() => {
            const nextCuota = (data.hardware.length + 1) as 1 | 2 | 3 | 4;
            update({ hardware: [...data.hardware, createFilaCosto(nextCuota <= nCuotasDisplay ? nextCuota : undefined)] });
          }}
          onRemove={id => update({ hardware: data.hardware.filter(r => r.id !== id) })}
          total={totalHardware}
          valueLabel="Valor Neto U." valueField="valorNeto"
          taxLabel="IVA" taxField="iva"
          fmt={fmt}
          nCuotas={nCuotasDisplay}
        />
      </FormSection>

      {/* Materiales */}
      <FormSection title="Materiales" icon={Package} accent="violet" collapsible defaultOpen badge={fmt(totalMateriales)}>
        <F2CostTable
          rows={data.materiales} catalogs={catalogs}
          onUpdate={updateMaterialesRow}
          onAdd={() => {
            const nextCuota = (data.materiales.length + 1) as 1 | 2 | 3 | 4;
            update({ materiales: [...data.materiales, createFilaCosto(nextCuota <= nCuotasDisplay ? nextCuota : undefined)] });
          }}
          onRemove={id => update({ materiales: data.materiales.filter(r => r.id !== id) })}
          total={totalMateriales}
          valueLabel="Valor Neto U." valueField="valorNeto"
          taxLabel="IVA" taxField="iva"
          fmt={fmt}
          nCuotas={nCuotasDisplay}
        />
      </FormSection>

      {/* RRHH */}
      <FormSection title="RRHH — Recursos Humanos" icon={Users} accent="violet" collapsible defaultOpen badge={fmt(totalRRHH)}>
        <F2RRHHTable
          rows={data.rrhh} catalogs={catalogs}
          onUpdate={updateRRHHRow}
          onAdd={() => {
            const nextCuota = (data.rrhh.length + 1) as 1 | 2 | 3 | 4;
            update({ rrhh: [...data.rrhh, createFilaRRHH("tecnico_interno", "", nextCuota <= nCuotasDisplay ? nextCuota : undefined)] });
          }}
          onRemove={id => update({ rrhh: data.rrhh.filter(r => r.id !== id) })}
          total={totalRRHH} fmt={fmt}
          nCuotas={nCuotasDisplay}
        />
      </FormSection>

      {/* Otros Gastos — secciones dinámicas según nCuotasImpl */}
      <FormSection title="Otros Gastos" icon={MoreHorizontal} accent="violet" collapsible defaultOpen badge={fmt(totalOtros)}>
        <div className="space-y-6">
          {cuotasActivas.map(mes => {
            const mesFiltrado = data.otrosGastos.filter(o => o.mes === mes);
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
                        <Button size="sm" variant="destructive" className="h-6 text-xs px-2" onClick={() => doRegenMes(mes)}>
                          Sí
                        </Button>
                        <Button size="sm" variant="outline" className="h-6 text-xs px-2" onClick={() => setConfirmRegenMes(null)}>
                          No
                        </Button>
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
                  onAdd={() => update({ otrosGastos: [...data.otrosGastos, createFilaOtros("varios", "Varios", mes)] })}
                  onRemove={id => update({ otrosGastos: data.otrosGastos.filter(r => r.id !== id) })}
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
          <TrendingUp className="w-4 h-4 text-violet-500" />
          Resumen de Costos
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
