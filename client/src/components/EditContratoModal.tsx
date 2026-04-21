import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";

const DIAS = [
  { value: 1, label: "Lun" },
  { value: 2, label: "Mar" },
  { value: 3, label: "Mié" },
  { value: 4, label: "Jue" },
  { value: 5, label: "Vie" },
  { value: 6, label: "Sáb" },
  { value: 0, label: "Dom" },
];

type Contrato = {
  id: number;
  empleadoId: number;
  fechaInicio: string;
  fechaFin: string | null;
  horasDiarias: number;
  diasSemana: string | number[];
  tipoDistribucion: string;
  mismasHorasDiarias: number;
  activo: number;
};

type BloqueHorario = {
  id: number;
  contratoId: number;
  diaSemana: number;
  horaInicio: string;
  horaFin: string;
};

type Props = {
  contrato: Contrato | null;
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
};

export default function EditContratoModal({ contrato, open, onClose, onSaved }: Props) {
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const [horasDiarias, setHorasDiarias] = useState<number>(8);
  const [tipoDistribucion, setTipoDistribucion] = useState<"normal" | "lun_sab" | "personalizado">("normal");
  const [diasSeleccionados, setDiasSeleccionados] = useState<number[]>([1, 2, 3, 4, 5]);
  const [mismasHoras, setMismasHoras] = useState(true);
  const [horaInicioUniforme, setHoraInicioUniforme] = useState("08:00");
  const [horaFinUniforme, setHoraFinUniforme] = useState("17:00");
  const [bloquesPorDia, setBloquesPorDia] = useState<Record<number, { horaInicio: string; horaFin: string }>>({});

  const utils = trpc.useUtils();

  // Cargar bloques actuales del contrato
  const { data: bloquesActuales = [] } = trpc.horario.getBloques.useQuery(
    { contratoId: contrato?.id ?? 0 },
    { enabled: !!contrato?.id && open }
  );

  useEffect(() => {
    if (!contrato) return;
    setFechaInicio(contrato.fechaInicio);
    setFechaFin(contrato.fechaFin ?? "");
    setHorasDiarias(contrato.horasDiarias);
    setMismasHoras(contrato.mismasHorasDiarias === 1);

    const dias = typeof contrato.diasSemana === "string"
      ? JSON.parse(contrato.diasSemana) as number[]
      : contrato.diasSemana as number[];
    setDiasSeleccionados(dias);

    const tipo = contrato.tipoDistribucion as "normal" | "lun_sab" | "personalizado";
    setTipoDistribucion(tipo);
  }, [contrato]);

  useEffect(() => {
    if (bloquesActuales.length === 0) return;
    if (contrato?.mismasHorasDiarias === 1 && bloquesActuales.length > 0) {
      setHoraInicioUniforme(bloquesActuales[0].horaInicio);
      setHoraFinUniforme(bloquesActuales[0].horaFin);
    } else {
      const mapa: Record<number, { horaInicio: string; horaFin: string }> = {};
      bloquesActuales.forEach(b => {
        mapa[b.diaSemana] = { horaInicio: b.horaInicio, horaFin: b.horaFin };
      });
      setBloquesPorDia(mapa);
    }
  }, [bloquesActuales, contrato]);

  const updateContrato = trpc.horario.updateContrato.useMutation();
  const setBloques = trpc.horario.setBloques.useMutation();

  function toggleDia(dia: number) {
    setDiasSeleccionados(prev =>
      prev.includes(dia) ? prev.filter(d => d !== dia) : [...prev, dia]
    );
  }

  function handleTipoDistribucion(tipo: "normal" | "lun_sab" | "personalizado") {
    setTipoDistribucion(tipo);
    if (tipo === "normal") setDiasSeleccionados([1, 2, 3, 4, 5]);
    else if (tipo === "lun_sab") setDiasSeleccionados([1, 2, 3, 4, 5, 6]);
  }

  function getBloquesDia(dia: number) {
    return bloquesPorDia[dia] ?? { horaInicio: "08:00", horaFin: "17:00" };
  }

  function setBloquesDia(dia: number, campo: "horaInicio" | "horaFin", valor: string) {
    setBloquesPorDia(prev => ({
      ...prev,
      [dia]: { ...getBloquesDia(dia), [campo]: valor },
    }));
  }

  async function handleGuardar() {
    if (!contrato) return;
    if (!fechaInicio || diasSeleccionados.length === 0) return;

    await updateContrato.mutateAsync({
      id: contrato.id,
      fechaInicio,
      fechaFin: fechaFin || null,
      horasDiarias,
      diasSemana: JSON.stringify(diasSeleccionados),
      tipoDistribucion,
      mismasHorasDiarias: mismasHoras ? 1 : 0,
    });

    const bloques = diasSeleccionados.map(dia => {
      if (mismasHoras) {
        return { diaSemana: dia, horaInicio: horaInicioUniforme, horaFin: horaFinUniforme };
      }
      const b = getBloquesDia(dia);
      return { diaSemana: dia, horaInicio: b.horaInicio, horaFin: b.horaFin };
    });

    await setBloques.mutateAsync({ contratoId: contrato.id, bloques });

    utils.horario.getBloques.invalidate({ contratoId: contrato.id });
    utils.horario.bloquesSemanales.invalidate();
    onSaved();
    onClose();
  }

  const isLoading = updateContrato.isPending || setBloques.isPending;

  if (!contrato) return null;

  return (
    <Dialog open={open} onOpenChange={open => !open && onClose()}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Contrato y Horario</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Rango */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Rango de trabajo</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Fecha inicio *</Label>
                <Input type="date" value={fechaInicio} onChange={e => setFechaInicio(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Fecha fin <span className="text-muted-foreground text-xs">(vacío = indefinido)</span></Label>
                <Input type="date" value={fechaFin} onChange={e => setFechaFin(e.target.value)} />
              </div>
            </div>
          </div>

          {/* Horas diarias */}
          <div className="space-y-1">
            <Label>Horas diarias *</Label>
            <Input
              type="number" min={0.5} max={24} step={0.5}
              value={horasDiarias}
              onChange={e => setHorasDiarias(parseFloat(e.target.value) || 8)}
              className="w-32"
            />
          </div>

          {/* Días */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Días de trabajo</p>
            <div className="flex gap-2 mb-3 flex-wrap">
              {(["normal", "lun_sab", "personalizado"] as const).map(tipo => (
                <button
                  key={tipo}
                  onClick={() => handleTipoDistribucion(tipo)}
                  className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                    tipoDistribucion === tipo
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-border text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {tipo === "normal" ? "Lun–Vie" : tipo === "lun_sab" ? "Lun–Sáb" : "Personalizado"}
                </button>
              ))}
            </div>
            {tipoDistribucion === "personalizado" ? (
              <div className="flex gap-2 flex-wrap">
                {DIAS.map(dia => (
                  <label key={dia.value} className="flex items-center gap-1.5 cursor-pointer select-none">
                    <Checkbox
                      checked={diasSeleccionados.includes(dia.value)}
                      onCheckedChange={() => toggleDia(dia.value)}
                    />
                    <span className="text-sm">{dia.label}</span>
                  </label>
                ))}
              </div>
            ) : (
              <div className="flex gap-2 flex-wrap">
                {DIAS.filter(d => diasSeleccionados.includes(d.value)).map(dia => (
                  <span key={dia.value} className="px-2 py-0.5 bg-muted rounded text-xs font-medium">{dia.label}</span>
                ))}
              </div>
            )}
          </div>

          {/* Distribución de horas */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Distribución de horas</p>
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <Switch checked={mismasHoras} onCheckedChange={setMismasHoras} />
                <span className="text-sm">Mismas horas todos los días</span>
              </label>
            </div>

            {mismasHoras ? (
              <div className="flex items-center gap-3 p-3 bg-muted/40 rounded-lg">
                <span className="text-sm text-muted-foreground w-24">Todos los días</span>
                <div className="flex items-center gap-2">
                  <Input type="time" value={horaInicioUniforme} onChange={e => setHoraInicioUniforme(e.target.value)} className="w-28" />
                  <span className="text-muted-foreground text-sm">→</span>
                  <Input type="time" value={horaFinUniforme} onChange={e => setHoraFinUniforme(e.target.value)} className="w-28" />
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {diasSeleccionados.sort((a, b) => (a === 0 ? 7 : a) - (b === 0 ? 7 : b)).map(dia => {
                  const diaLabel = DIAS.find(d => d.value === dia)?.label ?? dia;
                  const bloque = getBloquesDia(dia);
                  return (
                    <div key={dia} className="flex items-center gap-3 p-2 bg-muted/30 rounded-lg">
                      <span className="text-sm font-medium w-10">{diaLabel}</span>
                      <div className="flex items-center gap-2">
                        <Input type="time" value={bloque.horaInicio} onChange={e => setBloquesDia(dia, "horaInicio", e.target.value)} className="w-28" />
                        <span className="text-muted-foreground text-sm">→</span>
                        <Input type="time" value={bloque.horaFin} onChange={e => setBloquesDia(dia, "horaFin", e.target.value)} className="w-28" />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={isLoading}>Cancelar</Button>
          <Button
            onClick={handleGuardar}
            disabled={isLoading || !fechaInicio || diasSeleccionados.length === 0}
          >
            {isLoading ? "Guardando..." : "Guardar cambios"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
