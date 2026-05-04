/**
 * ExpedienteLayout - Layout interno de un Expediente.
 * Muestra un navbar con F1 (Acta), F2 (EP) y Resultados,
 * el nombre del expediente editable, y el contenido de la pestaña activa.
 */

import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { FileText, BarChart2, ClipboardList, Pencil, Check, X, ChevronLeft, Rocket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useExpedienteStore } from "@/features/expedientes/store";
import { mapDetalleToExpediente } from "@/features/expedientes/fromServer";
import { trpc } from "@/lib/trpc";
import type { FormStatus } from "@/features/expedientes/types";
import { cn } from "@/lib/utils";
import { useCan } from "@/hooks/useCan";

interface Tab {
  id: "acta" | "ep" | "resultados" | "implementacion";
  label: string;
  icon: React.ReactNode;
  path: (id: string) => string;
}

const ALL_TABS: Tab[] = [
  {
    id: "acta",
    label: "F1 — Acta",
    icon: <FileText className="w-4 h-4" />,
    path: (id) => `/expediente/${id}/acta`,
  },
  {
    id: "ep",
    label: "F2 — EP",
    icon: <ClipboardList className="w-4 h-4" />,
    path: (id) => `/expediente/${id}/ep`,
  },
  {
    id: "resultados",
    label: "Resultados",
    icon: <BarChart2 className="w-4 h-4" />,
    path: (id) => `/expediente/${id}/resultados`,
  },
  {
    id: "implementacion",
    label: "Implementación",
    icon: <Rocket className="w-4 h-4" />,
    path: (id) => `/expediente/${id}/implementacion`,
  },
];

/**
 * getVisibleTabs — Devuelve los tabs visibles usando ACTION_PERMISSIONS de permissions.ts.
 *
 * Fuente única de verdad: `can("expediente:tab_*")` via useCan().
 * No hay lógica de roles hardcodeada aquí — todo está en permissions.ts.
 */
function getVisibleTabs(can: (action: string) => boolean): Tab[] {
  return ALL_TABS.filter(tab => {
    switch (tab.id) {
      case "acta":           return can("expediente:tab_f1");
      case "ep":             return can("expediente:tab_f2");
      case "resultados":     return can("expediente:tab_resultados");
      case "implementacion": return can("expediente:tab_implementacion");
      default:               return false;
    }
  });
}

function StatusBadge({ status }: { status: FormStatus }) {
  const styles: Record<FormStatus, string> = {
    nuevo:        "bg-muted/60 text-muted-foreground border-border/40",
    sin_guardar:  "bg-amber-500/20 text-amber-400 border-amber-500/30",
    guardado:     "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  };
  const labels: Record<FormStatus, string> = {
    nuevo:        "Nuevo",
    sin_guardar:  "Sin guardar",
    guardado:     "Guardado",
  };
  return (
    <span className={cn("ml-1.5 text-[10px] px-1.5 py-0.5 rounded border font-medium", styles[status])}>
      {labels[status]}
    </span>
  );
}

interface Props {
  expedienteId: string;
  activeTab: "acta" | "ep" | "resultados" | "implementacion";
  children: React.ReactNode;
}

export default function ExpedienteLayout({ expedienteId, activeTab, children }: Props) {
  const [, navigate] = useLocation();
  const { getExpediente, renombrar, mergeDetalleEnStore } = useExpedienteStore();
  const expediente = getExpediente(expedienteId);
  const can = useCan();
  const TABS = getVisibleTabs(can);

  const mergedRef = useRef(false);
  const detalleQuery = trpc.expediente.detalle.useQuery(
    { uuid: expedienteId },
    { enabled: !expediente && !!expedienteId, retry: false },
  );
  const renombrarSrv = trpc.expediente.renombrar.useMutation();

  useEffect(() => {
    mergedRef.current = false;
  }, [expedienteId]);

  useEffect(() => {
    if (detalleQuery.data && !mergedRef.current) {
      mergedRef.current = true;
      mergeDetalleEnStore(mapDetalleToExpediente(detalleQuery.data));
    }
  }, [detalleQuery.data, mergeDetalleEnStore]);

  const [editando, setEditando] = useState(false);
  const [nombreTemp, setNombreTemp] = useState(expediente?.nombre ?? "");

  useEffect(() => {
    if (expediente) setNombreTemp(expediente.nombre);
  }, [expediente?.nombre]);

  if (!expediente) {
    if (detalleQuery.isLoading || detalleQuery.isFetching) {
      return (
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <p className="text-muted-foreground">Cargando expediente…</p>
        </div>
      );
    }
    if (detalleQuery.error) {
      return (
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <p className="text-muted-foreground">No se pudo cargar el expediente.</p>
          <Button variant="outline" onClick={() => navigate("/historial")}>
            <ChevronLeft className="w-4 h-4 mr-2" /> Volver al Historial
          </Button>
        </div>
      );
    }
    if (detalleQuery.data === null) {
      return (
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <p className="text-muted-foreground">Expediente no encontrado.</p>
          <Button variant="outline" onClick={() => navigate("/historial")}>
            <ChevronLeft className="w-4 h-4 mr-2" /> Volver al Historial
          </Button>
        </div>
      );
    }
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <p className="text-muted-foreground">Cargando expediente…</p>
      </div>
    );
  }

  const handleGuardarNombre = () => {
    if (nombreTemp.trim()) {
      renombrar(expedienteId, nombreTemp.trim());
      renombrarSrv.mutate({ uuid: expedienteId, nombre: nombreTemp.trim() });
    }
    setEditando(false);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header del expediente */}
      <div className="border-b border-border bg-card px-6 py-3 flex items-center gap-3 flex-wrap">
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground hover:text-foreground -ml-2"
          onClick={() => navigate("/historial")}
        >
          <ChevronLeft className="w-4 h-4 mr-1" />
          Expedientes
        </Button>

        <div className="h-4 w-px bg-border" />

        {/* Nombre editable */}
        {editando ? (
          <div className="flex items-center gap-2">
            <Input
              value={nombreTemp}
              onChange={e => setNombreTemp(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Enter") handleGuardarNombre();
                if (e.key === "Escape") setEditando(false);
              }}
              className="h-7 text-sm w-52"
              autoFocus
            />
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={handleGuardarNombre}>
              <Check className="w-3.5 h-3.5 text-emerald-500" />
            </Button>
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditando(false)}>
              <X className="w-3.5 h-3.5 text-destructive" />
            </Button>
          </div>
        ) : (
          <button
            className="flex items-center gap-1.5 group text-sm font-semibold text-foreground hover:text-primary transition-colors"
            onClick={() => setEditando(true)}
          >
            {expediente.nombre}
            <Pencil className="w-3 h-3 opacity-0 group-hover:opacity-60 transition-opacity" />
          </button>
        )}
        {expediente.codigo ? (
          <span className="text-[11px] px-2 py-0.5 rounded border bg-muted/40 text-muted-foreground font-mono">
            {expediente.codigo}
          </span>
        ) : null}
      </div>

      {/* Tabs de navegación */}
      <div className="border-b border-border bg-card px-6 flex gap-1">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => navigate(tab.path(expedienteId))}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors",
              activeTab === tab.id
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
            )}
          >
            {tab.icon}
            {tab.label}
            {tab.id === "acta" && <StatusBadge status={expediente.f1.status} />}
            {tab.id === "ep"   && <StatusBadge status={expediente.f2.status} />}
          </button>
        ))}
      </div>

      {/* Contenido */}
      <div className="flex-1 overflow-auto">
        {children}
      </div>
    </div>
  );
}
