import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  FileText, ClipboardList, BarChart3,
  Plus, ArrowRight, CheckCircle2, Clock, Download,
} from "lucide-react";
import { formatDate, formatCurrency, getStatusColor, getStatusLabel } from "@/lib/formatters";
import { loadActasList, loadEPList } from "@/hooks/useFormStore";
import { useMemo } from "react";
import { useLocalAuth } from "@/hooks/useLocalAuth";
import { navigate } from "wouter/use-browser-location";

export default function Dashboard() {
  const { currentUser } = useLocalAuth();

  // TODO: Conectar con API de Base de Datos aquí - reemplazar con trpc.dashboard.stats.useQuery()
  const actasList = useMemo(() => loadActasList(), []);
  const epList = useMemo(() => loadEPList(), []);

  const stats = useMemo(() => ({
    totalActas: actasList.length,
    actasCompletadas: actasList.filter(a => a.status === "completado").length,
    actasExportadas: actasList.filter(a => a.status === "exportado").length,
    totalEP: epList.length,
    epCompletadas: epList.filter(e => e.status === "completado").length,
    epExportadas: epList.filter(e => e.status === "exportado").length,
  }), [actasList, epList]);

  const recentActas = actasList.slice(-5).reverse();
  const recentEP = epList.slice(-5).reverse();

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Bienvenido, <span className="text-foreground font-medium">{currentUser?.nombre ?? currentUser?.username}</span>
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/base-datos">Base de Datos</Link>
          </Button>
          <Button size="sm" asChild>
            <div onClick={() => navigate("/nuevo-expediente")}>
              <Plus className="w-3.5 h-3.5 mr-1.5" />
              Nuevo Acta
            </div>
          </Button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Actas totales", value: stats.totalActas, icon: FileText, color: "text-blue-500" },
          { label: "Actas completadas", value: stats.actasCompletadas, icon: CheckCircle2, color: "text-green-500" },
          { label: "EPs totales", value: stats.totalEP, icon: ClipboardList, color: "text-violet-500" },
          { label: "EPs exportadas", value: stats.epExportadas, icon: Download, color: "text-orange-500" },
        ].map(stat => (
          <div key={stat.label} className="rounded-lg border border-border bg-card p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-muted-foreground">{stat.label}</p>
              <stat.icon className={`w-4 h-4 ${stat.color}`} />
            </div>
            <p className="text-2xl font-bold text-foreground">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Flujo de trabajo */}
      <div className="rounded-lg border border-border bg-card p-4">
        <h2 className="text-sm font-medium text-foreground mb-3">Flujo de trabajo</h2>
        <div className="flex items-center gap-2">
          {[
            { step: "01", label: "Acta", desc: "Datos del cliente", href: "/nuevo-expediente", icon: FileText },
            { step: "02", label: "Evaluación EP", desc: "Desglose de costos", href: "/nuevo-expediente", icon: ClipboardList },
            { step: "03", label: "Resultado", desc: "Cálculo automático", href: "/nuevo-expediente", icon: BarChart3 },
          ].map((item, i) => (
            <div key={item.step} className="flex items-center gap-2 flex-1">
              <div onClick={() => navigate(item.href)} className="flex-1">
                <div className="flex items-center gap-2.5 p-3 rounded-lg border border-border hover:border-primary/30 hover:bg-primary/5 transition-all cursor-pointer group">
                  <div className="w-7 h-7 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <item.icon className="w-3.5 h-3.5 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-foreground">{item.label}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{item.desc}</p>
                  </div>
                </div>
              </div>
              {i < 2 && <ArrowRight className="w-3.5 h-3.5 text-muted-foreground/40 flex-shrink-0" />}
            </div>
          ))}
        </div>
      </div>

      {/* Recent records */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Últimas Actas */}
        <div className="rounded-lg border border-border bg-card">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <h2 className="text-sm font-medium text-foreground">Últimas Actas</h2>
            <Button variant="ghost" size="sm" className="h-7 text-xs" asChild>
              <Link href="/acta">Ver todo <ArrowRight className="w-3 h-3 ml-1" /></Link>
            </Button>
          </div>
          {recentActas.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <p className="text-xs text-muted-foreground mb-3">No hay actas registradas</p>
              {/* <Button size="sm" variant="outline" asChild>
                <Link href="/acta"><Plus className="w-3.5 h-3.5 mr-1.5" />Crear primera Acta</Link>
              </Button> */}
            </div>
          ) : (
            <div className="divide-y divide-border">
              {recentActas.map(acta => (
                <div key={acta.id} className="flex items-center justify-between px-4 py-2.5">
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-foreground truncate">
                      {acta.razonSocial || "Sin nombre"}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {acta.noActa ? `N° ${acta.noActa}` : "—"} · {formatDate(acta.updatedAt ?? "")}
                    </p>
                  </div>
                  <Badge variant="outline" className={`text-[10px] ${getStatusColor(acta.status)}`}>
                    {getStatusLabel(acta.status)}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Últimas EPs */}
        <div className="rounded-lg border border-border bg-card">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <h2 className="text-sm font-medium text-foreground">Últimas Evaluaciones EP</h2>
            <Button variant="ghost" size="sm" className="h-7 text-xs" asChild>
              <Link href="/ep">Ver todo <ArrowRight className="w-3 h-3 ml-1" /></Link>
            </Button>
          </div>
          {recentEP.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <p className="text-xs text-muted-foreground mb-3">No hay evaluaciones registradas</p>
              {/* <Button size="sm" variant="outline" asChild>
                <Link href="/ep"><Plus className="w-3.5 h-3.5 mr-1.5" />Crear primera EP</Link>
              </Button> */}
            </div>
          ) : (
            <div className="divide-y divide-border">
              {recentEP.map(ep => (
                <div key={ep.id} className="flex items-center justify-between px-4 py-2.5">
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-foreground truncate">
                      {ep.empresa || ep.nombreCliente || "Sin nombre"}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {ep.montoProyecto ? formatCurrency(ep.montoProyecto, ep.tipoMoneda ?? "USD") : "—"} · {formatDate(ep.updatedAt ?? "")}
                    </p>
                  </div>
                  <Badge variant="outline" className={`text-[10px] ${getStatusColor(ep.status)}`}>
                    {getStatusLabel(ep.status)}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
