/**
 * features/expedientes/f1/sections/F1FormasPago.tsx
 *
 * Obs. 8: Solo muestra la tabla de Implementación si hay servicios de tipo Implementación,
 *         y la de Mantención solo si hay servicios de tipo Mantención.
 * Obs. 9: El campo tipoVenta de cada fila se pre-selecciona automáticamente
 *         según los tipos de venta presentes en serviciosContratados.
 * Obs. 10: El campo Fecha de cada cuota tiene la opción "Contra entrega" además de fecha.
 */
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FormSection, FieldGroup } from "@/components/FormSection";
import { CreditCard, Plus, Trash2, ShieldOff } from "lucide-react";
import type { F1Data, FormaPago } from "../../types";
import { formatCurrency, getCurrencyCode, parseNumeric } from "@/lib/formatters";

interface CatalogItem { value: string; label: string; }
interface Catalogs {
  tipoVenta?: readonly CatalogItem[] | CatalogItem[];
}

interface Props {
  data: F1Data;
  catalogs?: Catalogs;
  moneda?: string;
  onUpdate: (
    tipo: "formasPagoImplementacion" | "formasPagoMantencion",
    id: string,
    field: string,
    value: string | number
  ) => void;
  onAdd?: (tipo: "formasPagoImplementacion" | "formasPagoMantencion") => void;
  onRemove?: (tipo: "formasPagoImplementacion" | "formasPagoMantencion", id: string) => void;
  /** Si true, oculta montos y detalles de pago y muestra placeholder de acceso restringido */
  restricted?: boolean;
}

// ─── Subcomponente: campo de fecha con opción "Contra entrega" ────────────────

interface FechaContraEntregaProps {
  value: string;
  onChange: (v: string) => void;
}

function FechaContraEntrega({ value, onChange }: FechaContraEntregaProps) {
  const isContraEntrega = value === "contra_entrega";
  return (
    <div className="flex gap-1 items-center">
      {!isContraEntrega && (
        <Input
          type="date"
          className="h-7 text-xs border-0 bg-transparent focus-visible:ring-0 min-w-[110px]"
          value={value}
          onChange={e => onChange(e.target.value)}
        />
      )}
      {isContraEntrega && (
        <span className="text-xs text-muted-foreground italic px-1">Contra entrega</span>
      )}
      <Button
        type="button"
        variant={isContraEntrega ? "default" : "ghost"}
        size="sm"
        className="h-6 px-1.5 text-[10px] shrink-0"
        onClick={() => onChange(isContraEntrega ? "" : "contra_entrega")}
        title="Contra entrega"
      >
        CE
      </Button>
    </div>
  );
}

// ─── Subcomponente: tabla de formas de pago ───────────────────────────────────

interface PagoTableProps {
  title: string;
  items: FormaPago[];
  tipo: "formasPagoImplementacion" | "formasPagoMantencion";
  catalogs?: Catalogs;
  currencyCode?: string;
  totalReferencia: number; // Monto total esperado según servicios
  onUpdate: Props["onUpdate"];
  onAdd?: Props["onAdd"];
  onRemove?: Props["onRemove"];
}

