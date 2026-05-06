/**
 * ActaForm — Formulario 1: Acta de Aceptación de Servicios
 *
 * Arquitectura modular: cada sección es un componente independiente
 * ubicado en client/src/components/forms/acta/
 *
 * Secciones (en orden del Excel):
 *   ActaEncabezado     → Sres (combobox), Atención (combobox), Fecha, N° Acta
 *   ActaEmpresa        → Razón Social, RUT, Dirección, País (combobox), Moneda (combobox)
 *   ActaContactos      → Rep. Legal, Contacto Técnico, Facturación
 *   ActaServicios      → Tabla de servicios contratados (comboboxes BD)
 *   ActaFormasPago     → Cuotas de Implementación y Mantención
 *   ActaConsideraciones → Activación nueva (checkbox) + lista de consideraciones
 *   ActaFirmas         → Bloques de firma Cliente y CDLatam
 */
import { useCallback } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/FormSection";
import { FileText, Save, RefreshCw, Download } from "lucide-react";
import {
  useActaForm, createDefaultServicio, createDefaultFormaPago,
  type ServicioContratado,
} from "@/hooks/useFormStore";
import { trpc } from "@/lib/trpc";
import { getStatusColor, getStatusLabel } from "@/lib/formatters";
import { generateActaPDF } from "@/lib/pdfExport";
import {
  ActaEncabezado,
  ActaEmpresa,
  ActaContactos,
  ActaServicios,
  ActaFormasPago,
  ActaConsideraciones,
  ActaFirmas,
} from "@/components/forms/acta";

// Campos requeridos del Acta con su id de ancla y etiqueta
const REQUIRED_FIELDS: Array<{ key: keyof import("@/hooks/useFormStore").ActaData; label: string; anchor: string }> = [
  { key: "sres",          label: "Sres.",          anchor: "acta-sres" },
  { key: "atencion",      label: "Atención",        anchor: "acta-atencion" },
  { key: "fecha",         label: "Fecha",           anchor: "acta-fecha" },
  { key: "noActa",        label: "N° Acta",         anchor: "acta-noActa" },
  { key: "razonSocial",   label: "Razón Social",    anchor: "acta-razonSocial" },
  { key: "rucDniRut",     label: "RUC / DNI / RUT", anchor: "acta-rucDniRut" },
  { key: "moneda",        label: "Moneda",          anchor: "acta-moneda" },
];

export default function ActaForm() {
  const { acta, updateActa, resetActa, saveActa, isDirty } = useActaForm();
  const { data: catalogs } = trpc.catalogs.getAll.useQuery();

  // ── Servicios Contratados ────────────────────────────────────────────────────
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

  // ── Formas de Pago ───────────────────────────────────────────────────────────
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

  const addFormaPago = useCallback((tipo: "formasPagoImplementacion" | "formasPagoMantencion") => {
    const list = acta[tipo];
    updateActa({
      [tipo]: [...list, createDefaultFormaPago(list.length + 1)],
    });
  }, [acta, updateActa]);

  const removeFormaPago = useCallback((tipo: "formasPagoImplementacion" | "formasPagoMantencion", id: string) => {
    updateActa({
      [tipo]: acta[tipo].filter(fp => fp.id !== id),
    });
  }, [acta, updateActa]);

  // ── Save & Export ────────────────────────────────────────────────────────────
  const handleSave = useCallback(() => {
    // Validar campos requeridos y hacer scroll al primero faltante
    for (const req of REQUIRED_FIELDS) {
      const val = acta[req.key];
      if (!val || (typeof val === "string" && val.trim() === "")) {
        toast.error(`El campo "${req.label}" es requerido`, {
          description: "Complete el campo para poder guardar el acta.",
          action: {
            label: "Ir al campo",
            onClick: () => {
              const el = document.getElementById(req.anchor);
              if (el) {
                el.scrollIntoView({ behavior: "smooth", block: "center" });
                // Resaltar brevemente el campo
                el.classList.add("ring-2", "ring-destructive", "ring-offset-2");
                setTimeout(() => el.classList.remove("ring-2", "ring-destructive", "ring-offset-2"), 2000);
              }
            },
          },
        });
        // Scroll automático al campo faltante
        const el = document.getElementById(req.anchor);
        if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
        return;
      }
    }
    saveActa();
    toast.success("Acta guardada correctamente");
    // TODO: Conectar con API de Base de Datos aquí
    // await trpc.actas.create.mutate(acta);
  }, [acta, saveActa]);

  const handleExportPDF = useCallback(async () => {
    try {
      toast.loading("Generando PDF...", { id: "pdf-export" });
      await generateActaPDF(acta);
      updateActa({ status: "exportado" });
      toast.success("PDF exportado correctamente", { id: "pdf-export" });
    } catch {
      toast.error("Error al exportar PDF", { id: "pdf-export" });
    }
  }, [acta, updateActa]);

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

      {/* ── Secciones modulares (orden del Excel) ───────────────────────────── */}

      {/* 1. Encabezado: Sres, Atención, Fecha, N° Acta */}
      <ActaEncabezado
        acta={acta}
        onUpdate={updateActa}
        catalogs={{
          sres: catalogs?.empresas,
          atencion: catalogs?.nombres,
        }}
      />

      {/* 2. Datos de la Empresa: Razón Social, RUT, País, Moneda */}
      <ActaEmpresa
        acta={acta}
        onUpdate={updateActa}
        catalogs={{
          documentoIdentidad: catalogs?.documentoIdentidad,
          monedas: catalogs?.monedas,
        }}
      />

      {/* 3. Contactos: Rep. Legal, Técnico, Facturación */}
      <ActaContactos acta={acta} onUpdate={updateActa} />

      {/* 4. Servicios Contratados */}
      <ActaServicios
        servicios={acta.serviciosContratados}
        moneda={acta.moneda}
        catalogs={{
          unidadesNegocio: catalogs?.unidadesNegocio,
          soluciones: catalogs?.soluciones,
          detalleServicio: catalogs?.detalleServicio,
          tipoVenta: catalogs?.tipoVenta,
          plazos: catalogs?.plazos,
        }}
        onAdd={addServicio}
        onRemove={removeServicio}
        onUpdate={updateServicio}
      />

      {/* 5. Formas de Pago: Implementación y Mantención */}
      <ActaFormasPago
        acta={acta}
        moneda={acta.moneda}
        catalogs={{ tipoVenta: catalogs?.tipoVenta }}
        onUpdate={updateFormaPago}
        onAdd={addFormaPago}
        onRemove={removeFormaPago}
      />

      {/* 6. Consideraciones: Activación nueva + lista */}
      <ActaConsideraciones acta={acta} onUpdate={updateActa} />

      {/* 7. Firmas: Cliente y CDLatam */}
      <ActaFirmas acta={acta} onUpdate={updateActa} />

      {/* ── Footer ──────────────────────────────────────────────────────────── */}
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
