/**
 * features/expedientes/f1/sections/F1FormasPago.tsx
 *
 * Obs. 8: Solo muestra la tabla de Implementación si hay servicios de tipo Implementación,
 *         y la de Mantención solo si hay servicios de tipo Mantención.
 * Obs. 9: El campo tipoVenta de cada fila se pre-selecciona automáticamente
 *         según los tipos de venta presentes en serviciosContratados.
 * Obs. 10: El campo Fecha de cada cuota tiene la opción "Contra entrega" además de fecha.
 */
import { Fragment } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FormSection } from "@/components/FormSection";
import { Badge } from "@/components/ui/badge";
import { CreditCard, Plus, Trash2, ShieldOff } from "lucide-react";
import type { F1Data, FormaPago, FormaPagoHitos } from "../../types";
import { formatCurrency, getCurrencyCode, parseNumeric } from "@/lib/formatters";
import { isTipoImplementacion, isTipoImplementacionHitos, isTipoMantencion } from "../f1TipoVenta";

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
  onUpdateHitos: (formaPagoId: string, field: string, value: string | number) => void;
  onAddHito: (formaPagoId: string) => void;
  onRemoveHito: (formaPagoId: string, hitoId: string) => void;
  /** Si true, oculta montos y detalles de pago y muestra placeholder de acceso restringido */
  restricted?: boolean;
}

// ─── Subcomponente: campo de fecha con opción "Contra entrega" ────────────────

interface FechaContraEntregaProps {
  value: string;
  onChange: (v: string) => void;
}

interface PagoHitosTableProps {
  items: FormaPagoHitos[];
  currencyCode?: string;
  totalReferenciaByServicio: Record<string, number>;
  onUpdateHitos: Props["onUpdateHitos"];
  onAddHito: Props["onAddHito"];
  onRemoveHito: Props["onRemoveHito"];
}

