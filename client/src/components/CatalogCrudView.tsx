import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Search, Plus, Edit2, Trash2, ArrowUpDown } from "lucide-react";
import { CatalogConfig } from "../core/config/catalogConfig";
import { toast } from "sonner";

export function CatalogCrudView({ config }: { config: CatalogConfig }) {
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});

  // ─── Consultas a la API ──────────────────────────────
  const { data: records = [], isLoading, refetch } = trpc.catalogsDB.list.useQuery({ tableName: config.tableName });
  const createMutation = trpc.catalogsDB.create.useMutation();
  const updateMutation = trpc.catalogsDB.update.useMutation();
  const deleteMutation = trpc.catalogsDB.delete.useMutation();

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
    setFormData(config.fields.reduce((acc, f) => ({ ...acc, [f.key]: f.type === "boolean" ? true : "" }), {}));
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
    // Validar requeridos
    for (const field of config.fields) {
      if (field.required && !formData[field.key] && field.type !== "boolean") {
        return toast.error(`El campo "${field.label}" es obligatorio`);
      }
    }

    try {
      if (editingId) {
        await updateMutation.mutateAsync({
          tableName: config.tableName,
          id: editingId,
          data: formData
        });
        toast.success("Registro actualizado exitosamente");
      } else {
        await createMutation.mutateAsync({
          tableName: config.tableName,
          data: formData
        });
        toast.success("Registro creado exitosamente");
      }
      closeModal();
      refetch();
    } catch (error: any) {
      toast.error(error.message || "Ocurrió un error guardando el registro");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("¿Seguro que deseas eliminar este registro? (Se marcará como inactivo)")) return;
    try {
      await deleteMutation.mutateAsync({ tableName: config.tableName, id });
      toast.success("Registro eliminado");
      refetch();
    } catch (error: any) {
      toast.error("Error eliminando: " + error.message);
    }
  };

  // ─── Componentes del Formulario ────────────────────────
  const renderInput = (field: any) => {
    const value = formData[field.key] ?? "";

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
                {displayFields.map((field) => (
                  <th key={field.key} className="px-5 py-3.5 font-semibold tracking-wider">
                    <div className="flex items-center gap-1.5 cursor-pointer hover:text-white transition-colors">
                      {field.label}
                      <ArrowUpDown className="w-3 h-3 opacity-50" />
                    </div>
                  </th>
                ))}
                <th className="px-5 py-3.5 text-right font-semibold tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredRecords.map((record: any, idx: number) => (
                <tr key={record.id} className="hover:bg-white/[0.02] transition-colors group">
                  {displayFields.map((field) => (
                    <td key={field.key} className="px-5 py-3 whitespace-nowrap text-slate-300 font-medium">
                      {field.type === "boolean" ? (
                        <div className={`w-2.5 h-2.5 rounded-full ${record[field.key] ? "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.4)]" : "bg-red-500"}`}></div>
                      ) : (
                        record[field.key] || <span className="text-slate-600">-</span>
                      )}
                    </td>
                  ))}
                  <td className="px-5 py-3 whitespace-nowrap text-right">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(record)} className="h-8 w-8 text-blue-400 hover:text-blue-300 hover:bg-blue-500/10">
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(record.id)} className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-500/10">
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
