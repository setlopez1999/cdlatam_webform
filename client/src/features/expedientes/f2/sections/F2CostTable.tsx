/**
 * features/expedientes/f2/sections/F2CostTable.tsx
 *
 * Tabla de costos reutilizable para F2.
 * Usada por: Hardware, Materiales, RRHH, Otros Gastos.
 *
 * nCuotas (1–4): limita las opciones del CuotaSelect al número de cuotas
 * definido en F1 para el servicio de Implementación. Si no se pasa, muestra
 * las 4 opciones (comportamiento anterior).
 */
import { memo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";
import { parseNumeric } from "@/lib/formatters";
import type { Cuota } from "../f2RowDerivation";
import type { FilaCosto, FilaRRHH, FilaOtros } from "../../types";

/** Evita que combos largos compriman columnas numéricas (mismo patrón que F1Servicios). */
const SELECT_TRIGGER_CELL = "h-8 text-xs w-full max-w-full overflow-hidden";

// ─── TotalRow ─────────────────────────────────────────────────────────────────

export function TotalRow({ label, total, inline, fmt }: {
  label: string; total: number; inline?: boolean; fmt: (v: number) => string;
}) {
  if (inline) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">{label}:</span>
        <span className="text-sm font-bold font-mono text-foreground">{fmt(total)}</span>
      </div>
    );
  }
  return (
    <div className="flex items-center justify-between bg-muted/50 rounded-lg px-3 py-2 mt-2">
      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{label}</span>
      <span className="text-sm font-bold font-mono text-foreground">{fmt(total)}</span>
    </div>
  );
}

// ─── Selector de Cuota (dinámico según nCuotas de F1) ─────────────────────────

const ALL_CUOTAS = [
  { value: "1", label: "Cuota 1" },
  { value: "2", label: "Cuota 2" },
  { value: "3", label: "Cuota 3" },
  { value: "4", label: "Cuota 4" },
];

