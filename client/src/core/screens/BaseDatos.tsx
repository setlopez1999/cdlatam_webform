import { useState, useMemo } from "react";
import type {
  CatalogCeco, CatalogSolucion, CatalogPais, CatalogMoneda,
  CatalogUnidadNegocio, CatalogDetalleServicio, CatalogTipoVenta,
  CatalogPlazo, CatalogDocumento, CatalogContacto,
} from "../../../../drizzle/schema";
import { trpc } from "@/lib/trpc";
import {
  Building2, Globe, DollarSign, Briefcase, Layers, Tag,
  Clock, FileText, Hash, Users, Search, Database,
  BarChart3, Package, Wrench, MapPin, TrendingUp,
  ChevronDown, ChevronUp, X, FileText as FileTextIcon,
  ClipboardList, RefreshCw, Filter, Eye, Trash2,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Link } from "wouter";
import { loadActasList, loadEPList, deleteActa, deleteEP } from "@/hooks/useFormStore";
import { formatCurrency, formatDate, getStatusColor, getStatusLabel } from "@/lib/formatters";

// ─── Tipos ───────────────────────────────────────────────────────────────────

type TabId =
  | "resumen" | "cecos" | "soluciones" | "paises" | "monedas"
  | "unidades" | "detalle" | "tipos" | "plazos" | "documentos"
  | "contactos" | "actas" | "ep";

interface TabDef {
  id: TabId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bgColor: string;
  group: "catalogs" | "records";
}

const TABS: TabDef[] = [
  { id: "resumen",    label: "Resumen",          icon: BarChart3,  color: "text-violet-400",  bgColor: "bg-violet-500/10",  group: "catalogs" },
  { id: "cecos",      label: "CECOs",             icon: Hash,       color: "text-blue-400",    bgColor: "bg-blue-500/10",    group: "catalogs" },
  { id: "soluciones", label: "Soluciones",        icon: Layers,     color: "text-emerald-400", bgColor: "bg-emerald-500/10", group: "catalogs" },
  { id: "paises",     label: "Países",            icon: Globe,      color: "text-cyan-400",    bgColor: "bg-cyan-500/10",    group: "catalogs" },
  { id: "monedas",    label: "Monedas",           icon: DollarSign, color: "text-yellow-400",  bgColor: "bg-yellow-500/10",  group: "catalogs" },
  { id: "unidades",   label: "Unidades Negocio",  icon: Briefcase,  color: "text-orange-400",  bgColor: "bg-orange-500/10",  group: "catalogs" },
  { id: "detalle",    label: "Detalle Servicio",  icon: Wrench,     color: "text-pink-400",    bgColor: "bg-pink-500/10",    group: "catalogs" },
  { id: "tipos",      label: "Tipos de Venta",    icon: Tag,        color: "text-red-400",     bgColor: "bg-red-500/10",     group: "catalogs" },
  { id: "plazos",     label: "Plazos",            icon: Clock,      color: "text-teal-400",    bgColor: "bg-teal-500/10",    group: "catalogs" },
  { id: "documentos", label: "Documentos",        icon: FileText,   color: "text-indigo-400",  bgColor: "bg-indigo-500/10",  group: "catalogs" },
  { id: "contactos",  label: "Contactos",         icon: Users,      color: "text-rose-400",    bgColor: "bg-rose-500/10",    group: "catalogs" },
  { id: "actas",      label: "Actas",             icon: FileTextIcon, color: "text-slate-300", bgColor: "bg-slate-500/10",   group: "records" },
  { id: "ep",         label: "Evaluaciones",      icon: ClipboardList, color: "text-slate-300", bgColor: "bg-slate-500/10", group: "records" },
];

