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
 *   store.hardware  +  nCuotasImpl  →  hardwareRows  (vista agrupada por cuota; guardar usa store)
 */
import { useCallback, useMemo, useState } from "react";
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
import { useF2 } from "./useF2";
import { useNavGuard } from "@/hooks/useNavGuard";
import { UnsavedChangesDialog } from "@/components/UnsavedChangesDialog";
import { F2_INITIAL } from "../types";
import type { FilaCosto, FilaRRHH, FilaOtros } from "../types";
import type { Cuota } from "./f2RowDerivation";
import {
  deriveFilasCosto,
  deriveFilasRRHH,
  deriveFilasOtros,
  appendCostoAtCuota,
  appendRRHHAtCuota,
  newFilaOtros,
  removeRowById,
  updateCostRowInList,
  updateRRHHRowInList,
  updateOtrosRowInList,
  ITEMS_FIJOS,
} from "./f2RowDerivation";
import { getNCuotasImplementacion } from "../f1/f1ImplementacionCuotas";
import { F2InfoGeneral, F2CostTable, F2RRHHTable, F2OtrosTable } from "./sections";

// ─── Componente ───────────────────────────────────────────────────────────────

interface Props {
  expedienteId: number;
  onVerResultado?: () => void;
}

export default function F2Form({ expedienteId, onVerResultado }: Props) {
  const { data, status, f1Data, f1Suggestions, update, guardar, descartar, importarDesdeF1, isSyncing } = useF2(expedienteId);
  const { data: catalogs } = trpc.catalogs.getAll.useQuery();
  const [confirmRegenMes, setConfirmRegenMes] = useState<Cuota | null>(null);

  const { pendingTo, confirm: confirmNav, cancel: cancelNav } = useNavGuard({
    when: status === "sin_guardar",
  });

  const nCuotas = useMemo(() => getNCuotasImplementacion(f1Data), [f1Data]);

  const moneda = data?.tipoMoneda || "USD";
  const currencyCode = getCurrencyCode(moneda);
  const fmt = useCallback((v: number) => formatCurrency(v, currencyCode), [currencyCode]);

  const hardwareRows = useMemo(
    () => deriveFilasCosto(data?.hardware ?? [], nCuotas),
    [data?.hardware, nCuotas],
  );
  const materialesRows = useMemo(
    () => deriveFilasCosto(data?.materiales ?? [], nCuotas),
    [data?.materiales, nCuotas],
  );
  const rrhhRows = useMemo(
    () => deriveFilasRRHH(data?.rrhh ?? [], nCuotas),
    [data?.rrhh, nCuotas],
  );
  const otrosRows = useMemo(
    () => deriveFilasOtros(data?.otrosGastos ?? [], nCuotas, moneda),
    [data?.otrosGastos, nCuotas, moneda],
  );
  const cuotasActivas = useMemo(
    () => Array.from({ length: nCuotas }, (_, i) => (i + 1) as Cuota),
    [nCuotas],
  );

  const totalHardware = useMemo(
    () => hardwareRows.reduce((s, r) => s + r.total, 0),
    [hardwareRows],
  );
  const totalMateriales = useMemo(
    () => materialesRows.reduce((s, r) => s + r.total, 0),
    [materialesRows],
  );
  const totalRRHH = useMemo(
    () => rrhhRows.reduce((s, r) => s + r.total, 0),
    [rrhhRows],
  );
  const totalOtros = useMemo(
    () => otrosRows.reduce((s, r) => s + r.total, 0),
    [otrosRows],
  );
  const totalGastos = totalHardware + totalMateriales + totalRRHH + totalOtros;

  const otrosPorCuota = useMemo(
    () => cuotasActivas.map(mes => {
      const rows = otrosRows.filter(o => o.mes === mes);
      return { mes, rows, total: rows.reduce((s, r) => s + r.total, 0) };
    }),
    [otrosRows, cuotasActivas],
  );

  const catalogsInfo = useMemo(
    () => ({
      monedas: catalogs?.monedas as { value: string; label: string }[] | undefined,
      paises: catalogs?.paises as { value: string; label: string }[] | undefined,
      plazos: catalogs?.plazos as { value: string; label: string }[] | undefined,
      cecos: catalogs?.cecos as { value: string; label: string }[] | undefined,
      nombres: catalogs?.nombres as { value: string; label: string }[] | undefined,
    }),
    [catalogs?.monedas, catalogs?.paises, catalogs?.plazos, catalogs?.cecos, catalogs?.nombres],
  );

  const catalogsTable = useMemo(
    () => ({ cecos: catalogs?.cecos }),
    [catalogs?.cecos],
  );

  const updateHardwareRow = useCallback((id: string, field: keyof FilaCosto, value: string | number) => {
    if (!data) return;
    update({ hardware: updateCostRowInList(data.hardware, nCuotas, id, field, value) });
  }, [data, nCuotas, update]);

  const updateMaterialesRow = useCallback((id: string, field: keyof FilaCosto, value: string | number) => {
    if (!data) return;
    update({ materiales: updateCostRowInList(data.materiales, nCuotas, id, field, value) });
  }, [data, nCuotas, update]);

  const updateRRHHRow = useCallback((id: string, field: keyof FilaRRHH, value: string | number) => {
    if (!data) return;
    update({ rrhh: updateRRHHRowInList(data.rrhh, nCuotas, id, field, value) });
  }, [data, nCuotas, update]);

  const updateOtrosRow = useCallback((id: string, field: keyof FilaOtros, value: string | number) => {
    if (!data) return;
    update({ otrosGastos: updateOtrosRowInList(data.otrosGastos, nCuotas, moneda, id, field, value) });
  }, [data, nCuotas, moneda, update]);

  const addHardwareAtCuota = useCallback((cuota: Cuota) => {
    if (!data) return;
    update({ hardware: appendCostoAtCuota(data.hardware, cuota) });
  }, [data, update]);

  const removeHardwareRow = useCallback((id: string) => {
    if (!data) return;
    update({ hardware: removeRowById(data.hardware, id) });
  }, [data, update]);

  const addMaterialesAtCuota = useCallback((cuota: Cuota) => {
    if (!data) return;
    update({ materiales: appendCostoAtCuota(data.materiales, cuota) });
  }, [data, update]);

  const removeMaterialesRow = useCallback((id: string) => {
    if (!data) return;
    update({ materiales: removeRowById(data.materiales, id) });
  }, [data, update]);

  const addRRHHAtCuota = useCallback((cuota: Cuota) => {
    if (!data) return;
    update({ rrhh: appendRRHHAtCuota(data.rrhh, cuota) });
  }, [data, update]);

  const removeRRHHRow = useCallback((id: string) => {
    if (!data) return;
    update({ rrhh: removeRowById(data.rrhh, id) });
  }, [data, update]);

  const addOtrosRow = useCallback((mes: Cuota) => {
    if (!data) return;
    update({ otrosGastos: [...data.otrosGastos, newFilaOtros("varios", "Varios", mes, moneda)] });
  }, [data, moneda, update]);

  const removeOtrosRow = useCallback((id: string) => {
    if (!data) return;
    update({ otrosGastos: removeRowById(data.otrosGastos, id) });
  }, [data, update]);

  const doRegenMes = useCallback((mes: Cuota) => {
    if (!data) return;
    const sin = data.otrosGastos.filter(o => o.mes !== mes);
    const nuevos = ITEMS_FIJOS.map(item => newFilaOtros(item.tipo, item.label, mes, moneda));
    update({ otrosGastos: [...sin, ...nuevos] });
    setConfirmRegenMes(null);
    toast.success(`Ítems de la Cuota ${mes} regenerados`);
  }, [data, moneda, update]);

  const validate = useCallback((): boolean => {
    if (!data?.nombreCliente && !data?.empresa) {
      toast.error("El nombre del cliente o empresa es requerido");
      return false;
    }
    return true;
  }, [data?.nombreCliente, data?.empresa]);

  const handleSave = useCallback(async () => {
    if (!data || !validate()) return;
    const ok = await guardar({
      hardware: data.hardware,
      materiales: data.materiales,
      rrhh: data.rrhh,
      otrosGastos: otrosRows,
    });
    if (ok) toast.success("F2 guardado correctamente");
  }, [validate, guardar, data, otrosRows]);

  const handleNavSave = useCallback(async (): Promise<boolean> => {
    if (!data || !validate()) return false;
    const ok = await guardar({
      hardware: data.hardware,
      materiales: data.materiales,
      rrhh: data.rrhh,
      otrosGastos: otrosRows,
    });
    if (ok) { toast.success("F2 guardado correctamente"); confirmNav(); }
    return ok;
  }, [validate, guardar, data, otrosRows, confirmNav]);

  const handleNavDiscard = useCallback(async () => {
    await descartar();
    toast.info("Cambios descartados");
    confirmNav();
  }, [descartar, confirmNav]);

  const handleReset = useCallback(() => {
    update(F2_INITIAL);
    toast.info("Formulario F2 limpiado");
  }, [update]);

  if (!data) return <div className="p-6 text-muted-foreground">Expediente no encontrado.</div>;

  const statusBadge = {
    nuevo:       { label: "Nuevo",       className: "bg-slate-50 text-slate-600 border-slate-200" },
    sin_guardar: { label: "Sin guardar", className: "bg-amber-50 text-amber-700 border-amber-200" },
    guardado:    { label: "Guardado",    className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  }[status];

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

      <F2InfoGeneral
        data={data}
        onUpdate={update}
        catalogs={catalogsInfo}
        f1Suggestions={f1Suggestions}
        onImportarDesdeF1={importarDesdeF1}
      />

      <FormSection title="Hardware" icon={Cpu} accent="violet" collapsible defaultOpen badge={fmt(totalHardware)}>
        <F2CostTable
          rows={hardwareRows}
          catalogs={catalogsInfo}
          onUpdate={updateHardwareRow}
          onAddCuota={addHardwareAtCuota}
          onRemove={removeHardwareRow}
          total={totalHardware}
          valueLabel="Valor Neto U."
          valueField="valorNeto"
          taxLabel="IVA"
          taxField="iva"
          fmt={fmt}
          nCuotas={nCuotas}
        />
      </FormSection>

      <FormSection title="Materiales" icon={Package} accent="violet" collapsible defaultOpen badge={fmt(totalMateriales)}>
        <F2CostTable
          rows={materialesRows}
          catalogs={catalogsInfo}
          onUpdate={updateMaterialesRow}
          onAddCuota={addMaterialesAtCuota}
          onRemove={removeMaterialesRow}
          total={totalMateriales}
          valueLabel="Valor Neto U."
          valueField="valorNeto"
          taxLabel="IVA"
          taxField="iva"
          fmt={fmt}
          nCuotas={nCuotas}
        />
      </FormSection>

      <FormSection title="RRHH — Recursos Humanos" icon={Users} accent="violet" collapsible defaultOpen badge={fmt(totalRRHH)}>
        <F2RRHHTable
          rows={rrhhRows}
          catalogs={catalogsInfo}
          onUpdate={updateRRHHRow}
          onAddCuota={addRRHHAtCuota}
          onRemove={removeRRHHRow}
          total={totalRRHH}
          fmt={fmt}
          nCuotas={nCuotas}
        />
      </FormSection>

      <FormSection title="Otros Gastos" icon={MoreHorizontal} accent="violet" collapsible defaultOpen badge={fmt(totalOtros)}>
        <div className="space-y-6">
          {otrosPorCuota.map(({ mes, rows: mesFiltrado, total: totalMes }) => (
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
                      <Button size="sm" variant="outline" className="h-6 text-xs px-2" onClick={() => setConfirmRegenMes(null)}>No</Button>
                    </div>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-6 text-xs px-2 gap-1"
                      onClick={() => {
                        const tieneData = mesFiltrado.some(r => r.valorNeto > 0 || r.iva > 0 || r.descripcionGasto);
                        tieneData ? setConfirmRegenMes(mes) : doRegenMes(mes);
                      }}
                    >
                      <RotateCcw className="w-3 h-3" /> Regenerar ítems
                    </Button>
                  )}
                </div>
              </div>
              <F2OtrosTable
                rows={mesFiltrado}
                catalogs={catalogsInfo}
                onUpdate={updateOtrosRow}
                onAdd={() => addOtrosRow(mes)}
                onRemove={removeOtrosRow}
                total={totalMes}
                fmt={fmt}
                cuotaMes={mes}
              />
            </div>
          ))}
        </div>
      </FormSection>

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
