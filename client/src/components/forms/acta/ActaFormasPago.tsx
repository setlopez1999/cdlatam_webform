/**
 * ActaFormasPago — Formas de Pago del Acta
 * Dos tablas separadas: Implementación y Mantención
 * Estructura exacta del Excel: ITEM | Tipo Venta | N°Cuotas | 1aCuota(Monto+Fecha) | 2aCuota | 3aCuota
 */
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FormSection } from "@/components/FormSection";
import { CreditCard, Plus, Trash2 } from "lucide-react";
import type { ActaData, FormaPago } from "@/hooks/useFormStore";
import { formatCurrency, getCurrencyCode, parseNumeric } from "@/lib/formatters";

interface CatalogItem { value: string; label: string; }
interface Catalogs {
  tipoVenta?: readonly CatalogItem[] | CatalogItem[];
}

interface Props {
  acta: ActaData;
  catalogs?: Catalogs;
  moneda?: string;
  onUpdate: (
    type: "formasPagoImplementacion" | "formasPagoMantencion",
    id: string,
    field: string,
    value: string | number
  ) => void;
  onAdd?: (tipo: "formasPagoImplementacion" | "formasPagoMantencion") => void;
  onRemove?: (tipo: "formasPagoImplementacion" | "formasPagoMantencion", id: string) => void;
}

interface PagoTableProps {
  title: string;
  items: FormaPago[];
  tipo: "formasPagoImplementacion" | "formasPagoMantencion";
  catalogs?: Catalogs;
  currencyCode?: string;
  onUpdate: Props["onUpdate"];
  onAdd?: Props["onAdd"];
  onRemove?: Props["onRemove"];
  terceraCuotaLabel?: string;
}

