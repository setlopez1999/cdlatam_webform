/**
 * NuevoExpediente - Página para crear un nuevo expediente.
 * Genera un nombre automático (Expediente #N), permite cambiarlo,
 * y al confirmar redirige al F1 (Acta) del expediente creado.
 *
 * Al crear, sincroniza el expediente con la BD via trpc.expediente.sync.
 */

import { useState } from "react";
import { useLocation } from "wouter";
import { FolderPlus, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { useExpedienteStore } from "@/features/expedientes/store";

export default function NuevoExpediente() {
  const [, navigate] = useLocation();
  const { expedientes, crear } = useExpedienteStore();
  const [isCreating, setIsCreating] = useState(false);

  // Calcular nombre sugerido
  const num = expedientes.length + 1;
  const [nombre, setNombre] = useState(`Expediente #${num}`);

  // Mutation para sincronizar con BD
  const syncExpediente = trpc.expediente.sync.useMutation();

  const handleCrear = async () => {
    if (isCreating) return;
    setIsCreating(true);
    try {
      // 1. Crear en localStorage (store de Zustand)
      const exp = crear(nombre.trim() || `Expediente #${num}`);

      // 2. Sincronizar con BD (fire-and-forget: si falla, el expediente sigue en localStorage)
      syncExpediente.mutate(
        { uuid: exp.id, nombre: exp.nombre },
        {
          onError: (err) => {
            console.warn("[NuevoExpediente] No se pudo sincronizar con BD:", err.message);
          },
        }
      );

      // 3. Navegar al F1 del expediente creado
      navigate(`/expediente/${exp.id}/acta`);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[60vh] px-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
            <FolderPlus className="h-7 w-7 text-primary" />
          </div>
          <CardTitle className="text-xl">Nuevo Expediente</CardTitle>
          <CardDescription>
            Un expediente agrupa el Acta (F1), la Evaluación de Proyecto (F2)
            y los Resultados calculados automáticamente.
          </CardDescription>
        </CardHeader>

        <CardContent className="pt-4 flex flex-col gap-5">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="nombre-expediente">Nombre del expediente</Label>
            <Input
              id="nombre-expediente"
              value={nombre}
              onChange={e => setNombre(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleCrear()}
              placeholder={`Expediente #${num}`}
              autoFocus
            />
            <p className="text-xs text-muted-foreground">
              Puedes cambiarlo en cualquier momento desde el expediente.
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <Button className="w-full gap-2" onClick={handleCrear} disabled={isCreating}>
              Crear y completar F1 — Acta
              <ArrowRight className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              className="w-full text-muted-foreground"
              onClick={() => navigate("/historial")}
              disabled={isCreating}
            >
              Cancelar
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
