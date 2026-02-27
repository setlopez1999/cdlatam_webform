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
import { Briefcase, Plus, Trash2 } from "lucide-react";
import type { ActaData, ServicioContratado } from "@/hooks/useFormStore";
import { formatCurrency, getCurrencyCode, parseNumeric } from "@/lib/formatters";

interface CatalogItem { value: string; label: string; }
interface Catalogs {
  unidadesNegocio?: readonly CatalogItem[] | CatalogItem[];
  soluciones?: readonly CatalogItem[] | CatalogItem[];
  detalleServicio?: readonly CatalogItem[] | CatalogItem[];
  tipoVenta?: readonly CatalogItem[] | CatalogItem[];
  plazos?: readonly CatalogItem[] | CatalogItem[];
}

interface Props {
  servicios: ActaData["serviciosContratados"];
  catalogs?: Catalogs;
  moneda?: string;
  onAdd: () => void;
  onRemove: (id: string) => void;
  onUpdate: (id: string, field: keyof ServicioContratado, value: string | number) => void;
}

export function ActaServicios({ servicios, catalogs, moneda, onAdd, onRemove, onUpdate }: Props) {
  const currencyCode = getCurrencyCode(moneda ?? "");
  const totalServicios = servicios.reduce((sum, s) => sum + s.total, 0);

  return (
    <FormSection title="Servicios Contratados" icon={Briefcase} accent="indigo">
      <div className="space-y-3">

        {/* Tabla con scroll horizontal — SelectContent usa portal para no quedar recortado */}
        <div className="overflow-x-auto rounded-lg border border-border/40">
          <table className="w-full min-w-[920px] border-collapse text-xs">
            <thead>
              <tr className="bg-muted/60 text-muted-foreground">
                <th className="px-2 py-2 text-left font-medium w-8 border-b border-border/40">#</th>
                <th className="px-2 py-2 text-left font-medium w-[160px] border-b border-border/40">Unidad Negocio</th>
                <th className="px-2 py-2 text-left font-medium w-[160px] border-b border-border/40">Solución</th>
                <th className="px-2 py-2 text-left font-medium w-[160px] border-b border-border/40">Detalle Servicio</th>
                <th className="px-2 py-2 text-left font-medium w-[110px] border-b border-border/40">Tipo Venta</th>
                <th className="px-2 py-2 text-right font-medium w-[90px] border-b border-border/40">Valor Unit.</th>
                <th className="px-2 py-2 text-right font-medium w-[60px] border-b border-border/40">Cant.</th>
                <th className="px-2 py-2 text-right font-medium w-[90px] border-b border-border/40">Total</th>
                <th className="px-2 py-2 text-left font-medium w-[100px] border-b border-border/40">Plazo</th>
                <th className="px-2 py-2 w-8 border-b border-border/40"></th>
              </tr>
            </thead>
            <tbody>
              {servicios.map((servicio, idx) => (
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
                        {catalogs?.soluciones?.map(s => (
                          <SelectItem key={s.value} value={s.value} className="text-xs">{s.label}</SelectItem>
                        ))}
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
                        {catalogs?.detalleServicio?.map(d => (
                          <SelectItem key={d.value} value={d.value} className="text-xs">{d.label}</SelectItem>
                        ))}
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
                  <td className="px-1 py-1">
                    <Input
                      type="number"
                      className="h-8 text-xs text-right w-full"
                      placeholder="0.00"
                      value={servicio.valorUnitario || ""}
                      onChange={e => onUpdate(servicio.id, "valorUnitario", parseNumeric(e.target.value))}
                    />
                  </td>

                  {/* Cantidad */}
                  <td className="px-1 py-1">
                    <Input
                      type="number"
                      className="h-8 text-xs text-right w-full"
                      placeholder="1"
                      value={servicio.cantidad || ""}
                      onChange={e => onUpdate(servicio.id, "cantidad", parseNumeric(e.target.value))}
                    />
                  </td>

                  {/* Total (calculado) */}
                  <td className="px-2 py-1 text-right font-mono font-medium text-foreground">
                    {formatCurrency(servicio.total, currencyCode)}
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
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer: botón agregar + total */}
        <div className="flex items-center justify-between pt-2">
          <Button variant="outline" size="sm" onClick={onAdd}>
            <Plus className="w-3.5 h-3.5 mr-1.5" /> Agregar Servicio
          </Button>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">Total Servicios:</span>
            <span className="text-base font-bold text-foreground font-mono">
              {formatCurrency(totalServicios, currencyCode)}
            </span>
          </div>
        </div>

      </div>
    </FormSection>
  );
}
