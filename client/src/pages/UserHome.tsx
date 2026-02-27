/**
 * UserHome — Pantalla de inicio para usuarios con rol "user"
 *
 * Muestra dos acciones principales: Expediente nuevo e Historial (Expedientes)
 */
import { useLocation } from "wouter";
import { useLocalAuth } from "@/hooks/useLocalAuth";
import { loadActasList, loadEPList, type ActaData, type EPData } from "@/hooks/useFormStore";
import { Badge } from "@/components/ui/badge";
import {
  FileText, BarChart2, Clock, FolderOpen,
  ArrowRight, CheckCircle2, AlertCircle, Circle, Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/formatters";

// ── Helpers ──────────────────────────────────────────────────────────────────

function StatusIcon({ status }: { status: string }) {
  if (status === "completado" || status === "exportado") {
    return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
  }
  if (status === "borrador") {
    return <AlertCircle className="w-4 h-4 text-amber-500" />;
  }
  return <Circle className="w-4 h-4 text-muted-foreground" />;
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; className: string }> = {
    borrador: { label: "Borrador", className: "bg-amber-50 text-amber-700 border-amber-200" },
    completado: { label: "Completado", className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
    exportado: { label: "Exportado", className: "bg-blue-50 text-blue-700 border-blue-200" },
    nuevo: { label: "Nuevo", className: "bg-muted text-muted-foreground" },
  };
  const s = map[status] ?? map.nuevo;
  return (
    <Badge variant="outline" className={`text-xs ${s.className}`}>
      {s.label}
    </Badge>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────

export default function UserHome() {
  const { currentUser } = useLocalAuth();
  const actas: ActaData[] = loadActasList();
  const eps: EPData[] = loadEPList();
  const [, navigate] = useLocation();

  // Historial combinado para actividad reciente
  const historial = [
    ...actas.map(a => ({
      id: a.id,
      tipo: "Acta",
      titulo: a.razonSocial || `Acta ${a.noActa || "sin número"}`,
      subtitulo: a.noActa ? `N° ${a.noActa}` : "Sin número",
      fecha: a.updatedAt,
      status: a.status,
      path: "/acta",
      icon: FileText,
      color: "text-indigo-500",
      bgColor: "bg-indigo-50",
    })),
    ...eps.map(e => ({
      id: e.id,
      tipo: "EP",
      titulo: e.nombreCliente || e.empresa || "Evaluación sin nombre",
      subtitulo: e.tipoMoneda ? `${e.tipoMoneda} ${formatCurrency(e.montoProyecto)}` : "Sin monto",
      fecha: e.updatedAt,
      status: e.status,
      path: "/ep",
      icon: BarChart2,
      color: "text-emerald-500",
      bgColor: "bg-emerald-50",
    })),
  ].sort((a, b) => new Date(b.fecha ?? 0).getTime() - new Date(a.fecha ?? 0).getTime());

  const hora = new Date().getHours();
  const saludo = hora < 12 ? "Buenos días" : hora < 18 ? "Buenas tardes" : "Buenas noches";
  const nombre = currentUser?.username || "Usuario";
  const totalExpedientes = Math.max(actas.length, eps.length);

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8">
      {/* ── Saludo ──────────────────────────────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-semibold text-foreground">
          {saludo}, {nombre} 👋
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          ¿Qué deseas hacer hoy?
        </p>
      </div>
      <div>
        📄 Expedientes
      </div>

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
                  {totalExpedientes > 0
                    ? `${totalExpedientes} expediente${totalExpedientes !== 1 ? "s" : ""}`
                    : "Sin expedientes aún"}
                </p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
          </div>
        </button>
      </div>

      {/* ── Sub-accesos del expediente ───────────────────────────────────────── 
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <button
          onClick={() => navigate("/acta")}
          className="group flex items-center gap-3 p-4 rounded-xl border border-indigo-200 hover:border-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/10 transition-all"
        >
          <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center flex-shrink-0">
            <FileText className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="flex-1 min-w-0 text-left">
            <p className="text-sm font-medium text-foreground">Acta de Aceptación</p>
            <p className="text-xs text-muted-foreground">Formulario 1 (F1)</p>
          </div>
          <ArrowRight className="w-3.5 h-3.5 text-indigo-400 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all flex-shrink-0" />
        </button>

        <button
          onClick={() => navigate("/ep")}
          className="group flex items-center gap-3 p-4 rounded-xl border border-emerald-200 hover:border-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/10 transition-all"
        >
          <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center flex-shrink-0">
            <BarChart2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="flex-1 min-w-0 text-left">
            <p className="text-sm font-medium text-foreground">Evaluación de Proyecto</p>
            <p className="text-xs text-muted-foreground">Formulario 2 (F2)</p>
          </div>
          <ArrowRight className="w-3.5 h-3.5 text-emerald-400 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all flex-shrink-0" />
        </button>
      </div> */}

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
            {historial.slice(0, 5).map(item => {
              const Icon = item.icon;
              return (
                <button
                  key={`${item.tipo}-${item.id}`}
                  onClick={() => navigate(item.path)}
                  className="w-full flex items-center gap-3 p-3 rounded-lg border border-border hover:border-border/80 hover:bg-muted/30 transition-all text-left group"
                >
                  <div className={`w-8 h-8 rounded-lg ${item.bgColor} flex items-center justify-center flex-shrink-0`}>
                    <Icon className={`w-4 h-4 ${item.color}`} />
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
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
