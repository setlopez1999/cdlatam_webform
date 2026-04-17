import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, X, Check, AlertTriangle, Table2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";

interface Props {
  open: boolean;
  onClose: () => void;
  onChanged: () => void;
}

export function ManageCatalogsModal({ open, onClose, onChanged }: Props) {
  const { data: tables = [], refetch = () => {} } = trpc.catalogsDB.listTables.useQuery(undefined, { enabled: open }) ?? {};
  const createTable = trpc.catalogsDB.createTable.useMutation();
  const renameTable = trpc.catalogsDB.renameTable.useMutation();
  const deleteTable = trpc.catalogsDB.deleteTable.useMutation();

  const [newTitle, setNewTitle] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  // Generar tableName desde el título (slug)
  const toSlug = (s: string) =>
    s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");

  const handleCreate = async () => {
    if (!newTitle.trim()) return toast.warning("Ingresa un nombre para la tabla");
    const tableName = toSlug(newTitle);
    try {
      await createTable.mutateAsync({ tableName, title: newTitle.trim() });
      toast.success(`Tabla "${newTitle}" creada`);
      setNewTitle("");
      refetch();
      onChanged();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleRename = async (tableName: string) => {
    if (!editingTitle.trim()) return;
    try {
      await renameTable.mutateAsync({ tableName, newTitle: editingTitle.trim() });
      toast.success("Nombre actualizado");
      setEditingId(null);
      refetch();
      onChanged();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleDelete = async (tableName: string) => {
    try {
      await deleteTable.mutateAsync({ tableName });
      toast.success("Tabla eliminada");
      setConfirmDelete(null);
      refetch();
      onChanged();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg bg-[#13161f] border-white/10 text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <Table2 className="w-5 h-5 text-blue-400" />
            Administrar Catálogos
          </DialogTitle>
        </DialogHeader>

        {/* Crear nueva tabla */}
        <div className="flex gap-2">
          <Input
            value={newTitle}
            onChange={e => setNewTitle(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleCreate()}
            placeholder="Nombre de la nueva tabla..."
            className="bg-white/5 border-white/10 text-white placeholder:text-slate-500 h-9"
          />
          <Button
            size="sm"
            onClick={handleCreate}
            disabled={createTable.isPending}
            className="h-9 bg-blue-600 hover:bg-blue-700 text-white shrink-0"
          >
            <Plus className="w-4 h-4 mr-1" /> Crear
          </Button>
        </div>

        {/* Lista de tablas */}
        <div className="max-h-80 overflow-y-auto space-y-1 mt-1">
          {tables.map(t => (
            <div
              key={t.id}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/8 group"
            >
              {editingId === t.id ? (
                <>
                  <Input
                    value={editingTitle}
                    onChange={e => setEditingTitle(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") handleRename(t.tableName); if (e.key === "Escape") setEditingId(null); }}
                    className="h-7 text-sm bg-white/10 border-white/20 text-white flex-1"
                    autoFocus
                  />
                  <button onClick={() => handleRename(t.tableName)} className="text-green-400 hover:text-green-300">
                    <Check className="w-4 h-4" />
                  </button>
                  <button onClick={() => setEditingId(null)} className="text-slate-500 hover:text-white">
                    <X className="w-4 h-4" />
                  </button>
                </>
              ) : confirmDelete === t.tableName ? (
                <>
                  <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                  <span className="text-red-400 text-sm flex-1">¿Eliminar "{t.title}" y todos sus datos?</span>
                  <button
                    onClick={() => handleDelete(t.tableName)}
                    className="text-xs px-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded font-medium"
                  >
                    Sí, eliminar
                  </button>
                  <button onClick={() => setConfirmDelete(null)} className="text-slate-500 hover:text-white">
                    <X className="w-4 h-4" />
                  </button>
                </>
              ) : (
                <>
                  <span className="text-sm text-slate-200 flex-1">{t.title}</span>
                  {!t.isCustom && (
                    <span className="text-xs text-slate-500 px-1.5 py-0.5 bg-white/5 rounded">sistema</span>
                  )}
                  <button
                    onClick={() => { setEditingId(t.id); setEditingTitle(t.title); }}
                    className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-white transition-opacity"
                    title="Renombrar"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  {t.isCustom ? (
                    <button
                      onClick={() => setConfirmDelete(t.tableName)}
                      className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 transition-opacity"
                      title="Eliminar tabla"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  ) : (
                    <span className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100" />
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
