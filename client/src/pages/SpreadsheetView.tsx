import { useState, useCallback, useRef, useMemo } from "react";
import { AgGridReact } from "ag-grid-react";
import type { ColDef, CellValueChangedEvent, GridReadyEvent } from "ag-grid-community";
import { AllCommunityModule, ModuleRegistry } from "ag-grid-community";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Plus, Trash2, RefreshCw, ArrowLeft, Table2, Hash, CheckSquare, Sigma, Palette } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

// Registrar todos los módulos community de AG Grid
ModuleRegistry.registerModules([AllCommunityModule]);

// ─── Definición de tablas de catálogos ───────────────────────────────────────
const CATALOG_TABS = [
  { tableName: "monedas",    title: "Monedas" },
  { tableName: "paises",     title: "Países" },
  { tableName: "empresas",   title: "Empresas" },
  { tableName: "doctos",     title: "Doc. Identidad" },
  { tableName: "unidades",   title: "Unidades" },
  { tableName: "soluciones", title: "Soluciones" },
  { tableName: "detalle",    title: "Detalle Servicio" },
  { tableName: "tipos",      title: "Tipos Venta" },
  { tableName: "plazos",     title: "Plazos" },
  { tableName: "cecos",      title: "CECOs" },
  { tableName: "deptos",     title: "Departamentos" },
  { tableName: "areas",      title: "Áreas" },
  { tableName: "nombres",    title: "Nombres" },
] as const;

type TableName = typeof CATALOG_TABS[number]["tableName"];

// ─── Colores predefinidos para el picker ─────────────────────────────────────
const PRESET_COLORS = [
  { label: "Blanco",       value: "#e2e8f0" },
  { label: "Negro",        value: "#0f172a" },
  { label: "Gris",         value: "#94a3b8" },
  { label: "Azul",         value: "#60a5fa" },
  { label: "Verde",        value: "#4ade80" },
  { label: "Amarillo",     value: "#facc15" },
  { label: "Naranja",      value: "#fb923c" },
  { label: "Rojo",         value: "#f87171" },
];

