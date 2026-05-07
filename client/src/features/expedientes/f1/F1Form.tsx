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
import { useCallback, useEffect, useMemo, useRef } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/FormSection";
import { FileText, Save, RefreshCw, Download } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { generateActaPDF } from "@/lib/pdfExport";
import { useF1 } from "./useF1";
import { useClausulasVigentes } from "./useClausulasVigentes";
import { useFieldVisibility } from "@/hooks/useFieldVisibility";
import { useNavGuard } from "@/hooks/useNavGuard";
import { UnsavedChangesDialog } from "@/components/UnsavedChangesDialog";
import { F1_INITIAL } from "../types";
import type { F1Data, ServicioContratado } from "../types";
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
import { reconcileFormasPagoDesdeServicios } from "./reconcileFormasPago";

// ─── Campos requeridos ────────────────────────────────────────────────────────

// `noActa` NO va aquí: lo autogenera el server (buildActaCodigo) durante syncF1
// y el input es readOnly. Validarlo en cliente bloquearía el primer guardado.
const REQUIRED_FIELDS = [
  { key: "sres"        as const, label: "Sres.",          anchor: "f1-sres" },
  { key: "atencion"    as const, label: "Atención",        anchor: "f1-atencion" },
  { key: "fecha"       as const, label: "Fecha",           anchor: "f1-fecha" },
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
    cuotas: [
      { ...emptyCuota }, // Cuota 1
      { ...emptyCuota }, // Cuota 2
      { ...emptyCuota }, // Cuota 3
      { ...emptyCuota }, // Cuota 4
    ],
  };
}

// ─── Componente ───────────────────────────────────────────────────────────────

interface Props {
  expedienteId: string;
}

