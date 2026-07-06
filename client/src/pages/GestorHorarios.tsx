import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import AddEmpleadoModal from "@/components/AddEmpleadoModal";
import EditEmpleadoModal from "@/components/EditEmpleadoModal";
import EditContratoModal from "@/components/EditContratoModal";
import HorariosGrid, { type BloqueGrilla } from "@/components/horarios/HorariosGrid";
import HorarioConfigPanel from "@/components/horarios/HorarioConfigPanel";
import { useHorarioConfig } from "@/components/horarios/useHorarioConfig";
import {
  UserPlus, Users, Calendar, ChevronLeft, ChevronRight,
  Pencil, CalendarClock, Trash2,
} from "lucide-react";

// ── Constantes ────────────────────────────────────────────────────────────────
const DIAS_SEMANA = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

const CHIP_COLORS = [
  "bg-blue-500", "bg-emerald-500", "bg-violet-500", "bg-amber-500",
  "bg-rose-500", "bg-cyan-500", "bg-orange-500", "bg-teal-500",
  "bg-pink-500", "bg-indigo-500",
];

type Vista = "semanal" | "empleado";

type Empleado = {
  id: number;
  nombre: string;
  apellido: string;
  cargo: string | null;
  activo: number;
};

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

// ── Helpers ───────────────────────────────────────────────────────────────────
function getLunes(offset: number): Date {
  const hoy = new Date();
  const diaSemana = hoy.getDay();
  const lunes = new Date(hoy);
  lunes.setDate(hoy.getDate() - (diaSemana === 0 ? 6 : diaSemana - 1) + offset * 7);
  lunes.setHours(0, 0, 0, 0);
  return lunes;
}

function formatFecha(date: Date): string {
  return date.toLocaleDateString("es-CL", { day: "numeric", month: "short" });
}

