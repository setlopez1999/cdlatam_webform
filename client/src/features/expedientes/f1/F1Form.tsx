/**
 * features/expedientes/f1/F1Form.tsx
 *
 * Formulario F1 — Acta de Aceptación de Servicios.
 * Recibe el expedienteId y usa useF1() para leer/escribir en el store.
 *
 * Estado de form:
 *   nuevo       → primer acceso, sin cambios
 *   sin_guardar → el usuario modificó algo
 *   guardado    → se presionó Guardar sin cambios posteriores
 *
 * Para conectar con tRPC en el futuro, modificar solo guardar() en useF1.ts.
 */
import { useCallback } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/FormSection";
import { FileText, Save, RefreshCw, Download } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { generateActaPDF } from "@/lib/pdfExport";
import { useF1 } from "./useF1";
import { useFieldVisibility } from "@/hooks/useFieldVisibility";
import { F1_INITIAL } from "../types";
import type { ServicioContratado } from "../types";
import { nanoid } from "nanoid";
import {
  F1Encabezado,
  F1Empresa,
  F1Contactos,
  F1Servicios,
  F1FormasPago,
  F1Consideraciones,
  F1Firmas,
} from "./sections";

// ─── Campos requeridos ────────────────────────────────────────────────────────

const REQUIRED_FIELDS = [
  { key: "sres"        as const, label: "Sres.",          anchor: "f1-sres" },
  { key: "atencion"    as const, label: "Atención",        anchor: "f1-atencion" },
  { key: "fecha"       as const, label: "Fecha",           anchor: "f1-fecha" },
  { key: "noActa"      as const, label: "N° Acta",         anchor: "f1-noActa" },
  { key: "razonSocial" as const, label: "Razón Social",    anchor: "f1-razonSocial" },
  { key: "rucDniRut"   as const, label: "RUC / DNI / RUT", anchor: "f1-rucDniRut" },
  { key: "moneda"      as const, label: "Moneda",          anchor: "f1-moneda" },
];

// ─── Helpers de creación de filas ─────────────────────────────────────────────

function createServicio(item: number): ServicioContratado {
  return {
    id: nanoid(), unidadNegocio: "", solucion: "", detalleServicio: "",
    tipoVenta: "", moneda: "", cantidad: 1, precioUnitario: 0, plazo: "", total: 0,
  };
}

function createFormaPago(item: number) {
  const emptyCuota = { monto: 0, fecha: "" };
  return {
    id: nanoid(), item, tipoVenta: "", nCuotas: 1,
    primeraCuota: { ...emptyCuota },
    segundaCuota: { ...emptyCuota },
    terceraCuota: { ...emptyCuota },
  };
}

// ─── Componente ───────────────────────────────────────────────────────────────

interface Props {
  expedienteId: string;
}

