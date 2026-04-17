import { useState } from "react";
import {
  Database, BarChart3, DollarSign, Globe, Building2, FileText,
  Briefcase, Layers, Wrench, Tag, Clock, Package, Hash,
  MapPin, Users, Boxes, ShieldCheck, Landmark, Truck,
  Cpu, BookOpen, Star, Zap, Settings, Flag,
  LayoutGrid, AlignJustify
} from "lucide-react";

interface CatalogMeta {
  id: number;
  tableName: string;
  title: string;
  isCustom: boolean;
  linkedField?: string | null;
}

interface Props {
  tables: CatalogMeta[];
  activeTab: string;
  onSelect: (tableName: string) => void;
  counts?: Record<string, number>;
}

// Ícono por tableName — usa el alias corto que guarda catalog_meta
const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  monedas:    DollarSign,
  paises:     Globe,
  empresas:   Building2,
  doctos:     FileText,
  unidades:   Briefcase,
  soluciones: Layers,
  detalle:    Wrench,
  tipos:      Tag,
  plazos:     Clock,
  documentos: Package,
  cecos:      Hash,
  deptos:     MapPin,
  areas:      Boxes,
  nombres:    Users,
};

// Íconos de reserva para tablas dinámicas
const FALLBACK_ICONS = [ShieldCheck, Landmark, Truck, Cpu, BookOpen, Star, Zap, Settings, Flag, Globe];

