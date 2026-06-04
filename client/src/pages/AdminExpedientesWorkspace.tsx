/**
 * Vista workspace: todos los expedientes del sistema (solo admin / roles en EXPEDIENTES_WORKSPACE_GLOBAL_ROLES).
 * Misma navegación a /expediente/:id/* que Historial; datos desde expediente.listarResumenWorkspace.
 */
import { useMemo, useState } from "react";
import { FolderOpen, Search, Trash2, CheckSquare, Square } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { mapResumenRowToExpediente } from "@/features/expedientes/fromServer";
import { toast } from "sonner";
import { PageLayout } from "@/components/PageLayout";
import { ExpedienteCard } from "@/pages/Historial";

/**
 * Feature flag: eliminación masiva de expedientes.
 * Cambiar a `false` para ocultar el botón sin borrar la lógica.
 */
const FEATURE_BULK_DELETE = true;

export default function AdminExpedientesWorkspace() {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deletingBulk, setDeletingBulk] = useState(false);

  const resumenQuery = trpc.expediente.listarResumenWorkspace.useQuery(undefined, {
    staleTime: 0,
    retry: false,
  });

  const items = useMemo(() => {
    const rows = resumenQuery.data;
    if (!rows?.length) return [];
    return rows.map(r => ({
      exp: mapResumenRowToExpediente({
        expediente: r.expediente,
        acta: r.acta,
        evaluacion: r.evaluacion,
        resultado: r.resultado,
      }),
      creadorDisplay: r.creadorDisplay ?? undefined,
      creadorEliminado: r.creadorEliminado ?? false,
    }));
  }, [resumenQuery.data]);

  const filtrados = useMemo(() => {
    if (!search.trim()) return items;
    const q = search.toLowerCase();
    return items.filter(({ exp, creadorDisplay }) =>
      exp.nombre.toLowerCase().includes(q) ||
      exp.f1.data?.razonSocial?.toLowerCase().includes(q) ||
      exp.f1.data?.nombreFantasia?.toLowerCase().includes(q) ||
      (creadorDisplay?.toLowerCase().includes(q) ?? false) ||
      (exp.codigo?.toLowerCase().includes(q) ?? false)
    );
  }, [items, search]);

  const eliminarSrv = trpc.expediente.eliminar.useMutation({
    onSuccess: () => {
      void resumenQuery.refetch();
      toast.success("Expediente eliminado");
    },
    onError: (err) => {
      toast.error(err.message || "No se pudo eliminar");
    },
  });

  const utils = trpc.useUtils();

  /** Alterna la selección de un expediente. */
  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  /** Selecciona / deselecciona todos los filtrados. */
  const toggleSelectAll = () => {
    if (selected.size === filtrados.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtrados.map(({ exp }) => exp.id)));
    }
  };

  /** Elimina todos los expedientes seleccionados en secuencia. */
  const handleBulkDelete = async () => {
    if (selected.size === 0) return;
    const confirm = window.confirm(
      `¿Eliminar ${selected.size} expediente${selected.size !== 1 ? "s" : ""}? Esta acción no se puede deshacer.`
    );
    if (!confirm) return;
    setDeletingBulk(true);
    let ok = 0;
    let fail = 0;
    for (const uuid of Array.from(selected)) {
      try {
        await utils.client.expediente.eliminar.mutate({ uuid });
        ok++;
      } catch {
        fail++;
      }
    }
    setSelected(new Set());
    setDeletingBulk(false);
    void resumenQuery.refetch();
    if (fail === 0) {
      toast.success(`${ok} expediente${ok !== 1 ? "s" : ""} eliminado${ok !== 1 ? "s" : ""}`);
    } else {
      toast.warning(`${ok} eliminados, ${fail} fallaron`);
    }
  };

  const allFilteredSelected =
    filtrados.length > 0 && filtrados.every(({ exp }) => selected.has(exp.id));

  const subtitle = resumenQuery.isLoading
    ? "Cargando…"
    : items.length === 0
      ? "No hay expedientes en el sistema."
      : `${items.length} expediente${items.length !== 1 ? "s" : ""} en total`;

  return (
    <PageLayout
      title="Todos los expedientes"
      subtitle={subtitle}
      icon={<FolderOpen className="w-6 h-6 text-primary" />}
      actions={
        <div className="flex items-center gap-2">
          {/* Barra de acciones masivas — solo visible si FEATURE_BULK_DELETE y hay seleccionados */}
          {FEATURE_BULK_DELETE && selected.size > 0 && (
            <div className="flex items-center gap-2 bg-destructive/10 border border-destructive/30 rounded-md px-3 py-1.5">
              <span className="text-xs text-destructive font-medium">
                {selected.size} seleccionado{selected.size !== 1 ? "s" : ""}
              </span>
              <Button
                size="sm"
                variant="destructive"
                className="h-7 px-2 text-xs gap-1"
                disabled={deletingBulk}
                onClick={() => void handleBulkDelete()}
              >
                <Trash2 className="w-3.5 h-3.5" />
                {deletingBulk ? "Eliminando…" : "Eliminar"}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 px-2 text-xs text-muted-foreground"
                onClick={() => setSelected(new Set())}
              >
                Cancelar
              </Button>
            </div>
          )}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre, código, empresa o creador…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-8 h-8 text-sm w-56 md:w-72"
            />
          </div>
        </div>
      }
    >
      {resumenQuery.isError && (
        <p className="text-sm text-destructive">
          {resumenQuery.error?.message ?? "No autorizado o error al cargar."}
        </p>
      )}
      {filtrados.length === 0 && !resumenQuery.isLoading && !resumenQuery.isError ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
          <FolderOpen className="w-12 h-12 text-muted-foreground/40" />
          <p className="text-muted-foreground">
            {search ? `No hay coincidencias para "${search}".` : "No hay expedientes."}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {/* Fila de seleccionar todos — solo si FEATURE_BULK_DELETE */}
          {FEATURE_BULK_DELETE && filtrados.length > 0 && (
            <div className="flex items-center gap-2 px-1">
              <button
                type="button"
                onClick={toggleSelectAll}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                {allFilteredSelected
                  ? <CheckSquare className="w-4 h-4 text-primary" />
                  : <Square className="w-4 h-4" />}
                {allFilteredSelected ? "Deseleccionar todos" : "Seleccionar todos"}
              </button>
            </div>
          )}
          {filtrados.map(({ exp, creadorDisplay, creadorEliminado }) => (
            <div key={exp.id} className="flex items-start gap-2">
              {/* Checkbox individual — solo si FEATURE_BULK_DELETE */}
              {FEATURE_BULK_DELETE && (
                <button
                  type="button"
                  onClick={() => toggleSelect(exp.id)}
                  className="mt-3 flex-shrink-0 text-muted-foreground hover:text-primary transition-colors"
                  aria-label={selected.has(exp.id) ? "Deseleccionar" : "Seleccionar"}
                >
                  {selected.has(exp.id)
                    ? <CheckSquare className="w-4 h-4 text-primary" />
                    : <Square className="w-4 h-4" />}
                </button>
              )}
              <div className="flex-1 min-w-0">
                <ExpedienteCard
                  exp={exp}
                  creadorDisplay={creadorDisplay}
                  creadorEliminado={creadorEliminado}
                  onEliminar={() => eliminarSrv.mutate({ uuid: exp.id })}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </PageLayout>
  );
}