function PagoTable({
  title, items, tipo, catalogs, currencyCode = "USD", totalReferencia,
  onUpdate, onAdd, onRemove,
}: PagoTableProps) {
  // Determinar cuántas columnas de cuotas mostrar (máximo de nCuotas en esta tabla, min 1, max 4)
  const maxCuotas = Math.min(4, Math.max(1, ...items.map(i => i.nCuotas || 0)));
  
  const totalPagos = items.reduce(
    (sum, i) => sum + i.cuotas.reduce((s, c) => s + (c.monto || 0), 0), 0
  );

  const diff = Math.abs(totalPagos - totalReferencia);
  const hasWarning = diff > 0.1 && totalReferencia > 0;

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-1">
        <div className="flex items-center gap-3">
          <h4 className="text-sm font-semibold text-foreground">{title}</h4>
          {hasWarning && (
            <Badge variant="outline" className="bg-orange-500/10 text-orange-400 border-orange-500/20 text-[10px] py-0 px-2 flex items-center gap-1 animate-pulse">
              <ShieldOff className="w-3 h-3" /> La suma no coincide con el total de servicios ({formatCurrency(totalReferencia, currencyCode)})
            </Badge>
          )}
        </div>
        {onAdd && (
          <Button type="button" variant="outline" size="sm" onClick={() => onAdd(tipo)} className="h-7 text-xs gap-1">
            <Plus className="w-3 h-3" /> Agregar fila
          </Button>
        )}
      </div>

      <div className="overflow-x-auto rounded-lg border border-border/60 shadow-sm">
        <table className="w-full min-w-[800px] text-xs border-collapse">
          <thead>
            <tr className="bg-muted/60">
              <th className="border-b border-r border-border/60 px-2 py-2 text-left font-medium w-10">ITEM</th>
              <th className="border-b border-r border-border/60 px-2 py-2 text-left font-medium w-[130px] min-w-[130px]">Tipo Venta</th>
              <th className="border-b border-r border-border/60 px-2 py-2 text-center font-medium w-16">N° Cuotas</th>
              {Array.from({ length: maxCuotas }).map((_, i) => (
                <th key={i} className="border-b border-r border-border/60 px-2 py-2 text-center font-medium" colSpan={2}>
                  Cuota {i + 1}
                </th>
              ))}
              {onRemove && <th className="border-b border-l border-border/60 w-8"></th>}
            </tr>
            <tr className="bg-muted/30 text-muted-foreground">
              <th className="border-b border-r border-border/60 px-1 py-1"></th>
              <th className="border-b border-r border-border/60 px-1 py-1"></th>
              <th className="border-b border-r border-border/60 px-1 py-1"></th>
              {Array.from({ length: maxCuotas }).map((_, i) => (
                <Fragment key={i}>
                  <th className="border-b border-r border-border/60 px-2 py-1 text-center font-normal w-[90px] min-w-[90px]">Monto</th>
                  <th className="border-b border-r border-border/60 px-2 py-1 text-center font-normal min-w-[140px]">Fecha</th>
                </Fragment>
              ))}
              {onRemove && <th className="border-b border-l border-border/60"></th>}
            </tr>
          </thead>
          <tbody>
            {items.map((pago, idx) => (
              <tr key={pago.id} className="hover:bg-muted/10 transition-colors">
                <td className="border-b border-r border-border/40 px-2 py-1 text-center text-muted-foreground">{idx + 1}</td>

                {/* Tipo Venta */}
                <td className="border-b border-r border-border/40 px-1 py-0.5 min-w-[130px]">
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
                    <Input className="h-7 text-xs border-0 bg-transparent focus-visible:ring-0"
                      placeholder="Tipo venta" value={pago.tipoVenta}
                      onChange={e => onUpdate(tipo, pago.id, "tipoVenta", e.target.value)} />
                  )}
                </td>

                {/* N° Cuotas */}
                <td className="border-b border-r border-border/40 px-1 py-0.5">
                  <Input type="number" min={1} max={4}
                    className="h-7 text-xs text-center border-0 bg-transparent focus-visible:ring-0 font-medium text-blue-400"
                    value={pago.nCuotas}
                    onChange={e => onUpdate(tipo, pago.id, "nCuotas", e.target.value)} />
                </td>

                {/* Cuotas dinámicas */}
                {Array.from({ length: maxCuotas }).map((_, i) => {
                  const isEnabled = i < (pago.nCuotas || 1);
                  return (
                    <Fragment key={i}>
                      <td className={`border-b border-r border-border/40 px-1 py-0.5 min-w-[90px] ${!isEnabled ? "bg-muted/30" : ""}`}>
                        <Input type="number" min={0} disabled={!isEnabled}
                          className={`h-7 text-xs text-right border-0 bg-transparent focus-visible:ring-0 min-w-[72px] ${!isEnabled ? "opacity-30" : ""}`}
                          placeholder="0" value={pago.cuotas?.[i]?.monto || ""}
                          onChange={e => onUpdate(tipo, pago.id, `cuotas.${i}.monto`, parseNumeric(e.target.value))} />
                      </td>
                      <td className={`border-b border-r border-border/40 px-1 py-0.5 min-w-[140px] ${!isEnabled ? "bg-muted/30" : ""}`}>
                        {isEnabled ? (
                          <FechaContraEntrega
                            value={pago.cuotas?.[i]?.fecha || ""}
                            onChange={v => onUpdate(tipo, pago.id, `cuotas.${i}.fecha`, v)}
                          />
                        ) : (
                          <div className="h-7" />
                        )}
                      </td>
                    </Fragment>
                  );
                })}

                {onRemove && (
                  <td className="border-b border-l border-border/40 px-1 py-0.5 text-center">
                    <Button type="button" variant="ghost" size="icon"
                      className="h-6 w-6 text-destructive/60 hover:text-destructive"
                      onClick={() => onRemove(tipo, pago.id)}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
          {totalPagos > 0 && (
            <tfoot>
              <tr className="bg-muted/40 font-medium">
                <td colSpan={3} className="border-t border-r border-border/60 px-2 py-1.5 text-right text-xs">Total:</td>
                <td colSpan={2} className={`border-t border-r border-border/60 px-2 py-1.5 text-right text-xs font-bold ${hasWarning ? "text-orange-400" : "text-emerald-400"}`}>
                  {formatCurrency(totalPagos, currencyCode)}
                </td>
                <td colSpan={maxCuotas * 2 - 2} className="border-t border-border/60 px-2 py-1.5">
                   {hasWarning && <span className="text-[10px] text-orange-400/80 italic font-normal">Suma no coincide con servicios</span>}
                </td>
                {onRemove && <td className="border-t border-l border-border/60"></td>}
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

// Valores de tipoVenta que activan cada tabla (case-insensitive match parcial)
const IMPLEMENTACION_KEYWORDS = ["implementacion", "implementación", "impl"];
const MANTENCION_KEYWORDS     = ["mantencion", "mantención", "mant", "mantención"];

function matchesKeywords(value: string, keywords: string[]): boolean {
  const v = (value || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  return keywords.some(k => v.includes(k));
}

import { Fragment } from "react";
import { Badge } from "@/components/ui/badge";

export function F1FormasPago({ data, catalogs, moneda, onUpdate, onAdd, onRemove, restricted = false }: Props) {
  const currencyCode = getCurrencyCode(moneda ?? "");

  // Detectar qué tipos de venta están presentes en serviciosContratados
  const tiposPresentes = data.serviciosContratados.map(s => s.tipoVenta);
  const tieneImplementacion = tiposPresentes.some(t => matchesKeywords(t, IMPLEMENTACION_KEYWORDS));
  const tieneMantencion     = tiposPresentes.some(t => matchesKeywords(t, MANTENCION_KEYWORDS));

  // Cálculo de montos totales de servicios para validación
  const totalReferenciaImpl = data.serviciosContratados
    .filter(s => matchesKeywords(s.tipoVenta, IMPLEMENTACION_KEYWORDS))
    .reduce((sum, s) => sum + (s.total || 0), 0);

  const totalReferenciaMant = data.serviciosContratados
    .filter(s => matchesKeywords(s.tipoVenta, MANTENCION_KEYWORDS))
    .reduce((sum, s) => sum + (s.total || 0), 0);

  const mostrarAlguna = tieneImplementacion || tieneMantencion;

  if (restricted) {
    return (
      <FormSection title="Formas de Pago" icon={CreditCard} accent="indigo">
        <div className="flex items-center gap-3 py-6 px-2 text-muted-foreground">
          <ShieldOff className="w-5 h-5 shrink-0" />
          <p className="text-sm">
            <span className="font-semibold">[Restringido]</span> — No tienes acceso a la información de pagos de este expediente.
          </p>
        </div>
      </FormSection>
    );
  }

  if (!mostrarAlguna) {
    return (
      <FormSection title="Formas de Pago" icon={CreditCard} accent="indigo">
        <p className="text-sm text-muted-foreground italic">
          Agrega servicios de tipo <strong>Implementación</strong> o <strong>Mantención</strong> para habilitar las formas de pago.
        </p>
      </FormSection>
    );
  }

  return (
    <FormSection title="Formas de Pago" icon={CreditCard} accent="indigo">
      <div className="space-y-8">
        {tieneImplementacion && (
          <PagoTable
            title="Formas de Pago — Implementación"
            items={data.formasPagoImplementacion}
            tipo="formasPagoImplementacion"
            catalogs={catalogs}
            currencyCode={currencyCode}
            totalReferencia={totalReferenciaImpl}
            onUpdate={onUpdate}
            onAdd={onAdd}
            onRemove={onRemove}
          />
        )}
        {tieneMantencion && (
          <div className={tieneImplementacion ? "border-t border-border/40 pt-6" : ""}>
            <PagoTable
              title="Formas de Pago — Mantención"
              items={data.formasPagoMantencion}
              tipo="formasPagoMantencion"
              catalogs={catalogs}
              currencyCode={currencyCode}
              totalReferencia={totalReferenciaMant}
              onUpdate={onUpdate}
              onAdd={onAdd}
              onRemove={onRemove}
            />
          </div>
        )}
      </div>
    </FormSection>
  );
}
