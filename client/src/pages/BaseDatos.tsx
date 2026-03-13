import { useState, useMemo } from "react";
import type {
  CatalogCeco, CatalogSolucion, CatalogPais, CatalogMoneda,
  CatalogUnidadNegocio, CatalogDetalleServicio, CatalogTipoVenta,
  CatalogPlazo, CatalogDocumento,
  CatalogEmpresa, CatalogDocumentoIdentidad, CatalogDepartamento, CatalogArea, CatalogNombre
} from "../../../drizzle/schema";
import { trpc } from "@/lib/trpc";
import {
  Building2, Globe, DollarSign, Briefcase, Layers, Tag,
  Clock, Package, Wrench, MapPin,
  FileText, Hash, Users, Search, Database,
  BarChart3, TrendingUp,
  ChevronDown, ChevronUp, X, FileText as FileTextIcon,
  ClipboardList, RefreshCw, Filter, Eye, Trash2,
  Download, Upload, Settings2
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Link } from "wouter";
import { loadActasList, loadEPList, deleteActa, deleteEP } from "@/hooks/useFormStore";
import { formatCurrency, formatDate, getStatusColor, getStatusLabel } from "@/lib/formatters";
import { CatalogCrudView } from "@/components/CatalogCrudView";
import { catalogConfigs } from "@/config/catalogConfig";

// ─── Tipos ───────────────────────────────────────────────────────────────────

type TabId =
  | "resumen" | "cecos" | "soluciones" | "paises" | "monedas"
  | "unidades" | "detalle" | "tipos" | "plazos" | "documentos" | "empresas" | "doctos" | "deptos" | "areas" | "nombres"
  | "actas" | "ep";

interface TabDef {
  id: TabId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bgColor: string;
  group: "catalogs" | "records";
}

const TABS: TabDef[] = [
  { id: "resumen", label: "Resumen", icon: BarChart3, color: "text-violet-400", bgColor: "bg-violet-500/10", group: "catalogs" },
  { id: "monedas", label: "Monedas", icon: DollarSign, color: "text-yellow-400", bgColor: "bg-yellow-500/10", group: "catalogs" },
  { id: "paises", label: "Países", icon: Globe, color: "text-cyan-400", bgColor: "bg-cyan-500/10", group: "catalogs" },
  { id: "empresas", label: "Empresas", icon: Building2, color: "text-blue-400", bgColor: "bg-blue-500/10", group: "catalogs" },
  { id: "doctos", label: "Doc. Identidad", icon: FileText, color: "text-slate-400", bgColor: "bg-slate-500/10", group: "catalogs" },
  { id: "unidades", label: "Unidades Neg.", icon: Briefcase, color: "text-orange-400", bgColor: "bg-orange-500/10", group: "catalogs" },
  { id: "soluciones", label: "Soluciones", icon: Layers, color: "text-emerald-400", bgColor: "bg-emerald-500/10", group: "catalogs" },
  { id: "detalle", label: "Detalle Serv.", icon: Wrench, color: "text-pink-400", bgColor: "bg-pink-500/10", group: "catalogs" },
  { id: "tipos", label: "Tipos de Venta", icon: Tag, color: "text-red-400", bgColor: "bg-red-500/10", group: "catalogs" },
  { id: "plazos", label: "Plazos", icon: Clock, color: "text-teal-400", bgColor: "bg-teal-500/10", group: "catalogs" },
  //{ id: "documentos", label: "Documentos", icon: FileTextIcon, color: "text-indigo-400", bgColor: "bg-indigo-500/10", group: "catalogs" },
  { id: "cecos", label: "CECOs", icon: Hash, color: "text-blue-400", bgColor: "bg-blue-500/10", group: "catalogs" },
  { id: "deptos", label: "Departamentos", icon: MapPin, color: "text-indigo-400", bgColor: "bg-indigo-500/10", group: "catalogs" },
  { id: "areas", label: "Áreas", icon: Layers, color: "text-fuchsia-400", bgColor: "bg-fuchsia-500/10", group: "catalogs" },
  { id: "nombres", label: "Nombres", icon: Users, color: "text-rose-400", bgColor: "bg-rose-500/10", group: "catalogs" },
  { id: "actas", label: "Actas", icon: FileTextIcon, color: "text-slate-300", bgColor: "bg-slate-500/10", group: "records" },
  { id: "ep", label: "Evaluaciones", icon: ClipboardList, color: "text-slate-300", bgColor: "bg-slate-500/10", group: "records" },
];

