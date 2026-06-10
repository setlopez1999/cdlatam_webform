/**
 * Checklist de Implementación IPTV-OTT (persistido por expediente).
 */
import { Rocket } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { PageHeader } from "@/components/FormSection";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Props {
  expedienteId: number;
}

export default function ImplementacionView({ expedienteId }: Props) {
  const utils = trpc.useUtils();
  const listQuery = trpc.expediente.implementacion.listar.useQuery(
    { id: expedienteId },
    { enabled: expedienteId > 0 },
  );

  const setEstado = trpc.expediente.implementacion.setEstado.useMutation({
    onSuccess: () => {
      void utils.expediente.implementacion.listar.invalidate({ id: expedienteId });
    },
    onError: err => {
      toast.error(err.message || "No se pudo guardar el ítem");
      void listQuery.refetch();
    },
  });

  if (listQuery.isLoading) {
    return (
      <div className="p-6 text-muted-foreground text-sm">Cargando checklist…</div>
    );
  }

  if (listQuery.error) {
    return (
      <div className="p-6 text-destructive text-sm">
        {listQuery.error.message || "No se pudo cargar la implementación."}
      </div>
    );
  }

  const items = listQuery.data ?? [];

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6" translate="no">
      <PageHeader
        title="Implementación"
        subtitle="Checklist de funcionalidades IPTV-OTT por expediente. Cada cambio se guarda automáticamente."
        badge="Impl"
        badgeColor="bg-violet-50 text-violet-800 border-violet-200"
        icon={Rocket}
      />

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Features incluidos</CardTitle>
        </CardHeader>
        <CardContent className="divide-y divide-border/60">
          {items.map(row => (
            <div
              key={row.key}
              className={cn(
                "flex items-start gap-3 py-3 first:pt-0 last:pb-0",
              )}
            >
              <span className="text-xs text-muted-foreground font-mono tabular-nums w-6 shrink-0 pt-0.5">
                {row.orden}
              </span>
              <p className="flex-1 text-sm leading-snug">{row.label}</p>
              <Switch
                checked={row.estado}
                disabled={setEstado.isPending && setEstado.variables?.checkKey === row.key}
                onCheckedChange={next => {
                  setEstado.mutate({
                    id: expedienteId,
                    checkKey: row.key,
                    estado: next,
                  });
                }}
                className="shrink-0 mt-0.5"
                aria-label={`${row.label}: ${row.estado ? "incluido" : "no incluido"}`}
              />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
