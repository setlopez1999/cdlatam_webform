import { useCallback } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { FormSection, FieldGroup, PageHeader } from "@/components/FormSection";
import {
  FileText, Building2, Users, Briefcase, CreditCard,
  Plus, Trash2, Save, RefreshCw, Download, Eye,
} from "lucide-react";
import {
  useActaForm, createDefaultServicio, createDefaultFormaPago,
  type ServicioContratado, type FormaPago,
} from "@/hooks/useFormStore";
import { trpc } from "@/lib/trpc";
import { formatCurrency, parseNumeric, getStatusColor, getStatusLabel } from "@/lib/formatters";
import { generateActaPDF } from "@/lib/pdfExport";

export default function ActaForm() {
  const { acta, updateActa, resetActa, saveActa, isDirty } = useActaForm();
  const { data: catalogs } = trpc.catalogs.getAll.useQuery();

  // ─── Servicios Contratados ──────────────────────────────────────────────────
  const addServicio = useCallback(() => {
    const nextItem = acta.serviciosContratados.length + 1;
    updateActa({
      serviciosContratados: [...acta.serviciosContratados, createDefaultServicio(nextItem)],
    });
  }, [acta.serviciosContratados, updateActa]);

  const removeServicio = useCallback((id: string) => {
    updateActa({
      serviciosContratados: acta.serviciosContratados.filter(s => s.id !== id),
    });
  }, [acta.serviciosContratados, updateActa]);

  const updateServicio = useCallback((id: string, field: keyof ServicioContratado, value: string | number) => {
    updateActa({
      serviciosContratados: acta.serviciosContratados.map(s => {
        if (s.id !== id) return s;
        const updated = { ...s, [field]: value };
        if (field === "valorUnitario" || field === "cantidad") {
          updated.total = updated.valorUnitario * updated.cantidad;
        }
        return updated;
      }),
    });
  }, [acta.serviciosContratados, updateActa]);

  // ─── Formas de Pago ─────────────────────────────────────────────────────────
  const updateFormaPago = useCallback((
    type: "formasPagoImplementacion" | "formasPagoMantencion",
    id: string,
    field: string,
    value: string | number
  ) => {
    const list = acta[type];
    updateActa({
      [type]: list.map(fp => {
        if (fp.id !== id) return fp;
        if (field.includes(".")) {
          const [parent, child] = field.split(".");
          return { ...fp, [parent]: { ...(fp as any)[parent], [child]: value } };
        }
        return { ...fp, [field]: value };
      }),
    });
  }, [acta, updateActa]);

  // ─── Save & Export ──────────────────────────────────────────────────────────
  const handleSave = useCallback(() => {
    if (!acta.razonSocial) {
      toast.error("La Razón Social es requerida");
      return;
    }
    saveActa();
    toast.success("Acta guardada correctamente");
    // TODO: Conectar con API de Base de Datos aquí - trpc.actas.create.mutate(acta)
  }, [acta, saveActa]);

  const handleExportPDF = useCallback(async () => {
    try {
      toast.loading("Generando PDF...", { id: "pdf-export" });
      await generateActaPDF(acta);
      updateActa({ status: "exportado" });
      toast.success("PDF exportado correctamente", { id: "pdf-export" });
    } catch (e) {
      toast.error("Error al exportar PDF", { id: "pdf-export" });
    }
  }, [acta, updateActa]);

  const totalServicios = acta.serviciosContratados.reduce((sum, s) => sum + s.total, 0);

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <PageHeader
        title="Acta de Aceptación de Servicios"
        subtitle="Formulario 1 — Datos del cliente y servicios contratados"
        badge="F1"
        badgeColor="bg-indigo-50 text-indigo-700 border-indigo-200"
        icon={FileText}
        actions={
          <div className="flex items-center gap-2">
            {isDirty && (
              <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-xs">
                Sin guardar
              </Badge>
            )}
            <Badge variant="outline" className={`text-xs ${getStatusColor(acta.status)}`}>
              {getStatusLabel(acta.status)}
            </Badge>
            <Button variant="outline" size="sm" onClick={resetActa}>
              <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Limpiar
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportPDF}>
              <Download className="w-3.5 h-3.5 mr-1.5" /> PDF
            </Button>
            <Button size="sm" onClick={handleSave}>
              <Save className="w-3.5 h-3.5 mr-1.5" /> Guardar
            </Button>
          </div>
        }
      />

      {/* ── Encabezado ──────────────────────────────────────────────────────── */}
      <FormSection title="Encabezado del Acta" icon={FileText} accent="indigo">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FieldGroup label="N° Acta" required>
            <Input
              placeholder="Ej: 2026-001"
              value={acta.noActa}
              onChange={e => updateActa({ noActa: e.target.value })}
            />
          </FieldGroup>
          <FieldGroup label="Atención (Destinatario)">
            <Input
              placeholder="Nombre del destinatario"
              value={acta.atencion}
              onChange={e => updateActa({ atencion: e.target.value })}
            />
          </FieldGroup>
          <FieldGroup label="Fecha" required>
            <Input
              type="date"
              value={acta.fecha}
              onChange={e => updateActa({ fecha: e.target.value })}
            />
          </FieldGroup>
        </div>
      </FormSection>

      {/* ── Datos Empresa ───────────────────────────────────────────────────── */}
      <FormSection title="Datos de la Empresa" icon={Building2} accent="indigo">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FieldGroup label="Razón Social" required>
            <Input
              placeholder="Nombre legal de la empresa"
              value={acta.razonSocial}
              onChange={e => updateActa({ razonSocial: e.target.value })}
            />
          </FieldGroup>
          <FieldGroup label="Nombre de Fantasía">
            <Input
              placeholder="Nombre comercial"
              value={acta.nombreFantasia}
              onChange={e => updateActa({ nombreFantasia: e.target.value })}
            />
          </FieldGroup>
          <FieldGroup label="Tipo de Documento">
            <Select value={acta.tipoDocumento} onValueChange={v => updateActa({ tipoDocumento: v })}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar..." />
              </SelectTrigger>
              <SelectContent>
                {catalogs?.documentoIdentidad.map(d => (
                  <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FieldGroup>
          <FieldGroup label="RUC / DNI / RUT" required>
            <Input
              placeholder="Número de identificación fiscal"
              value={acta.rucDniRut}
              onChange={e => updateActa({ rucDniRut: e.target.value })}
            />
          </FieldGroup>
          <FieldGroup label="Dirección Comercial" className="md:col-span-2">
            <Textarea
              placeholder="Dirección completa de la empresa"
              value={acta.direccionComercial}
              onChange={e => updateActa({ direccionComercial: e.target.value })}
              rows={2}
            />
          </FieldGroup>
        </div>
      </FormSection>

      {/* ── Datos de Contacto ───────────────────────────────────────────────── */}
      <FormSection title="Datos de Contacto" icon={Users} accent="indigo" collapsible defaultOpen>
        <div className="space-y-5">
          {/* Representante Legal */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Representante Legal
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              <FieldGroup label="Nombre" required>
                <Input
                  placeholder="Nombre completo"
                  value={acta.representanteLegal}
                  onChange={e => updateActa({ representanteLegal: e.target.value })}
                />
              </FieldGroup>
              <FieldGroup label="DNI / Cédula">
                <Input
                  placeholder="Número de identidad"
                  value={acta.representanteDni}
                  onChange={e => updateActa({ representanteDni: e.target.value })}
                />
              </FieldGroup>
              <FieldGroup label="E-mail">
                <Input
                  type="email"
                  placeholder="correo@empresa.com"
                  value={acta.representanteEmail}
                  onChange={e => updateActa({ representanteEmail: e.target.value })}
                />
              </FieldGroup>
              <FieldGroup label="Teléfono">
                <Input
                  placeholder="+56 9 XXXX XXXX"
                  value={acta.representanteFono}
                  onChange={e => updateActa({ representanteFono: e.target.value })}
                />
              </FieldGroup>
            </div>
          </div>
          <Separator />
          {/* Contacto Técnico */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Contacto Técnico
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <FieldGroup label="Nombre">
                <Input
                  placeholder="Nombre del contacto técnico"
                  value={acta.contactoTecnico}
                  onChange={e => updateActa({ contactoTecnico: e.target.value })}
                />
              </FieldGroup>
              <FieldGroup label="E-mail">
                <Input
                  type="email"
                  placeholder="tecnico@empresa.com"
                  value={acta.contactoTecnicoEmail}
                  onChange={e => updateActa({ contactoTecnicoEmail: e.target.value })}
                />
              </FieldGroup>
              <FieldGroup label="Teléfono">
                <Input
                  placeholder="+56 9 XXXX XXXX"
                  value={acta.contactoTecnicoFono}
                  onChange={e => updateActa({ contactoTecnicoFono: e.target.value })}
                />
              </FieldGroup>
            </div>
          </div>
          <Separator />
          {/* Contacto Facturación */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Contacto Facturación
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <FieldGroup label="Nombre">
                <Input
                  placeholder="Nombre del contacto de facturación"
                  value={acta.contactoFacturacion}
                  onChange={e => updateActa({ contactoFacturacion: e.target.value })}
                />
              </FieldGroup>
              <FieldGroup label="E-mail">
                <Input
                  type="email"
                  placeholder="facturacion@empresa.com"
                  value={acta.contactoFacturacionEmail}
                  onChange={e => updateActa({ contactoFacturacionEmail: e.target.value })}
                />
              </FieldGroup>
              <FieldGroup label="Teléfono">
                <Input
                  placeholder="+56 9 XXXX XXXX"
                  value={acta.contactoFacturacionFono}
                  onChange={e => updateActa({ contactoFacturacionFono: e.target.value })}
                />
              </FieldGroup>
            </div>
          </div>
        </div>
      </FormSection>

      {/* ── Servicios Contratados ───────────────────────────────────────────── */}
      <FormSection title="Servicios Contratados" icon={Briefcase} accent="indigo">
        <div className="space-y-3">
          {/* Table Header */}
          <div className="hidden lg:grid grid-cols-12 gap-2 px-2 py-1.5 bg-muted/50 rounded-lg text-xs font-medium text-muted-foreground">
            <div className="col-span-1">#</div>
            <div className="col-span-2">Unidad Negocio</div>
            <div className="col-span-2">Solución</div>
            <div className="col-span-2">Detalle Servicio</div>
            <div className="col-span-1">Tipo Venta</div>
            <div className="col-span-1 text-right">Valor Unit.</div>
            <div className="col-span-1 text-right">Cant.</div>
            <div className="col-span-1 text-right">Total</div>
            <div className="col-span-1">Plazo</div>
          </div>

          {acta.serviciosContratados.map((servicio, idx) => (
            <div key={servicio.id} className="grid grid-cols-12 gap-2 items-start p-2 rounded-lg border border-border/60 hover:border-border transition-colors">
              <div className="col-span-1 flex items-center h-9">
                <span className="text-xs font-mono text-muted-foreground w-5 text-center">{idx + 1}</span>
              </div>
              <div className="col-span-2">
                <Select
                  value={servicio.unidadNegocio}
                  onValueChange={v => updateServicio(servicio.id, "unidadNegocio", v)}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Unidad..." />
                  </SelectTrigger>
                  <SelectContent>
                    {catalogs?.unidadesNegocio.map(u => (
                      <SelectItem key={u.value} value={u.value} className="text-xs">{u.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2">
                <Select
                  value={servicio.solucion}
                  onValueChange={v => updateServicio(servicio.id, "solucion", v)}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Solución..." />
                  </SelectTrigger>
                  <SelectContent>
                    {catalogs?.soluciones.map(s => (
                      <SelectItem key={s.value} value={s.value} className="text-xs">{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2">
                <Select
                  value={servicio.detalleServicio}
                  onValueChange={v => updateServicio(servicio.id, "detalleServicio", v)}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Detalle..." />
                  </SelectTrigger>
                  <SelectContent>
                    {catalogs?.detalleServicio.map(d => (
                      <SelectItem key={d.value} value={d.value} className="text-xs">{d.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-1">
                <Select
                  value={servicio.tipoVenta}
                  onValueChange={v => updateServicio(servicio.id, "tipoVenta", v)}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Tipo..." />
                  </SelectTrigger>
                  <SelectContent>
                    {catalogs?.tipoVenta.map(t => (
                      <SelectItem key={t.value} value={t.value} className="text-xs">{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-1">
                <Input
                  type="number"
                  className="h-9 text-xs text-right"
                  placeholder="0.00"
                  value={servicio.valorUnitario || ""}
                  onChange={e => updateServicio(servicio.id, "valorUnitario", parseNumeric(e.target.value))}
                />
              </div>
              <div className="col-span-1">
                <Input
                  type="number"
                  className="h-9 text-xs text-right"
                  placeholder="1"
                  value={servicio.cantidad || ""}
                  onChange={e => updateServicio(servicio.id, "cantidad", parseNumeric(e.target.value))}
                />
              </div>
              <div className="col-span-1 flex items-center h-9">
                <span className="text-xs font-mono font-medium text-foreground w-full text-right">
                  {formatCurrency(servicio.total)}
                </span>
              </div>
              <div className="col-span-1">
                <Select
                  value={servicio.plazo}
                  onValueChange={v => updateServicio(servicio.id, "plazo", v)}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Plazo..." />
                  </SelectTrigger>
                  <SelectContent>
                    {catalogs?.plazos.map(p => (
                      <SelectItem key={p.value} value={p.value} className="text-xs">{p.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-12 lg:hidden">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive w-full"
                  onClick={() => removeServicio(servicio.id)}
                  disabled={acta.serviciosContratados.length <= 1}
                >
                  <Trash2 className="w-3.5 h-3.5 mr-1" /> Eliminar fila
                </Button>
              </div>
              <div className="hidden lg:flex col-span-12 justify-end -mt-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-destructive"
                  onClick={() => removeServicio(servicio.id)}
                  disabled={acta.serviciosContratados.length <= 1}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          ))}

          <div className="flex items-center justify-between pt-2">
            <Button variant="outline" size="sm" onClick={addServicio}>
              <Plus className="w-3.5 h-3.5 mr-1.5" /> Agregar Servicio
            </Button>
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">Total Servicios:</span>
              <span className="text-base font-bold text-foreground font-mono">
                {formatCurrency(totalServicios)}
              </span>
            </div>
          </div>
        </div>
      </FormSection>

      {/* ── Formas de Pago ──────────────────────────────────────────────────── */}
      <FormSection title="Formas de Pago — Implementación" icon={CreditCard} accent="indigo" collapsible defaultOpen>
        <PaymentTable
          items={acta.formasPagoImplementacion}
          catalogs={catalogs}
          onChange={(id, field, value) => updateFormaPago("formasPagoImplementacion", id, field, value)}
          label="Implementación"
        />
      </FormSection>

      <FormSection title="Formas de Pago — Mantención" icon={CreditCard} accent="indigo" collapsible defaultOpen>
        <PaymentTable
          items={acta.formasPagoMantencion}
          catalogs={catalogs}
          onChange={(id, field, value) => updateFormaPago("formasPagoMantencion", id, field, value)}
          label="Mantención"
        />
      </FormSection>

      {/* ── Consideraciones ─────────────────────────────────────────────────── */}
      <div className="bg-muted/50 rounded-xl p-4 border border-border">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
          Consideraciones y Alcances Comerciales
        </p>
        <ul className="space-y-1">
          {[
            "Valores expresados en dólares.",
            "Valores NO incluyen impuestos ni comisiones bancarias o de transferencia.",
            "El servicio no incluye hardware.",
            "Se considera un descuento del 50% en las dos primeras cuotas de mantención.",
            "La forma de pago de la mantención es mes vencido a partir de la entrega del servicio.",
          ].map((item, i) => (
            <li key={i} className="text-xs text-muted-foreground flex items-start gap-2">
              <span className="text-primary mt-0.5">•</span>
              {item}
            </li>
          ))}
        </ul>
      </div>

      {/* ── Save Footer ─────────────────────────────────────────────────────── */}
      <div className="flex justify-end gap-3 pb-6">
        <Button variant="outline" onClick={resetActa}>
          <RefreshCw className="w-4 h-4 mr-2" /> Limpiar formulario
        </Button>
        <Button variant="outline" onClick={handleExportPDF}>
          <Download className="w-4 h-4 mr-2" /> Exportar PDF
        </Button>
        <Button onClick={handleSave}>
          <Save className="w-4 h-4 mr-2" /> Guardar Acta
        </Button>
      </div>
    </div>
  );
}

// ─── Payment Table Component ──────────────────────────────────────────────────

function PaymentTable({
  items,
  catalogs,
  onChange,
  label,
}: {
  items: FormaPago[];
  catalogs: any;
  onChange: (id: string, field: string, value: string | number) => void;
  label: string;
}) {
  return (
    <div className="space-y-3">
      {items.map((fp) => (
        <div key={fp.id} className="grid grid-cols-1 md:grid-cols-7 gap-3 p-3 rounded-lg border border-border/60">
          <FieldGroup label="Tipo Venta">
            <Select value={fp.tipoVenta} onValueChange={v => onChange(fp.id, "tipoVenta", v)}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="Tipo..." />
              </SelectTrigger>
              <SelectContent>
                {catalogs?.tipoVenta.map((t: any) => (
                  <SelectItem key={t.value} value={t.value} className="text-xs">{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FieldGroup>
          <FieldGroup label="N° Cuotas">
            <Input
              type="number"
              className="h-9 text-xs text-right"
              min={1}
              max={36}
              value={fp.nCuotas}
              onChange={e => onChange(fp.id, "nCuotas", parseInt(e.target.value) || 1)}
            />
          </FieldGroup>
          <FieldGroup label="1ª Cuota — Monto">
            <Input
              type="number"
              className="h-9 text-xs text-right"
              placeholder="0.00"
              value={fp.primeraCuota.monto || ""}
              onChange={e => onChange(fp.id, "primeraCuota.monto", parseNumeric(e.target.value))}
            />
          </FieldGroup>
          <FieldGroup label="1ª Cuota — Fecha">
            <Input
              type="date"
              className="h-9 text-xs"
              value={fp.primeraCuota.fecha}
              onChange={e => onChange(fp.id, "primeraCuota.fecha", e.target.value)}
            />
          </FieldGroup>
          <FieldGroup label="2ª Cuota — Monto">
            <Input
              type="number"
              className="h-9 text-xs text-right"
              placeholder="0.00"
              value={fp.segundaCuota.monto || ""}
              onChange={e => onChange(fp.id, "segundaCuota.monto", parseNumeric(e.target.value))}
            />
          </FieldGroup>
          <FieldGroup label="2ª Cuota — Fecha">
            <Input
              type="date"
              className="h-9 text-xs"
              value={fp.segundaCuota.fecha}
              onChange={e => onChange(fp.id, "segundaCuota.fecha", e.target.value)}
            />
          </FieldGroup>
          <FieldGroup label="3ª Cuota — Monto">
            <Input
              type="number"
              className="h-9 text-xs text-right"
              placeholder="0.00"
              value={fp.terceraCuota.monto || ""}
              onChange={e => onChange(fp.id, "terceraCuota.monto", parseNumeric(e.target.value))}
            />
          </FieldGroup>
        </div>
      ))}
    </div>
  );
}
