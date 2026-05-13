import { useState, useCallback, useRef, useMemo } from "react";
import { AgGridReact } from "ag-grid-react";
import type { ColDef, CellValueChangedEvent, GridReadyEvent } from "ag-grid-community";
import { AllCommunityModule, ModuleRegistry } from "ag-grid-community";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Plus, Trash2, RefreshCw, ArrowLeft, Table2, Hash, CheckSquare, Sigma, Palette } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

import { catalogConfigs } from "@/config/catalogConfig";

ModuleRegistry.registerModules([AllCommunityModule]);

const PRESET_COLORS = [
  { label: "Blanco", value: "#e2e8f0" },
  { label: "Negro", value: "#0f172a" },
  { label: "Gris", value: "#94a3b8" },
  { label: "Azul", value: "#60a5fa" },
  { label: "Verde", value: "#4ade80" },
  { label: "Amarillo", value: "#facc15" },
  { label: "Naranja", value: "#fb923c" },
  { label: "Rojo", value: "#f87171" },
];

function defaultNewRowPayload(tableName: string, rows: any[]): Record<string, any> {
  if (tableName === "impl_items") {
    const maxOrden = rows.reduce((m, r) => Math.max(m, Number(r.orden) || 0), 0);
    return {
      key: `nuevo_item_${Date.now()}`,
      label: "Nuevo ítem",
      orden: maxOrden + 1,
      activo: 1,
    };
  }
  return { valor: "Nuevo", activo: 1 };
}