function CuotaSelect({
  value,
  onChange,
  nCuotas = 4,
}: {
  value?: 1 | 2 | 3 | 4;
  onChange: (v: 1 | 2 | 3 | 4) => void;
  /** Número de cuotas habilitadas (1–4). Viene de F1 implementación. */
  nCuotas?: number;
}) {
  const cuotas = ALL_CUOTAS.slice(0, Math.min(4, Math.max(1, nCuotas)));
  return (
    <Select value={value ? String(value) : ""} onValueChange={v => onChange(Number(v) as 1 | 2 | 3 | 4)}>
      <SelectTrigger className={SELECT_TRIGGER_CELL}>
        <SelectValue placeholder="Cuota..." className="truncate" />
      </SelectTrigger>
      <SelectContent position="popper" sideOffset={4} className="z-[200]">
        {cuotas.map(c => (
          <SelectItem key={c.value} value={c.value} className="text-xs">{c.label}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

// ─── Botones + Gasto por cuota (F1 implementación) ────────────────────────────

const CUOTAS_ACTIVAS = [1, 2, 3, 4] as const;

export const AddGastoCuotaBar = memo(function AddGastoCuotaBar({
  nCuotas,
  onAddCuota,
  labelPrefix = "Gasto",
}: {
  nCuotas: number;
  onAddCuota: (cuota: Cuota) => void;
  /** Prefijo del botón; RRHH usa "Recurso". */
  labelPrefix?: string;
}) {
  const count = Math.min(4, Math.max(1, nCuotas));
  return (
    <div className="flex flex-wrap gap-1.5">
      {CUOTAS_ACTIVAS.slice(0, count).map(cuota => (
        <Button
          key={cuota}
          type="button"
          variant="outline"
          size="sm"
          className="h-7 text-xs"
          onClick={() => onAddCuota(cuota)}
        >
          <Plus className="w-3 h-3 mr-1" />
          {labelPrefix} Cuota {cuota}
        </Button>
      ))}
    </div>
  );
});

// ─── Hardware / Materiales Table ──────────────────────────────────────────────

export const F2CostTable = memo(function F2CostTable({
  rows, catalogs, onUpdate, onAddCuota, onRemove, total,
  valueLabel, valueField, taxLabel, taxField, fmt, nCuotas = 3,
}: {
  rows: FilaCosto[];
  catalogs: any;
  onUpdate: (id: string, field: keyof FilaCosto, value: string | number) => void;
  onAddCuota: (cuota: Cuota) => void;
  onRemove: (id: string) => void;
  total: number;
  valueLabel: string;
  valueField: "valorNeto";
  taxLabel: string;
  taxField: "iva";
  fmt: (v: number) => string;
  /** Cuotas habilitadas desde F1 implementación (1–4). */
  nCuotas: number;
}) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border/40">
      <table className="w-full min-w-[1140px] border-collapse text-xs">
        <thead>
          <tr className="bg-muted/60 text-muted-foreground">
            <th className="px-2 py-2 text-left font-medium w-[140px] min-w-[140px] border-b border-border/40">Centro Costo</th>
            <th className="px-2 py-2 text-left font-medium w-[90px] min-w-[90px] border-b border-border/40">Cuota</th>
            <th className="px-2 py-2 text-left font-medium w-[150px] min-w-[150px] border-b border-border/40">Descripción</th>
            <th className="px-2 py-2 text-left font-medium w-[90px] min-w-[90px] border-b border-border/40">Moneda</th>
            <th className="px-2 py-2 text-right font-medium w-[80px] min-w-[80px] border-b border-border/40">T.Cambio</th>
            <th className="px-2 py-2 text-right font-medium w-[90px] min-w-[90px] border-b border-border/40">{valueLabel}</th>
            <th className="px-2 py-2 text-right font-medium w-[75px] min-w-[75px] border-b border-border/40">Cant.</th>
            <th className="px-2 py-2 text-right font-medium w-[90px] min-w-[90px] border-b border-border/40">Total Neto</th>
            <th className="px-2 py-2 text-right font-medium w-[90px] min-w-[90px] border-b border-border/40">{taxLabel}</th>
            <th className="px-2 py-2 text-right font-medium w-[90px] min-w-[90px] border-b border-border/40">Total</th>
            <th className="px-2 py-2 w-8 border-b border-border/40"></th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr>
              <td colSpan={11} className="px-3 py-4 text-center text-xs text-muted-foreground">
                Sin gastos. Use los botones para agregar por cuota.
              </td>
            </tr>
          )}
          {rows.map(row => (
            <tr key={row.id} className="border-b border-border/20 last:border-b-0 hover:bg-muted/20 transition-colors">
              <td className="px-1 py-1 min-w-[140px]">
                <Select value={row.centroCosto} onValueChange={v => onUpdate(row.id, "centroCosto", v)}>
                  <SelectTrigger className={SELECT_TRIGGER_CELL}>
                    <SelectValue placeholder="CECO..." className="truncate" />
                  </SelectTrigger>
                  <SelectContent position="popper" sideOffset={4} className="z-[200]">
                    {catalogs?.cecos?.map((a: any) => (
                      <SelectItem key={a.value} value={a.value} className="text-xs">{a.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </td>
              <td className="px-1 py-1 min-w-[90px]">
                <CuotaSelect
                  value={row.cuota as 1 | 2 | 3 | 4 | undefined}
                  onChange={v => onUpdate(row.id, "cuota", v)}
                  nCuotas={nCuotas}
                />
              </td>
              <td className="px-1 py-1 min-w-[150px] max-w-[150px]">
                <Input className="h-8 text-xs w-full min-w-0 truncate" placeholder="Descripción..."
                  value={row.descripcionGasto}
                  onChange={e => onUpdate(row.id, "descripcionGasto", e.target.value)} />
              </td>
              <td className="px-1 py-1 min-w-[90px]">
                <Select value={row.tipoMoneda} onValueChange={v => onUpdate(row.id, "tipoMoneda", v)}>
                  <SelectTrigger className={SELECT_TRIGGER_CELL}>
                    <SelectValue placeholder="Moneda..." className="truncate" />
                  </SelectTrigger>
                  <SelectContent position="popper" sideOffset={4} className="z-[200]">
                    {catalogs?.monedas?.map((m: any) => (
                      <SelectItem key={m.value} value={m.value} className="text-xs">{m.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </td>
              <td className="px-1 py-1 min-w-[80px]">
                <Input type="number" step="any" className="h-8 text-xs text-right w-full min-w-[62px]" placeholder="1"
                  value={row.tipoCambio ?? ""}
                  onChange={e => onUpdate(row.id, "tipoCambio", parseNumeric(e.target.value))} />
              </td>
              <td className="px-1 py-1 min-w-[90px]">
                <Input type="number" className="h-8 text-xs text-right w-full min-w-[72px]" placeholder="0.00"
                  value={row[valueField] || ""}
                  onChange={e => onUpdate(row.id, valueField, parseNumeric(e.target.value))} />
              </td>
              <td className="px-1 py-1 min-w-[75px]">
                <Input type="number" className="h-8 text-xs text-right w-full min-w-[58px]" placeholder="1"
                  value={row.cantidad || ""}
                  onChange={e => onUpdate(row.id, "cantidad", parseNumeric(e.target.value))} />
              </td>
              <td className="px-2 py-1 min-w-[90px] text-right font-mono">{fmt(row.totalNeto)}</td>
              <td className="px-1 py-1 min-w-[90px]">
                <Input type="number" className="h-8 text-xs text-right w-full min-w-[72px]" placeholder="0.00"
                  value={row[taxField] || ""}
                  onChange={e => onUpdate(row.id, taxField, parseNumeric(e.target.value))} />
              </td>
              <td className="px-2 py-1 min-w-[90px] text-right font-mono font-bold">{fmt(row.total)}</td>
              <td className="px-1 py-1 text-center">
                <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive"
                  onClick={() => onRemove(row.id)}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="flex flex-col gap-2 px-2 py-2 border-t border-border/40 sm:flex-row sm:items-center sm:justify-between">
        <AddGastoCuotaBar nCuotas={nCuotas} onAddCuota={onAddCuota} />
        <TotalRow label="Total" total={total} inline fmt={fmt} />
      </div>
    </div>
  );
});

// ─── RRHH Table ───────────────────────────────────────────────────────────────

export const F2RRHHTable = memo(function F2RRHHTable({
  rows, catalogs, onUpdate, onAddCuota, onRemove, total, fmt, nCuotas = 3,
}: {
  rows: FilaRRHH[];
  catalogs: any;
  onUpdate: (id: string, field: keyof FilaRRHH, value: string | number) => void;
  onAddCuota: (cuota: Cuota) => void;
  onRemove: (id: string) => void;
  total: number;
  fmt: (v: number) => string;
  /** Cuotas habilitadas desde F1 implementación (1–4). */
  nCuotas: number;
}) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border/40">
      <table className="w-full min-w-[1200px] border-collapse text-xs">
        <thead>
          <tr className="bg-muted/60 text-muted-foreground">
            <th className="px-2 py-2 text-left font-medium w-[140px] min-w-[140px] border-b border-border/40">Tipo</th>
            <th className="px-2 py-2 text-left font-medium w-[90px] min-w-[90px] border-b border-border/40">Cuota</th>
            <th className="px-2 py-2 text-left font-medium w-[140px] min-w-[140px] border-b border-border/40">Descripción</th>
            <th className="px-2 py-2 text-left font-medium w-[90px] min-w-[90px] border-b border-border/40">Moneda</th>
            <th className="px-2 py-2 text-right font-medium w-[80px] min-w-[80px] border-b border-border/40">T.Cambio</th>
            <th className="px-2 py-2 text-right font-medium w-[90px] min-w-[90px] border-b border-border/40">Valor s/Imp.</th>
            <th className="px-2 py-2 text-right font-medium w-[75px] min-w-[75px] border-b border-border/40">Cant.</th>
            <th className="px-2 py-2 text-right font-medium w-[90px] min-w-[90px] border-b border-border/40">Total Neto</th>
            <th className="px-2 py-2 text-right font-medium w-[90px] min-w-[90px] border-b border-border/40">Impuesto</th>
            <th className="px-2 py-2 text-right font-medium w-[90px] min-w-[90px] border-b border-border/40">Total</th>
            <th className="px-2 py-2 w-8 border-b border-border/40"></th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr>
              <td colSpan={11} className="px-3 py-4 text-center text-xs text-muted-foreground">
                Sin recursos. Use los botones para agregar por cuota.
              </td>
            </tr>
          )}
          {rows.map(row => (
            <tr key={row.id} className="border-b border-border/20 last:border-b-0 hover:bg-muted/20 transition-colors">
              <td className="px-1 py-1 min-w-[140px]">
                <Select value={row.tipo} onValueChange={v => onUpdate(row.id, "tipo", v)}>
                  <SelectTrigger className={SELECT_TRIGGER_CELL}>
                    <SelectValue className="truncate" />
                  </SelectTrigger>
                  <SelectContent position="popper" sideOffset={4} className="z-[200]">
                    {[
                      { value: "tecnico_interno",      label: "Técnico Interno" },
                      { value: "especialista_externo", label: "Especialista Externo" },
                      { value: "supervisor",            label: "Supervisor" },
                      { value: "pm",                    label: "PM" },
                      { value: "otro",                  label: "Otro" },
                    ].map(t => <SelectItem key={t.value} value={t.value} className="text-xs">{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </td>
              <td className="px-1 py-1 min-w-[90px]">
                <CuotaSelect
                  value={row.cuota as 1 | 2 | 3 | 4 | undefined}
                  onChange={v => onUpdate(row.id, "cuota", v)}
                  nCuotas={nCuotas}
                />
              </td>
              <td className="px-1 py-1 min-w-[140px] max-w-[140px]">
                <Input className="h-8 text-xs w-full min-w-0 truncate" placeholder="Descripción..."
                  value={row.descripcionGasto}
                  onChange={e => onUpdate(row.id, "descripcionGasto", e.target.value)} />
              </td>
              <td className="px-1 py-1 min-w-[90px]">
                <Select value={row.tipoMoneda} onValueChange={v => onUpdate(row.id, "tipoMoneda", v)}>
                  <SelectTrigger className={SELECT_TRIGGER_CELL}>
                    <SelectValue placeholder="Moneda..." className="truncate" />
                  </SelectTrigger>
                  <SelectContent position="popper" sideOffset={4} className="z-[200]">
                    {catalogs?.monedas?.map((m: any) => (
                      <SelectItem key={m.value} value={m.value} className="text-xs">{m.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </td>
              <td className="px-1 py-1 min-w-[80px]">
                <Input type="number" step="any" className="h-8 text-xs text-right w-full min-w-[62px]" placeholder="1"
                  value={row.tipoCambio ?? ""}
                  onChange={e => onUpdate(row.id, "tipoCambio", parseNumeric(e.target.value))} />
              </td>
              <td className="px-1 py-1 min-w-[90px]">
                <Input type="number" className="h-8 text-xs text-right w-full min-w-[72px]" placeholder="0.00"
                  value={row.valorSinImpuesto || ""}
                  onChange={e => onUpdate(row.id, "valorSinImpuesto", parseNumeric(e.target.value))} />
              </td>
              <td className="px-1 py-1 min-w-[75px]">
                <Input type="number" className="h-8 text-xs text-right w-full min-w-[58px]" placeholder="1"
                  value={row.cantidad || ""}
                  onChange={e => onUpdate(row.id, "cantidad", parseNumeric(e.target.value))} />
              </td>
              <td className="px-2 py-1 min-w-[90px] text-right font-mono">{fmt(row.totalNeto)}</td>
              <td className="px-1 py-1 min-w-[90px]">
                <Input type="number" className="h-8 text-xs text-right w-full min-w-[72px]" placeholder="0.00"
                  value={row.impuesto || ""}
                  onChange={e => onUpdate(row.id, "impuesto", parseNumeric(e.target.value))} />
              </td>
              <td className="px-2 py-1 min-w-[90px] text-right font-mono font-bold">{fmt(row.total)}</td>
              <td className="px-1 py-1 text-center">
                <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive"
                  onClick={() => onRemove(row.id)}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="flex flex-col gap-2 px-2 py-2 border-t border-border/40 sm:flex-row sm:items-center sm:justify-between">
        <AddGastoCuotaBar nCuotas={nCuotas} onAddCuota={onAddCuota} labelPrefix="Recurso" />
        <TotalRow label="Total RRHH" total={total} inline fmt={fmt} />
      </div>
    </div>
  );
});

// ─── Otros Gastos Table ───────────────────────────────────────────────────────

export const F2OtrosTable = memo(function F2OtrosTable({
  rows, catalogs, onUpdate, onAdd, onRemove, total, fmt, cuotaMes,
}: {
  rows: FilaOtros[];
  catalogs: any;
  onUpdate: (id: string, field: keyof FilaOtros, value: string | number) => void;
  onAdd: () => void;
  onRemove: (id: string) => void;
  total: number;
  fmt: (v: number) => string;
  /** Mes/cuota del bloque (etiqueta del botón agregar). */
  cuotaMes?: number;
}) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border/40">
      <table className="w-full min-w-[1100px] border-collapse text-xs">
        <thead>
          <tr className="bg-muted/60 text-muted-foreground">
            <th className="px-2 py-2 text-left font-medium w-[110px] min-w-[110px] border-b border-border/40">Tipo</th>
            <th className="px-2 py-2 text-left font-medium w-[110px] min-w-[110px] border-b border-border/40">Centro Costo</th>
            <th className="px-2 py-2 text-left font-medium w-[140px] min-w-[140px] border-b border-border/40">Descripción</th>
            <th className="px-2 py-2 text-left font-medium w-[90px] min-w-[90px] border-b border-border/40">Moneda</th>
            <th className="px-2 py-2 text-right font-medium w-[80px] min-w-[80px] border-b border-border/40">T.Cambio</th>
            <th className="px-2 py-2 text-right font-medium w-[90px] min-w-[90px] border-b border-border/40">Valor Neto</th>
            <th className="px-2 py-2 text-right font-medium w-[75px] min-w-[75px] border-b border-border/40">Cant.</th>
            <th className="px-2 py-2 text-right font-medium w-[90px] min-w-[90px] border-b border-border/40">Total Neto</th>
            <th className="px-2 py-2 text-right font-medium w-[90px] min-w-[90px] border-b border-border/40">IVA</th>
            <th className="px-2 py-2 text-right font-medium w-[90px] min-w-[90px] border-b border-border/40">Total</th>
            <th className="px-2 py-2 w-8 border-b border-border/40"></th>
          </tr>
        </thead>
        <tbody>
          {rows.map(row => (
            <tr key={row.id} className="border-b border-border/20 last:border-b-0 hover:bg-muted/20 transition-colors">
              <td className="px-1 py-1 min-w-[110px]">
                <Select value={row.tipo} onValueChange={v => onUpdate(row.id, "tipo", v)}>
                  <SelectTrigger className={SELECT_TRIGGER_CELL}>
                    <SelectValue className="truncate" />
                  </SelectTrigger>
                  <SelectContent position="popper" sideOffset={4} className="z-[200]">
                    {[
                      { value: "comision",     label: "Comisión" },
                      { value: "movilizacion", label: "Movilización" },
                      { value: "viatico",      label: "Viático" },
                      { value: "alojamiento",  label: "Alojamiento" },
                      { value: "varios",       label: "Varios" },
                    ].map(t => <SelectItem key={t.value} value={t.value} className="text-xs">{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </td>
              <td className="px-1 py-1 min-w-[110px]">
                <Select value={row.centroCosto} onValueChange={v => onUpdate(row.id, "centroCosto", v)}>
                  <SelectTrigger className={SELECT_TRIGGER_CELL}>
                    <SelectValue placeholder="CECO..." className="truncate" />
                  </SelectTrigger>
                  <SelectContent position="popper" sideOffset={4} className="z-[200]">
                    {catalogs?.cecos?.map((a: any) => (
                      <SelectItem key={a.value} value={a.value} className="text-xs">{a.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </td>
              <td className="px-1 py-1 min-w-[140px] max-w-[140px]">
                <Input className="h-8 text-xs w-full min-w-0 truncate" placeholder="Descripción..."
                  value={row.descripcionGasto}
                  onChange={e => onUpdate(row.id, "descripcionGasto", e.target.value)} />
              </td>
              <td className="px-1 py-1 min-w-[90px]">
                <Select value={row.tipoMoneda} onValueChange={v => onUpdate(row.id, "tipoMoneda", v)}>
                  <SelectTrigger className={SELECT_TRIGGER_CELL}>
                    <SelectValue placeholder="Moneda..." className="truncate" />
                  </SelectTrigger>
                  <SelectContent position="popper" sideOffset={4} className="z-[200]">
                    {catalogs?.monedas?.map((m: any) => (
                      <SelectItem key={m.value} value={m.value} className="text-xs">{m.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </td>
              <td className="px-1 py-1 min-w-[80px]">
                <Input type="number" step="any" className="h-8 text-xs text-right w-full min-w-[62px]" placeholder="1"
                  value={row.tipoCambio ?? ""}
                  onChange={e => onUpdate(row.id, "tipoCambio", parseNumeric(e.target.value))} />
              </td>
              <td className="px-1 py-1 min-w-[90px]">
                <Input type="number" className="h-8 text-xs text-right w-full min-w-[72px]" placeholder="0.00"
                  value={row.valorNeto || ""}
                  onChange={e => onUpdate(row.id, "valorNeto", parseNumeric(e.target.value))} />
              </td>
              <td className="px-1 py-1 min-w-[75px]">
                <Input type="number" className="h-8 text-xs text-right w-full min-w-[58px]" placeholder="1"
                  value={row.cantidad || ""}
                  onChange={e => onUpdate(row.id, "cantidad", parseNumeric(e.target.value))} />
              </td>
              <td className="px-2 py-1 min-w-[90px] text-right font-mono">{fmt(row.totalNeto)}</td>
              <td className="px-1 py-1 min-w-[90px]">
                <Input type="number" className="h-8 text-xs text-right w-full min-w-[72px]" placeholder="0.00"
                  value={row.iva || ""}
                  onChange={e => onUpdate(row.id, "iva", parseNumeric(e.target.value))} />
              </td>
              <td className="px-2 py-1 min-w-[90px] text-right font-mono font-bold">{fmt(row.total)}</td>
              <td className="px-1 py-1 text-center">
                <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive"
                  onClick={() => onRemove(row.id)}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="flex items-center justify-between px-2 py-2 border-t border-border/40">
        <Button variant="outline" size="sm" onClick={onAdd}>
          <Plus className="w-3.5 h-3.5 mr-1.5" />
          {cuotaMes != null ? `Gasto Cuota ${cuotaMes}` : "Agregar gasto"}
        </Button>
        <TotalRow label="Total Otros" total={total} inline fmt={fmt} />
      </div>
    </div>
  );
});
