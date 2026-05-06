import { useState, useRef, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { FileText, Upload, Download, Trash2, Search, FileCheck, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { PageLayout } from "@/components/PageLayout";

interface Clausula {
  id: number;
  valor: string;
  unidadNegocioId?: number | null;
  filePath: string;
  fileName: string;
  fileSize?: number | null;
  activo: number;
  createdAt: Date;
}

// Sentinel para representar "Sin unidad" en los <select> nativos. El backend
// acepta `null` en `unidadNegocioId` (NO un string), así que mapeamos al guardar.
const SIN_UNIDAD = "__sin_unidad__";

export default function ClausulasPage() {
  const utils = trpc.useUtils();
  const [search, setSearch] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [nombre, setNombre] = useState("");
  const [unidadNegocioId, setUnidadNegocioId] = useState<string>("");

  // Estado del dialog de edición
  const [editing, setEditing] = useState<Clausula | null>(null);
  const [editNombre, setEditNombre] = useState("");
  const [editUnidad, setEditUnidad] = useState<string>(SIN_UNIDAD);

  const { data: clausulas = [], refetch } = trpc.clausulas.list.useQuery();
  const { data: unidadesNegocio = [] } = trpc.clausulas.getUnidadesNegocio.useQuery();

  // Map<id, label> para resolver el nombre de la unidad por fila. Fuente de
  // verdad: catalog_unidades_negocio (mismo origen que F1Servicios).
  const unidadesById = useMemo(() => {
    const m = new Map<number, string>();
    for (const u of unidadesNegocio as Array<{ id: number; valor: string }>) {
      m.set(u.id, u.valor);
    }
    return m;
  }, [unidadesNegocio]);

  const deleteMutation = trpc.clausulas.delete.useMutation({
    onSuccess: () => {
      toast.success("Cláusula eliminada");
      refetch();
    },
    onError: (err) => toast.error("Error: " + err.message),
  });

  const toggleMutation = trpc.clausulas.toggleStatus.useMutation({
    onSuccess: () => refetch(),
    onError: (err) => toast.error("Error: " + err.message),
  });

  const updateMutation = trpc.clausulas.update.useMutation({
    onSuccess: () => {
      toast.success("Cláusula actualizada");
      void utils.clausulas.list.invalidate();
      setEditing(null);
    },
    onError: (err) => toast.error("Error: " + err.message),
  });

  const filtered = clausulas.filter((c: Clausula) =>
    c.valor.toLowerCase().includes(search.toLowerCase()) ||
    c.fileName.toLowerCase().includes(search.toLowerCase())
  );

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    const file = fileInputRef.current?.files?.[0];
    if (!file || !nombre) {
      toast.error("Nombre y archivo son requeridos");
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append("pdf", file);
    formData.append("valor", nombre);
    if (unidadNegocioId) formData.append("unidadNegocioId", unidadNegocioId);

    try {
      const res = await fetch("/api/clausulas/upload", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { error?: string }).error || "Error subiendo archivo");
      }
      toast.success("Cláusula subida exitosamente");
      setNombre("");
      setUnidadNegocioId("");
      if (fileInputRef.current) fileInputRef.current.value = "";
      refetch();
    } catch (err: any) {
      toast.error(err.message || "Error subiendo archivo");
    } finally {
      setUploading(false);
    }
  };

  const openEdit = (c: Clausula) => {
    setEditing(c);
    setEditNombre(c.valor);
    setEditUnidad(c.unidadNegocioId == null ? SIN_UNIDAD : String(c.unidadNegocioId));
  };

  const handleSaveEdit = () => {
    if (!editing) return;
    if (!editNombre.trim()) {
      toast.error("El nombre es requerido");
      return;
    }
    // Convertir el valor del select al formato que espera el backend:
    // null cuando no hay unidad, número cuando hay.
    const unidadParsed = editUnidad === SIN_UNIDAD ? null : Number(editUnidad);
    updateMutation.mutate({
      id: editing.id,
      valor: editNombre.trim(),
      unidadNegocioId: unidadParsed,
    });
  };

  return (
    <PageLayout title="Cláusulas Legales (PDFs)" subtitle="Gestión de cláusulas legales por unidad de negocio (solo admin)">
      <div className="space-y-4 animate-in fade-in zoom-in-95 duration-200">
        {/* Upload Form */}
        <form onSubmit={handleUpload} className="bg-[#1a1f2e] border border-white/5 p-4 rounded-xl space-y-3">
          <h3 className="text-sm font-medium text-slate-300 flex items-center gap-2">
            <Upload className="w-4 h-4" /> Subir Nueva Cláusula
          </h3>
          <div className="flex flex-col sm:flex-row gap-3">
            <Input
              value={nombre}
              onChange={e => setNombre(e.target.value)}
              placeholder="Nombre de la cláusula"
              className="bg-[#242b3d] border-white/10 text-white flex-1"
              required
            />
            <select
              value={unidadNegocioId}
              onChange={e => setUnidadNegocioId(e.target.value)}
              className="bg-[#242b3d] border border-white/10 text-white rounded-md px-3 py-2 text-sm"
            >
              <option value="">Sin unidad de negocio</option>
              {unidadesNegocio.map((u: any) => (
                <option key={u.id} value={u.id}>{u.valor}</option>
              ))}
            </select>
            <Input
              ref={fileInputRef}
              type="file"
              accept=".pdf"
              className="bg-[#242b3d] border-white/10 text-white flex-1"
              required
            />
            <Button type="submit" disabled={uploading} className="bg-blue-600 hover:bg-blue-700">
              {uploading ? "Subiendo..." : "Subir PDF"}
            </Button>
          </div>
        </form>

        {/* Search */}
        <div className="flex gap-3 items-center bg-[#1a1f2e] border border-white/5 p-4 rounded-xl">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por nombre o archivo..."
              className="pl-9 bg-[#242b3d] border-white/10 text-white"
            />
          </div>
        </div>

        {/* Table */}
        <div className="bg-[#1a1f2e] border border-white/5 rounded-xl overflow-x-auto">
          {filtered.length === 0 ? (
            <div className="p-12 text-center text-slate-500">
              <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg">No hay cláusulas</p>
              <p className="text-sm">Sube un PDF usando el formulario de arriba</p>
            </div>
          ) : (
            <table className="w-full text-sm text-left">
              <thead className="bg-[#242b3d] text-xs uppercase text-slate-400 border-b border-white/10">
                <tr>
                  <th className="px-5 py-3.5">Nombre</th>
                  <th className="px-5 py-3.5">Unidad de Negocio</th>
                  <th className="px-5 py-3.5">Archivo</th>
                  <th className="px-5 py-3.5">Tamaño</th>
                  <th className="px-5 py-3.5">Estado</th>
                  <th className="px-5 py-3.5 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filtered.map((c: Clausula) => {
                  const unidadLabel =
                    c.unidadNegocioId != null ? unidadesById.get(c.unidadNegocioId) : undefined;
                  return (
                    <tr key={c.id} className="hover:bg-white/[0.04] transition-colors">
                      <td className="px-5 py-3 text-slate-300 font-medium">{c.valor}</td>
                      <td className="px-5 py-3 text-xs">
                        {unidadLabel ? (
                          <span className="inline-flex px-2 py-1 rounded bg-blue-500/10 text-blue-300 border border-blue-500/20">
                            {unidadLabel}
                          </span>
                        ) : (
                          <span className="text-slate-500 italic">Sin unidad</span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-slate-400 text-xs">{c.fileName}</td>
                      <td className="px-5 py-3 text-slate-400 text-xs">
                        {c.fileSize ? `${(c.fileSize / 1024).toFixed(1)} KB` : "-"}
                      </td>
                      <td className="px-5 py-3">
                        <span className={`px-2 py-1 rounded text-xs ${c.activo ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"}`}>
                          {c.activo ? "Activo" : "Inactivo"}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <a
                            href={c.filePath}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 rounded"
                            title="Ver PDF"
                          >
                            <Download className="w-4 h-4" />
                          </a>
                          <button
                            onClick={() => openEdit(c)}
                            className="p-1.5 text-slate-300 hover:text-white hover:bg-white/10 rounded"
                            title="Editar (renombrar y reasignar unidad)"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => toggleMutation.mutate({ id: c.id, activo: c.activo ? 0 : 1 })}
                            className={`p-1.5 rounded ${c.activo ? "text-orange-400 hover:text-orange-300 hover:bg-orange-500/10" : "text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10"}`}
                            title={c.activo ? "Desactivar" : "Activar"}
                          >
                            <FileCheck className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm("¿Eliminar esta cláusula?")) {
                                deleteMutation.mutate({ id: c.id });
                              }
                            }}
                            className="p-1.5 text-red-500 hover:text-red-400 hover:bg-red-500/10 rounded"
                            title="Eliminar"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Dialog de edición */}
      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="bg-[#1a1f2e] border-white/10 text-slate-100">
          <DialogHeader>
            <DialogTitle>Editar cláusula</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-xs text-slate-400">Nombre</label>
              <Input
                value={editNombre}
                onChange={(e) => setEditNombre(e.target.value)}
                placeholder="Nombre de la cláusula"
                className="bg-[#242b3d] border-white/10 text-white"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-slate-400">Unidad de Negocio</label>
              <select
                value={editUnidad}
                onChange={(e) => setEditUnidad(e.target.value)}
                className="w-full bg-[#242b3d] border border-white/10 text-white rounded-md px-3 py-2 text-sm"
              >
                <option value={SIN_UNIDAD}>Sin unidad de negocio</option>
                {unidadesNegocio.map((u: any) => (
                  <option key={u.id} value={String(u.id)}>{u.valor}</option>
                ))}
              </select>
              <p className="text-[11px] text-slate-500">
                La cláusula aparecerá automáticamente en F1 cuando se use esta unidad en Servicios.
              </p>
            </div>
            {editing?.fileName && (
              <p className="text-xs text-slate-500">
                Archivo: <span className="text-slate-300">{editing.fileName}</span>
              </p>
            )}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setEditing(null)}
              disabled={updateMutation.isPending}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleSaveEdit}
              disabled={updateMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {updateMutation.isPending ? "Guardando..." : "Guardar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageLayout>
  );
}
