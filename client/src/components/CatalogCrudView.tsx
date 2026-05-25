import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Search, Plus, Edit2, Trash2, ArrowUpDown, Power } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { CatalogConfig } from "@/config/catalogConfig";
import { toast } from "sonner";
import { parseErrorMessage } from "@/lib/errorUtils";
import { slugifyForKey, uniqueKeyFromBase } from "@/lib/slugifyKey";

export function CatalogCrudView({ config }: { config: CatalogConfig }) {
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  // ─── Consultas a la API ──────────────────────────────
  const { data: records = [], isLoading, refetch } = trpc.catalogsDB.list.useQuery({ tableName: config.tableName });
  const createMutation = trpc.catalogsDB.create.useMutation();
  const updateMutation = trpc.catalogsDB.update.useMutation();
  const deleteMutation = trpc.catalogsDB.delete.useMutation();
  const bulkUpdateMutation = trpc.catalogsDB.bulkUpdate.useMutation();
  const bulkDeleteMutation = trpc.catalogsDB.bulkDelete.useMutation();

  // ─── Filtros de Tabla ────────────────────────────────
  const filteredRecords = useMemo(() => {
    if (!search) return records;
    const lowerSearch = search.toLowerCase();
    return records.filter((rec: any) =>
      Object.keys(rec).some(key =>
        String(rec[key]).toLowerCase().includes(lowerSearch)
      )
    );
  }, [records, search]);

  const displayFields = config.fields.filter(f => !f.hiddenInTable);

  // ─── Manejadores de Modal ────────────────────────────
  const openNew = () => {
    setEditingId(null);
    setFormData(config.fields.reduce((acc, f) => ({ ...acc, [f.key]: f.type === "boolean" ? 1 : "" }), {}));
    setModalOpen(true);
  };

  const openEdit = (record: any) => {
    setEditingId(record.id);
    setFormData(record);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setFormData({});
    setEditingId(null);
  };

  // ─── Actions CRUD ──────────────────────────────────────
  const handleSave = async () => {
    const isCreate = !editingId;
    for (const field of config.fields) {
      if (field.hideOnCreate && isCreate) continue;
      if (field.required && !formData[field.key] && field.type !== "boolean") {
        return toast.error(`El campo "${field.label}" es obligatorio`);
      }
    }

    try {
      // Sanitizar el payload para SQLite (evitar bindings inválidos como booleanos o strings vacíos en IDs)
      const payload = { ...formData };
      if (!editingId && "id" in payload) {
        delete payload.id; // Evitar enviar id vacío "" que rompe el autoIncrement
      }

      for (const field of config.fields) {
        if (field.type === "boolean") {
          payload[field.key] = payload[field.key] ? 1 : 0;
        } else if (field.type === "number" && payload[field.key] === "") {
          delete payload[field.key];
        } else if (field.type === "select" && field.key.endsWith("Id") && typeof payload[field.key] === "string") {
          payload[field.key] = parseInt(payload[field.key], 10);
        }
      }

      if (isCreate && config.tableName === "impl_items") {
        const label = String(payload.label ?? "").trim();
        const existing = new Set(
          (records as { key?: string }[]).map(r => String(r.key ?? "")).filter(Boolean),
        );
        payload.key = uniqueKeyFromBase(slugifyForKey(label), existing);
      }
      if (editingId && config.tableName === "impl_items") {
        delete payload.key;
      }

      if (editingId) {
        await updateMutation.mutateAsync({
          tableName: config.tableName,
          id: editingId,
          data: payload
        });
        toast.success("Registro actualizado exitosamente");
      } else {
        await createMutation.mutateAsync({
          tableName: config.tableName,
          data: payload
        });
        toast.success("Registro creado exitosamente");
      }
      closeModal();
      refetch();
    } catch (error: any) {
      toast.error(parseErrorMessage(error));
    }
  };

  const toggleStatus = async (record: any) => {
    const isActivo = Boolean(record.activo);
    const action = isActivo ? "desactivar" : "activar";
    if (!confirm(`¿Seguro que deseas ${action} este registro?`)) return;
    try {
      await updateMutation.mutateAsync({
        tableName: config.tableName,
        id: record.id,
        data: { activo: isActivo ? 0 : 1 }
      });
      toast.success(`Registro ${isActivo ? 'inactivado' : 'activado'}`);
      refetch();
    } catch (error: any) {
      toast.error(`Error al ${action}: ` + parseErrorMessage(error));
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("¿Seguro que deseas ELIMINAR permanentemente este registro? Esta acción no se puede deshacer.")) return;
    try {
      await deleteMutation.mutateAsync({ tableName: config.tableName, id });
      toast.success("Registro eliminado");
      refetch();
    } catch (error: any) {
      toast.error("Error eliminando: " + parseErrorMessage(error));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) setSelectedIds(filteredRecords.map((r: any) => r.id));
    else setSelectedIds([]);
  };

  const handleSelectOne = (id: number, checked: boolean) => {
    if (checked) setSelectedIds([...selectedIds, id]);
    else setSelectedIds(selectedIds.filter(x => x !== id));
  };

  const handleBulkAction = async (action: 'activar' | 'desactivar' | 'borrar') => {
    if (!selectedIds.length) return;
    const isDelete = action === 'borrar';
    if (!confirm(`¿Seguro que deseas ${action} los ${selectedIds.length} registros seleccionados?${isDelete ? ' Esta acción no se puede deshacer.' : ''}`)) return;
    
    try {
      if (isDelete) {
        await bulkDeleteMutation.mutateAsync({ tableName: config.tableName, ids: selectedIds });
      } else {
        await bulkUpdateMutation.mutateAsync({
          tableName: config.tableName,
          ids: selectedIds,
          data: { activo: action === 'activar' ? 1 : 0 }
        });
      }
      toast.success(`${selectedIds.length} Registros ${action === 'borrar' ? 'eliminados' : (action === 'activar' ? 'activados' : 'inactivados')}`);
      setSelectedIds([]);
      refetch();
    } catch (error: any) {
      toast.error(`Error al ${action} masivamente: ` + parseErrorMessage(error));
    }
  };

  // ─── Componentes del Formulario ────────────────────────
  const renderInput = (field: any) => {
    if (field.hideOnCreate && !editingId) return null;
    const value = formData[field.key] ?? "";

    if (field.readOnlyInForm && editingId) {
      return (
        <div key={field.key} className="space-y-1.5">
          <Label className="text-sm font-medium text-slate-300">{field.label}</Label>
          <Input
            type="text"
            value={String(value)}
            readOnly
            disabled
            className="w-full bg-[#1a1f2e]/80 border-white/10 text-slate-400"
          />
        </div>
      );
    }

    if (field.type === "boolean") {
      return (
        <div key={field.key} className="flex items-center justify-between p-3 border border-white/10 rounded-lg">
          <Label htmlFor={field.key} className="text-sm font-medium text-slate-200 cursor-pointer">
            {field.label} {field.required && <span className="text-red-400">*</span>}
          </Label>
          <Switch
            id={field.key}
            checked={Boolean(value)}
            onCheckedChange={(checked) => setFormData({ ...formData, [field.key]: checked ? 1 : 0 })}
            className="data-[state=checked]:bg-blue-500"
          />
        </div>
      );
    }

    if (field.type === "select" && field.options) {
      return (
        <div key={field.key} className="space-y-1.5">
          <Label className="text-sm font-medium text-slate-300">
            {field.label} {field.required && <span className="text-red-400">*</span>}
          </Label>
          <Select value={String(value)} onValueChange={(v) => setFormData({ ...formData, [field.key]: v })}>
            <SelectTrigger className="w-full bg-[#1a1f2e] border-white/10 text-white">
              <SelectValue placeholder={`Seleccione ${field.label}`} />
            </SelectTrigger>
            <SelectContent>
              {field.options.map((opt: any) => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      );
    }

    return (
      <div key={field.key} className="space-y-1.5">
        <Label className="text-sm font-medium text-slate-300">
          {field.label} {field.required && <span className="text-red-400">*</span>}
        </Label>
        <Input
          type={field.type === "number" ? "number" : "text"}
          value={value}
          onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value })}
          placeholder={`Ingresa ${field.label.toLowerCase()}`}
          className="w-full bg-[#1a1f2e] border-white/10 text-white placeholder:text-slate-500"
        />
      </div>
    );
  };

  // ─── Render ────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex justify-center p-12">
        <div className="w-8 h-8 border-2 border-slate-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-in fade-in zoom-in-95 duration-200">
      {/* Search & Actions Header */}
      <div className="flex flex-col sm:flex-row gap-3 justify-between items-center bg-[#1a1f2e] border border-white/5 p-4 rounded-xl">
        <div className="relative w-full sm:w-auto flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={`Buscar en ${config.title}...`}
            className="pl-9 bg-[#242b3d] border-white/5 text-white placeholder:text-slate-500 h-10 w-full"
          />
        </div>
        <Button onClick={openNew} className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/20">
          <Plus className="w-4 h-4 mr-2" />
          Nuevo Registro
        </Button>
      </div>

      {/* Bulk Actions Header */}
      {selectedIds.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-blue-500/10 border border-blue-500/20 p-3 rounded-xl animate-in fade-in slide-in-from-top-2">
          <span className="text-sm font-medium text-blue-400">
            {selectedIds.length} registro{selectedIds.length !== 1 ? 's' : ''} seleccionado{selectedIds.length !== 1 ? 's' : ''}
          </span>
          <div className="flex gap-2 w-full sm:w-auto">
            <Button size="sm" variant="ghost" className="flex-1 sm:flex-none h-9 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10" onClick={() => handleBulkAction('activar')}>
              <Power className="w-4 h-4 mr-1.5" /> Activar
            </Button>
            <Button size="sm" variant="ghost" className="flex-1 sm:flex-none h-9 text-orange-400 hover:text-orange-300 hover:bg-orange-500/10" onClick={() => handleBulkAction('desactivar')}>
              <Power className="w-4 h-4 mr-1.5" /> Desactivar
            </Button>
            <Button size="sm" variant="ghost" className="flex-1 sm:flex-none h-9 text-red-400 hover:text-red-300 hover:bg-red-500/10" onClick={() => handleBulkAction('borrar')}>
              <Trash2 className="w-4 h-4 mr-1.5" /> Eliminar
            </Button>
          </div>
        </div>
      )}

      {/* Table Data Wrapper */}
      <div className="bg-[#1a1f2e] border border-white/5 rounded-xl overflow-x-auto shadow-sm">
        {filteredRecords.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center text-slate-500">
            <Search className="w-12 h-12 mb-4 text-slate-600 opacity-50" />
            <p className="text-lg font-medium text-slate-400">No hay registros</p>
            <p className="text-sm">Agrega un nuevo registro o intenta con otra búsqueda.</p>
          </div>
        ) : (
          <table className="w-full text-sm text-left">
            <thead className="bg-[#242b3d] text-xs uppercase text-slate-400 border-b border-white/10">
              <tr>
                <th className="px-5 py-3.5 w-12 text-center">
                  <Checkbox 
                    checked={filteredRecords.length > 0 && selectedIds.length === filteredRecords.length}
                    onCheckedChange={handleSelectAll}
                    aria-label="Seleccionar todos"
                    className="border-white/30 data-[state=checked]:bg-blue-500 data-[state=checked]:border-blue-500"
                  />
                </th>
                {displayFields.map((field) => (
                  <th key={field.key} className="px-5 py-3.5 font-semibold tracking-wider">
                    <div className="flex items-center gap-1.5 cursor-pointer hover:text-white transition-colors">
                      {field.label}
                      <ArrowUpDown className="w-3 h-3 opacity-50" />
                    </div>
                  </th>
                ))}
                <th className="px-5 py-3.5 text-right font-semibold tracking-wider sticky right-0 bg-[#242b3d] z-10 shadow-[-8px_0_12px_rgba(0,0,0,0.3)]">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredRecords.map((record: any, idx: number) => (
                <tr key={record.id} className={`hover:bg-white/[0.04] transition-colors group ${selectedIds.includes(record.id) ? 'bg-blue-500/[0.08]' : ''}`}>
                  <td className="px-5 py-3 text-center">
                    <Checkbox
                      checked={selectedIds.includes(record.id)}
                      onCheckedChange={(c) => handleSelectOne(record.id, Boolean(c))}
                      aria-label={`Seleccionar fila ${idx}`}
                      className="border-white/30 data-[state=checked]:bg-blue-500 data-[state=checked]:border-blue-500"
                    />
                  </td>
                  {displayFields.map((field) => (
                    <td key={field.key} className="px-5 py-3 whitespace-nowrap text-slate-300 font-medium">
                      {field.type === "boolean" ? (
                        <div className={`w-2.5 h-2.5 rounded-full ${record[field.key] ? "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.4)]" : "bg-red-500"}`}></div>
                      ) : field.type === "select" && field.options ? (
                        field.options.find((o: any) => String(o.value) === String(record[field.key]))?.label || record[field.key] || <span className="text-slate-600">-</span>
                      ) : (
                        record[field.key] || <span className="text-slate-600">-</span>
                      )}
                    </td>
                  ))}
                  <td className="px-5 py-3 whitespace-nowrap text-right sticky right-0 bg-[#1a1f2e] group-hover:bg-[#1f2537] z-10 shadow-[-8px_0_12px_rgba(0,0,0,0.25)] transition-colors">
                    <div className="flex items-center justify-end gap-2">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(record)} className="h-8 w-8 text-blue-400 hover:text-blue-300 hover:bg-blue-500/10">
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => toggleStatus(record)} title={record.activo ? "Desactivar" : "Activar"} className={`h-8 w-8 ${record.activo ? 'text-orange-400 hover:text-orange-300 hover:bg-orange-500/10' : 'text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10'}`}>
                        <Power className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(record.id)} title="Eliminar permanentemente" className="h-8 w-8 text-red-500 hover:text-red-400 hover:bg-red-500/10">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="flex justify-between items-center text-xs text-slate-500 px-2">
        <span>Mostrando {filteredRecords.length} de {records.length} registros totales.</span>
      </div>

      {/* Editor Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-md bg-[#1a1f2e] border border-white/10 text-white shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <div className={`p-1.5 rounded-lg ${config.bgColor ?? 'bg-blue-500/10'}`}>
                <Edit2 className={`w-4 h-4 ${config.color ?? 'text-blue-400'}`} />
              </div>
              {editingId ? "Editar Registro" : `Nuevo en ${config.title}`}
            </DialogTitle>
          </DialogHeader>

          <div className="py-4 space-y-4 max-h-[60vh] overflow-y-auto pr-1">
            {config.fields.map(renderInput)}
          </div>

          <DialogFooter className="bg-black/20 -mx-6 -mb-6 px-6 py-4 mt-2">
            <Button variant="ghost" onClick={closeModal} className="text-slate-400 hover:text-white hover:bg-white/5">
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              className="bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/20"
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {createMutation.isPending || updateMutation.isPending ? "Guardando..." : "Guardar Cambios"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
