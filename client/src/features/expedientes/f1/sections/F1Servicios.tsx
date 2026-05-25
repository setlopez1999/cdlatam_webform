/**
 * ActaServicios — Tabla de Servicios Contratados del Acta
 *
 * Usa tabla HTML real (<table>) con overflow-x-auto para scroll horizontal.
 * Los SelectContent usan position="popper" para renderizarse fuera del
 * contenedor con overflow, evitando la superposición de dropdowns.
 */
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FormSection } from "@/components/FormSection";
import { Briefcase, Plus, Trash2, ShieldOff } from "lucide-react";
import type { F1Data, ServicioContratado } from "../../types";
import { formatCurrency, getCurrencyCode, parseNumeric } from "@/lib/formatters";

interface CatalogItem { value: string; label: string; id?: number; unidadNegocioId?: number; solucionId?: number; }
interface Catalogs {
  unidadesNegocio?: CatalogItem[];
  soluciones?: CatalogItem[];
  detalleServicio?: readonly CatalogItem[] | CatalogItem[];
  tipoVenta?: readonly CatalogItem[] | CatalogItem[];
  plazos?: readonly CatalogItem[] | CatalogItem[];
}

interface Props {
  servicios: F1Data["serviciosContratados"];
  catalogs?: Catalogs;
  moneda?: string;
  onAdd: () => void;
  onAddVenta?: () => void;
  onRemove: (id: string) => void;
  onUpdate: (id: string, field: keyof ServicioContratado, value: string | number) => void;
  /** Si true, oculta valores unitarios, totales y descuentos — muestra solo servicio y tipo */
  restricted?: boolean;
}

