export type FieldType = "text" | "number" | "select" | "boolean";

export interface CatalogField {
  key: string;
  label: string;
  type: FieldType;
  required?: boolean;
  options?: { value: string; label: string }[]; // Para selects
  hiddenInTable?: boolean; // Si true, no se muestra en la grilla principal
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
      { key: "codigo", label: "Código", type: "text", required: true },
      { key: "nombre", label: "Nombre Corto", type: "text", required: true },
      { key: "activo", label: "Activo", type: "boolean", hiddenInTable: true },
    ],
  },
  paises: {
    tableName: "paises",
    title: "Países",
    color: "text-cyan-400",
    bgColor: "bg-cyan-500/10",
    fields: [
      { key: "nombre", label: "Nombre", type: "text", required: true },
      { key: "activo", label: "Activo", type: "boolean", hiddenInTable: true },
    ],
  },
  unidades: {
    tableName: "unidades",
    title: "Unidades de Negocio",
    color: "text-orange-400",
    bgColor: "bg-orange-500/10",
    fields: [
      { key: "nombre", label: "Nombre", type: "text", required: true },
      { key: "activo", label: "Activo", type: "boolean", hiddenInTable: true },
    ],
  },
  soluciones: {
    tableName: "soluciones",
    title: "Soluciones de Negocio",
    color: "text-emerald-400",
    bgColor: "bg-emerald-500/10",
    fields: [
      { key: "nombre", label: "Nombre", type: "text", required: true },
      { key: "activo", label: "Activo", type: "boolean", hiddenInTable: true },
    ],
  },
  detalle: {
    tableName: "detalle",
    title: "Detalle de Servicio",
    color: "text-pink-400",
    bgColor: "bg-pink-500/10",
    fields: [
      { key: "nombre", label: "Nombre", type: "text", required: true },
      { key: "activo", label: "Activo", type: "boolean", hiddenInTable: true },
    ],
  },
  tipos: {
    tableName: "tipos",
    title: "Tipos de Venta",
    color: "text-red-400",
    bgColor: "bg-red-500/10",
    fields: [
      { key: "nombre", label: "Nombre", type: "text", required: true },
      { key: "activo", label: "Activo", type: "boolean", hiddenInTable: true },
    ],
  },
  plazos: {
    tableName: "plazos",
    title: "Plazos Habilitados",
    color: "text-teal-400",
    bgColor: "bg-teal-500/10",
    fields: [
      { key: "nombre", label: "Nombre de Plazo", type: "text", required: true },
      { key: "activo", label: "Activo", type: "boolean", hiddenInTable: true },
    ],
  },
  documentos: {
    tableName: "documentos",
    title: "Documentos",
    color: "text-indigo-400",
    bgColor: "bg-indigo-500/10",
    fields: [
      { key: "nombre", label: "Nombre de Documento", type: "text", required: true },
      { key: "activo", label: "Activo", type: "boolean", hiddenInTable: true },
    ],
  },
  // CECOs y Contactos tienen columnas particulares
  cecos: {
    tableName: "cecos",
    title: "CECOs",
    description: "Centros de Costo de cada empresa",
    color: "text-blue-400",
    bgColor: "bg-blue-500/10",
    fields: [
      { key: "codigo", label: "Código CECO", type: "text", required: true },
      { key: "empresa", label: "Empresa", type: "text", required: true },
      { key: "departamento", label: "Departamento", type: "text", required: true },
      { key: "nombreCompleto", label: "Nombre Completo", type: "text", required: true },
      { key: "activo", label: "Activo", type: "boolean", hiddenInTable: true },
    ],
  },
  contactos: {
    tableName: "contactos",
    title: "Contactos Recurrentes",
    color: "text-rose-400",
    bgColor: "bg-rose-500/10",
    fields: [
      { key: "nombre", label: "Nombre Completo", type: "text", required: true },
      { key: "empresa", label: "Empresa Relacionada", type: "text", required: false },
      { key: "activo", label: "Activo", type: "boolean", hiddenInTable: true },
    ],
  },
};
