/**
 * features/expedientes/f2/sections/F2CostTable.tsx
 *
 * Tabla de costos reutilizable para F2.
 * Usada por: Hardware, Materiales, RRHH, Otros Gastos.
 */
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";
import { parseNumeric } from "@/lib/formatters";
import type { FilaCosto, FilaRRHH, FilaOtros } from "../../types";

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

// ─── Selector de Cuota ────────────────────────────────────────────────────────

const CUOTAS = [
  { value: "1", label: "Cuota 1" },
  { value: "2", label: "Cuota 2" },
  { value: "3", label: "Cuota 3" },
];

function CuotaSelect({ value, onChange }: { value?: 1 | 2 | 3; onChange: (v: 1 | 2 | 3) => void }) {
  return (
    <Select value={value ? String(value) : ""} onValueChange={v => onChange(Number(v) as 1 | 2 | 3)}>
      <SelectTrigger className="h-8 text-xs">
        <SelectValue placeholder="Cuota..." />
      </SelectTrigger>
      <SelectContent position="popper" sideOffset={4} className="z-[200]">
        {CUOTAS.map(c => (
          <SelectItem key={c.value} value={c.value} className="text-xs">{c.label}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

// ─── Hardware / Materiales Table ──────────────────────────────────────────────

export function F2CostTable({
  rows, catalogs, onUpdate, onAdd, onRemove, total,
  valueLabel, valueField, taxLabel, taxField, fmt,
}: {
  rows: FilaCosto[];
  catalogs: any;
  onUpdate: (id: string, field: keyof FilaCosto, value: string | number) => void;
  onAdd: () => void;
  onRemove: (id: string) => void;
  total: number;
  valueLabel: string;
  valueField: "valorNeto";
  taxLabel: string;
  taxField: "iva";
  fmt: (v: number) => string;
}) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border/40">
      <table className="w-full min-w-[860px] border-collapse text-xs">
        <thead>
          <tr className="bg-muted/60 text-muted-foreground">
            <th className="px-2 py-2 text-left font-medium w-[140px] border-b border-border/40">Centro Costo</th>
            <th className="px-2 py-2 text-left font-medium w-[90px] border-b border-border/40">Cuota</th>
            <th className="px-2 py-2 text-left font-medium w-[180px] border-b border-border/40">Descripción</th>
            <th className="px-2 py-2 text-right font-medium w-[90px] border-b border-border/40">{valueLabel}</th>
            <th className="px-2 py-2 text-right font-medium w-[60px] border-b border-border/40">Cant.</th>
            <th className="px-2 py-2 text-right font-medium w-[90px] border-b border-border/40">Total Neto</th>
            <th className="px-2 py-2 text-right font-medium w-[90px] border-b border-border/40">{taxLabel}</th>
            <th className="px-2 py-2 text-right font-medium w-[90px] border-b border-border/40">Total</th>
            <th className="px-2 py-2 w-8 border-b border-border/40"></th>
          </tr>
        </thead>
        <tbody>
          {rows.map(row => (
            <tr key={row.id} className="border-b border-border/20 last:border-b-0 hover:bg-muted/20 transition-colors">
              <td className="px-1 py-1">
                <Select value={row.centroCosto} onValueChange={v => onUpdate(row.id, "centroCosto", v)}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="CECO..." className="truncate" />
                  </SelectTrigger>
                  <SelectContent position="popper" sideOffset={4} className="z-[200]">
                    {catalogs?.cecos?.map((a: any) => (
                      <SelectItem key={a.value} value={a.value} className="text-xs">{a.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </td>
              <td className="px-1 py-1">
                <CuotaSelect
                  value={row.cuota}
                  onChange={v => onUpdate(row.id, "cuota", v)}
                />
              </td>
              <td className="px-1 py-1">
                <Input className="h-8 text-xs" placeholder="Descripción..."
                  value={row.descripcionGasto}
                  onChange={e => onUpdate(row.id, "descripcionGasto", e.target.value)} />
              </td>
              <td className="px-1 py-1">
                <Input type="number" className="h-8 text-xs text-right" placeholder="0.00"
                  value={row[valueField] || ""}
                  onChange={e => onUpdate(row.id, valueField, parseNumeric(e.target.value))} />
              </td>
              <td className="px-1 py-1">
                <Input type="number" className="h-8 text-xs text-right" placeholder="1"
                  value={row.cantidad || ""}
                  onChange={e => onUpdate(row.id, "cantidad", parseNumeric(e.target.value))} />
              </td>
              <td className="px-2 py-1 text-right font-mono">{fmt(row.totalNeto)}</td>
              <td className="px-1 py-1">
                <Input type="number" className="h-8 text-xs text-right" placeholder="0.00"
                  value={row[taxField] || ""}
                  onChange={e => onUpdate(row.id, taxField, parseNumeric(e.target.value))} />
              </td>
              <td className="px-2 py-1 text-right font-mono font-bold">{fmt(row.total)}</td>
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
          <Plus className="w-3.5 h-3.5 mr-1.5" /> Agregar fila
        </Button>
        <TotalRow label="Total" total={total} inline fmt={fmt} />
      </div>
    </div>
  );
}

// ─── RRHH Table ───────────────────────────────────────────────────────────────

export function F2RRHHTable({
  rows, catalogs, onUpdate, onAdd, onRemove, total, fmt,
}: {
  rows: FilaRRHH[];
  catalogs: any;
  onUpdate: (id: string, field: keyof FilaRRHH, value: string | number) => void;
  onAdd: () => void;
  onRemove: (id: string) => void;
  total: number;
  fmt: (v: number) => string;
}) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border/40">
      <table className="w-full min-w-[1000px] border-collapse text-xs">
        <thead>
          <tr className="bg-muted/60 text-muted-foreground">
            <th className="px-2 py-2 text-left font-medium w-[140px] border-b border-border/40">Tipo Recurso</th>
            <th className="px-2 py-2 text-left font-medium w-[90px] border-b border-border/40">Cuota</th>
            <th className="px-2 py-2 text-left font-medium w-[150px] border-b border-border/40">Descripción</th>
            <th className="px-2 py-2 text-right font-medium w-[90px] border-b border-border/40">Valor s/Imp.</th>
            <th className="px-2 py-2 text-right font-medium w-[60px] border-b border-border/40">Cant.</th>
            <th className="px-2 py-2 text-right font-medium w-[90px] border-b border-border/40">Total Neto</th>
            <th className="px-2 py-2 text-right font-medium w-[90px] border-b border-border/40">Impuesto</th>
            <th className="px-2 py-2 text-right font-medium w-[90px] border-b border-border/40">Total</th>
            <th className="px-2 py-2 w-8 border-b border-border/40"></th>
          </tr>
        </thead>
        <tbody>
          {rows.map(row => (
            <tr key={row.id} className="border-b border-border/20 last:border-b-0 hover:bg-muted/20 transition-colors">
              <td className="px-1 py-1">
                <Select value={row.tipo} onValueChange={v => onUpdate(row.id, "tipo", v)}>
                  <SelectTrigger className="h-8 text-xs">
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
              <td className="px-1 py-1">
                <CuotaSelect
                  value={row.cuota}
                  onChange={v => onUpdate(row.id, "cuota", v)}
                />
              </td>
              <td className="px-1 py-1">
                <Input className="h-8 text-xs" placeholder="Descripción..."
                  value={row.descripcionGasto}
                  onChange={e => onUpdate(row.id, "descripcionGasto", e.target.value)} />
              </td>
              <td className="px-1 py-1">
                <Input type="number" className="h-8 text-xs text-right" placeholder="0.00"
                  value={row.valorSinImpuesto || ""}
                  onChange={e => onUpdate(row.id, "valorSinImpuesto", parseNumeric(e.target.value))} />
              </td>
              <td className="px-1 py-1">
                <Input type="number" className="h-8 text-xs text-right" placeholder="1"
                  value={row.cantidad || ""}
                  onChange={e => onUpdate(row.id, "cantidad", parseNumeric(e.target.value))} />
              </td>
              <td className="px-2 py-1 text-right font-mono">{fmt(row.totalNeto)}</td>
              <td className="px-1 py-1">
                <Input type="number" className="h-8 text-xs text-right" placeholder="0.00"
                  value={row.impuesto || ""}
                  onChange={e => onUpdate(row.id, "impuesto", parseNumeric(e.target.value))} />
              </td>
              <td className="px-2 py-1 text-right font-mono font-bold">{fmt(row.total)}</td>
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
          <Plus className="w-3.5 h-3.5 mr-1.5" /> Agregar recurso
        </Button>
        <TotalRow label="Total RRHH" total={total} inline fmt={fmt} />
      </div>
    </div>
  );
}

// ─── Otros Gastos Table ───────────────────────────────────────────────────────

export function F2OtrosTable({
  rows, catalogs, onUpdate, onAdd, onRemove, total, fmt,
}: {
  rows: FilaOtros[];
  catalogs: any;
  onUpdate: (id: string, field: keyof FilaOtros, value: string | number) => void;
  onAdd: () => void;
  onRemove: (id: string) => void;
  total: number;
  fmt: (v: number) => string;
}) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border/40">
      <table className="w-full min-w-[800px] border-collapse text-xs">
        <thead>
          <tr className="bg-muted/60 text-muted-foreground">
            <th className="px-2 py-2 text-left font-medium w-[120px] border-b border-border/40">Tipo</th>
            <th className="px-2 py-2 text-left font-medium w-[120px] border-b border-border/40">Centro Costo</th>
            <th className="px-2 py-2 text-left font-medium w-[160px] border-b border-border/40">Descripción</th>
            <th className="px-2 py-2 text-right font-medium w-[90px] border-b border-border/40">Valor Neto</th>
            <th className="px-2 py-2 text-right font-medium w-[60px] border-b border-border/40">Cant.</th>
            <th className="px-2 py-2 text-right font-medium w-[90px] border-b border-border/40">Total Neto</th>
            <th className="px-2 py-2 text-right font-medium w-[90px] border-b border-border/40">IVA</th>
            <th className="px-2 py-2 text-right font-medium w-[90px] border-b border-border/40">Total</th>
            <th className="px-2 py-2 w-8 border-b border-border/40"></th>
          </tr>
        </thead>
        <tbody>
          {rows.map(row => (
            <tr key={row.id} className="border-b border-border/20 last:border-b-0 hover:bg-muted/20 transition-colors">
              <td className="px-1 py-1">
                <Select value={row.tipo} onValueChange={v => onUpdate(row.id, "tipo", v)}>
                  <SelectTrigger className="h-8 text-xs">
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
              <td className="px-1 py-1">
                <Select value={row.centroCosto} onValueChange={v => onUpdate(row.id, "centroCosto", v)}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="CECO..." className="truncate" />
                  </SelectTrigger>
                  <SelectContent position="popper" sideOffset={4} className="z-[200]">
                    {catalogs?.cecos?.map((c: any) => (
                      <SelectItem key={c.value} value={c.value} className="text-xs">{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </td>
              <td className="px-1 py-1">
                <Input className="h-8 text-xs" placeholder="Descripción..."
                  value={row.descripcionGasto ?? ""}
                  onChange={e => onUpdate(row.id, "descripcionGasto", e.target.value)} />
              </td>
              <td className="px-1 py-1">
                <Input type="number" className="h-8 text-xs text-right" placeholder="0.00"
                  value={row.valorNeto || ""}
                  onChange={e => onUpdate(row.id, "valorNeto", parseNumeric(e.target.value))} />
              </td>
              <td className="px-1 py-1">
                <Input type="number" className="h-8 text-xs text-right" placeholder="1"
                  value={row.cantidad || ""}
                  onChange={e => onUpdate(row.id, "cantidad", parseNumeric(e.target.value))} />
              </td>
              <td className="px-2 py-1 text-right font-mono">{fmt(row.totalNeto)}</td>
              <td className="px-1 py-1">
                <Input type="number" className="h-8 text-xs text-right" placeholder="0.00"
                  value={row.iva || ""}
                  onChange={e => onUpdate(row.id, "iva", parseNumeric(e.target.value))} />
              </td>
              <td className="px-2 py-1 text-right font-mono font-bold">{fmt(row.total)}</td>
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
          <Plus className="w-3.5 h-3.5 mr-1.5" /> Agregar gasto
        </Button>
        <TotalRow label="Total" total={total} inline fmt={fmt} />
      </div>
    </div>
  );
}