function PagoHitosTable({
  items,
  currencyCode = "USD",
  totalReferenciaByServicio,
  onUpdateHitos,
  onAddHito,
  onRemoveHito,
}: PagoHitosTableProps) {
  const safeItems = Array.isArray(items) ? items : [];
  return (
    <div className="space-y-4">
      <h4 className="text-sm font-semibold text-foreground">Formas de Pago — Implementación Hitos</h4>

      {safeItems.map((pago, idx) => {
        const totalHitos = pago.hitos.reduce((sum, h) => sum + (h.precioHito || 0), 0);
        const totalRef = totalReferenciaByServicio[pago.linkedServicioId ?? ""] ?? 0;
        const hasWarning = totalRef > 0 && Math.abs(totalHitos - totalRef) > 0.1;
        return (
          <div key={pago.id} className="rounded-lg border border-border/60 p-3 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="text-xs text-muted-foreground">
                <span className="font-medium text-foreground">Ítem {idx + 1}</span>
                {" · "}
                <span>{pago.tipoVenta || "Implementación Hitos"}</span>
              </div>
              <div className="flex items-center gap-2">
                {hasWarning && (
                  <Badge variant="outline" className="bg-orange-500/10 text-orange-400 border-orange-500/20 text-[10px] py-0 px-2">
                    La suma de hitos no coincide con el total del servicio ({formatCurrency(totalRef, currencyCode)})
                  </Badge>
                )}
                <Button type="button" variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => onAddHito(pago.id)}>
                  <Plus className="w-3 h-3" /> Agregar hito
                </Button>
              </div>
            </div>

            <div className="overflow-x-auto rounded-lg border border-border/40">
              <table className="w-full min-w-[720px] text-xs border-collapse">
                <thead>
                  <tr className="bg-muted/60">
                    <th className="border-b border-r border-border/60 px-2 py-2 text-left font-medium w-10">#</th>
                    <th className="border-b border-r border-border/60 px-2 py-2 text-left font-medium">Nombre hito</th>
                    <th className="border-b border-r border-border/60 px-2 py-2 text-right font-medium w-[130px]">Precio hito</th>
                    <th className="border-b border-r border-border/60 px-2 py-2 text-left font-medium">Condiciones</th>
                    <th className="border-b border-border/60 px-2 py-2 w-8"></th>
                  </tr>
                </thead>
                <tbody>
                  {pago.hitos.map((hito, hIdx) => (
                    <tr key={hito.id} className="hover:bg-muted/10 transition-colors border-b border-border/20 last:border-b-0">
                      <td className="px-2 py-1 text-center text-muted-foreground">{hIdx + 1}</td>
                      <td className="px-1 py-1">
                        <Input
                          className="h-7 text-xs"
                          placeholder="Nombre del hito"
                          value={hito.nombreHito}
                          onChange={e => onUpdateHitos(pago.id, `hitos.${hIdx}.nombreHito`, e.target.value)}
                        />
                      </td>
                      <td className="px-1 py-1">
                        <Input
                          type="number"
                          min={0}
                          className="h-7 text-xs text-right"
                          placeholder="0"
                          value={hito.precioHito || ""}
                          onChange={e => onUpdateHitos(pago.id, `hitos.${hIdx}.precioHito`, parseNumeric(e.target.value))}
                        />
                      </td>
                      <td className="px-1 py-1">
                        <Input
                          className="h-7 text-xs"
                          placeholder="Condición de cumplimiento"
                          value={hito.condicion}
                          onChange={e => onUpdateHitos(pago.id, `hitos.${hIdx}.condicion`, e.target.value)}
                        />
                      </td>
                      <td className="px-1 py-1 text-center">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-destructive/60 hover:text-destructive"
                          onClick={() => onRemoveHito(pago.id, hito.id)}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-muted/40 font-medium">
                    <td colSpan={2} className="border-t border-r border-border/60 px-2 py-1.5 text-right">Total hitos:</td>
                    <td className={`border-t border-r border-border/60 px-2 py-1.5 text-right font-bold ${hasWarning ? "text-orange-400" : "text-emerald-400"}`}>
                      {formatCurrency(totalHitos, currencyCode)}
                    </td>
                    <td colSpan={2} className="border-t border-border/60 px-2 py-1.5 text-[10px] text-muted-foreground">
                      {hasWarning ? "Revisar suma de hitos vs total del servicio" : "Suma de hitos validada"}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        );
      })}
    </div>
  );
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
  /** Mantención: cuotas de gracia manuales vs valor unitario; sin validación de suma vs total servicio. */
  modo?: "implementacion" | "mantencion";
  catalogs?: Catalogs;
  currencyCode?: string;
  totalReferencia: number; // Monto total esperado según servicios (solo Implementación)
  /** Total descuento acumulado F1 (Mantención). */
  totalDescuentoMantencion?: number;
  precioUnitarioByServicioId?: Record<string, number>;
  onUpdate: Props["onUpdate"];
  onAdd?: Props["onAdd"];
  onRemove?: Props["onRemove"];
}

function PagoTable({
  title, items, tipo, modo = "implementacion", catalogs, currencyCode = "USD", totalReferencia,
  totalDescuentoMantencion = 0,
  precioUnitarioByServicioId = {},
  onUpdate, onAdd, onRemove,
}: PagoTableProps) {
  const esMantencion = modo === "mantencion";
  // Determinar cuántas columnas de cuotas mostrar (máximo de nCuotas en esta tabla, min 1, max 4)
  const maxCuotas = Math.min(4, Math.max(1, ...items.map(i => i.nCuotas || 0)));
  
  const totalPagos = items.reduce(
    (sum, i) => sum + i.cuotas.reduce((s, c) => s + (c.monto || 0), 0), 0
  );

  const diff = Math.abs(totalPagos - totalReferencia);
  const hasWarning = !esMantencion && diff > 0.1 && totalReferencia > 0;

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-1">
        <div className="flex flex-wrap items-center gap-3">
          <h4 className="text-sm font-semibold text-foreground">{title}</h4>
          {esMantencion && (
            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/25 text-[10px] py-0 px-2">
              Ahorro total (cuotas de gracia): {formatCurrency(totalDescuentoMantencion, currencyCode)}
            </Badge>
          )}
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
              <th className="border-b border-r border-border/60 px-2 py-2 text-center font-medium w-16">
                {esMantencion ? "N° Cuotas de Gracia" : "N° Cuotas"}
              </th>
              {Array.from({ length: maxCuotas }).map((_, i) => (
                <th key={i} className="border-b border-r border-border/60 px-2 py-2 text-center font-medium" colSpan={2}>
                  {esMantencion ? `Cuota de gracia ${i + 1}` : `Cuota ${i + 1}`}
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
                  <div className="space-y-0.5">
                    {catalogs?.tipoVenta && catalogs.tipoVenta.length > 0 ? (
                      <Select
                        value={pago.tipoVenta}
                        onValueChange={v => onUpdate(tipo, pago.id, "tipoVenta", v)}
                      >
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
                    {esMantencion && pago.linkedServicioId && precioUnitarioByServicioId[pago.linkedServicioId] !== undefined && (
                      <div className="text-[10px] text-muted-foreground px-0.5">
                        Ref. mensual (VU): {formatCurrency(precioUnitarioByServicioId[pago.linkedServicioId] ?? 0, currencyCode)}
                      </div>
                    )}
                  </div>
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
          {(esMantencion ? totalDescuentoMantencion > 0 || totalPagos > 0 : totalPagos > 0) && (
            <tfoot>
              <tr className="bg-muted/40 font-medium">
                <td colSpan={3} className="border-t border-r border-border/60 px-2 py-1.5 text-right text-xs">
                  {esMantencion ? "Suma montos ingresados (gracia):" : "Total:"}
                </td>
                <td colSpan={2} className={`border-t border-r border-border/60 px-2 py-1.5 text-right text-xs font-bold ${hasWarning ? "text-orange-400" : esMantencion ? "text-foreground" : "text-emerald-400"}`}>
                  {formatCurrency(totalPagos, currencyCode)}
                </td>
                <td colSpan={maxCuotas * 2 - 2} className="border-t border-border/60 px-2 py-1.5">
                  {esMantencion ? (
                    <span className="text-[10px] text-muted-foreground font-normal">
                      Ahorro acumulado F1: {formatCurrency(totalDescuentoMantencion, currencyCode)}
                    </span>
                  ) : (
                    hasWarning && <span className="text-[10px] text-orange-400/80 italic font-normal">Suma no coincide con servicios</span>
                  )}
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

export function F1FormasPago({
  data,
  catalogs,
  moneda,
  onUpdate,
  onAdd,
  onRemove,
  onUpdateHitos,
  onAddHito,
  onRemoveHito,
  restricted = false,
}: Props) {
  const currencyCode = getCurrencyCode(moneda ?? "");
  const hitosItems = data.formasPagoImplementacionHitos ?? [];

  const tieneImplementacion = data.serviciosContratados.some(s => isTipoImplementacion(s.tipoVenta));
  const tieneMantencion = data.serviciosContratados.some(s => isTipoMantencion(s.tipoVenta));
  const tieneImplementacionHitos = data.serviciosContratados.some(s => isTipoImplementacionHitos(s.tipoVenta));

  const totalReferenciaImpl = data.serviciosContratados
    .filter(s => isTipoImplementacion(s.tipoVenta))
    .reduce((sum, s) => sum + (s.total || 0), 0);

  const totalReferenciaMant = data.serviciosContratados
    .filter(s => isTipoMantencion(s.tipoVenta))
    .reduce((sum, s) => sum + (s.total || 0), 0);

  const precioUnitarioByServicioId = data.serviciosContratados.reduce<Record<string, number>>((acc, s) => {
    acc[s.id] = s.precioUnitario ?? 0;
    return acc;
  }, {});

  const totalReferenciaHitosByServicio = data.serviciosContratados
    .filter(s => isTipoImplementacionHitos(s.tipoVenta))
    .reduce<Record<string, number>>((acc, s) => {
      acc[s.id] = s.total || 0;
      return acc;
    }, {});

  const mostrarAlguna = tieneImplementacion || tieneMantencion || tieneImplementacionHitos;

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
          Agrega servicios de tipo <strong>Implementación</strong>, <strong>Implementación Hitos</strong> o <strong>Mantención</strong> para habilitar las formas de pago.
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
              modo="mantencion"
              catalogs={catalogs}
              currencyCode={currencyCode}
              totalReferencia={totalReferenciaMant}
              totalDescuentoMantencion={data.total_descuento_mantencion ?? 0}
              precioUnitarioByServicioId={precioUnitarioByServicioId}
              onUpdate={onUpdate}
              onAdd={onAdd}
              onRemove={onRemove}
            />
          </div>
        )}
        {tieneImplementacionHitos && (
          <div className={tieneImplementacion || tieneMantencion ? "border-t border-border/40 pt-6" : ""}>
            <PagoHitosTable
              items={hitosItems}
              currencyCode={currencyCode}
              totalReferenciaByServicio={totalReferenciaHitosByServicio}
              onUpdateHitos={onUpdateHitos}
              onAddHito={onAddHito}
              onRemoveHito={onRemoveHito}
            />
          </div>
        )}
      </div>
    </FormSection>
  );
}