// ─── Tipos de datos ─────────────────────────────────────────────────────────

type SummaryData = {
  monedas: CatalogMoneda[];
  paises: CatalogPais[];
  empresas: CatalogEmpresa[];
  doctos: CatalogDocumentoIdentidad[];
  unidades: CatalogUnidadNegocio[];
  soluciones: CatalogSolucion[];
  detalles: CatalogDetalleServicio[];
  tipos: CatalogTipoVenta[];
  plazos: CatalogPlazo[];
  docs: CatalogDocumento[];
  cecos: CatalogCeco[];
  deptos: CatalogDepartamento[];
  areas: CatalogArea[];
  nombres: CatalogNombre[];
};

// ─── Helpers UI ─────────────────────────────────────────────────────────────────

function SearchBar({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
      <Input
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder ?? "Buscar..."}
        className="pl-9 bg-[#1a1f2e] border-white/10 text-white placeholder:text-slate-500 h-9 text-sm"
      />
      {value && (
        <button onClick={() => onChange("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white">
          <X className="w-3 h-3" />
        </button>
      )}
    </div>
  );
}

function EmptyState({ icon: Icon, title, desc }: { icon: React.ComponentType<{ className?: string }>; title: string; desc: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <Icon className="w-10 h-10 text-slate-600 mb-3" />
      <p className="text-slate-400 font-medium">{title}</p>
      <p className="text-slate-600 text-sm mt-1">{desc}</p>
    </div>
  );
}

// ─── Vista Resumen ────────────────────────────────────────────────────────────

function ResumenView({ data }: { data: SummaryData }) {
  const stats = [
    { icon: Hash, label: "CECOs", value: data.cecos.length, color: "text-blue-400", bg: "bg-blue-500/10" },
    { icon: Layers, label: "Soluciones", value: data.soluciones.length, color: "text-emerald-400", bg: "bg-emerald-500/10" },
    { icon: Globe, label: "Países", value: data.paises.length, color: "text-cyan-400", bg: "bg-cyan-500/10" },
    { icon: DollarSign, label: "Monedas", value: data.monedas.length, color: "text-yellow-400", bg: "bg-yellow-500/10" },
    { icon: Building2, label: "Empresas", value: data.empresas.length, color: "text-blue-400", bg: "bg-blue-500/10" },
    { icon: FileText, label: "Doc. Identidad", value: data.doctos.length, color: "text-slate-400", bg: "bg-slate-500/10" },
    { icon: Briefcase, label: "Unidades Negocio", value: data.unidades.length, color: "text-orange-400", bg: "bg-orange-500/10" },
    { icon: Wrench, label: "Detalle Servicio", value: data.detalles.length, color: "text-pink-400", bg: "bg-pink-500/10" },
    { icon: Tag, label: "Tipos de Venta", value: data.tipos.length, color: "text-red-400", bg: "bg-red-500/10" },
    { icon: Clock, label: "Plazos", value: data.plazos.length, color: "text-teal-400", bg: "bg-teal-500/10" },
    { icon: FileText, label: "Documentos", value: data.docs.length, color: "text-indigo-400", bg: "bg-indigo-500/10" },
    { icon: MapPin, label: "Departamentos", value: data.deptos.length, color: "text-indigo-400", bg: "bg-indigo-500/10" },
    { icon: Layers, label: "Áreas", value: data.areas.length, color: "text-fuchsia-400", bg: "bg-fuchsia-500/10" },
    { icon: Users, label: "Nombres", value: data.nombres.length, color: "text-rose-400", bg: "bg-rose-500/10" },
  ];
  const total = stats.reduce((a, s) => a + s.value, 0);

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="bg-gradient-to-r from-blue-600/20 to-violet-600/20 border border-blue-500/20 rounded-xl p-6 flex items-center gap-5">
        <div className="w-14 h-14 rounded-xl bg-blue-500/20 flex items-center justify-center flex-shrink-0">
          <Database className="w-7 h-7 text-blue-400" />
        </div>
        <div>
          <p className="text-4xl font-bold text-white">{total}</p>
          <p className="text-slate-400 text-sm">registros totales en la base de datos</p>
          <p className="text-xs text-slate-500 mt-0.5">Importados desde Excel — Hoja "Base de datos"</p>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {stats.map(s => (
          <div key={s.label} className="bg-[#1a1f2e] border border-white/5 rounded-xl p-4 flex items-center gap-3 hover:border-white/10 transition-colors">
            <div className={`w-9 h-9 rounded-lg ${s.bg} flex items-center justify-center flex-shrink-0`}>
              <s.icon className={`w-4 h-4 ${s.color}`} />
            </div>
            <div className="min-w-0">
              <p className="text-xl font-bold text-white">{s.value}</p>
              <p className="text-xs text-slate-500 truncate">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Soluciones preview */}
      <div className="bg-[#1a1f2e] border border-white/5 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Package className="w-4 h-4 text-emerald-400" />
          <h3 className="text-sm font-semibold text-white">Soluciones Disponibles</h3>
          <Badge className="ml-auto text-xs bg-emerald-500/10 text-emerald-400 border-emerald-500/20">{data.soluciones.length} total</Badge>
        </div>
        <div className="flex flex-wrap gap-2">
          {data.soluciones.map((s: CatalogSolucion) => (
            <span key={s.id} className="text-xs px-2.5 py-1 bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 rounded-full">{s.valor}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── ESPACIO PARA OTRAS VISTAS (SI APLICA) ───────────────────────────────────

// ─── Vista simple lista ───────────────────────────────────────────────────────

function SimpleList({ items, dotColor }: { items: string[]; dotColor: string }) {
  const [search, setSearch] = useState("");
  const filtered = items.filter(i => i.toLowerCase().includes(search.toLowerCase()));
  return (
    <div className="space-y-3">
      <SearchBar value={search} onChange={setSearch} placeholder="Filtrar..." />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {filtered.map((item, i) => (
          <div key={i} className="bg-[#1a1f2e] border border-white/5 rounded-lg px-3 py-2.5 flex items-center gap-2 hover:border-white/10 transition-colors">
            <div className={`w-1.5 h-1.5 rounded-full ${dotColor} flex-shrink-0`} />
            <span className="text-sm text-slate-200 truncate">{item}</span>
          </div>
        ))}
      </div>
      {filtered.length === 0 && <EmptyState icon={Search} title="Sin resultados" desc={`No hay coincidencias para "${search}"`} />}
      <p className="text-xs text-slate-500">{filtered.length} de {items.length} registros</p>
    </div>
  );
}

// ─── Vista Actas (localStorage) ───────────────────────────────────────────────

function ActasView() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [actas, setActas] = useState(() => loadActasList());

  const filtered = useMemo(() => actas.filter(a => {
    const q = search.toLowerCase();
    const matchQ = !q || a.razonSocial?.toLowerCase().includes(q) || a.noActa?.toLowerCase().includes(q) || a.rucDniRut?.toLowerCase().includes(q);
    return matchQ && (statusFilter === "all" || a.status === statusFilter);
  }), [actas, search, statusFilter]);

  const handleDelete = (id: string) => {
    if (!confirm("¿Eliminar esta acta?")) return;
    deleteActa(id);
    setActas(loadActasList());
    toast.success("Acta eliminada");
    // TODO: Conectar con API de Base de Datos aquí - trpc.actas.delete.mutate({ id })
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-3 flex-wrap">
        <div className="flex-1 min-w-48"><SearchBar value={search} onChange={setSearch} placeholder="Buscar por razón social, N° acta, RUT..." /></div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40 bg-[#1a1f2e] border-white/10 text-white h-9 text-sm">
            <Filter className="w-3.5 h-3.5 mr-2 text-slate-400" /><SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="borrador">Borrador</SelectItem>
            <SelectItem value="completado">Completado</SelectItem>
            <SelectItem value="exportado">Exportado</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={() => setActas(loadActasList())} className="h-9 border-white/10 text-slate-400 hover:text-white">
          <RefreshCw className="w-3.5 h-3.5" />
        </Button>
      </div>
      {filtered.length === 0 ? (
        <EmptyState icon={FileTextIcon} title="No hay actas" desc={search ? "Sin resultados para tu búsqueda." : "Aún no hay actas registradas."} />
      ) : (
        <div className="bg-[#1a1f2e] border border-white/5 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5 bg-white/3">
                  {["N° Acta", "Razón Social", "RUT/DNI", "Representante", "Fecha", "Total", "Estado", ""].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-medium text-slate-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((acta, i) => {
                  const total = (acta.serviciosContratados as any[])?.reduce((s: number, sv: any) => s + (sv.total || 0), 0) ?? 0;
                  return (
                    <tr key={String(acta.id ?? i)} className="border-t border-white/3 hover:bg-white/3 transition-colors">
                      <td className="px-4 py-3"><span className="font-mono text-xs text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded">{acta.noActa || "-"}</span></td>
                      <td className="px-4 py-3 text-sm font-medium text-slate-200">{acta.razonSocial || "-"}</td>
                      <td className="px-4 py-3 text-xs text-slate-400">{acta.rucDniRut || "-"}</td>
                      <td className="px-4 py-3 text-xs text-slate-400">{acta.representanteLegal || "-"}</td>
                      <td className="px-4 py-3 text-xs text-slate-400">{formatDate(acta.fecha ?? "")}</td>
                      <td className="px-4 py-3 text-xs font-mono text-right text-slate-300">{formatCurrency(total)}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full border ${getStatusColor(acta.status)}`}>{getStatusLabel(acta.status)}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          <Button asChild variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-white">
                            <Link href="/acta"><Eye className="w-3.5 h-3.5" /></Link>
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-red-400" onClick={() => handleDelete(String(acta.id ?? ""))}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-2.5 border-t border-white/5 text-xs text-slate-500">
            {filtered.length} de {actas.length} actas
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Vista EP (localStorage) ──────────────────────────────────────────────────

function EPView() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [eps, setEps] = useState(() => loadEPList());

  const filtered = useMemo(() => eps.filter(e => {
    const q = search.toLowerCase();
    const matchQ = !q || e.nombreCliente?.toLowerCase().includes(q) || e.empresa?.toLowerCase().includes(q) || e.solucion?.toLowerCase().includes(q);
    return matchQ && (statusFilter === "all" || e.status === statusFilter);
  }), [eps, search, statusFilter]);

  const handleDelete = (id: string) => {
    if (!confirm("¿Eliminar esta evaluación?")) return;
    deleteEP(id);
    setEps(loadEPList());
    toast.success("Evaluación eliminada");
    // TODO: Conectar con API de Base de Datos aquí - trpc.evaluaciones.delete.mutate({ id })
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-3 flex-wrap">
        <div className="flex-1 min-w-48"><SearchBar value={search} onChange={setSearch} placeholder="Buscar por cliente, empresa, solución..." /></div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40 bg-[#1a1f2e] border-white/10 text-white h-9 text-sm">
            <Filter className="w-3.5 h-3.5 mr-2 text-slate-400" /><SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="borrador">Borrador</SelectItem>
            <SelectItem value="completado">Completado</SelectItem>
            <SelectItem value="exportado">Exportado</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={() => setEps(loadEPList())} className="h-9 border-white/10 text-slate-400 hover:text-white">
          <RefreshCw className="w-3.5 h-3.5" />
        </Button>
      </div>
      {filtered.length === 0 ? (
        <EmptyState icon={ClipboardList} title="No hay evaluaciones" desc={search ? "Sin resultados para tu búsqueda." : "Aún no hay evaluaciones registradas."} />
      ) : (
        <div className="bg-[#1a1f2e] border border-white/5 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5 bg-white/3">
                  {["N° Propuesta", "Cliente", "Empresa", "Solución", "País", "Monto", "Estado", ""].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-medium text-slate-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((ep, i) => (
                  <tr key={String(ep.id ?? i)} className="border-t border-white/3 hover:bg-white/3 transition-colors">
                    <td className="px-4 py-3"><span className="font-mono text-xs text-violet-400 bg-violet-500/10 px-2 py-0.5 rounded">{ep.propuestaNumero || "-"}</span></td>
                    <td className="px-4 py-3 text-sm font-medium text-slate-200">{ep.nombreCliente || "-"}</td>
                    <td className="px-4 py-3 text-xs text-slate-400">{ep.empresa || "-"}</td>
                    <td className="px-4 py-3 text-xs text-slate-400">{ep.solucion || "-"}</td>
                    <td className="px-4 py-3 text-xs text-slate-400">{ep.paisImplementacion || "-"}</td>
                    <td className="px-4 py-3 text-xs font-mono text-right text-slate-300">{formatCurrency(ep.montoProyecto)}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${getStatusColor(ep.status)}`}>{getStatusLabel(ep.status)}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <Button asChild variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-white">
                          <Link href="/ep"><Eye className="w-3.5 h-3.5" /></Link>
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-red-400" onClick={() => handleDelete(String(ep.id ?? ""))}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-2.5 border-t border-white/5 text-xs text-slate-500">
            {filtered.length} de {eps.length} evaluaciones
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function BaseDatos() {
  const [activeTab, setActiveTab] = useState<TabId>("resumen");
  const [showAdminDb, setShowAdminDb] = useState(false);
  const { data: rawData, isLoading, error } = trpc.catalogsDB.summary.useQuery();
  const data = rawData as SummaryData | undefined;

  const catalogTabs = TABS.filter(t => t.group === "catalogs");
  const recordTabs = TABS.filter(t => t.group === "records");

  const getCount = (id: TabId) => {
    if (!data) return null;
    const map: Partial<Record<TabId, number>> = {
      cecos: data.cecos.length, soluciones: data.soluciones.length,
      paises: data.paises.length, monedas: data.monedas.length,
      unidades: data.unidades.length, detalle: data.detalles.length,
      tipos: data.tipos.length, plazos: data.plazos.length,
      documentos: data.docs.length,
      empresas: data.empresas.length, doctos: data.doctos.length,
      deptos: data.deptos.length, areas: data.areas.length, nombres: data.nombres.length,
    };
    return map[id] ?? null;
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Database className="w-6 h-6 text-primary" />
            Base de Datos
          </h1>
          <p className="text-sm text-slate-400 mt-0.5">Catálogos del sistema y registros de documentos</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          MySQL conectado
        </div>
      </div>

      {/* Grupo Catálogos */}
      <div>
        <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-2 px-1">Catálogos del Sistema</p>
        <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-none">
          {catalogTabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            const count = getCount(tab.id);
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all flex-shrink-0 ${isActive ? `${tab.bgColor} ${tab.color} border border-current/20` : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
                  }`}>
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
                {count !== null && <span className={`ml-0.5 text-xs px-1.5 py-0.5 rounded-full ${isActive ? "bg-current/10" : "bg-white/5 text-slate-500"}`}>{count}</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* Grupo Registros 
      <div>
        <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-2 px-1">Registros de Documentos</p>
        <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-none">
          {recordTabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all flex-shrink-0 ${isActive ? "bg-slate-500/20 text-slate-200 border border-slate-500/30" : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
                  }`}>
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>
      */}

      {/* Contenido */}
      <div className="min-h-64">
        {isLoading && activeTab !== "actas" && activeTab !== "ep" ? (
          <div className="flex items-center justify-center h-48">
            <div className="text-center space-y-3">
              <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mx-auto" />
              <p className="text-slate-400 text-sm">Cargando...</p>
            </div>
          </div>
        ) : error && activeTab !== "actas" && activeTab !== "ep" ? (
          <div className="flex items-center justify-center h-48">
            <div className="text-center">
              <Database className="w-8 h-8 text-red-400 mx-auto mb-2" />
              <p className="text-red-400 text-sm">{error.message}</p>
            </div>
          </div>
        ) : (
          <>
            {activeTab === "resumen" && data && <ResumenView data={data} />}

            {/* CRUD GENÉRICO DE CATÁLOGOS */}
            {activeTab !== "resumen" && activeTab !== "actas" && activeTab !== "ep" && catalogConfigs[activeTab] && (
              <CatalogCrudView config={catalogConfigs[activeTab]} />
            )}

            {/* VISTAS PARTICULARES */}
            {activeTab === "actas" && <ActasView />}
            {activeTab === "ep" && <EPView />}
          </>
        )}
      </div>

      {/* Admin DB Management (Hidden Trigger) */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-2">
        {showAdminDb && (
          <div className="flex flex-col gap-2 bg-[#1a1f2e] border border-white/10 p-2 rounded-xl shadow-2xl animate-in fade-in slide-in-from-bottom-2">
            <Button 
              variant="outline" 
              size="sm" 
              className="h-9 border-white/5 bg-white/5 text-slate-300 hover:text-white"
              onClick={() => {
                window.location.href = "/api/db/export";
                toast.success("Iniciando descarga de base de datos...");
              }}
            >
              <Download className="w-4 h-4 mr-2" />
              Exportar BD
            </Button>
            
            <div className="relative">
              <input
                type="file"
                className="absolute inset-0 opacity-0 cursor-pointer"
                accept=".db"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  
                  if (!confirm("¿Estás seguro de que deseas sobrescribir la base de datos actual? Esta acción no se puede deshacer.")) return;
                  
                  const toastId = toast.loading("Importando base de datos...");
                  try {
                    const response = await fetch("/api/db/import", {
                      method: "POST",
                      headers: { "Content-Type": "application/octet-stream" },
                      body: await file.arrayBuffer(),
                    });
                    
                    if (response.ok) {
                      toast.success("Base de datos importada con éxito. Recargando...", { id: toastId });
                      setTimeout(() => window.location.reload(), 1500);
                    } else {
                      toast.error("Error al importar la base de datos.", { id: toastId });
                    }
                  } catch (err) {
                    console.error(err);
                    toast.error("Error de conexión al importar.", { id: toastId });
                  }
                }}
              />
              <Button 
                variant="outline" 
                size="sm" 
                className="h-9 border-white/5 bg-white/5 text-slate-300 hover:text-white w-full"
              >
                <Upload className="w-4 h-4 mr-2" />
                Importar BD
              </Button>
            </div>
            
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-6 w-6 self-end text-slate-500 hover:text-white"
              onClick={() => setShowAdminDb(false)}
            >
              <X className="w-3 h-3" />
            </Button>
          </div>
        )}
        
        <button 
          onClick={() => setShowAdminDb(!showAdminDb)}
          className="w-4 h-4 rounded-full bg-white/5 hover:bg-white/10 transition-colors flex items-center justify-center opacity-20 hover:opacity-100"
          title="Admin DB"
        >
          <Settings2 className="w-2.5 h-2.5 text-slate-500" />
        </button>
      </div>
    </div>
  );
}
