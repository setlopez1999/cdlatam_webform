import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  FileText, ClipboardList, BarChart3, Database,
  Plus, TrendingUp, Clock, CheckCircle2, Download,
  ArrowRight, Activity, Layers, AlertCircle,
} from "lucide-react";
import { formatDate, formatCurrency, getStatusColor, getStatusLabel } from "@/lib/formatters";
import { loadActasList, loadEPList } from "@/hooks/useFormStore";
import { useMemo } from "react";

export default function Dashboard() {
  const { user, loading, isAuthenticated } = useAuth();

  // Load from localStorage (Service Layer)
  // TODO: Conectar con API de Base de Datos aquí - reemplazar con trpc.dashboard.stats.useQuery()
  const actasList = useMemo(() => loadActasList(), []);
  const epList = useMemo(() => loadEPList(), []);

  const stats = useMemo(() => ({
    totalActas: actasList.length,
    actasBorrador: actasList.filter(a => a.status === "borrador").length,
    actasCompletadas: actasList.filter(a => a.status === "completado").length,
    actasExportadas: actasList.filter(a => a.status === "exportado").length,
    totalEP: epList.length,
    epBorrador: epList.filter(e => e.status === "borrador").length,
    epCompletadas: epList.filter(e => e.status === "completado").length,
    epExportadas: epList.filter(e => e.status === "exportado").length,
  }), [actasList, epList]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="text-center max-w-md px-6">
          <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Layers className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-2">Sistema de Gestión Administrativa</h2>
          <p className="text-muted-foreground mb-6">
            Plataforma para gestión de Actas de Aceptación, Evaluaciones de Proyectos y Resultados.
          </p>
          <Button asChild size="lg" className="w-full">
            <a href={getLoginUrl()}>Iniciar Sesión</a>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Bienvenido, <span className="font-medium text-foreground">{user?.name ?? "Usuario"}</span>
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href="/base-datos">
              <Database className="w-4 h-4 mr-2" />
              Base de Datos
            </Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/acta">
              <Plus className="w-4 h-4 mr-2" />
              Nuevo Acta
            </Link>
          </Button>
        </div>
      </div>

      {/* Status Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Formulario 1 Card */}
        <Card className="border-border hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center">
                  <FileText className="w-4 h-4 text-indigo-600" />
                </div>
                <div>
                  <CardTitle className="text-sm font-semibold">Formulario 1</CardTitle>
                  <p className="text-xs text-muted-foreground">Acta de Aceptación</p>
                </div>
              </div>
              <Badge variant="outline" className="text-xs font-mono">F1</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-end gap-2">
              <span className="text-3xl font-bold text-foreground">{stats.totalActas}</span>
              <span className="text-sm text-muted-foreground mb-1">registros</span>
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 text-amber-600">
                  <Clock className="w-3 h-3" /> Borrador
                </span>
                <span className="font-medium">{stats.actasBorrador}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 text-emerald-600">
                  <CheckCircle2 className="w-3 h-3" /> Completado
                </span>
                <span className="font-medium">{stats.actasCompletadas}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 text-blue-600">
                  <Download className="w-3 h-3" /> Exportado
                </span>
                <span className="font-medium">{stats.actasExportadas}</span>
              </div>
            </div>
            <Button asChild variant="outline" size="sm" className="w-full mt-2">
              <Link href="/acta">
                Ir al Formulario <ArrowRight className="w-3 h-3 ml-1" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        {/* Formulario 2 Card */}
        <Card className="border-border hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-violet-50 rounded-lg flex items-center justify-center">
                  <ClipboardList className="w-4 h-4 text-violet-600" />
                </div>
                <div>
                  <CardTitle className="text-sm font-semibold">Formulario 2</CardTitle>
                  <p className="text-xs text-muted-foreground">Evaluación de Proyecto</p>
                </div>
              </div>
              <Badge variant="outline" className="text-xs font-mono">F2</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-end gap-2">
              <span className="text-3xl font-bold text-foreground">{stats.totalEP}</span>
              <span className="text-sm text-muted-foreground mb-1">registros</span>
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 text-amber-600">
                  <Clock className="w-3 h-3" /> Borrador
                </span>
                <span className="font-medium">{stats.epBorrador}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 text-emerald-600">
                  <CheckCircle2 className="w-3 h-3" /> Completado
                </span>
                <span className="font-medium">{stats.epCompletadas}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 text-blue-600">
                  <Download className="w-3 h-3" /> Exportado
                </span>
                <span className="font-medium">{stats.epExportadas}</span>
              </div>
            </div>
            <Button asChild variant="outline" size="sm" className="w-full mt-2">
              <Link href="/ep">
                Ir al Formulario <ArrowRight className="w-3 h-3 ml-1" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        {/* Formulario 3 Card */}
        <Card className="border-border hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-emerald-50 rounded-lg flex items-center justify-center">
                  <BarChart3 className="w-4 h-4 text-emerald-600" />
                </div>
                <div>
                  <CardTitle className="text-sm font-semibold">Formulario 3</CardTitle>
                  <p className="text-xs text-muted-foreground">Resultado Evaluación</p>
                </div>
              </div>
              <Badge variant="outline" className="text-xs font-mono">F3</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2 py-2">
              <Activity className="w-5 h-5 text-emerald-500" />
              <div>
                <p className="text-sm font-medium text-foreground">Auto-calculado</p>
                <p className="text-xs text-muted-foreground">Se genera desde el F2 en tiempo real</p>
              </div>
            </div>
            <div className="bg-emerald-50 rounded-lg p-3 border border-emerald-100">
              <p className="text-xs text-emerald-700 font-medium">Flujo automático activo</p>
              <p className="text-xs text-emerald-600 mt-0.5">
                Completa el F2 para ver resultados en vivo
              </p>
            </div>
            <Button asChild variant="outline" size="sm" className="w-full mt-2">
              <Link href="/resultado">
                Ver Resultado <ArrowRight className="w-3 h-3 ml-1" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Workflow Guide */}
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            Flujo de Trabajo
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
            {[
              { step: "01", title: "Acta", desc: "Registra los datos del cliente y servicios contratados", href: "/acta", color: "bg-indigo-500" },
              { step: "02", title: "Evaluación EP", desc: "Ingresa costos por categoría (Hardware, RRHH, Otros)", href: "/ep", color: "bg-violet-500" },
              { step: "03", title: "Resultado", desc: "El sistema calcula automáticamente el resultado financiero", href: "/resultado", color: "bg-emerald-500" },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-4 flex-1">
                <Link href={item.href}>
                  <div className="flex items-center gap-3 p-3 rounded-xl border border-border hover:border-primary/30 hover:bg-accent/50 transition-all cursor-pointer group w-full">
                    <div className={`w-8 h-8 ${item.color} rounded-lg flex items-center justify-center flex-shrink-0`}>
                      <span className="text-xs font-bold text-white">{item.step}</span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">{item.title}</p>
                      <p className="text-xs text-muted-foreground">{item.desc}</p>
                    </div>
                  </div>
                </Link>
                {i < 2 && (
                  <ArrowRight className="w-4 h-4 text-muted-foreground flex-shrink-0 hidden md:block" />
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Records */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Actas */}
        <Card className="border-border">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <FileText className="w-4 h-4 text-indigo-500" />
                Últimas Actas
              </CardTitle>
              <Button asChild variant="ghost" size="sm" className="text-xs h-7">
                <Link href="/acta">Ver todo</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {actasList.length === 0 ? (
              <div className="text-center py-8">
                <AlertCircle className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No hay actas registradas</p>
                <Button asChild variant="outline" size="sm" className="mt-3">
                  <Link href="/acta">
                    <Plus className="w-3 h-3 mr-1" /> Crear primera Acta
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {actasList.slice(0, 4).map((acta, i) => (
                  <div key={i} className="flex items-center justify-between p-2.5 rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {acta.razonSocial || "Sin razón social"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {acta.noActa ? `N° ${acta.noActa}` : "Sin número"} · {formatDate(acta.fecha)}
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      className={`text-xs flex-shrink-0 ml-2 ${getStatusColor(acta.status)}`}
                    >
                      {getStatusLabel(acta.status)}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent EPs */}
        <Card className="border-border">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <ClipboardList className="w-4 h-4 text-violet-500" />
                Últimas Evaluaciones EP
              </CardTitle>
              <Button asChild variant="ghost" size="sm" className="text-xs h-7">
                <Link href="/ep">Ver todo</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {epList.length === 0 ? (
              <div className="text-center py-8">
                <AlertCircle className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No hay evaluaciones registradas</p>
                <Button asChild variant="outline" size="sm" className="mt-3">
                  <Link href="/ep">
                    <Plus className="w-3 h-3 mr-1" /> Crear primera EP
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {epList.slice(0, 4).map((ep, i) => (
                  <div key={i} className="flex items-center justify-between p-2.5 rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {ep.nombreCliente || ep.empresa || "Sin cliente"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {ep.propuestaNumero ? `Prop. ${ep.propuestaNumero}` : "Sin propuesta"} · {formatCurrency(ep.montoProyecto)}
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      className={`text-xs flex-shrink-0 ml-2 ${getStatusColor(ep.status)}`}
                    >
                      {getStatusLabel(ep.status)}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