export default function F1Form({ expedienteId }: Props) {
  const { data, status, update, guardar } = useF1(expedienteId);
  // Visibilidad de campos sensibles — cuando el acta persista en BD, pasar data.creadorId
  const { canViewSensitiveFields } = useFieldVisibility(undefined);
  const { data: catalogs } = trpc.catalogs.getAll.useQuery();

  if (!data) return <div className="p-6 text-muted-foreground">Expediente no encontrado.</div>;

  // ── Badge de estado ────────────────────────────────────────────────────────

  const statusBadge = {
    nuevo:       { label: "Nuevo",       className: "bg-slate-50 text-slate-600 border-slate-200" },
    sin_guardar: { label: "Sin guardar", className: "bg-amber-50 text-amber-700 border-amber-200" },
    guardado:    { label: "Guardado",    className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  }[status];

  // ── Servicios ──────────────────────────────────────────────────────────────

  const addServicio = useCallback(() => {
    const item = data.serviciosContratados.length + 1;
    update({ serviciosContratados: [...data.serviciosContratados, createServicio(item)] });
  }, [data.serviciosContratados, update]);

  const removeServicio = useCallback((id: string) => {
    update({ serviciosContratados: data.serviciosContratados.filter(s => s.id !== id) });
  }, [data.serviciosContratados, update]);

  const updateServicio = useCallback((id: string, field: keyof ServicioContratado, value: string | number) => {
    update({
      serviciosContratados: data.serviciosContratados.map(s => {
        if (s.id !== id) return s;
        const updated = { ...s, [field]: value };
        if (field === "precioUnitario" || field === "cantidad") {
          updated.total = updated.precioUnitario * updated.cantidad;
        }
        return updated;
      }),
    });
  }, [data.serviciosContratados, update]);

  // ── Formas de Pago ─────────────────────────────────────────────────────────

  const updateFormaPago = useCallback((
    tipo: "formasPagoImplementacion" | "formasPagoMantencion",
    id: string,
    field: string,
    value: string | number
  ) => {
    const list = data[tipo];
    update({
      [tipo]: list.map(fp => {
        if (fp.id !== id) return fp;
        if (field.includes(".")) {
          const [parent, child] = field.split(".");
          return { ...fp, [parent]: { ...(fp as any)[parent], [child]: value } };
        }
        return { ...fp, [field]: value };
      }),
    });
  }, [data, update]);

  const addFormaPago = useCallback((tipo: "formasPagoImplementacion" | "formasPagoMantencion") => {
    const list = data[tipo];
    update({ [tipo]: [...list, createFormaPago(list.length + 1)] });
  }, [data, update]);

  const removeFormaPago = useCallback((tipo: "formasPagoImplementacion" | "formasPagoMantencion", id: string) => {
    update({ [tipo]: data[tipo].filter(fp => fp.id !== id) });
  }, [data, update]);

  // ── Guardar ────────────────────────────────────────────────────────────────

  const handleSave = useCallback(() => {
    for (const req of REQUIRED_FIELDS) {
      const val = data[req.key];
      if (!val || (typeof val === "string" && val.trim() === "")) {
        toast.error(`El campo "${req.label}" es requerido`, {
          description: "Complete el campo para poder guardar.",
          action: {
            label: "Ir al campo",
            onClick: () => {
              const el = document.getElementById(req.anchor);
              if (el) {
                el.scrollIntoView({ behavior: "smooth", block: "center" });
                el.classList.add("ring-2", "ring-destructive", "ring-offset-2");
                setTimeout(() => el.classList.remove("ring-2", "ring-destructive", "ring-offset-2"), 2000);
              }
            },
          },
        });
        const el = document.getElementById(req.anchor);
        if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
        return;
      }
    }
    guardar();
    toast.success("F1 guardado correctamente");
    // TODO: await trpc.actas.create.mutate(data)  ← conectar aquí
  }, [data, guardar]);

  const handleReset = useCallback(() => {
    update(F1_INITIAL);
    toast.info("Formulario limpiado");
  }, [update]);

  const handleExportPDF = useCallback(async () => {
    try {
      toast.loading("Generando PDF...", { id: "pdf-f1" });
      // generateActaPDF espera ActaData — pasamos data que es compatible
      await generateActaPDF(data as any);
      toast.success("PDF exportado", { id: "pdf-f1" });
    } catch {
      toast.error("Error al exportar PDF", { id: "pdf-f1" });
    }
  }, [data]);

  // ── Render ─────────────────────────────────────────────────────────────────

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
            <Badge variant="outline" className={`text-xs ${statusBadge.className}`}>
              {statusBadge.label}
            </Badge>
            <Button variant="outline" size="sm" onClick={handleReset}>
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

      <F1Encabezado
        data={data} onUpdate={update}
        catalogs={{ sres: catalogs?.empresas as any, atencion: catalogs?.nombres as any }}
      />

      <F1Empresa
        data={data} onUpdate={update}
        catalogs={{
          documentoIdentidad: catalogs?.documentoIdentidad as any,
          monedas: catalogs?.monedas as any,
          paises: catalogs?.paises as any,
        }}
      />

      <F1Contactos data={data} onUpdate={update} />

      <F1Servicios
        servicios={data.serviciosContratados}
        moneda={data.moneda}
        catalogs={{
          unidadesNegocio: catalogs?.unidadesNegocio as any,
          soluciones: catalogs?.soluciones as any,
          detalleServicio: catalogs?.detalleServicio as any,
          tipoVenta: catalogs?.tipoVenta as any,
          plazos: catalogs?.plazos as any,
        }}
        onAdd={addServicio}
        onRemove={removeServicio}
        onUpdate={updateServicio}
        restricted={!canViewSensitiveFields}
      />

      <F1FormasPago
        data={data}
        moneda={data.moneda}
        catalogs={{ tipoVenta: catalogs?.tipoVenta as any }}
        onUpdate={updateFormaPago}
        onAdd={addFormaPago}
        onRemove={removeFormaPago}
        restricted={!canViewSensitiveFields}
      />

      <F1Consideraciones data={data} onUpdate={update} restricted={!canViewSensitiveFields} />

      <F1Firmas data={data} onUpdate={update} />

      <div className="flex justify-end gap-3 pb-6">
        <Button variant="outline" onClick={handleReset}>
          <RefreshCw className="w-4 h-4 mr-2" /> Limpiar formulario
        </Button>
        <Button variant="outline" onClick={handleExportPDF}>
          <Download className="w-4 h-4 mr-2" /> Exportar PDF
        </Button>
        <Button onClick={handleSave}>
          <Save className="w-4 h-4 mr-2" /> Guardar F1
        </Button>
      </div>
    </div>
  );
}