export default function F1Form({ expedienteId }: Props) {
  const { data, status, update, guardar, descartar, isSyncing } = useF1(expedienteId);
  // Visibilidad de campos sensibles — cuando el acta persista en BD, pasar data.creadorId
  const { canViewSensitiveFields } = useFieldVisibility(undefined);
  const { data: catalogs } = trpc.catalogs.getAll.useQuery();

  // Cláusulas legales que se anexarán al PDF al exportar. Es la misma fuente
  // que muestra F1Consideraciones — un solo hook para evitar divergencias.
  const { clausulas: clausulasParaPdf, isLoading: clausulasLoading } = useClausulasVigentes(
    data?.serviciosContratados,
  );

  // Bloqueo de navegación cuando hay cambios sin guardar.
  // Activa beforeunload (cerrar tab/F5) y modal en navegación SPA.
  const { pendingTo, confirm: confirmNav, cancel: cancelNav } = useNavGuard({
    when: status === "sin_guardar",
  });

  const dataRef = useRef(data);
  dataRef.current = data;

  const applyWithReconcile = useCallback(
    (partial: Partial<F1Data>) => {
      const base = dataRef.current;
      if (!base) return;
      const merged = { ...base, ...partial } as F1Data;
      const rec = reconcileFormasPagoDesdeServicios(merged);
      update({ ...partial, ...rec });
    },
    [update],
  );

  const serviciosSyncKey = useMemo(
    () =>
      JSON.stringify(
        (data?.serviciosContratados ?? []).map(s => ({
          id: s.id,
          tipoVenta: s.tipoVenta,
          total: s.total,
        })),
      ),
    [data?.serviciosContratados],
  );

  /** Hidrata formas enlazadas al cargar expediente o si faltan filas respecto a servicios Impl/Mant. */
  useEffect(() => {
    const d = dataRef.current;
    if (!d) return;
    const rec = reconcileFormasPagoDesdeServicios(d);
    if (
      JSON.stringify(rec.formasPagoImplementacion) === JSON.stringify(d.formasPagoImplementacion) &&
      JSON.stringify(rec.formasPagoMantencion) === JSON.stringify(d.formasPagoMantencion)
    ) {
      return;
    }
    update({ ...rec });
  }, [expedienteId, serviciosSyncKey, update]);

  const serviciosRows = data?.serviciosContratados ?? [];

  const addServicio = useCallback(() => {
    const item = serviciosRows.length + 1;
    applyWithReconcile({ serviciosContratados: [...serviciosRows, createServicio(item)] });
  }, [serviciosRows, applyWithReconcile]);

  const removeServicio = useCallback(
    (id: string) => {
      applyWithReconcile({ serviciosContratados: serviciosRows.filter(s => s.id !== id) });
    },
    [serviciosRows, applyWithReconcile],
  );

  const updateServicio = useCallback(
    (id: string, field: keyof ServicioContratado, value: string | number) => {
      applyWithReconcile({
        serviciosContratados: serviciosRows.map(s => {
          if (s.id !== id) return s;
          const updated = { ...s, [field]: value };
          if (field === "precioUnitario" || field === "cantidad") {
            updated.total = updated.precioUnitario * updated.cantidad;
          }
          return updated;
        }),
      });
    },
    [serviciosRows, applyWithReconcile],
  );

  // ── Formas de Pago ─────────────────────────────────────────────────────────

  const updateFormaPago = useCallback((
    tipo: "formasPagoImplementacion" | "formasPagoMantencion",
    id: string,
    field: string,
    value: string | number
  ) => {
    if (!data) return;
    const list = data[tipo];
    update({
      [tipo]: list.map(fp => {
        if (fp.id !== id) return fp;

        // Soporte para cuotas dinámicas (ej: "cuotas.0.monto")
        if (field.startsWith("cuotas.")) {
          const parts = field.split(".");
          const index = parseInt(parts[1]);
          const child = parts[2];
          const newCuotas = [...fp.cuotas];
          newCuotas[index] = { ...newCuotas[index], [child]: value };
          return { ...fp, cuotas: newCuotas };
        }

        // Caso especial para nCuotas: limitar rango 1-4
        if (field === "nCuotas") {
          const val = Math.min(4, Math.max(1, typeof value === "string" ? parseInt(value) : value));
          return { ...fp, nCuotas: val || 1 };
        }

        return { ...fp, [field]: value };
      }),
    });
  }, [data, update]);

  const addFormaPago = useCallback((tipo: "formasPagoImplementacion" | "formasPagoMantencion") => {
    if (!data) return;
    const list = data[tipo];
    update({ [tipo]: [...list, createFormaPago(list.length + 1)] });
  }, [data, update]);

  const removeFormaPago = useCallback((tipo: "formasPagoImplementacion" | "formasPagoMantencion", id: string) => {
    if (!data) return;
    update({ [tipo]: data[tipo].filter(fp => fp.id !== id) });
  }, [data, update]);

  // ── Guardar ────────────────────────────────────────────────────────────────

  /**
   * Valida los campos requeridos. Si falla, muestra toast y scrollea al campo.
   * Devuelve true si pasa la validación.
   */
  const validate = useCallback((): boolean => {
    if (!data) return false;
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
        return false;
      }
    }
    return true;
  }, [data]);

  const handleSave = useCallback(async () => {
    if (!validate()) return;
    const ok = await guardar();
    if (ok) toast.success("F1 guardado correctamente");
    // El toast rojo de fallo lo emite el propio hook en onError.
  }, [validate, guardar]);

  // Handlers del modal de cambios sin guardar
  const handleNavSave = useCallback(async (): Promise<boolean> => {
    if (!validate()) return false;
    const ok = await guardar();
    if (ok) {
      toast.success("F1 guardado correctamente");
      confirmNav();
    }
    return ok;
  }, [validate, guardar, confirmNav]);

  const handleNavDiscard = useCallback(async () => {
    await descartar();
    toast.info("Cambios descartados");
    confirmNav();
  }, [descartar, confirmNav]);

  const handleReset = useCallback(() => {
    update(F1_INITIAL);
    toast.info("Formulario limpiado");
  }, [update]);

  const handleExportPDF = useCallback(async () => {
    if (!data) return;
    try {
      toast.loading("Generando PDF...", { id: "pdf-f1" });
      // Pasamos las cláusulas vigentes para que se anexen al final del PDF.
      // Si una cláusula falla al cargar (PDF corrupto / 404), el callback
      // muestra un warning y el resto del flujo sigue.
      const failed: string[] = [];
      await generateActaPDF(
        data as any,
        clausulasParaPdf.map(c => ({
          id: c.id,
          valor: c.valor,
          filePath: c.filePath,
          fileName: c.fileName,
        })),
        {
          onClausulaError: (c) => failed.push(c.fileName),
        },
      );
      if (failed.length > 0) {
        toast.warning(`PDF exportado, pero ${failed.length} cláusula(s) no se pudieron anexar`, {
          id: "pdf-f1",
          description: failed.join(", "),
        });
      } else {
        toast.success("PDF exportado", { id: "pdf-f1" });
      }
    } catch {
      toast.error("Error al exportar PDF", { id: "pdf-f1" });
    }
  }, [data, clausulasParaPdf]);

  if (!data) return <div className="p-6 text-muted-foreground">Expediente no encontrado.</div>;

  const statusBadge = {
    nuevo:       { label: "Nuevo",       className: "bg-slate-50 text-slate-600 border-slate-200" },
    sin_guardar: { label: "Sin guardar", className: "bg-amber-50 text-amber-700 border-amber-200" },
    guardado:    { label: "Guardado",    className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  }[status];

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
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportPDF}
              disabled={clausulasLoading}
              title={clausulasLoading ? "Cargando cláusulas legales…" : "Exportar PDF"}
            >
              <Download className="w-3.5 h-3.5 mr-1.5" />
              {clausulasLoading ? "Cargando…" : "PDF"}
            </Button>
            <Button size="sm" onClick={handleSave} disabled={isSyncing}>
              <Save className="w-3.5 h-3.5 mr-1.5" /> {isSyncing ? "Guardando..." : "Guardar"}
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
        <Button onClick={handleSave} disabled={isSyncing}>
          <Save className="w-4 h-4 mr-2" /> {isSyncing ? "Guardando..." : "Guardar F1"}
        </Button>
      </div>

      <UnsavedChangesDialog
        open={pendingTo !== null}
        formLabel="F1"
        onSave={handleNavSave}
        onDiscard={handleNavDiscard}
        onCancel={cancelNav}
      />
    </div>
  );
}