function PagoTable({ title, items, tipo, catalogs, currencyCode = "USD", onUpdate, onAdd, onRemove, terceraCuotaLabel = "Tercera Cuota" }: PagoTableProps) {
  const totalMonto = items.reduce((sum, i) =>
    sum + i.primeraCuota.monto + i.segundaCuota.monto + i.terceraCuota.monto, 0);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-semibold text-foreground">{title}</h4>
        {onAdd && (
          <Button type="button" variant="outline" size="sm" onClick={() => onAdd(tipo)} className="h-7 text-xs gap-1">
            <Plus className="w-3 h-3" /> Agregar fila
          </Button>
        )}
      </div>

      <div className="overflow-x-auto rounded-lg border border-border/60">
        <table className="w-full min-w-[780px] text-xs border-collapse">
          <thead>
            <tr className="bg-muted/60">
              <th className="border-b border-r border-border/60 px-2 py-2 text-left font-medium w-10">ITEM</th>
              <th className="border-b border-r border-border/60 px-2 py-2 text-left font-medium min-w-[120px]">Tipo Venta</th>
              <th className="border-b border-r border-border/60 px-2 py-2 text-center font-medium w-16">N° Cuotas</th>
              <th className="border-b border-r border-border/60 px-2 py-2 text-center font-medium" colSpan={2}>Primera Cuota</th>
              <th className="border-b border-r border-border/60 px-2 py-2 text-center font-medium" colSpan={2}>Segunda Cuota</th>
              <th className="border-b border-border/60 px-2 py-2 text-center font-medium" colSpan={2}>{terceraCuotaLabel}</th>
              {onRemove && <th className="border-b border-l border-border/60 w-8"></th>}
            </tr>
            <tr className="bg-muted/30 text-muted-foreground">
              <th className="border-b border-r border-border/60 px-1 py-1"></th>
              <th className="border-b border-r border-border/60 px-1 py-1"></th>
              <th className="border-b border-r border-border/60 px-1 py-1"></th>
              <th className="border-b border-r border-border/60 px-2 py-1 text-center font-normal">Monto</th>
              <th className="border-b border-r border-border/60 px-2 py-1 text-center font-normal">Fecha</th>
              <th className="border-b border-r border-border/60 px-2 py-1 text-center font-normal">Monto</th>
              <th className="border-b border-r border-border/60 px-2 py-1 text-center font-normal">Fecha</th>
              <th className="border-b border-r border-border/60 px-2 py-1 text-center font-normal">Monto</th>
              <th className="border-b border-border/60 px-2 py-1 text-center font-normal">Fecha</th>
              {onRemove && <th className="border-b border-l border-border/60"></th>}
            </tr>
          </thead>
          <tbody>
            {items.map((pago, idx) => (
              <tr key={pago.id} className="hover:bg-muted/20 transition-colors">
                <td className="border-b border-r border-border/40 px-2 py-1 text-center text-muted-foreground">{idx + 1}</td>

                {/* Tipo Venta — combobox BD */}
                <td className="border-b border-r border-border/40 px-1 py-0.5">
                  {catalogs?.tipoVenta && catalogs.tipoVenta.length > 0 ? (
                    <Select value={pago.tipoVenta} onValueChange={v => onUpdate(tipo, pago.id, "tipoVenta", v)}>
                      <SelectTrigger className="h-7 text-xs border-0 bg-transparent focus:ring-0 max-w-full overflow-hidden">
                        <SelectValue placeholder="Tipo..." className="truncate" />
                      </SelectTrigger>
                      <SelectContent position="popper" sideOffset={4} className="z-[200]">
                        {catalogs.tipoVenta.map(t => (
                          <SelectItem key={t.value} value={t.value} className="text-xs">{t.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input className="h-7 text-xs border-0 bg-transparent focus-visible:ring-0" placeholder="Tipo venta"
                      value={pago.tipoVenta} onChange={e => onUpdate(tipo, pago.id, "tipoVenta", e.target.value)} />
                  )}
                </td>

                {/* N° Cuotas */}
                <td className="border-b border-r border-border/40 px-1 py-0.5">
                  <Input type="number" min={1} max={36}
                    className="h-7 text-xs text-center border-0 bg-transparent focus-visible:ring-0"
                    value={pago.nCuotas}
                    onChange={e => onUpdate(tipo, pago.id, "nCuotas", parseInt(e.target.value) || 1)} />
                </td>

                {/* Primera Cuota: Monto + Fecha */}
                <td className="border-b border-r border-border/40 px-1 py-0.5">
                  <Input type="number" min={0} className="h-7 text-xs text-right border-0 bg-transparent focus-visible:ring-0" placeholder="0"
                    value={pago.primeraCuota.monto || ""}
                    onChange={e => onUpdate(tipo, pago.id, "primeraCuota.monto", parseNumeric(e.target.value))} />
                </td>
                <td className="border-b border-r border-border/40 px-1 py-0.5">
                  <Input type="date" className="h-7 text-xs border-0 bg-transparent focus-visible:ring-0"
                    value={pago.primeraCuota.fecha}
                    onChange={e => onUpdate(tipo, pago.id, "primeraCuota.fecha", e.target.value)} />
                </td>

                {/* Segunda Cuota: Monto + Fecha */}
                <td className="border-b border-r border-border/40 px-1 py-0.5">
                  <Input type="number" min={0} className="h-7 text-xs text-right border-0 bg-transparent focus-visible:ring-0" placeholder="0"
                    value={pago.segundaCuota.monto || ""}
                    onChange={e => onUpdate(tipo, pago.id, "segundaCuota.monto", parseNumeric(e.target.value))} />
                </td>
                <td className="border-b border-r border-border/40 px-1 py-0.5">
                  <Input type="date" className="h-7 text-xs border-0 bg-transparent focus-visible:ring-0"
                    value={pago.segundaCuota.fecha}
                    onChange={e => onUpdate(tipo, pago.id, "segundaCuota.fecha", e.target.value)} />
                </td>

                {/* Tercera Cuota: Monto + Fecha */}
                <td className="border-b border-r border-border/40 px-1 py-0.5">
                  <Input type="number" min={0} className="h-7 text-xs text-right border-0 bg-transparent focus-visible:ring-0" placeholder="0"
                    value={pago.terceraCuota.monto || ""}
                    onChange={e => onUpdate(tipo, pago.id, "terceraCuota.monto", parseNumeric(e.target.value))} />
                </td>
                <td className="border-b border-border/40 px-1 py-0.5">
                  <Input type="date" className="h-7 text-xs border-0 bg-transparent focus-visible:ring-0"
                    value={pago.terceraCuota.fecha}
                    onChange={e => onUpdate(tipo, pago.id, "terceraCuota.fecha", e.target.value)} />
                </td>

                {onRemove && (
                  <td className="border-b border-l border-border/40 px-1 py-0.5 text-center">
                    <Button type="button" variant="ghost" size="icon" className="h-6 w-6 text-destructive/60 hover:text-destructive"
                      onClick={() => onRemove(tipo, pago.id)}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
          {totalMonto > 0 && (
            <tfoot>
              <tr className="bg-muted/40 font-medium">
                <td colSpan={3} className="border-t border-r border-border/60 px-2 py-1.5 text-right text-xs">Total:</td>
                <td colSpan={2} className="border-t border-r border-border/60 px-2 py-1.5 text-right text-xs font-semibold text-primary">
                  {formatCurrency(totalMonto, currencyCode)}
                </td>
                <td colSpan={4} className="border-t border-border/60 px-2 py-1.5"></td>
                {onRemove && <td className="border-t border-l border-border/60"></td>}
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}

export function ActaFormasPago({ acta, catalogs, moneda, onUpdate, onAdd, onRemove }: Props) {
  const currencyCode = getCurrencyCode(moneda ?? "");
  return (
    <FormSection title="Formas de Pago" icon={CreditCard} accent="indigo">
      <div className="space-y-8">
        <PagoTable
          title="Formas de Pago Implementación"
          items={acta.formasPagoImplementacion}
          tipo="formasPagoImplementacion"
          catalogs={catalogs}
          currencyCode={currencyCode}
          onUpdate={onUpdate}
          onAdd={onAdd}
          onRemove={onRemove}
          terceraCuotaLabel="Tercera Cuota"
        />
        <div className="border-t border-border/40 pt-6">
          <PagoTable
            title="Formas de Pago Mantención"
            items={acta.formasPagoMantencion}
            tipo="formasPagoMantencion"
            catalogs={catalogs}
            currencyCode={currencyCode}
            onUpdate={onUpdate}
            onAdd={onAdd}
            onRemove={onRemove}
            terceraCuotaLabel="Tercera Cuota en adelante"
          />
        </div>
      </div>
    </FormSection>
  );
}