// Paleta de colores cíclica
const COLORS = [
  { text: "text-yellow-400",  bg: "bg-yellow-500/10",  border: "border-yellow-400/30"  },
  { text: "text-cyan-400",    bg: "bg-cyan-500/10",    border: "border-cyan-400/30"    },
  { text: "text-blue-400",    bg: "bg-blue-500/10",    border: "border-blue-400/30"    },
  { text: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-400/30" },
  { text: "text-pink-400",    bg: "bg-pink-500/10",    border: "border-pink-400/30"    },
  { text: "text-orange-400",  bg: "bg-orange-500/10",  border: "border-orange-400/30"  },
  { text: "text-red-400",     bg: "bg-red-500/10",     border: "border-red-400/30"     },
  { text: "text-teal-400",    bg: "bg-teal-500/10",    border: "border-teal-400/30"    },
  { text: "text-indigo-400",  bg: "bg-indigo-500/10",  border: "border-indigo-400/30"  },
  { text: "text-fuchsia-400", bg: "bg-fuchsia-500/10", border: "border-fuchsia-400/30" },
  { text: "text-rose-400",    bg: "bg-rose-500/10",    border: "border-rose-400/30"    },
  { text: "text-violet-400",  bg: "bg-violet-500/10",  border: "border-violet-400/30"  },
];

type ViewMode = "desplegado" | "compacto";

// ─── Tema de hover centralizado ─────────────────────────────────────────────
// Cambia aqui para ajustar el estilo de hover en ambos modos
const HOVER_STYLE = {
  base:   "text-slate-700 bg-blue-50 border-blue-200",
  text:   "text-slate-700",
  icon:   "text-blue-500",
};

function getStoredMode(): ViewMode {
  try { return (localStorage.getItem("catalog_view_mode") as ViewMode) ?? "desplegado"; } catch { return "desplegado"; }
}

export function CatalogTabGrid({ tables, activeTab, onSelect, counts = {} }: Props) {
  const [mode, setMode] = useState<ViewMode>(getStoredMode);

  const toggleMode = () => {
    const next: ViewMode = mode === "desplegado" ? "compacto" : "desplegado";
    setMode(next);
    try { localStorage.setItem("catalog_view_mode", next); } catch {}
  };

  // Lista completa: resumen + tablas
  const allItems = [
    { tableName: "resumen", title: "Resumen", isResumen: true, idx: -1 },
    ...tables.map((t, i) => ({ ...t, isResumen: false, idx: i })),
  ];

  return (
    <div className="space-y-2">
      {/* Encabezado con toggle */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Catálogos del Sistema</p>
        <button
          onClick={toggleMode}
          title={mode === "desplegado" ? "Cambiar a vista compacta" : "Cambiar a vista desplegada"}
          className="flex items-center gap-1.5 px-2 py-1 rounded-md text-xs text-slate-500 hover:text-slate-200 hover:bg-white/5 border border-white/5 transition-all"
        >
          {mode === "desplegado"
            ? <><AlignJustify className="w-3.5 h-3.5" /> Compacto</>
            : <><LayoutGrid className="w-3.5 h-3.5" /> Desplegado</>
          }
        </button>
      </div>

      {/* Vista DESPLEGADA: grid de bloques */}
      {mode === "desplegado" && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2">
          {allItems.map(item => {
            const isActive = activeTab === item.tableName;
            if (item.isResumen) {
              return (
                <button key="resumen" onClick={() => onSelect("resumen")}
                  className={`flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl border transition-all text-center
                    ${isActive ? "bg-violet-500/20 border-violet-400/40 text-violet-300 shadow-sm" : `bg-white/3 border-white/8 text-slate-400 hover:${HOVER_STYLE.base}`}`}>
                  <BarChart3 className={`w-4 h-4 ${isActive ? "text-violet-400" : "text-slate-500"}`} />
                  <span className="text-xs font-medium leading-tight">Resumen</span>
                </button>
              );
            }
            const color = COLORS[item.idx % COLORS.length];
            const Icon = ICON_MAP[item.tableName] ?? FALLBACK_ICONS[item.idx % FALLBACK_ICONS.length];
            const count = counts[item.tableName];
            return (
              <button key={item.tableName} onClick={() => onSelect(item.tableName)}
                className={`flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl border transition-all text-center
                  ${isActive ? `${color.bg} ${color.border} ${color.text} shadow-sm` : `bg-white/3 border-white/8 text-slate-400 hover:${HOVER_STYLE.base}`}`}>
                <Icon className={`w-4 h-4 ${isActive ? color.text : "text-slate-500"}`} />
                <span className="text-xs font-medium leading-tight text-center break-words w-full">{item.title}</span>
                {count !== undefined && (
                  <span className={`text-xs font-bold ${isActive ? color.text : "text-slate-500"}`}>{count}</span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Vista COMPACTA: fila de íconos pequeños con label al hover */}
      {mode === "compacto" && (
        <div className="flex flex-wrap gap-1">
          {allItems.map(item => {
            const isActive = activeTab === item.tableName;
            const isResumen = item.isResumen;
            const color = isResumen
              ? { text: "text-violet-400", bg: "bg-violet-500/20", border: "border-violet-400/40" }
              : COLORS[item.idx % COLORS.length];
            const Icon = isResumen
              ? BarChart3
              : (ICON_MAP[item.tableName] ?? FALLBACK_ICONS[item.idx % FALLBACK_ICONS.length]);

            return (
              <button
                key={item.tableName}
                onClick={() => onSelect(item.tableName)}
                title={item.title}
                className={`group relative flex items-center gap-0 rounded-lg border transition-all overflow-hidden
                  ${isActive
                    ? `${color.bg} ${color.border} ${color.text} pl-2 pr-2`
                    : `bg-white/3 border-white/8 text-slate-500 hover:${HOVER_STYLE.base} pl-2 pr-2`
                  } h-8`}
              >
                <Icon className={`w-3.5 h-3.5 flex-shrink-0 ${isActive ? color.text : ""}`} />
                {/* Nombre: siempre visible si activo, al hover si no */}
                <span className={`text-xs font-medium whitespace-nowrap overflow-hidden transition-all duration-200
                  ${isActive
                    ? "max-w-xs ml-1.5 opacity-100"
                    : "max-w-0 ml-0 opacity-0 group-hover:max-w-xs group-hover:ml-1.5 group-hover:opacity-100"
                  }`}>
                  {item.title}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
