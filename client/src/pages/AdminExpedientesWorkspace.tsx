/**
 * Vista workspace: todos los expedientes del sistema (solo admin / roles en EXPEDIENTES_WORKSPACE_GLOBAL_ROLES).
 * Misma navegación a /expediente/:id/* que Historial; datos desde expediente.listarResumenWorkspace.
 */

import { useMemo, useState } from "react";
import { FolderOpen, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { mapResumenRowToExpediente } from "@/features/expedientes/fromServer";
import { toast } from "sonner";
import { PageLayout } from "@/components/PageLayout";
import { ExpedienteCard } from "@/pages/Historial";

export default function AdminExpedientesWorkspace() {
  const [search, setSearch] = useState("");

  // staleTime: 0 + invalidación tras guardar/renombrar/eliminar garantizan que
  // al volver al workspace se vea la versión más reciente del server.
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
      creadorDisplay: r.creadorDisplay,
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
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre, código, empresa o creador…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-8 h-8 text-sm w-56 md:w-72"
          />
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
          {filtrados.map(({ exp, creadorDisplay }) => (
            <ExpedienteCard
              key={exp.id}
              exp={exp}
              creadorDisplay={creadorDisplay}
              onEliminar={() => eliminarSrv.mutate({ uuid: exp.id })}
            />
          ))}
        </div>
      )}
    </PageLayout>
  );
}
