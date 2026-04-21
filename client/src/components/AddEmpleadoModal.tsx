import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";

// Días de la semana: 0=Dom, 1=Lun, ..., 6=Sab
const DIAS = [
  { value: 1, label: "Lun" },
  { value: 2, label: "Mar" },
  { value: 3, label: "Mié" },
  { value: 4, label: "Jue" },
  { value: 5, label: "Vie" },
  { value: 6, label: "Sáb" },
  { value: 0, label: "Dom" },
];

const PRESETS_DIAS = {
  normal: [1, 2, 3, 4, 5],
  lun_sab: [1, 2, 3, 4, 5, 6],
  personalizado: [],
};

type BloqueHorario = {
  diaSemana: number;
  horaInicio: string;
  horaFin: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
};

export default function AddEmpleadoModal({ open, onClose, onSaved }: Props) {
  // Paso actual del formulario: 1=datos básicos, 2=contrato y horario
  const [paso, setPaso] = useState<1 | 2>(1);

  // Paso 1 — Datos básicos del empleado
  const [nombre, setNombre] = useState("");
  const [apellido, setApellido] = useState("");
  const [cargo, setCargo] = useState("");

  // Paso 2 — Contrato
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const [horasDiarias, setHorasDiarias] = useState<number>(8);
  const [tipoDistribucion, setTipoDistribucion] = useState<"normal" | "lun_sab" | "personalizado">("normal");
  const [diasSeleccionados, setDiasSeleccionados] = useState<number[]>([1, 2, 3, 4, 5]);
  const [mismasHoras, setMismasHoras] = useState(true);

  // Horario uniforme (mismasHoras=true)
  const [horaInicioUniforme, setHoraInicioUniforme] = useState("08:00");
  const [horaFinUniforme, setHoraFinUniforme] = useState("17:00");

  // Horario por día (mismasHoras=false) — un bloque por día seleccionado
  const [bloquesPorDia, setBloquesPorDia] = useState<Record<number, { horaInicio: string; horaFin: string }>>({});

  const utils = trpc.useUtils();

  const createEmpleado = trpc.horario.createEmpleado.useMutation();
  const createContrato = trpc.horario.createContrato.useMutation();
  const setBloques = trpc.horario.setBloques.useMutation();

  function handleTipoDistribucion(tipo: "normal" | "lun_sab" | "personalizado") {
    setTipoDistribucion(tipo);
    if (tipo !== "personalizado") {
      setDiasSeleccionados(PRESETS_DIAS[tipo]);
    }
  }

  function toggleDia(dia: number) {
    setDiasSeleccionados(prev =>
      prev.includes(dia) ? prev.filter(d => d !== dia) : [...prev, dia]
    );
  }

  function getBloquesDia(dia: number): { horaInicio: string; horaFin: string } {
    return bloquesPorDia[dia] ?? { horaInicio: "08:00", horaFin: "17:00" };
  }

  function setBloquesDia(dia: number, campo: "horaInicio" | "horaFin", valor: string) {
    setBloquesPorDia(prev => ({
      ...prev,
      [dia]: { ...getBloquesDia(dia), [campo]: valor },
    }));
  }

  function buildBloques(contratoId: number): BloqueHorario[] {
    return diasSeleccionados.map(dia => {
      if (mismasHoras) {
        return { diaSemana: dia, horaInicio: horaInicioUniforme, horaFin: horaFinUniforme };
      }
      const bloque = getBloquesDia(dia);
      return { diaSemana: dia, horaInicio: bloque.horaInicio, horaFin: bloque.horaFin };
    });
  }

  async function handleGuardar() {
    if (!nombre.trim() || !apellido.trim()) return;
    if (!fechaInicio) return;
    if (diasSeleccionados.length === 0) return;

    try {
      // 1. Crear empleado
      const empleado = await createEmpleado.mutateAsync({ nombre: nombre.trim(), apellido: apellido.trim(), cargo: cargo.trim() || undefined });

      // 2. Crear contrato
      const contrato = await createContrato.mutateAsync({
        empleadoId: empleado.id,
        fechaInicio,
        fechaFin: fechaFin || null,
        horasDiarias,
        diasSemana: JSON.stringify(diasSeleccionados),
        tipoDistribucion,
        mismasHorasDiarias: mismasHoras ? 1 : 0,
      });

      // 3. Guardar bloques de horario
      const bloques = buildBloques(contrato.id);
      await setBloques.mutateAsync({ contratoId: contrato.id, bloques });

      utils.horario.listEmpleados.invalidate();
      utils.horario.bloquesSemanales.invalidate();
      onSaved();
      handleClose();
    } catch (err) {
      console.error("Error al crear empleado:", err);
    }
  }

  function handleClose() {
    setPaso(1);
    setNombre(""); setApellido(""); setCargo("");
    setFechaInicio(""); setFechaFin("");
    setHorasDiarias(8);
    setTipoDistribucion("normal");
    setDiasSeleccionados([1, 2, 3, 4, 5]);
    setMismasHoras(true);
    setHoraInicioUniforme("08:00");
    setHoraFinUniforme("17:00");
    setBloquesPorDia({});
    onClose();
  }

  const isLoading = createEmpleado.isPending || createContrato.isPending || setBloques.isPending;

  return (
    <Dialog open={open} onOpenChange={open => !open && handleClose()}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {paso === 1 ? "Nuevo Empleado — Datos básicos" : "Nuevo Empleado — Contrato y Horario"}
          </DialogTitle>
        </DialogHeader>

        {/* ── PASO 1: Datos básicos ── */}
        {paso === 1 && (
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Nombre *</Label>
                <Input value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Juan" />
              </div>
              <div className="space-y-1">
                <Label>Apellido *</Label>
                <Input value={apellido} onChange={e => setApellido(e.target.value)} placeholder="Pérez" />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Cargo</Label>
              <Input value={cargo} onChange={e => setCargo(e.target.value)} placeholder="Técnico, Analista, etc." />
            </div>
          </div>
        )}

        {/* ── PASO 2: Contrato y horario ── */}
        {paso === 2 && (
          <div className="space-y-5 py-2">
            {/* Rango de trabajo */}
            <div>
              <p className="text-sm font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Rango de trabajo</p>
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
              <Label>Horas diarias de trabajo *</Label>
              <Input
                type="number" min={0.5} max={24} step={0.5}
                value={horasDiarias}
                onChange={e => setHorasDiarias(parseFloat(e.target.value) || 8)}
                className="w-32"
              />
            </div>

            {/* Días de trabajo */}
            <div>
              <p className="text-sm font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Días de trabajo</p>
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
              {tipoDistribucion === "personalizado" && (
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
              )}
              {tipoDistribucion !== "personalizado" && (
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
                <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Distribución de horas</p>
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <Switch checked={mismasHoras} onCheckedChange={setMismasHoras} />
                  <span className="text-sm">Mismas horas todos los días</span>
                </label>
              </div>

              {mismasHoras ? (
                /* Horario uniforme */
                <div className="flex items-center gap-3 p-3 bg-muted/40 rounded-lg">
                  <span className="text-sm text-muted-foreground w-24">Todos los días</span>
                  <div className="flex items-center gap-2">
                    <Input
                      type="time" value={horaInicioUniforme}
                      onChange={e => setHoraInicioUniforme(e.target.value)}
                      className="w-28"
                    />
                    <span className="text-muted-foreground text-sm">→</span>
                    <Input
                      type="time" value={horaFinUniforme}
                      onChange={e => setHoraFinUniforme(e.target.value)}
                      className="w-28"
                    />
                  </div>
                </div>
              ) : (
                /* Horario por día */
                <div className="space-y-2">
                  {diasSeleccionados.sort((a, b) => (a === 0 ? 7 : a) - (b === 0 ? 7 : b)).map(dia => {
                    const diaLabel = DIAS.find(d => d.value === dia)?.label ?? dia;
                    const bloque = getBloquesDia(dia);
                    return (
                      <div key={dia} className="flex items-center gap-3 p-2 bg-muted/30 rounded-lg">
                        <span className="text-sm font-medium w-10">{diaLabel}</span>
                        <div className="flex items-center gap-2">
                          <Input
                            type="time" value={bloque.horaInicio}
                            onChange={e => setBloquesDia(dia, "horaInicio", e.target.value)}
                            className="w-28"
                          />
                          <span className="text-muted-foreground text-sm">→</span>
                          <Input
                            type="time" value={bloque.horaFin}
                            onChange={e => setBloquesDia(dia, "horaFin", e.target.value)}
                            className="w-28"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleClose} disabled={isLoading}>Cancelar</Button>
          {paso === 1 ? (
            <Button
              onClick={() => setPaso(2)}
              disabled={!nombre.trim() || !apellido.trim()}
            >
              Siguiente: Horario
            </Button>
          ) : (
            <>
              <Button variant="outline" onClick={() => setPaso(1)} disabled={isLoading}>Atrás</Button>
              <Button
                onClick={handleGuardar}
                disabled={isLoading || !fechaInicio || diasSeleccionados.length === 0}
              >
                {isLoading ? "Guardando..." : "Guardar empleado"}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
