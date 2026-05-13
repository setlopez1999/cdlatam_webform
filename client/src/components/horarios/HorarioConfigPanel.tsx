/**
 * HorarioConfigPanel
 * Panel desplegable (popover) para configurar el rango de horas
 * visible en la grilla semanal.
 */
import { useState } from "react";
import { Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import type { HorarioConfig } from "./useHorarioConfig";

type Props = {
  config: HorarioConfig;
  onSave: (config: HorarioConfig) => void;
};

export default function HorarioConfigPanel({ config, onSave }: Props) {
  const [open, setOpen] = useState(false);
  const [inicio, setInicio] = useState(config.horaInicio);
  const [fin, setFin] = useState(config.horaFin);

  function handleOpen(v: boolean) {
    if (v) {
      // Sincronizar con el config actual al abrir
      setInicio(config.horaInicio);
      setFin(config.horaFin);
    }
    setOpen(v);
  }

  function handleSave() {
    if (inicio >= fin) return; // no guardar rango inválido
    onSave({ horaInicio: inicio, horaFin: fin });
    setOpen(false);
  }

  const invalid = inicio >= fin;

  return (
    <Popover open={open} onOpenChange={handleOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          title="Configurar vista de horario"
          className="h-8 w-8"
        >
          <Settings2 className="w-4 h-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-4 space-y-4" align="end">
        <div>
          <p className="text-sm font-semibold mb-1">Ajustes de vista</p>
          <p className="text-xs text-muted-foreground">
            Define el rango de horas visible en la grilla semanal.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Hora inicio</Label>
            <select
              value={inicio}
              onChange={e => setInicio(Number(e.target.value))}
              className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {Array.from({ length: 24 }, (_, i) => (
                <option key={i} value={i}>
                  {String(i).padStart(2, "0")}:00
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Hora fin</Label>
            <select
              value={fin}
              onChange={e => setFin(Number(e.target.value))}
              className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {Array.from({ length: 24 }, (_, i) => i + 1).map(h => (
                <option key={h} value={h}>
                  {String(h).padStart(2, "0")}:00
                </option>
              ))}
            </select>
          </div>
        </div>

        {invalid && (
          <p className="text-xs text-destructive">
            La hora de inicio debe ser menor que la hora de fin.
          </p>
        )}

        <div className="text-xs text-muted-foreground">
          Mostrará{" "}
          <span className="font-medium text-foreground">
            {invalid ? "—" : `${fin - inicio}h`}
          </span>{" "}
          ({String(inicio).padStart(2, "0")}:00 – {String(fin).padStart(2, "0")}:00)
        </div>

        <div className="flex gap-2 justify-end">
          <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button size="sm" onClick={handleSave} disabled={invalid}>
            Aplicar
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
