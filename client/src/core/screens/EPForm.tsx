import { useCallback } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { FormSection, FieldGroup, PageHeader } from "@/components/FormSection";
import {
  ClipboardList, Info, Cpu, Package, Users, MoreHorizontal,
  Plus, Trash2, Save, RefreshCw, Eye, TrendingUp,
} from "lucide-react";
import {
  useEPForm, createDefaultFilaCosto, createDefaultFilaOtros,
  type FilaCosto, type FilaRRHH, type FilaOtros,
} from "@/hooks/useFormStore";
import { trpc } from "@/lib/trpc";
import { formatCurrency, parseNumeric, getStatusColor, getStatusLabel } from "@/lib/formatters";
import { Link } from "wouter";

export default function EPForm() {
  const { ep, updateEP, resetEP, saveEP, isDirty, resultado } = useEPForm();
  const { data: catalogs } = trpc.catalogs.getAll.useQuery();

  // ─── Hardware ────────────────────────────────────────────────────────────────
  const updateHardwareRow = useCallback((id: string, field: keyof FilaCosto, value: string | number) => {
    updateEP({
      hardware: ep.hardware.map(row => {
        if (row.id !== id) return row;
        const updated = { ...row, [field]: value };
        if (field === "valorNeto" || field === "cantidad") {
          updated.totalNeto = updated.valorNeto * updated.cantidad;
          updated.total = updated.totalNeto + updated.iva;
        }
        if (field === "iva") {
          updated.total = updated.totalNeto + updated.iva;
        }
        return updated;
      }),
    });
  }, [ep.hardware, updateEP]);

  const addHardwareRow = () => updateEP({ hardware: [...ep.hardware, createDefaultFilaCosto()] });
  const removeHardwareRow = (id: string) => updateEP({ hardware: ep.hardware.filter(r => r.id !== id) });

  // ─── Materiales ──────────────────────────────────────────────────────────────
  const updateMaterialesRow = useCallback((id: string, field: keyof FilaCosto, value: string | number) => {
    updateEP({
      materiales: ep.materiales.map(row => {
        if (row.id !== id) return row;
        const updated = { ...row, [field]: value };
        if (field === "valorNeto" || field === "cantidad") {
          updated.totalNeto = updated.valorNeto * updated.cantidad;
          updated.total = updated.totalNeto + updated.iva;
        }
        if (field === "iva") updated.total = updated.totalNeto + updated.iva;
        return updated;
      }),
    });
  }, [ep.materiales, updateEP]);

  const addMaterialesRow = () => updateEP({ materiales: [...ep.materiales, createDefaultFilaCosto()] });
  const removeMaterialesRow = (id: string) => updateEP({ materiales: ep.materiales.filter(r => r.id !== id) });

  // ─── RRHH ────────────────────────────────────────────────────────────────────
  const updateRRHHRow = useCallback((id: string, field: keyof FilaRRHH, value: string | number) => {
    updateEP({
      rrhh: ep.rrhh.map(row => {
        if (row.id !== id) return row;
        const updated = { ...row, [field]: value };
        if (field === "valorSinImpuesto" || field === "cantidad") {
          updated.totalNeto = updated.valorSinImpuesto * updated.cantidad;
          updated.total = updated.totalNeto + updated.impuesto;
        }
        if (field === "impuesto") updated.total = updated.totalNeto + updated.impuesto;
        return updated;
      }),
    });
  }, [ep.rrhh, updateEP]);

  // ─── Otros Gastos ────────────────────────────────────────────────────────────
  const updateOtrosRow = useCallback((id: string, field: keyof FilaOtros, value: string | number) => {
    updateEP({
      otrosGastos: ep.otrosGastos.map(row => {
        if (row.id !== id) return row;
        const updated = { ...row, [field]: value };
        if (field === "valorNeto" || field === "cantidad") {
          updated.totalNeto = updated.valorNeto * updated.cantidad;
          updated.total = updated.totalNeto + updated.iva;
        }
        if (field === "iva") updated.total = updated.totalNeto + updated.iva;
        return updated;
      }),
    });
  }, [ep.otrosGastos, updateEP]);

  const addOtrosRow = (mes: 1 | 2 | 3) => updateEP({
    otrosGastos: [...ep.otrosGastos, createDefaultFilaOtros("varios", "Varios", mes)],
  });
  const removeOtrosRow = (id: string) => updateEP({ otrosGastos: ep.otrosGastos.filter(r => r.id !== id) });

  // ─── Totals ──────────────────────────────────────────────────────────────────
  const totalHardware = ep.hardware.reduce((s, r) => s + r.total, 0);
  const totalMateriales = ep.materiales.reduce((s, r) => s + r.total, 0);
  const totalRRHH = ep.rrhh.reduce((s, r) => s + r.total, 0);
  const totalOtros = ep.otrosGastos.reduce((s, r) => s + r.total, 0);
  const totalGastos = totalHardware + totalMateriales + totalRRHH + totalOtros;

  // ─── Save ────────────────────────────────────────────────────────────────────
  const handleSave = useCallback(() => {
    if (!ep.nombreCliente && !ep.empresa) {
      toast.error("El nombre del cliente o empresa es requerido");
      return;
    }
    saveEP();
    toast.success("Evaluación de Proyecto guardada correctamente");
    // TODO: Conectar con API de Base de Datos aquí - trpc.evaluaciones.create.mutate(ep)
  }, [ep, saveEP]);

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <PageHeader
        title="Evaluación de Proyecto"
        subtitle="Formulario 2 — Desglose detallado de costos por categoría"
        badge="F2"
        badgeColor="bg-violet-50 text-violet-700 border-violet-200"
        icon={ClipboardList}
        actions={
          <div className="flex items-center gap-2">
            {isDirty && (
              <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-xs">
                Sin guardar
              </Badge>
            )}
            <Badge variant="outline" className={`text-xs ${getStatusColor(ep.status)}`}>
              {getStatusLabel(ep.status)}
            </Badge>
            <Button asChild variant="outline" size="sm">
              <Link href="/resultado">
                <Eye className="w-3.5 h-3.5 mr-1.5" /> Ver Resultado
              </Link>
            </Button>
            <Button variant="outline" size="sm" onClick={resetEP}>
              <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Limpiar
            </Button>
            <Button size="sm" onClick={handleSave}>
              <Save className="w-3.5 h-3.5 mr-1.5" /> Guardar
            </Button>
          </div>
        }
      />

      {/* Live Preview Banner */}
      <div className="bg-violet-50 border border-violet-200 rounded-xl p-3 flex items-center gap-3">
        <div className="w-7 h-7 bg-violet-100 rounded-lg flex items-center justify-center flex-shrink-0">
          <TrendingUp className="w-3.5 h-3.5 text-violet-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-violet-700">Preview en vivo activo</p>
          <p className="text-xs text-violet-600">El Formulario 3 se actualiza automáticamente mientras completas los costos.</p>
        </div>
        <div className="flex items-center gap-4 flex-shrink-0">
          <div className="text-center">
            <p className="text-xs text-violet-500">Total Gastos</p>
            <p className="text-sm font-bold text-violet-700 font-mono">{formatCurrency(totalGastos)}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-violet-500">Resultado M1</p>
            <p className={`text-sm font-bold font-mono ${resultado.resultado.mes1 >= 0 ? "text-emerald-600" : "text-red-600"}`}>
              {formatCurrency(resultado.resultado.mes1)}
            </p>
          </div>
          <Button asChild size="sm" variant="outline" className="border-violet-300 text-violet-700 hover:bg-violet-100">
            <Link href="/resultado">Ver F3 →</Link>
          </Button>
        </div>
      </div>

      {/* ── Información General ─────────────────────────────────────────────── */}
      <FormSection title="Información General del Proyecto" icon={Info} accent="violet">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <FieldGroup label="Unidad de Negocios" required>
            <Select value={ep.unidadNegocios} onValueChange={v => updateEP({ unidadNegocios: v })}>
              <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
              <SelectContent>
                {catalogs?.unidadesNegocio.map(u => (
                  <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FieldGroup>
          <FieldGroup label="Empresa">
            <Select value={ep.empresa} onValueChange={v => updateEP({ empresa: v })}>
              <SelectTrigger><SelectValue placeholder="Seleccionar empresa..." /></SelectTrigger>
              <SelectContent>
                {catalogs?.empresas.map(e => (
                  <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FieldGroup>
          <FieldGroup label="Solución">
            <Select value={ep.solucion} onValueChange={v => updateEP({ solucion: v })}>
              <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
              <SelectContent>
                {catalogs?.soluciones.map(s => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FieldGroup>
          <FieldGroup label="Nombre Cliente" required>
            <Input
              placeholder="Nombre del cliente"
              value={ep.nombreCliente}
              onChange={e => updateEP({ nombreCliente: e.target.value })}
            />
          </FieldGroup>
          <FieldGroup label="RUT / Documento">
            <Input
              placeholder="RUT o documento de identidad"
              value={ep.rut}
              onChange={e => updateEP({ rut: e.target.value })}
            />
          </FieldGroup>
          <FieldGroup label="N° Propuesta" required>
            <Input
              placeholder="Ej: 2026-EP-001"
              value={ep.propuestaNumero}
              onChange={e => updateEP({ propuestaNumero: e.target.value })}
            />
          </FieldGroup>
          <FieldGroup label="Tipo de Moneda">
            <Select value={ep.tipoMoneda} onValueChange={v => updateEP({ tipoMoneda: v })}>
              <SelectTrigger><SelectValue placeholder="Moneda..." /></SelectTrigger>
              <SelectContent>
                {catalogs?.monedas.map(m => (
                  <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FieldGroup>
          <FieldGroup label="Monto Proyecto" required>
            <Input
              type="number"
              className="text-right"
              placeholder="0.00"
              value={ep.montoProyecto || ""}
              onChange={e => updateEP({ montoProyecto: parseNumeric(e.target.value) })}
            />
          </FieldGroup>
          <FieldGroup label="Tipo de Cambio">
            <Input
              type="number"
              className="text-right"
              placeholder="1.0000"
              value={ep.tipoCambio || ""}
              onChange={e => updateEP({ tipoCambio: parseNumeric(e.target.value) })}
            />
          </FieldGroup>
          <FieldGroup label="Total CLP (calculado)">
            <div className="h-9 px-3 flex items-center bg-muted rounded-md border border-border">
              <span className="text-sm font-mono font-medium text-foreground">
                {formatCurrency(ep.totalClp, "CLP")}
              </span>
            </div>
          </FieldGroup>
          <FieldGroup label="País Implementación">
            <Select value={ep.paisImplementacion} onValueChange={v => updateEP({ paisImplementacion: v })}>
              <SelectTrigger><SelectValue placeholder="País..." /></SelectTrigger>
              <SelectContent>
                {catalogs?.paises.map(p => (
                  <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FieldGroup>
          <FieldGroup label="Plazo Implementación">
            <Select value={ep.plazoImplementacion} onValueChange={v => updateEP({ plazoImplementacion: v })}>
              <SelectTrigger><SelectValue placeholder="Plazo..." /></SelectTrigger>
              <SelectContent>
                {catalogs?.plazos.map(p => (
                  <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FieldGroup>
          <FieldGroup label="Ejecutivo Comercial">
            <Input
              placeholder="Nombre del ejecutivo"
              value={ep.ejecutivoComercial}
              onChange={e => updateEP({ ejecutivoComercial: e.target.value })}
            />
          </FieldGroup>
          <FieldGroup label="Preventa">
            <Input
              placeholder="Responsable de preventa"
              value={ep.preventa}
              onChange={e => updateEP({ preventa: e.target.value })}
            />
          </FieldGroup>
          <FieldGroup label="Fecha Entrega">
            <Input
              type="date"
              value={ep.fechaEntrega}
              onChange={e => updateEP({ fechaEntrega: e.target.value })}
            />
          </FieldGroup>
          <FieldGroup label="Descripción" className="md:col-span-2 lg:col-span-3">
            <Textarea
              placeholder="Descripción del proyecto..."
              value={ep.descripcion}
              onChange={e => updateEP({ descripcion: e.target.value })}
              rows={2}
            />
          </FieldGroup>
        </div>
      </FormSection>

      {/* ── Hardware ──────────────────────────────────────────────────────────── */}
      <FormSection title="Hardware" icon={Cpu} accent="violet" collapsible defaultOpen
        badge={formatCurrency(totalHardware)}>
        <CostTable
          rows={ep.hardware}
          catalogs={catalogs}
          onUpdate={updateHardwareRow}
          onAdd={addHardwareRow}
          onRemove={removeHardwareRow}
          total={totalHardware}
          valueLabel="Valor Neto U."
          valueField="valorNeto"
          taxLabel="IVA"
          taxField="iva"
        />
      </FormSection>

      {/* ── Materiales ────────────────────────────────────────────────────────── */}
      <FormSection title="Materiales" icon={Package} accent="violet" collapsible defaultOpen
        badge={formatCurrency(totalMateriales)}>
        <CostTable
          rows={ep.materiales}
          catalogs={catalogs}
          onUpdate={updateMaterialesRow}
          onAdd={addMaterialesRow}
          onRemove={removeMaterialesRow}
          total={totalMateriales}
          valueLabel="Valor Neto U."
          valueField="valorNeto"
          taxLabel="IVA"
          taxField="iva"
        />
      </FormSection>

      {/* ── RRHH ──────────────────────────────────────────────────────────────── */}
      <FormSection title="RRHH — Recursos Humanos" icon={Users} accent="violet" collapsible defaultOpen
        badge={formatCurrency(totalRRHH)}>
        <div className="space-y-2">
          <div className="hidden lg:grid grid-cols-10 gap-2 px-2 py-1.5 bg-muted/50 rounded-lg text-xs font-medium text-muted-foreground">
            <div className="col-span-2">Tipo</div>
            <div className="col-span-2">Centro de Costo</div>
            <div className="col-span-1 text-right">Valor s/Imp.</div>
            <div className="col-span-1">Moneda</div>
            <div className="col-span-1 text-right">Cant.</div>
            <div className="col-span-1 text-right">Total Neto</div>
            <div className="col-span-1 text-right">Impuesto</div>
            <div className="col-span-1 text-right">Total</div>
          </div>
          {ep.rrhh.map(row => (
            <div key={row.id} className="grid grid-cols-10 gap-2 items-center p-2 rounded-lg border border-border/60">
              <div className="col-span-2">
                <div className="h-9 px-3 flex items-center bg-muted/50 rounded-md border border-border text-xs font-medium text-foreground">
                  {row.label}
                </div>
              </div>
              <div className="col-span-2">
                <Select value={row.centroCosto} onValueChange={v => updateRRHHRow(row.id, "centroCosto", v)}>
                  <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="CECO..." /></SelectTrigger>
                  <SelectContent>
                    {catalogs?.cecos.map((c: any) => (
                      <SelectItem key={c.value} value={c.value} className="text-xs">{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-1">
                <Input type="number" className="h-9 text-xs text-right" placeholder="0.00"
                  value={row.valorSinImpuesto || ""}
                  onChange={e => updateRRHHRow(row.id, "valorSinImpuesto", parseNumeric(e.target.value))} />
              </div>
              <div className="col-span-1">
                <Select value={row.tipoMoneda} onValueChange={v => updateRRHHRow(row.id, "tipoMoneda", v)}>
                  <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {catalogs?.monedas.map((m: any) => (
                      <SelectItem key={m.value} value={m.value} className="text-xs">{m.value}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-1">
                <Input type="number" className="h-9 text-xs text-right" placeholder="1"
                  value={row.cantidad || ""}
                  onChange={e => updateRRHHRow(row.id, "cantidad", parseNumeric(e.target.value))} />
              </div>
              <div className="col-span-1 flex items-center h-9 justify-end">
                <span className="text-xs font-mono">{formatCurrency(row.totalNeto)}</span>
              </div>
              <div className="col-span-1">
                <Input type="number" className="h-9 text-xs text-right" placeholder="0.00"
                  value={row.impuesto || ""}
                  onChange={e => updateRRHHRow(row.id, "impuesto", parseNumeric(e.target.value))} />
              </div>
              <div className="col-span-1 flex items-center h-9 justify-end">
                <span className="text-xs font-mono font-bold">{formatCurrency(row.total)}</span>
              </div>
            </div>
          ))}
          <TotalRow label="Total RRHH" total={totalRRHH} />
        </div>
      </FormSection>

      {/* ── Otros Gastos ──────────────────────────────────────────────────────── */}
      <FormSection title="Otros Gastos" icon={MoreHorizontal} accent="violet" collapsible defaultOpen
        badge={formatCurrency(totalOtros)}>
        <div className="space-y-4">
          {[1, 2, 3].map(mes => {
            const mesFiltrado = ep.otrosGastos.filter(o => o.mes === mes);
            const totalMes = mesFiltrado.reduce((s, r) => s + r.total, 0);
            return (
              <div key={mes}>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Gastos Mes {mes}
                  </p>
                  <span className="text-xs font-mono text-muted-foreground">{formatCurrency(totalMes)}</span>
                </div>
                <OtrosTable
                  rows={mesFiltrado}
                  catalogs={catalogs}
                  onUpdate={updateOtrosRow}
                  onAdd={() => addOtrosRow(mes as 1 | 2 | 3)}
                  onRemove={removeOtrosRow}
                  total={totalMes}
                />
              </div>
            );
          })}
        </div>
      </FormSection>

      {/* ── Resumen Total ─────────────────────────────────────────────────────── */}
      <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-violet-500" />
          Resumen de Costos
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { label: "Hardware", value: totalHardware, color: "text-blue-600" },
            { label: "Materiales", value: totalMateriales, color: "text-indigo-600" },
            { label: "RRHH", value: totalRRHH, color: "text-violet-600" },
            { label: "Otros", value: totalOtros, color: "text-purple-600" },
            { label: "TOTAL GASTOS", value: totalGastos, color: "text-foreground", bold: true },
          ].map((item, i) => (
            <div key={i} className={`p-3 rounded-lg ${item.bold ? "bg-violet-50 border border-violet-200" : "bg-muted/50 border border-border"}`}>
              <p className="text-xs text-muted-foreground">{item.label}</p>
              <p className={`text-sm font-bold font-mono mt-1 ${item.color}`}>
                {formatCurrency(item.value)}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Footer ────────────────────────────────────────────────────────────── */}
      <div className="flex justify-end gap-3 pb-6">
        <Button variant="outline" onClick={resetEP}>
          <RefreshCw className="w-4 h-4 mr-2" /> Limpiar
        </Button>
        <Button asChild variant="outline">
          <Link href="/resultado">
            <Eye className="w-4 h-4 mr-2" /> Ver Resultado F3
          </Link>
        </Button>
        <Button onClick={handleSave}>
          <Save className="w-4 h-4 mr-2" /> Guardar EP
        </Button>
      </div>
    </div>
  );
}

// ─── Cost Table Component ─────────────────────────────────────────────────────

function CostTable({
  rows, catalogs, onUpdate, onAdd, onRemove, total,
  valueLabel, valueField, taxLabel, taxField,
}: {
  rows: FilaCosto[];
  catalogs: any;
  onUpdate: (id: string, field: any, value: any) => void;
  onAdd: () => void;
  onRemove: (id: string) => void;
  total: number;
  valueLabel: string;
  valueField: "valorNeto";
  taxLabel: string;
  taxField: "iva";
}) {
  return (
    <div className="space-y-2">
      <div className="hidden lg:grid grid-cols-10 gap-2 px-2 py-1.5 bg-muted/50 rounded-lg text-xs font-medium text-muted-foreground">
        <div className="col-span-2">Centro de Costo</div>
        <div className="col-span-1 text-right">{valueLabel}</div>
        <div className="col-span-1">Moneda</div>
        <div className="col-span-1 text-right">Cant.</div>
        <div className="col-span-1 text-right">Total Neto</div>
        <div className="col-span-1 text-right">{taxLabel}</div>
        <div className="col-span-1 text-right">Total</div>
        <div className="col-span-2">Descripción / Obs.</div>
      </div>
      {rows.map(row => (
        <div key={row.id} className="grid grid-cols-10 gap-2 items-center p-2 rounded-lg border border-border/60 hover:border-border transition-colors">
          <div className="col-span-2">
            <Select value={row.centroCosto} onValueChange={v => onUpdate(row.id, "centroCosto", v)}>
              <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="CECO..." /></SelectTrigger>
              <SelectContent>
                {catalogs?.cecos.map((c: any) => (
                  <SelectItem key={c.value} value={c.value} className="text-xs">{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-1">
            <Input type="number" className="h-9 text-xs text-right" placeholder="0.00"
              value={row[valueField] || ""}
              onChange={e => onUpdate(row.id, valueField, parseNumeric(e.target.value))} />
          </div>
          <div className="col-span-1">
            <Select value={row.tipoMoneda} onValueChange={v => onUpdate(row.id, "tipoMoneda", v)}>
              <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {catalogs?.monedas.map((m: any) => (
                  <SelectItem key={m.value} value={m.value} className="text-xs">{m.value}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-1">
            <Input type="number" className="h-9 text-xs text-right" placeholder="1"
              value={row.cantidad || ""}
              onChange={e => onUpdate(row.id, "cantidad", parseNumeric(e.target.value))} />
          </div>
          <div className="col-span-1 flex items-center h-9 justify-end">
            <span className="text-xs font-mono">{formatCurrency(row.totalNeto)}</span>
          </div>
          <div className="col-span-1">
            <Input type="number" className="h-9 text-xs text-right" placeholder="0.00"
              value={row[taxField] || ""}
              onChange={e => onUpdate(row.id, taxField, parseNumeric(e.target.value))} />
          </div>
          <div className="col-span-1 flex items-center h-9 justify-end">
            <span className="text-xs font-mono font-bold">{formatCurrency(row.total)}</span>
          </div>
          <div className="col-span-2 flex gap-1">
            <Input className="h-9 text-xs flex-1" placeholder="Descripción..."
              value={row.descripcionGasto}
              onChange={e => onUpdate(row.id, "descripcionGasto", e.target.value)} />
            <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-destructive flex-shrink-0"
              onClick={() => onRemove(row.id)} disabled={rows.length <= 1}>
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      ))}
      <div className="flex items-center justify-between pt-1">
        <Button variant="outline" size="sm" onClick={onAdd}>
          <Plus className="w-3.5 h-3.5 mr-1.5" /> Agregar fila
        </Button>
        <TotalRow label="Total" total={total} inline />
      </div>
    </div>
  );
}

function OtrosTable({ rows, catalogs, onUpdate, onAdd, onRemove, total }: {
  rows: FilaOtros[];
  catalogs: any;
  onUpdate: (id: string, field: any, value: any) => void;
  onAdd: () => void;
  onRemove: (id: string) => void;
  total: number;
}) {
  return (
    <div className="space-y-2">
      {rows.map(row => (
        <div key={row.id} className="grid grid-cols-10 gap-2 items-center p-2 rounded-lg border border-border/60">
          <div className="col-span-2">
            <Select value={row.tipo} onValueChange={v => onUpdate(row.id, "tipo", v)}>
              <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {[
                  { value: "comision", label: "Comisión" },
                  { value: "movilizacion", label: "Movilización" },
                  { value: "viatico", label: "Viático" },
                  { value: "alojamiento", label: "Alojamiento" },
                  { value: "varios", label: "Varios" },
                ].map(t => <SelectItem key={t.value} value={t.value} className="text-xs">{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-2">
            <Select value={row.centroCosto} onValueChange={v => onUpdate(row.id, "centroCosto", v)}>
              <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="CECO..." /></SelectTrigger>
              <SelectContent>
                {catalogs?.cecos.map((c: any) => (
                  <SelectItem key={c.value} value={c.value} className="text-xs">{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-1">
            <Input type="number" className="h-9 text-xs text-right" placeholder="0.00"
              value={row.valorNeto || ""}
              onChange={e => onUpdate(row.id, "valorNeto", parseNumeric(e.target.value))} />
          </div>
          <div className="col-span-1">
            <Input type="number" className="h-9 text-xs text-right" placeholder="1"
              value={row.cantidad || ""}
              onChange={e => onUpdate(row.id, "cantidad", parseNumeric(e.target.value))} />
          </div>
          <div className="col-span-1 flex items-center h-9 justify-end">
            <span className="text-xs font-mono">{formatCurrency(row.totalNeto)}</span>
          </div>
          <div className="col-span-1">
            <Input type="number" className="h-9 text-xs text-right" placeholder="0.00"
              value={row.iva || ""}
              onChange={e => onUpdate(row.id, "iva", parseNumeric(e.target.value))} />
          </div>
          <div className="col-span-1 flex items-center h-9 justify-end">
            <span className="text-xs font-mono font-bold">{formatCurrency(row.total)}</span>
          </div>
          <div className="col-span-1 flex justify-end">
            <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-destructive"
              onClick={() => onRemove(row.id)}>
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      ))}
      <div className="flex items-center justify-between pt-1">
        <Button variant="outline" size="sm" onClick={onAdd}>
          <Plus className="w-3.5 h-3.5 mr-1.5" /> Agregar gasto
        </Button>
        <TotalRow label="Total Mes" total={total} inline />
      </div>
    </div>
  );
}

function TotalRow({ label, total, inline }: { label: string; total: number; inline?: boolean }) {
  if (inline) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">{label}:</span>
        <span className="text-sm font-bold font-mono text-foreground">{formatCurrency(total)}</span>
      </div>
    );
  }
  return (
    <div className="flex items-center justify-between bg-muted/50 rounded-lg px-3 py-2 mt-2">
      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{label}</span>
      <span className="text-sm font-bold font-mono text-foreground">{formatCurrency(total)}</span>
    </div>
  );
}