// ── Componente principal ──────────────────────────────────────────────────────
export default function GestorHorarios() {
  const [vista, setVista] = useState<Vista>("semanal");
  const [empleadoSeleccionado, setEmpleadoSeleccionado] = useState<number | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editEmpleado, setEditEmpleado] = useState<Empleado | null>(null);
  const [editContrato, setEditContrato] = useState<Contrato | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Empleado | null>(null);
  const [semanaOffset, setSemanaOffset] = useState(0);

  // Configuración de rango horario (persiste en localStorage)
  const { config: horarioConfig, setConfig: setHorarioConfig } = useHorarioConfig();

  // ── Queries ──────────────────────────────────────────────────────────────────
  const { data: empleados = [], refetch: refetchEmpleados } = trpc.horario.listEmpleados.useQuery();
  const { data: bloquesSemanales = [], refetch: refetchBloques } = trpc.horario.bloquesSemanales.useQuery();

  const { data: contratoActivo, refetch: refetchContrato } = trpc.horario.getContratoActivo.useQuery(
    { empleadoId: empleadoSeleccionado ?? 0 },
    { enabled: !!empleadoSeleccionado }
  );

  const { data: bloquesEmpleado = [], refetch: refetchBloquesEmpleado } = trpc.horario.getBloques.useQuery(
    { contratoId: contratoActivo?.id ?? 0 },
    { enabled: !!contratoActivo?.id }
  );

  // ── Mutations ─────────────────────────────────────────────────────────────────
  const deleteMutation = trpc.horario.deleteEmpleado.useMutation({
    onSuccess: () => {
      setDeleteTarget(null);
      if (empleadoSeleccionado === deleteTarget?.id) {
        setEmpleadoSeleccionado(null);
      }
      refetchEmpleados();
      refetchBloques();
    },
  });

  // ── Semana actual ─────────────────────────────────────────────────────────────
  const lunes = getLunes(semanaOffset);
  // Orden de la tabla: Dom(0), Lun(1)…Sáb(6) → reordenamos para mostrar Lun primero en header
  // La grilla usa índice 0=Dom … 6=Sáb tal como vienen los datos
  const diasSemana = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(lunes);
    // lunes = día 1; i=0→Lun, i=1→Mar, …, i=5→Sáb, i=6→Dom
    d.setDate(lunes.getDate() + i);
    return d;
  });
  // Para HorariosGrid necesitamos las fechas en orden Dom(0)…Sáb(6)
  // diasSemana[0]=Lun, [1]=Mar, …, [5]=Sáb, [6]=Dom → reordenar
  const fechasPorDia: Date[] = [
    diasSemana[6], // Dom
    diasSemana[0], // Lun
    diasSemana[1], // Mar
    diasSemana[2], // Mié
    diasSemana[3], // Jue
    diasSemana[4], // Vie
    diasSemana[5], // Sáb
  ];

  // ── Colores por empleado ──────────────────────────────────────────────────────
  const colorPorEmpleado: Record<number, string> = {};
  empleados.forEach((e, i) => {
    colorPorEmpleado[e.id] = CHIP_COLORS[i % CHIP_COLORS.length];
  });

  // ── Convertir bloques al formato de HorariosGrid ──────────────────────────────
  const bloquesGenerales: BloqueGrilla[] = bloquesSemanales.map(b => ({
    diaSemana: b.diaSemana,
    horaInicio: b.horaInicio,
    horaFin: b.horaFin,
    empleadoId: b.empleadoId,
    chipLabel: `${b.empleadoNombre[0]}${b.empleadoApellido[0]}`,
    tooltip: `${b.empleadoNombre} ${b.empleadoApellido} · ${b.horaInicio}–${b.horaFin}`,
  }));

  const bloquesIndividuales: BloqueGrilla[] = bloquesEmpleado.map(b => ({
    diaSemana: b.diaSemana,
    horaInicio: b.horaInicio,
    horaFin: b.horaFin,
    empleadoId: empleadoSeleccionado ?? 0,
    chipLabel: "●",
    tooltip: `${b.horaInicio}–${b.horaFin}`,
  }));

  // ── Handlers ──────────────────────────────────────────────────────────────────
  function handleSaved() {
    refetchEmpleados();
    refetchBloques();
    refetchContrato();
    refetchBloquesEmpleado();
  }

  function handleConfirmDelete() {
    if (!deleteTarget) return;
    deleteMutation.mutate({ id: deleteTarget.id });
  }

  const empleadoActual = empleados.find(e => e.id === empleadoSeleccionado) ?? null;

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Gestor de Horarios</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            <span translate="no">{empleados.length}</span> empleado{empleados.length !== 1 ? "s" : ""} registrado{empleados.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div translate="no">
        <Button onClick={() => setShowAddModal(true)} className="gap-2">
          <UserPlus className="w-4 h-4" />
          Agregar empleado
        </Button>
        </div>
      </div>

      {/* Tabs + botón configuración */}
      <div className="flex items-center justify-between border-b">
        <div className="flex gap-2">
          <button
            onClick={() => { setVista("semanal"); }}
            className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              vista === "semanal" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Calendar className="w-4 h-4" />
            Vista semanal
          </button>
          <button
            onClick={() => setVista("empleado")}
            className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              vista === "empleado" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Users className="w-4 h-4" />
            Por empleado
          </button>
        </div>
        {/* Botón ⚙ configuración de rango horario */}
        <div className="pb-1">
          <HorarioConfigPanel config={horarioConfig} onSave={setHorarioConfig} />
        </div>
      </div>

      {/* ── VISTA SEMANAL GENERAL ── */}
      {vista === "semanal" && (
        <div className="space-y-4">
          {/* Navegación de semana */}
          <div className="flex items-center gap-3">
            <Button variant="outline" size="icon" onClick={() => setSemanaOffset(o => o - 1)}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm font-medium min-w-[220px] text-center">
              {semanaOffset === 0
                ? "Esta semana"
                : semanaOffset === -1
                ? "Semana pasada"
                : semanaOffset === 1
                ? "Próxima semana"
                : `Semana del ${formatFecha(lunes)}`}
              {" · "}{formatFecha(diasSemana[0])} – {formatFecha(diasSemana[6])}
            </span>
            <Button variant="outline" size="icon" onClick={() => setSemanaOffset(o => o + 1)}>
              <ChevronRight className="w-4 h-4" />
            </Button>
            {semanaOffset !== 0 && (
              <Button variant="ghost" size="sm" onClick={() => setSemanaOffset(0)}>Hoy</Button>
            )}
          </div>

          {/* Leyenda */}
          {empleados.length > 0 && (
            <div className="flex flex-wrap gap-3">
              {empleados.filter(e => e.activo === 1).map(e => (
                <span key={e.id} className="flex items-center gap-1.5 text-xs">
                  <span className={`w-3 h-3 rounded-full ${colorPorEmpleado[e.id]}`} />
                  <span translate="no">{e.nombre} {e.apellido}</span>
                </span>
              ))}
            </div>
          )}

          {empleados.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <Calendar className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No hay empleados registrados.</p>
              <p className="text-sm">Agrega un empleado para ver su horario aquí.</p>
            </div>
          ) : (
            <HorariosGrid
              bloques={bloquesGenerales}
              colorPorEmpleado={colorPorEmpleado}
              horaInicio={horarioConfig.horaInicio}
              horaFin={horarioConfig.horaFin}
              fechasPorDia={fechasPorDia}
            />
          )}
        </div>
      )}

      {/* ── VISTA POR EMPLEADO ── */}
      {vista === "empleado" && (
        <div className="space-y-4">
          {empleados.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No hay empleados registrados.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Combobox de empleados */}
              <div className="flex items-center gap-3">
                <label className="text-sm font-medium text-muted-foreground whitespace-nowrap">
                  Empleado:
                </label>
                <Select
                  value={empleadoSeleccionado ? String(empleadoSeleccionado) : ""}
                  onValueChange={val => setEmpleadoSeleccionado(Number(val))}
                >
                  <SelectTrigger className="w-72" translate="no">
                    <SelectValue placeholder="Selecciona un empleado…" />
                  </SelectTrigger>
                  <SelectContent>
                    {empleados.map(e => (
                      <SelectItem key={e.id} value={String(e.id)}>
                        <div className="flex items-center gap-2">
                          <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${colorPorEmpleado[e.id]}`} />
                          <span translate="no">{e.nombre} {e.apellido}</span>
                          {e.cargo && (
                            <span className="text-muted-foreground text-xs">· <span translate="no">{e.cargo}</span></span>
                          )}
                          {e.activo !== 1 && (
                            <Badge variant="secondary" className="text-xs ml-1">Inactivo</Badge>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Detalle del empleado seleccionado */}
              {!empleadoSeleccionado ? (
                <div className="flex items-center justify-center h-48 text-muted-foreground text-sm border rounded-lg">
                  Selecciona un empleado para ver su horario
                </div>
              ) : !contratoActivo ? (
                <div className="flex flex-col items-center justify-center h-48 text-muted-foreground text-sm border rounded-lg gap-3">
                  <CalendarClock className="w-8 h-8 opacity-30" />
                  <p>Este empleado no tiene contrato activo</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Info del contrato */}
                  <div className="p-3 bg-muted/40 rounded-lg text-sm">
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1">
                        <p>
                          <span className="font-medium">Empleado:</span>{" "}
                          <span translate="no">{empleadoActual?.nombre} {empleadoActual?.apellido}</span>
                          {empleadoActual?.cargo && (
                            <span className="text-muted-foreground ml-1">· <span translate="no">{empleadoActual.cargo}</span></span>
                          )}
                        </p>
                        <p>
                          <span className="font-medium">Rango:</span>{" "}
                          <span translate="no">{contratoActivo.fechaInicio} → {contratoActivo.fechaFin ?? "Indefinido"}</span>
                        </p>
                        <p><span className="font-medium">Horas diarias:</span> <span translate="no">{contratoActivo.horasDiarias}h</span></p>
                        <p>
                          <span className="font-medium">Días:</span>{" "}
                          <span translate="no">{(JSON.parse(contratoActivo.diasSemana as string) as number[])
                            .map((d: number) => DIAS_SEMANA[d])
                            .join(", ")}</span>
                        </p>
                      </div>
                      <div className="flex gap-1 flex-shrink-0">
                        <Button
                          variant="outline" size="sm"
                          className="gap-1.5 text-xs"
                          onClick={() => setEditEmpleado(empleadoActual)}
                        >
                          <Pencil className="w-3 h-3" />
                          Empleado
                        </Button>
                        <Button
                          variant="outline" size="sm"
                          className="gap-1.5 text-xs"
                          onClick={() => setEditContrato(contratoActivo as Contrato)}
                        >
                          <CalendarClock className="w-3 h-3" />
                          Horario
                        </Button>
                        <Button
                          variant="outline" size="sm"
                          className="gap-1.5 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => setDeleteTarget(empleadoActual)}
                        >
                          <Trash2 className="w-3 h-3" />
                          Eliminar
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Grilla del empleado — mismo componente reutilizable */}
                  <HorariosGrid
                    bloques={bloquesIndividuales}
                    colorPorEmpleado={colorPorEmpleado}
                    horaInicio={horarioConfig.horaInicio}
                    horaFin={horarioConfig.horaFin}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── MODALES ── */}
      <AddEmpleadoModal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSaved={handleSaved}
      />
      <EditEmpleadoModal
        empleado={editEmpleado}
        open={!!editEmpleado}
        onClose={() => setEditEmpleado(null)}
        onSaved={handleSaved}
      />
      <EditContratoModal
        contrato={editContrato}
        open={!!editContrato}
        onClose={() => setEditContrato(null)}
        onSaved={handleSaved}
      />

      {/* AlertDialog de confirmación de borrado */}
      <AlertDialog open={!!deleteTarget} onOpenChange={open => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar empleado?</AlertDialogTitle>
            <AlertDialogDescription>
              Estás a punto de eliminar a{" "}
              <span className="font-semibold text-foreground" translate="no">
                {deleteTarget?.nombre} {deleteTarget?.apellido}
              </span>
              . Esta acción eliminará también todos sus contratos y bloques de horario.{" "}
              <span className="font-semibold text-destructive">No se puede deshacer.</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Eliminando…" : "Sí, eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}
