export type FieldType = "text" | "number" | "select" | "boolean";

export interface CatalogField {
  key: string;
  label: string;
  type: FieldType;
  required?: boolean;
  options?: { value: string; label: string }[]; // Para selects
  hiddenInTable?: boolean;
  /** Alta: no mostrar (se genera en cliente). */
  hideOnCreate?: boolean;
  /** Edición: solo lectura (clave enlazada a expedientes). */
  readOnlyInForm?: boolean;
}

export interface CatalogConfig {
  tableName: string;
  title: string;
  description?: string;
  icon?: any; // Componente Lucide
  color?: string; // e.g. "text-emerald-400"
  bgColor?: string; // e.g. "bg-emerald-500/10"
  fields: CatalogField[];
}

export const catalogConfigs: Record<string, CatalogConfig> = {
  monedas: {
    tableName: "monedas",
    title: "Monedas",
    description: "Monedas habilitadas para transacciones",
    color: "text-yellow-400",
    bgColor: "bg-yellow-500/10",
    fields: [
      { key: "valor", label: "Valor", type: "text", required: true },
      { key: "activo", label: "Activo", type: "boolean",  },
    ],
  },
  paises: {
    tableName: "paises",
    title: "Países",
    color: "text-cyan-400",
    bgColor: "bg-cyan-500/10",
    fields: [
      { key: "valor", label: "Valor", type: "text", required: true },
      { key: "activo", label: "Activo", type: "boolean",  },
    ],
  },
  empresas: {
    tableName: "empresas",
    title: "Empresas",
    color: "text-blue-400",
    bgColor: "bg-blue-500/10",
    fields: [
      { key: "valor", label: "Valor", type: "text", required: true },
      { key: "activo", label: "Activo", type: "boolean",  },
    ],
  },
  doctos: {
    tableName: "doctos",
    title: "Documento de Identidad",
    color: "text-slate-400",
    bgColor: "bg-slate-500/10",
    fields: [
      { key: "valor", label: "Valor", type: "text", required: true },
      { key: "activo", label: "Activo", type: "boolean",  },
    ],
  },
  unidades: {
    tableName: "unidades",
    title: "Unidades de Negocio",
    color: "text-orange-400",
    bgColor: "bg-orange-500/10",
    fields: [
      { key: "valor", label: "Valor", type: "text", required: true },
      { key: "activo", label: "Activo", type: "boolean",  },
    ],
  },
  soluciones: {
    tableName: "soluciones",
    title: "Soluciones de Negocio",
    color: "text-emerald-400",
    bgColor: "bg-emerald-500/10",
    fields: [
      { key: "valor", label: "Valor", type: "text", required: true },
      { key: "unidadNegocioId", label: "Unidad de Negocio", type: "select", required: true, options: [] }, // Opciones se inyectarán dinámicamente
      { key: "activo", label: "Activo", type: "boolean" },
    ],
  },
  detalle: {
    tableName: "detalle",
    title: "Detalle de Servicio",
    color: "text-pink-400",
    bgColor: "bg-pink-500/10",
    fields: [
      { key: "valor", label: "Valor", type: "text", required: true },
      { key: "solucionId", label: "Solución", type: "select", required: true, options: [] }, // Opciones se inyectarán dinámicamente
      { key: "activo", label: "Activo", type: "boolean" },
    ],
  },
  tipos: {
    tableName: "tipos",
    title: "Tipos de Venta",
    color: "text-red-400",
    bgColor: "bg-red-500/10",
    fields: [
      { key: "valor", label: "Valor", type: "text", required: true },
      { key: "activo", label: "Activo", type: "boolean",  },
    ],
  },
  plazos: {
    tableName: "plazos",
    title: "Plazos",
    color: "text-teal-400",
    bgColor: "bg-teal-500/10",
    fields: [
      { key: "valor", label: "Valor", type: "text", required: true },
      { key: "activo", label: "Activo", type: "boolean",  },
    ],
  },
  cecos: {
    tableName: "cecos",
    title: "CECOs",
    description: "Centros de Costo",
    color: "text-blue-400",
    bgColor: "bg-blue-500/10",
    fields: [
      { key: "valor", label: "Valor", type: "text", required: true },
      { key: "activo", label: "Activo", type: "boolean",  },
    ],
  },
  deptos: {
    tableName: "deptos",
    title: "Departamentos",
    color: "text-indigo-400",
    bgColor: "bg-indigo-500/10",
    fields: [
      { key: "valor", label: "Valor", type: "text", required: true },
      { key: "activo", label: "Activo", type: "boolean",  },
    ],
  },
  areas: {
    tableName: "areas",
    title: "Áreas",
    color: "text-fuchsia-400",
    bgColor: "bg-fuchsia-500/10",
    fields: [
      { key: "valor", label: "Valor", type: "text", required: true },
      { key: "activo", label: "Activo", type: "boolean",  },
    ],
  },
  nombres: {
    tableName: "nombres",
    title: "Nombres",
    color: "text-rose-400",
    bgColor: "bg-rose-500/10",
    fields: [
      { key: "valor", label: "Valor", type: "text", required: true },
      { key: "activo", label: "Activo", type: "boolean",  },
    ],
  },
  consideraciones: {
    tableName: "consideraciones",
    title: "Consideraciones comerciales (Acta)",
    description: "Ítems del checklist de Consideraciones y Alcances Comerciales en F1. Marcar \"Persistente\" para que el ítem siempre esté marcado y no sea desmarcable por comerciales.",
    color: "text-indigo-400",
    bgColor: "bg-indigo-500/10",
    fields: [
      { key: "valor", label: "Texto del ítem", type: "text", required: true },
      { key: "orden", label: "Orden", type: "number", required: false },
      { key: "activo", label: "Activo", type: "boolean" },
      { key: "persistente", label: "Persistente (siempre marcado)", type: "boolean" },
    ],
  },
  impl_items: {
    tableName: "impl_items",
    title: "Ítems implementación IPTV-OTT",
    description: "Checklist del expediente (pestaña Implementación)",
    color: "text-sky-400",
    bgColor: "bg-sky-500/10",
    fields: [
      {
        key: "key",
        label: "Clave interna",
        type: "text",
        required: false,
        hiddenInTable: true,
        hideOnCreate: true,
        readOnlyInForm: true,
      },
      { key: "label", label: "Descripción visible", type: "text", required: true },
      { key: "orden", label: "Orden", type: "number", required: true },
      { key: "activo", label: "Activo", type: "boolean" },
    ],
  },
};