// ─── Componente de grilla por tabla ──────────────────────────────────────────
function CatalogSheet({ tableName, textColor }: { tableName: TableName; textColor: string }) {
  const gridRef = useRef<AgGridReact>(null);
  const [selectedRows, setSelectedRows] = useState<any[]>([]);

  const { data: rows = [], isLoading, refetch } = trpc.catalogsDB.list.useQuery(
    { tableName },
    { refetchOnWindowFocus: false }
  );

  const createMutation = trpc.catalogsDB.create.useMutation();
  const updateMutation = trpc.catalogsDB.update.useMutation();
  const deleteMutation = trpc.catalogsDB.delete.useMutation();

  // Columnas con color dinámico
  const colDefs: ColDef[] = useMemo(() => [
    {
      field: "id",
      headerName: "ID",
      width: 80,
      editable: false,
      pinned: "left" as const,
      cellStyle: { color: "#64748b", fontWeight: 600 },
    },
    {
      field: "valor",
      headerName: "Valor",
      flex: 1,
      editable: true,
      cellEditor: "agTextCellEditor",
      cellStyle: { color: textColor, fontWeight: 400 },
    },
    {
      field: "activo",
      headerName: "Activo",
      width: 110,
      editable: true,
      cellEditor: "agSelectCellEditor",
      cellEditorParams: { values: [1, 0] },
      valueFormatter: (p: any) => (p.value === 1 || p.value === true ? "✓ Sí" : "✗ No"),
      cellStyle: (p: any) => ({
        color: p.value === 1 || p.value === true ? "#4ade80" : "#f87171",
        fontWeight: 600,
      }),
    },
  ], [textColor]);

  // ─── Edición inline: guarda al cambiar celda ─────────────────────────────
  const onCellValueChanged = useCallback(
    async (event: CellValueChangedEvent) => {
      const { data, colDef, newValue } = event;
      if (!data?.id || colDef.field === "id") return;
      try {
        await updateMutation.mutateAsync({
          tableName,
          id: data.id,
          data: { [colDef.field as string]: newValue },
        });
        toast.success("Guardado");
      } catch (err: any) {
        toast.error("Error al guardar: " + err.message);
        refetch();
      }
    },
    [tableName, updateMutation, refetch]
  );

  // ─── Agregar fila nueva ───────────────────────────────────────────────────
  const handleAddRow = useCallback(async () => {
    try {
      await createMutation.mutateAsync({
        tableName,
        data: { valor: "Nuevo", activo: 1 },
      });
      toast.success("Fila agregada");
      await refetch();
      setTimeout(() => {
        gridRef.current?.api?.ensureIndexVisible((rows.length ?? 0), "bottom");
      }, 200);
    } catch (err: any) {
      toast.error("Error al agregar: " + err.message);
    }
  }, [tableName, createMutation, refetch, rows.length]);

  // ─── Borrar filas seleccionadas ───────────────────────────────────────────
  const handleDeleteSelected = useCallback(async () => {
    if (!selectedRows.length) return toast.warning("Selecciona al menos una fila");
    if (!confirm(`¿Eliminar ${selectedRows.length} registro(s)?`)) return;
    try {
      for (const row of selectedRows) {
        await deleteMutation.mutateAsync({ tableName, id: row.id });
      }
      toast.success(`${selectedRows.length} registro(s) eliminado(s)`);
      setSelectedRows([]);
      refetch();
    } catch (err: any) {
      toast.error("Error al eliminar: " + err.message);
    }
  }, [selectedRows, tableName, deleteMutation, refetch]);

  // ─── Estadísticas rápidas ─────────────────────────────────────────────────
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
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-4 text-sm text-slate-400">
          <span className="flex items-center gap-1.5">
            <Hash className="w-3.5 h-3.5" /> <strong className="text-slate-200">{stats.total}</strong> registros
          </span>
          <span className="flex items-center gap-1.5">
            <CheckSquare className="w-3.5 h-3.5 text-green-400" /> <strong className="text-green-400">{stats.activos}</strong> activos
          </span>
          <span className="flex items-center gap-1.5">
            <Sigma className="w-3.5 h-3.5 text-slate-500" /> <strong className="text-red-400">{stats.inactivos}</strong> inactivos
          </span>
          {selectedRows.length > 0 && (
            <span className="text-blue-400 font-medium">{selectedRows.length} seleccionado(s)</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => refetch()}
            className="h-8 text-slate-400 hover:text-white"
          >
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Recargar
          </Button>
          {selectedRows.length > 0 && (
            <Button
              size="sm"
              variant="ghost"
              onClick={handleDeleteSelected}
              className="h-8 text-red-400 hover:text-red-300 hover:bg-red-500/10"
            >
              <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Eliminar ({selectedRows.length})
            </Button>
          )}
          <Button
            size="sm"
            onClick={handleAddRow}
            className="h-8 bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/20"
          >
            <Plus className="w-3.5 h-3.5 mr-1.5" /> Agregar fila
          </Button>
        </div>
      </div>

      {/* AG Grid */}
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
            defaultColDef={{
              resizable: true,
              sortable: true,
              filter: true,
            }}
          />
        )}
      </div>

      {/* Hint edición */}
      <p className="text-xs text-slate-600 text-right">
        Doble clic en una celda para editar · Enter para confirmar · Esc para cancelar
      </p>
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────
export default function SpreadsheetView() {
  const [activeTab, setActiveTab] = useState<TableName>("monedas");
  const [textColor, setTextColor] = useState("#e2e8f0");
  const [showColorPicker, setShowColorPicker] = useState(false);
  const colorInputRef = useRef<HTMLInputElement>(null);

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
            <span
              className="w-4 h-4 rounded-full border border-white/20 inline-block"
              style={{ backgroundColor: textColor }}
            />
          </button>

          {showColorPicker && (
            <div className="absolute right-0 top-10 z-50 bg-[#1e2130] border border-white/10 rounded-xl shadow-2xl p-3 flex flex-col gap-2 min-w-[180px]">
              <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-1">Presets</p>
              <div className="grid grid-cols-4 gap-1.5">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c.value}
                    title={c.label}
                    onClick={() => { setTextColor(c.value); setShowColorPicker(false); }}
                    className="w-8 h-8 rounded-lg border-2 transition-transform hover:scale-110"
                    style={{
                      backgroundColor: c.value,
                      borderColor: textColor === c.value ? "#60a5fa" : "transparent",
                    }}
                  />
                ))}
              </div>
              <div className="border-t border-white/10 pt-2 mt-1 flex items-center gap-2">
                <p className="text-xs text-slate-500">Personalizado</p>
                <input
                  ref={colorInputRef}
                  type="color"
                  value={textColor}
                  onChange={(e) => setTextColor(e.target.value)}
                  className="w-8 h-8 rounded cursor-pointer border-0 bg-transparent"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Pestañas de tablas */}
      <div className="border-b border-white/5 bg-[#13161f] px-4 shrink-0 overflow-x-auto">
        <div className="flex gap-0.5 min-w-max">
          {CATALOG_TABS.map((tab) => (
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

      {/* Contenido de la hoja activa */}
      <div className="flex-1 p-5 min-h-0 flex flex-col" onClick={() => setShowColorPicker(false)}>
        <CatalogSheet key={activeTab} tableName={activeTab} textColor={textColor} />
      </div>
    </div>
  );
}