// ─── Componente de grilla por tabla ──────────────────────────────────────────
function CatalogSheet({ tableName, textColor, allCatalogs }: { tableName: string; textColor: string; allCatalogs?: any }) {
  const gridRef = useRef<AgGridReact>(null);
  const [selectedRows, setSelectedRows] = useState<any[]>([]);

  const { data: rows = [], isLoading, refetch } = trpc.catalogsDB.listGeneric.useQuery(
    { tableName },
    { refetchOnWindowFocus: false }
  );

  const createMutation    = trpc.catalogsDB.createGeneric.useMutation();
  const updateMutation    = trpc.catalogsDB.updateGeneric.useMutation();
  const bulkDeleteMutation = trpc.catalogsDB.bulkDeleteGeneric.useMutation();

  const colDefs: ColDef[] = useMemo(() => {
    // 1. Obtener config (hardcodeado o genérico)
    const config = catalogConfigs[tableName] || {
      fields: [
        { key: "valor", label: "Valor", type: "text" },
        { key: "activo", label: "Activo", type: "boolean" },
      ]
    };

    // 2. Generar columnas base
    const cols: ColDef[] = [
      { field: "id", headerName: "ID", width: 80, editable: false, pinned: "left" as const, cellStyle: { color: "#64748b", fontWeight: 600 } },
    ];

    const visible = config.fields.filter(f => !f.hiddenInTable);

    visible.forEach(f => {
      const isMainText = f.key === "valor" || f.key === "label";
      const col: ColDef = {
        field: f.key,
        headerName: f.label,
        flex: isMainText ? 1 : 0,
        width: f.key === "activo" ? 110 : 150,
        editable: !f.readOnlyInForm,
        cellStyle: isMainText ? { color: textColor } : undefined,
      };

      if (f.type === "boolean") {
        col.cellEditor = "agSelectCellEditor";
        col.cellEditorParams = { values: [1, 0] };
        col.valueFormatter = (p) => (p.value === 1 || p.value === true ? "✓ Sí" : "✗ No");
        col.cellStyle = (p) => ({ color: p.value === 1 || p.value === true ? "#4ade80" : "#f87171", fontWeight: 600 });
      } 
      else if (f.type === "select") {
        // Buscar opciones si es un campo relacional (ej: unidadNegocioId)
        // Intentamos obtener las opciones de allCatalogs inyectado o del propio field
        let options = f.options || [];
        
        // Inyección dinámica para relaciones conocidas
        if (f.key === "unidadNegocioId" && allCatalogs?.unidades) {
          options = allCatalogs.unidades.map((u: any) => ({ value: String(u.id), label: u.valor }));
        }

        col.cellEditor = "agSelectCellEditor";
        col.cellEditorParams = { values: options.map(o => o.value) };
        col.valueFormatter = (p) => {
          const opt = options.find(o => String(o.value) === String(p.value));
          return opt ? opt.label : (p.value || "-");
        };
      } else {
        col.cellEditor = "agTextCellEditor";
      }

      cols.push(col);
    });

    return cols;
  }, [tableName, textColor, allCatalogs]);

  const onCellValueChanged = useCallback(async (event: CellValueChangedEvent) => {
    const { data, colDef, newValue } = event;
    if (!data?.id || colDef.field === "id") return;
    try {
      let finalValue = newValue;
      
      // Sanitización para SQLite (IDs deben ser números)
      if (colDef.field?.endsWith("Id") && typeof newValue === "string") {
        finalValue = newValue === "" ? null : parseInt(newValue, 10);
      }

      await updateMutation.mutateAsync({ 
        tableName, 
        id: data.id, 
        data: { [colDef.field as string]: finalValue } 
      });
      toast.success("Guardado");
    } catch (err: any) {
      toast.error("Error al guardar: " + err.message);
      refetch();
    }
  }, [tableName, updateMutation, refetch]);

  const handleAddRow = useCallback(async () => {
    try {
      await createMutation.mutateAsync({ tableName, data: defaultNewRowPayload(tableName, rows) });
      toast.success("Fila agregada");
      await refetch();
      setTimeout(() => gridRef.current?.api?.ensureIndexVisible(rows.length ?? 0, "bottom"), 200);
    } catch (err: any) {
      toast.error("Error al agregar: " + err.message);
    }
  }, [tableName, createMutation, refetch, rows]);

  const handleDeleteSelected = useCallback(async () => {
    if (!selectedRows.length) return toast.warning("Selecciona al menos una fila");
    if (!confirm(`¿Eliminar ${selectedRows.length} registro(s)?`)) return;
    try {
      await bulkDeleteMutation.mutateAsync({ tableName, ids: selectedRows.map(r => r.id) });
      toast.success(`${selectedRows.length} registro(s) eliminado(s)`);
      setSelectedRows([]);
      refetch();
    } catch (err: any) {
      toast.error("Error al eliminar: " + err.message);
    }
  }, [selectedRows, tableName, bulkDeleteMutation, refetch]);

  const stats = useMemo(() => {
    const total = rows.length;
    const activos = rows.filter((r: any) => r.activo === 1).length;
    return { total, activos, inactivos: total - activos };
  }, [rows]);

  const onGridReady = useCallback((params: GridReadyEvent) => {
    params.api.sizeColumnsToFit();
  }, []);

  return (
    <div className="flex flex-col h-full gap-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-4 text-sm text-slate-400">
          <span className="flex items-center gap-1.5"><Hash className="w-3.5 h-3.5" /> <strong className="text-slate-200">{stats.total}</strong> registros</span>
          <span className="flex items-center gap-1.5"><CheckSquare className="w-3.5 h-3.5 text-green-400" /> <strong className="text-green-400">{stats.activos}</strong> activos</span>
          <span className="flex items-center gap-1.5"><Sigma className="w-3.5 h-3.5 text-slate-500" /> <strong className="text-red-400">{stats.inactivos}</strong> inactivos</span>
          {selectedRows.length > 0 && <span className="text-blue-400 font-medium">{selectedRows.length} seleccionado(s)</span>}
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="ghost" onClick={() => refetch()} className="h-8 text-slate-400 hover:text-white">
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Recargar
          </Button>
          {selectedRows.length > 0 && (
            <Button size="sm" variant="ghost" onClick={handleDeleteSelected} className="h-8 text-red-400 hover:text-red-300 hover:bg-red-500/10">
              <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Eliminar ({selectedRows.length})
            </Button>
          )}
          <Button size="sm" onClick={handleAddRow} className="h-8 bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/20">
            <Plus className="w-3.5 h-3.5 mr-1.5" /> Agregar fila
          </Button>
        </div>
      </div>

      <div className="flex-1 ag-theme-quartz-dark rounded-xl overflow-hidden border border-white/5 min-h-0">
        {isLoading ? (
          <div className="flex items-center justify-center h-full text-slate-400">
            <RefreshCw className="w-5 h-5 animate-spin mr-2" /> Cargando...
          </div>
        ) : (
          <AgGridReact
            ref={gridRef}
            rowData={rows}
            columnDefs={colDefs}
            onCellValueChanged={onCellValueChanged}
            onGridReady={onGridReady}
            rowSelection="multiple"
            onSelectionChanged={(e) => setSelectedRows(e.api.getSelectedRows())}
            suppressRowClickSelection={false}
            animateRows={true}
            stopEditingWhenCellsLoseFocus={true}
            enterNavigatesVerticallyAfterEdit={true}
            enterNavigatesVertically={true}
            suppressMovableColumns={false}
            defaultColDef={{ resizable: true, sortable: true, filter: true }}
          />
        )}
      </div>

      <p className="text-xs text-slate-600 text-right">
        Doble clic en una celda para editar · Enter para confirmar · Esc para cancelar
      </p>
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────
export default function SpreadsheetView() {
  const [activeTab, setActiveTab] = useState<string>("");
  const [textColor, setTextColor] = useState(() => localStorage.getItem("spreadsheet_text_color") ?? "#e2e8f0");
  const [showColorPicker, setShowColorPicker] = useState(false);
  const colorInputRef = useRef<HTMLInputElement>(null);

  // Cargar tabs dinámicamente desde catalog_meta
  const { data: tables = [] } = trpc.catalogsDB.listTables.useQuery(undefined, {
    onSuccess: (data: { tableName: string; title: string; isCustom: number }[]) => {
      if (!activeTab && data.length > 0) setActiveTab(data[0].tableName);
    },
  } as any);

  // Cargar datos de resumen para inyectar opciones en los selects (ej: unidades de negocio)
  const { data: summary } = trpc.catalogsDB.getSummary.useQuery();

  const handleColorChange = (color: string) => {
    setTextColor(color);
    localStorage.setItem("spreadsheet_text_color", color);
    setShowColorPicker(false);
  };

  return (
    <div className="h-screen bg-[#0f1117] flex flex-col overflow-hidden">
      {/* Header */}
      <div className="border-b border-white/5 bg-[#13161f] px-6 py-3 flex items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-4">
          <Link href="/base-datos">
            <Button variant="ghost" size="sm" className="h-8 text-slate-400 hover:text-white gap-1.5">
              <ArrowLeft className="w-4 h-4" /> Volver a BD
            </Button>
          </Link>
          <div className="flex items-center gap-2 text-white font-semibold">
            <Table2 className="w-5 h-5 text-blue-400" />
            <span>Catálogos — Vista Spreadsheet</span>
          </div>
        </div>

        {/* Selector de color de texto */}
        <div className="relative flex items-center gap-2">
          <button
            onClick={() => setShowColorPicker((v) => !v)}
            className="flex items-center gap-2 h-8 px-3 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white text-xs transition-colors"
          >
            <Palette className="w-3.5 h-3.5" />
            <span>Color texto</span>
            <span className="w-4 h-4 rounded-full border border-white/20 inline-block" style={{ backgroundColor: textColor }} />
          </button>

          {showColorPicker && (
            <div className="absolute right-0 top-10 z-50 bg-[#1e2130] border border-white/10 rounded-xl shadow-2xl p-3 flex flex-col gap-2 min-w-[180px]">
              <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-1">Presets</p>
              <div className="grid grid-cols-4 gap-1.5">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c.value}
                    title={c.label}
                    onClick={() => handleColorChange(c.value)}
                    className="w-8 h-8 rounded-lg border-2 transition-transform hover:scale-110"
                    style={{ backgroundColor: c.value, borderColor: textColor === c.value ? "#60a5fa" : "transparent" }}
                  />
                ))}
              </div>
              <div className="border-t border-white/10 pt-2 mt-1 flex items-center gap-2">
                <p className="text-xs text-slate-500">Personalizado</p>
                <input
                  ref={colorInputRef}
                  type="color"
                  value={textColor}
                  onChange={(e) => handleColorChange(e.target.value)}
                  className="w-8 h-8 rounded cursor-pointer border-0 bg-transparent"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Pestañas dinámicas */}
      <div className="border-b border-white/5 bg-[#13161f] px-4 shrink-0 overflow-x-auto">
        <div className="flex gap-0.5 min-w-max">
          {tables.map((tab) => (
            <button
              key={tab.tableName}
              onClick={() => setActiveTab(tab.tableName)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab.tableName
                  ? "border-blue-500 text-blue-400 bg-blue-500/5"
                  : "border-transparent text-slate-500 hover:text-slate-300 hover:bg-white/5"
              }`}
            >
              {tab.title}
            </button>
          ))}
        </div>
      </div>

      {/* Contenido */}
      <div className="flex-1 p-5 min-h-0 flex flex-col" onClick={() => setShowColorPicker(false)}>
        {activeTab && <CatalogSheet key={activeTab} tableName={activeTab} textColor={textColor} allCatalogs={summary} />}
      </div>
    </div>
  );
}