export function F1Servicios({ servicios, catalogs, moneda, onAdd, onAddVenta, onRemove, onUpdate, restricted = false }: Props) {
  const currencyCode = getCurrencyCode(moneda ?? "");
  const totalServicios = servicios.reduce((sum, s) => sum + s.total, 0);

  return (
    <FormSection title="Servicios Contratados" icon={Briefcase} accent="indigo">
      <div className="space-y-3">

        {/* Tabla con scroll horizontal — SelectContent usa portal para no quedar recortado */}
        <div className="overflow-x-auto rounded-lg border border-border/40">
          <table className="w-full min-w-[1100px] border-collapse text-xs">
            <thead>
              <tr className="bg-muted/60 text-muted-foreground">
                <th className="px-2 py-2 text-left font-medium w-8 border-b border-border/40">#</th>
                <th className="px-2 py-2 text-left font-medium w-[160px] border-b border-border/40">Unidad Negocio</th>
                <th className="px-2 py-2 text-left font-medium w-[160px] border-b border-border/40">Solución</th>
                <th className="px-2 py-2 text-left font-medium w-[160px] border-b border-border/40">Detalle Servicio</th>
                <th className="px-2 py-2 text-left font-medium w-[110px] border-b border-border/40">Tipo Venta</th>
                <th className="px-2 py-2 text-right font-medium w-[105px] min-w-[105px] border-b border-border/40">Valor Unit.</th>
                <th className="px-2 py-2 text-right font-medium w-[75px] min-w-[75px] border-b border-border/40">Cant.</th>
                <th className="px-2 py-2 text-right font-medium w-[100px] border-b border-border/40">Total</th>
                <th className="px-2 py-2 text-left font-medium w-[110px] border-b border-border/40">Plazo</th>
                <th className="px-2 py-2 w-8 border-b border-border/40"></th>
              </tr>
            </thead>
            <tbody>
              {servicios.map((servicio, idx) => {
                // Filtrar soluciones basadas en la unidad de negocio seleccionada
                const selectedUnidad = catalogs?.unidadesNegocio?.find(u => u.value === servicio.unidadNegocio);
                const filteredSoluciones = catalogs?.soluciones?.filter(s => {
                  if (!servicio.unidadNegocio) return true;
                  return s.unidadNegocioId === selectedUnidad?.id;
                });
                // Filtrar detalles basados en la solución seleccionada
                const selectedSolucion = catalogs?.soluciones?.find(s => s.value === servicio.solucion);
                const filteredDetalles = (catalogs?.detalleServicio as CatalogItem[] | undefined)?.filter(d => {
                  if (!servicio.solucion) return true;
                  return d.solucionId === selectedSolucion?.id;
                });
                return (
                  <tr key={servicio.id} className="border-b border-border/20 last:border-b-0 hover:bg-muted/20 transition-colors">

                    {/* # */}
                    <td className="px-2 py-1 text-center text-muted-foreground font-mono">{idx + 1}</td>

                    {/* Unidad de Negocio */}
                    <td className="px-1 py-1">
                      <Select value={servicio.unidadNegocio} onValueChange={v => onUpdate(servicio.id, "unidadNegocio", v)}>
                        <SelectTrigger className="h-8 text-xs w-full max-w-full overflow-hidden">
                          <SelectValue placeholder="Unidad..." className="truncate" />
                        </SelectTrigger>
                        <SelectContent position="popper" sideOffset={4} className="z-[200]">
                          {catalogs?.unidadesNegocio?.map(u => (
                            <SelectItem key={u.value} value={u.value} className="text-xs">{u.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>

                    {/* Solución */}
                    <td className="px-1 py-1">
                      <Select value={servicio.solucion} onValueChange={v => onUpdate(servicio.id, "solucion", v)}>
                        <SelectTrigger className="h-8 text-xs w-full max-w-full overflow-hidden">
                          <SelectValue placeholder="Solución..." className="truncate" />
                        </SelectTrigger>
                        <SelectContent position="popper" sideOffset={4} className="z-[200]">
                          {filteredSoluciones?.map(s => (
                            <SelectItem key={s.value} value={s.value} className="text-xs">{s.label}</SelectItem>
                          ))}
                          {(!filteredSoluciones || filteredSoluciones.length === 0) && (
                            <div className="p-2 text-[10px] text-muted-foreground text-center italic">
                              No hay soluciones para esta unidad
                            </div>
                          )}
                        </SelectContent>
                      </Select>
                    </td>

                    {/* Detalle Servicio */}
                    <td className="px-1 py-1">
                      <Select value={servicio.detalleServicio} onValueChange={v => onUpdate(servicio.id, "detalleServicio", v)}>
                        <SelectTrigger className="h-8 text-xs w-full max-w-full overflow-hidden">
                          <SelectValue placeholder="Detalle..." className="truncate" />
                        </SelectTrigger>
                        <SelectContent position="popper" sideOffset={4} className="z-[200]">
                          {filteredDetalles?.map(d => (
                            <SelectItem key={d.value} value={d.value} className="text-xs">{d.label}</SelectItem>
                          ))}
                          {(!filteredDetalles || filteredDetalles.length === 0) && (
                            <div className="p-2 text-[10px] text-muted-foreground text-center italic">
                              {servicio.solucion ? "No hay detalles para esta solución" : "Selecciona una solución primero"}
                            </div>
                          )}
                        </SelectContent>
                      </Select>
                    </td>

                    {/* Tipo Venta */}
                    <td className="px-1 py-1">
                      <Select value={servicio.tipoVenta} onValueChange={v => onUpdate(servicio.id, "tipoVenta", v)}>
                        <SelectTrigger className="h-8 text-xs w-full max-w-full overflow-hidden">
                          <SelectValue placeholder="Tipo..." className="truncate" />
                        </SelectTrigger>
                        <SelectContent position="popper" sideOffset={4} className="z-[200]">
                          {catalogs?.tipoVenta?.map(t => (
                            <SelectItem key={t.value} value={t.value} className="text-xs">{t.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>

                    {/* Valor Unitario */}
                    <td className="px-1 py-1 min-w-[105px]">
                      {restricted
                        ? <span className="text-muted-foreground italic text-xs">[Restringido]</span>
                        : <Input type="number" className="h-8 text-xs text-right w-full min-w-[85px]" placeholder="0.00" value={servicio.precioUnitario || ""} onChange={e => onUpdate(servicio.id, "precioUnitario", parseNumeric(e.target.value))} />
                      }
                    </td>

                    {/* Cantidad */}
                    <td className="px-1 py-1 min-w-[75px]">
                      {restricted
                        ? <span className="text-muted-foreground italic text-xs">[Restringido]</span>
                        : <Input type="number" className="h-8 text-xs text-right w-full min-w-[58px]" placeholder="1" value={servicio.cantidad || ""} onChange={e => onUpdate(servicio.id, "cantidad", parseNumeric(e.target.value))} />
                      }
                    </td>

                    {/* Total (calculado) */}
                    <td className="px-2 py-1 text-right font-mono font-medium text-foreground">
                      {restricted ? <span className="text-muted-foreground italic text-xs">[Restringido]</span> : formatCurrency(servicio.total, currencyCode)}
                    </td>

                    {/* Plazo */}
                    <td className="px-1 py-1">
                      <Select value={servicio.plazo} onValueChange={v => onUpdate(servicio.id, "plazo", v)}>
                        <SelectTrigger className="h-8 text-xs w-full max-w-full overflow-hidden">
                          <SelectValue placeholder="Plazo..." className="truncate" />
                        </SelectTrigger>
                        <SelectContent position="popper" sideOffset={4} className="z-[200]">
                          {catalogs?.plazos?.map(p => (
                            <SelectItem key={p.value} value={p.value} className="text-xs">{p.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>

                    {/* Eliminar */}
                    <td className="px-1 py-1 text-center">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        onClick={() => onRemove(servicio.id)}
                        disabled={servicios.length <= 1}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Footer: botón agregar + total */}
        {!restricted && (
          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={onAdd}>
                <Plus className="w-3.5 h-3.5 mr-1.5" /> Agregar Servicio
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={onAddVenta}
                className="border-orange-300 text-orange-700 hover:bg-orange-50 hover:text-orange-800"
              >
                <Plus className="w-3.5 h-3.5 mr-1.5" /> Agregar Venta
              </Button>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">Total Servicios:</span>
              <span className="text-base font-bold text-foreground font-mono">
                {formatCurrency(totalServicios, currencyCode)}
              </span>
            </div>
          </div>
        )}

      </div>
    </FormSection>
  );
}