const EMPRESA_INFO: Record<string, { label: string; color: string }> = {
  GN:   { label: "Grupo Negocio", color: "bg-blue-500/20 text-blue-300 border-blue-500/30" },
  TP:   { label: "Trapemn",       color: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" },
  CD:   { label: "CDLatam",       color: "bg-orange-500/20 text-orange-300 border-orange-500/30" },
  GIM:  { label: "GIM SAS",       color: "bg-violet-500/20 text-violet-300 border-violet-500/30" },
  IPTV: { label: "IPTV",          color: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30" },
};

// ─── Tipos de datos ─────────────────────────────────────────────────────────

type SummaryData = {
  cecos: CatalogCeco[];
  soluciones: CatalogSolucion[];
  paises: CatalogPais[];
  monedas: CatalogMoneda[];
  unidades: CatalogUnidadNegocio[];
  detalles: CatalogDetalleServicio[];
  tipos: CatalogTipoVenta[];
  plazos: CatalogPlazo[];
  docs: CatalogDocumento[];
  contactos: CatalogContacto[];
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
    { icon: Hash,       label: "CECOs",           value: data.cecos.length,      color: "text-blue-400",    bg: "bg-blue-500/10" },
    { icon: Layers,     label: "Soluciones",       value: data.soluciones.length, color: "text-emerald-400", bg: "bg-emerald-500/10" },
    { icon: Globe,      label: "Países",           value: data.paises.length,     color: "text-cyan-400",    bg: "bg-cyan-500/10" },
    { icon: DollarSign, label: "Monedas",          value: data.monedas.length,    color: "text-yellow-400",  bg: "bg-yellow-500/10" },
    { icon: Briefcase,  label: "Unidades Negocio", value: data.unidades.length,   color: "text-orange-400",  bg: "bg-orange-500/10" },
    { icon: Wrench,     label: "Detalle Servicio", value: data.detalles.length,   color: "text-pink-400",    bg: "bg-pink-500/10" },
    { icon: Tag,        label: "Tipos de Venta",   value: data.tipos.length,      color: "text-red-400",     bg: "bg-red-500/10" },
    { icon: Clock,      label: "Plazos",           value: data.plazos.length,     color: "text-teal-400",    bg: "bg-teal-500/10" },
    { icon: FileText,   label: "Documentos",       value: data.docs.length,       color: "text-indigo-400",  bg: "bg-indigo-500/10" },
    { icon: Users,      label: "Contactos",        value: data.contactos.length,  color: "text-rose-400",    bg: "bg-rose-500/10" },
  ];
  const total = stats.reduce((a, s) => a + s.value, 0);

  const empresasCount: Record<string, number> = {};
  for (const c of data.cecos) {
    const emp = c.empresa;
    empresasCount[emp] = (empresasCount[emp] ?? 0) + 1;
  }

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

      {/* CECOs por empresa */}
      <div className="bg-[#1a1f2e] border border-white/5 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-5">
          <TrendingUp className="w-4 h-4 text-blue-400" />
          <h3 className="text-sm font-semibold text-white">Distribución de CECOs por Empresa</h3>
          <Badge className="ml-auto text-xs bg-blue-500/10 text-blue-400 border-blue-500/20">{data.cecos.length} total</Badge>
        </div>
        <div className="space-y-3">
          {Object.entries(empresasCount).sort(([,a],[,b]) => b - a).map(([emp, count]) => {
            const info = EMPRESA_INFO[emp] ?? { label: emp, color: "bg-slate-500/20 text-slate-300 border-slate-500/30" };
            const pct = Math.round((count / data.cecos.length) * 100);
            return (
              <div key={emp} className="flex items-center gap-3">
                <div className="w-24 flex-shrink-0">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${info.color}`}>{emp}</span>
                </div>
                <div className="flex-1 bg-white/5 rounded-full h-2">
                  <div className="h-2 rounded-full bg-gradient-to-r from-blue-500 to-violet-500" style={{ width: `${pct}%` }} />
                </div>
                <span className="text-xs text-slate-400 w-20 text-right">{count} CECOs ({pct}%)</span>
              </div>
            );
          })}
        </div>
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
            <span key={s.id} className="text-xs px-2.5 py-1 bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 rounded-full">{s.nombre}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Vista CECOs ──────────────────────────────────────────────────────────────

function CecosView({ cecos }: { cecos: CatalogCeco[] }) {
  const [search, setSearch] = useState("");
  const [empFilter, setEmpFilter] = useState("all");
  const [expanded, setExpanded] = useState<Set<string>>(new Set(Object.keys(EMPRESA_INFO)));

  const empresas = useMemo(() => Array.from(new Set(cecos.map(c => c.empresa))).sort(), [cecos]);

  const filtered = useMemo(() => cecos.filter(c => {
    const q = search.toLowerCase();
    return (c.nombreCompleto.toLowerCase().includes(q) || c.codigo.includes(q)) &&
      (empFilter === "all" || c.empresa === empFilter);
  }), [cecos, search, empFilter]);

  const grouped = useMemo(() => {
    const g: Record<string, typeof filtered> = {};
    for (const c of filtered) { if (!g[c.empresa]) g[c.empresa] = []; g[c.empresa].push(c); }
    return g;
  }, [filtered]);

  const toggle = (e: string) => setExpanded(prev => { const n = new Set(prev); n.has(e) ? n.delete(e) : n.add(e); return n; });

  return (
    <div className="space-y-4">
      <div className="flex gap-3 flex-wrap">
        <div className="flex-1 min-w-48">
          <SearchBar value={search} onChange={setSearch} placeholder="Buscar por código, empresa o departamento..." />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {["all", ...empresas].map(emp => (
            <button key={emp} onClick={() => setEmpFilter(emp)}
              className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${empFilter === emp ? "bg-blue-500/20 text-blue-300 border-blue-500/40" : "bg-white/5 text-slate-400 border-white/10 hover:border-white/20"}`}>
              {emp === "all" ? `Todas (${cecos.length})` : `${emp} (${cecos.filter(c => c.empresa === emp).length})`}
            </button>
          ))}
        </div>
      </div>
      <p className="text-xs text-slate-500">{filtered.length} de {cecos.length} CECOs</p>
      <div className="space-y-2">
        {Object.entries(grouped).map(([emp, items]) => {
          const info = EMPRESA_INFO[emp] ?? { label: emp, color: "bg-slate-500/20 text-slate-300 border-slate-500/30" };
          const isOpen = expanded.has(emp);
          return (
            <div key={emp} className="bg-[#1a1f2e] border border-white/5 rounded-xl overflow-hidden">
              <button onClick={() => toggle(emp)} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/3 transition-colors">
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${info.color}`}>{emp}</span>
                <span className="text-sm font-medium text-white">{info.label}</span>
                <Badge className="ml-auto text-xs bg-white/5 text-slate-400 border-white/10">{items.length} CECOs</Badge>
                {isOpen ? <ChevronUp className="w-4 h-4 text-slate-500 ml-2" /> : <ChevronDown className="w-4 h-4 text-slate-500 ml-2" />}
              </button>
              {isOpen && (
                <div className="border-t border-white/5">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-white/3">
                        <th className="text-left px-4 py-2 text-xs text-slate-500 font-medium w-28">Código</th>
                        <th className="text-left px-4 py-2 text-xs text-slate-500 font-medium">Departamento</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((c, i) => (
                        <tr key={c.id} className={`border-t border-white/3 hover:bg-white/3 transition-colors ${i % 2 === 0 ? "" : "bg-white/1"}`}>
                          <td className="px-4 py-2.5">
                            <span className="font-mono text-xs text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded">{c.codigo}</span>
                          </td>
                          <td className="px-4 py-2.5 text-slate-300 text-sm">{c.departamento}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })}
      </div>
      {filtered.length === 0 && <EmptyState icon={Hash} title="Sin resultados" desc={`No hay CECOs que coincidan con "${search}"`} />}
    </div>
  );
}

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
      documentos: data.docs.length, contactos: data.contactos.length,
    };
    return map[id] ?? null;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Database className="w-5 h-5 text-blue-400" />
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
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all flex-shrink-0 ${
                  isActive ? `${tab.bgColor} ${tab.color} border border-current/20` : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
                }`}>
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
                {count !== null && <span className={`ml-0.5 text-xs px-1.5 py-0.5 rounded-full ${isActive ? "bg-current/10" : "bg-white/5 text-slate-500"}`}>{count}</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* Grupo Registros */}
      <div>
        <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-2 px-1">Registros de Documentos</p>
        <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-none">
          {recordTabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all flex-shrink-0 ${
                  isActive ? "bg-slate-500/20 text-slate-200 border border-slate-500/30" : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
                }`}>
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

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
            {activeTab === "cecos" && data && <CecosView cecos={data.cecos} />}
            {activeTab === "soluciones" && data && <SimpleList items={data.soluciones.map((s: CatalogSolucion) => s.nombre)} dotColor="bg-emerald-400" />}
            {activeTab === "paises" && data && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                  {data.paises.map((p: CatalogPais) => (
                    <div key={p.id} className="bg-[#1a1f2e] border border-white/5 rounded-lg px-3 py-2.5 flex items-center gap-2 hover:border-white/10 transition-colors">
                      <MapPin className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
                      <span className="text-sm text-slate-200">{p.nombre}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {activeTab === "monedas" && data && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {data.monedas.map((m: CatalogMoneda) => {
                  const flags: Record<string, string> = { USD: "🇺🇸", ARS: "🇦🇷", CLP: "🇨🇱", COP: "🇨🇴", SOL: "🇵🇪", UF: "🇨🇱" };
                  return (
                    <div key={m.id} className="bg-[#1a1f2e] border border-white/5 rounded-xl p-4 flex items-center gap-4 hover:border-white/10 transition-colors">
                      <div className="w-12 h-12 rounded-xl bg-yellow-500/10 flex items-center justify-center text-2xl flex-shrink-0">{flags[m.codigo as string] ?? "💱"}</div>
                      <div>
                        <p className="text-base font-bold text-white font-mono">{m.codigo}</p>
                        <p className="text-xs text-slate-400">{m.nombre}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            {activeTab === "unidades" && data && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {data.unidades.map((u: CatalogUnidadNegocio) => (
                  <div key={u.id} className="bg-[#1a1f2e] border border-white/5 rounded-xl p-4 flex items-center gap-3 hover:border-white/10 transition-colors">
                    <div className="w-9 h-9 rounded-lg bg-orange-500/10 flex items-center justify-center flex-shrink-0">
                      <Briefcase className="w-4 h-4 text-orange-400" />
                    </div>
                    <span className="text-sm font-medium text-slate-200">{u.nombre}</span>
                  </div>
                ))}
              </div>
            )}
            {activeTab === "detalle" && data && <SimpleList items={data.detalles.map((d: CatalogDetalleServicio) => d.nombre)} dotColor="bg-pink-400" />}
            {activeTab === "tipos" && data && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {data.tipos.map((t: CatalogTipoVenta) => (
                  <div key={t.id} className="bg-[#1a1f2e] border border-white/5 rounded-xl p-4 flex items-center gap-3 hover:border-white/10 transition-colors">
                    <div className="w-9 h-9 rounded-lg bg-red-500/10 flex items-center justify-center flex-shrink-0"><Tag className="w-4 h-4 text-red-400" /></div>
                    <span className="text-sm font-medium text-slate-200">{t.nombre}</span>
                  </div>
                ))}
              </div>
            )}
            {activeTab === "plazos" && data && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {data.plazos.map((p: CatalogPlazo) => (
                  <div key={p.id} className="bg-[#1a1f2e] border border-white/5 rounded-xl p-4 text-center hover:border-white/10 transition-colors">
                    <Clock className="w-5 h-5 text-teal-400 mx-auto mb-2" />
                    <p className="text-sm font-semibold text-white">{p.nombre}</p>
                  </div>
                ))}
              </div>
            )}
            {activeTab === "documentos" && data && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {data.docs.map((d: CatalogDocumento) => (
                  <div key={d.id} className="bg-[#1a1f2e] border border-white/5 rounded-xl p-5 text-center hover:border-white/10 transition-colors">
                    <div className="w-12 h-12 rounded-xl bg-indigo-500/10 flex items-center justify-center mx-auto mb-3">
                      <FileText className="w-6 h-6 text-indigo-400" />
                    </div>
                    <p className="text-lg font-bold text-white font-mono">{d.nombre}</p>
                    <p className="text-xs text-slate-500 mt-1">Documento de identidad</p>
                  </div>
                ))}
              </div>
            )}
            {activeTab === "contactos" && data && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {data.contactos.map((c: CatalogContacto) => (
                  <div key={c.id} className="bg-[#1a1f2e] border border-white/5 rounded-xl p-4 hover:border-white/10 transition-colors flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500/30 to-violet-500/30 flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-semibold text-white">{c.nombre.charAt(0).toUpperCase()}</span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-white truncate">{c.nombre}</p>
                      {c.empresa && <p className="text-xs text-slate-400 truncate">{c.empresa}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
            {activeTab === "actas" && <ActasView />}
            {activeTab === "ep" && <EPView />}
          </>
        )}
      </div>
    </div>
  );
}
