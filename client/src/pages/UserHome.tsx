/**
 * UserHome — Pantalla de inicio para usuarios con rol "user"
 *
 * Muestra dos acciones principales: Expediente nuevo e Historial (Expedientes).
 * Usa el nuevo store (features/expedientes/store.ts) como única fuente de verdad.
 */
import { useMemo } from "react";
import { useLocation } from "wouter";
import { useLocalAuth } from "@/hooks/useLocalAuth";
import { useExpedienteStore } from "@/features/expedientes/store";
import type { Expediente } from "@/features/expedientes/types";
import { Badge } from "@/components/ui/badge";
import {
  FileText, Clock, FolderOpen,
  ArrowRight, CheckCircle2, AlertCircle, Circle, Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageLayout } from "@/components/PageLayout";

// ── Helpers ──────────────────────────────────────────────────────────────────

function StatusIcon({ status }: { status: string }) {
  if (status === "guardado") return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
  if (status === "borrador") return <AlertCircle className="w-4 h-4 text-amber-500" />;
  return <Circle className="w-4 h-4 text-muted-foreground" />;
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; className: string }> = {
    borrador:  { label: "Borrador",  className: "bg-amber-50 text-amber-700 border-amber-200" },
    guardado:  { label: "Guardado",  className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
    nuevo:     { label: "Nuevo",     className: "bg-muted text-muted-foreground" },
  };
  const s = map[status] ?? map.nuevo;
  return (
    <Badge variant="outline" className={`text-xs ${s.className}`}>
      {s.label}
    </Badge>
  );
}

/** Convierte un expediente del nuevo store en un item de actividad reciente */
function toHistorialItem(exp: Expediente) {
  const razonSocial = exp.f1.data.razonSocial;
  const titulo = razonSocial || exp.nombre;
  const noActa = exp.f1.data.noActa;
  const subtitulo = noActa ? `N° ${noActa}` : exp.nombre;
  const status = exp.f1.status;
  return {
    id: exp.id,
    titulo,
    subtitulo,
    fecha: exp.updatedAt,
    status,
    path: `/expediente/${exp.id}/acta`,
  };
}

// ── Componente principal ──────────────────────────────────────────────────────

export default function UserHome() {
  const { currentUser } = useLocalAuth();
  const { expedientes } = useExpedienteStore();
  const [, navigate] = useLocation();

  // Actividad reciente: expedientes ordenados por fecha de actualización
  const historial = useMemo(
    () =>
      [...expedientes]
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
        .map(toHistorialItem),
    [expedientes]
  );

  const hora = new Date().getHours();
  const saludo = hora < 12 ? "Buenos días" : hora < 18 ? "Buenas tardes" : "Buenas noches";
  const nombre = currentUser?.displayName || currentUser?.username || "Usuario";
  const total = expedientes.length;

  return (
    <PageLayout
      title={`${saludo}, ${nombre} 👋`}
      subtitle="¿Qué deseas hacer hoy?"
    >

      {/* ── Acciones principales ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Expediente nuevo */}
        <button
          onClick={() => navigate("/nuevo-expediente")}
          className="group text-left p-5 rounded-xl border-2 border-[#00c2b2]/30 hover:border-[#00c2b2] bg-card transition-all duration-200 hover:shadow-md"
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#00c2b2]/10 flex items-center justify-center">
                <Plus className="w-5 h-5 text-[#00c2b2]" />
              </div>
              <div>
                <p className="font-semibold text-foreground">Expediente nuevo</p>
                <p className="text-xs text-muted-foreground">Acta (F1) + EP (F2)</p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-[#00c2b2] opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
          </div>
        </button>

        {/* Historial / Expedientes */}
        <button
          onClick={() => navigate("/historial")}
          className="group text-left p-5 rounded-xl border-2 border-border hover:border-primary/40 bg-card transition-all duration-200 hover:shadow-md"
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <FolderOpen className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <p className="font-semibold text-foreground">Historial</p>
                <p className="text-xs text-muted-foreground">
                  {total > 0
                    ? `${total} expediente${total !== 1 ? "s" : ""}`
                    : "Sin expedientes aún"}
                </p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
          </div>
        </button>
      </div>

      {/* ── Actividad reciente ───────────────────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Clock className="w-4 h-4 text-muted-foreground" />
            Actividad reciente
          </h2>
          {historial.length > 5 && (
            <Button variant="ghost" size="sm" className="text-xs" onClick={() => navigate("/historial")}>
              Ver todo
            </Button>
          )}
        </div>

        {historial.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed border-border rounded-xl">
            <FolderOpen className="w-8 h-8 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No hay expedientes registrados aún.</p>
            <p className="text-xs text-muted-foreground/60 mt-1">
              Usa "Expediente nuevo" para comenzar.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {historial.slice(0, 5).map(item => (
              <button
                key={item.id}
                onClick={() => navigate(item.path)}
                className="w-full flex items-center gap-3 p-3 rounded-lg border border-border hover:border-border/80 hover:bg-muted/30 transition-all text-left group"
              >
                <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0">
                  <FileText className="w-4 h-4 text-indigo-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{item.titulo}</p>
                  <p className="text-xs text-muted-foreground">{item.subtitulo}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <StatusBadge status={item.status} />
                  <StatusIcon status={item.status} />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </PageLayout>
  );
}
