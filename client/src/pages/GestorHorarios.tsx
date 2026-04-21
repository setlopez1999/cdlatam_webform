import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import AddEmpleadoModal from "@/components/AddEmpleadoModal";
import EditEmpleadoModal from "@/components/EditEmpleadoModal";
import EditContratoModal from "@/components/EditContratoModal";
import { UserPlus, Users, Calendar, ChevronLeft, ChevronRight, Pencil, CalendarClock } from "lucide-react";

const DIAS_SEMANA = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const HORAS = Array.from({ length: 24 }, (_, i) => i);

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

export default function GestorHorarios() {
  const [vista, setVista] = useState<Vista>("semanal");
  const [empleadoSeleccionado, setEmpleadoSeleccionado] = useState<number | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editEmpleado, setEditEmpleado] = useState<Empleado | null>(null);
  const [editContrato, setEditContrato] = useState<Contrato | null>(null);
  const [semanaOffset, setSemanaOffset] = useState(0);

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

  const lunes = getLunes(semanaOffset);
  const diasSemana = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(lunes);
    d.setDate(lunes.getDate() + i);
    return d;
  });

  function getBloquesEnCelda(diaBD: number, hora: number, fuente: typeof bloquesSemanales) {
    return fuente.filter(b => {
      if (b.diaSemana !== diaBD) return false;
      const inicio = parseInt(b.horaInicio.split(":")[0]);
      const fin = parseInt(b.horaFin.split(":")[0]);
      return hora >= inicio && hora < fin;
    });
  }

  const colorPorEmpleado: Record<number, string> = {};
  empleados.forEach((e, i) => {
    colorPorEmpleado[e.id] = CHIP_COLORS[i % CHIP_COLORS.length];
  });

  function handleSaved() {
    refetchEmpleados();
    refetchBloques();
    refetchContrato();
    refetchBloquesEmpleado();
  }

  const empleadoActual = empleados.find(e => e.id === empleadoSeleccionado) ?? null;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Gestor de Horarios</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {empleados.length} empleado{empleados.length !== 1 ? "s" : ""} registrado{empleados.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Button onClick={() => setShowAddModal(true)} className="gap-2">
          <UserPlus className="w-4 h-4" />
          Agregar empleado
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b">
        <button
          onClick={() => { setVista("semanal"); setEmpleadoSeleccionado(null); }}
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
              {" · "}{formatFecha(lunes)} – {formatFecha(diasSemana[6])}
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
                  {e.nombre} {e.apellido}
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
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-xs border-collapse min-w-[700px]">
                <thead>
                  <tr className="bg-muted/50">
                    <th className="w-14 p-2 text-right text-muted-foreground font-normal border-r">Hora</th>
                    {diasSemana.map((d, i) => (
                      <th key={i} className="p-2 text-center font-medium border-r last:border-r-0">
                        <div>{DIAS_SEMANA[(i + 1) % 7]}</div>
                        <div className="text-muted-foreground font-normal">{formatFecha(d)}</div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {HORAS.map(hora => (
                    <tr key={hora} className="border-t hover:bg-muted/20 transition-colors">
                      <td className="p-1 pr-2 text-right text-muted-foreground border-r align-top pt-1.5">
                        {String(hora).padStart(2, "0")}:00
                      </td>
                      {diasSemana.map((_, colIdx) => {
                        const diaBD = colIdx < 6 ? colIdx + 1 : 0;
                        const bloques = getBloquesEnCelda(diaBD, hora, bloquesSemanales);
                        return (
                          <td key={colIdx} className="p-0.5 border-r last:border-r-0 align-top min-h-[28px]">
                            <div className="flex flex-col gap-0.5">
                              {bloques.map((b, bi) => (
                                <div
                                  key={bi}
                                  className={`${colorPorEmpleado[b.empleadoId]} text-white rounded px-1 py-0.5 truncate cursor-default text-center font-medium`}
                                  title={`${b.empleadoNombre} ${b.empleadoApellido} · ${b.horaInicio}–${b.horaFin}`}
                                >
                                  {b.empleadoNombre[0]}{b.empleadoApellido[0]}
                                </div>
                              ))}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Lista de empleados */}
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Empleados</p>
                {empleados.map(e => (
                  <div
                    key={e.id}
                    className={`group flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-colors ${
                      empleadoSeleccionado === e.id
                        ? "border-primary bg-primary/5"
                        : "border-border hover:bg-muted/50"
                    }`}
                    onClick={() => setEmpleadoSeleccionado(e.id)}
                  >
                    <span className={`w-3 h-3 rounded-full flex-shrink-0 ${colorPorEmpleado[e.id]}`} />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{e.nombre} {e.apellido}</p>
                      {e.cargo && <p className="text-xs text-muted-foreground truncate">{e.cargo}</p>}
                    </div>
                    {e.activo !== 1 && (
                      <Badge variant="secondary" className="text-xs flex-shrink-0">Inactivo</Badge>
                    )}
                    {/* Botón editar empleado */}
                    <button
                      onClick={ev => { ev.stopPropagation(); setEditEmpleado(e); }}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-muted"
                      title="Editar empleado"
                    >
                      <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Horario del empleado seleccionado */}
              <div className="md:col-span-2">
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
                    {/* Info del contrato con botón editar */}
                    <div className="p-3 bg-muted/40 rounded-lg text-sm space-y-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-1">
                          <p>
                            <span className="font-medium">Empleado:</span>{" "}
                            {empleadoActual?.nombre} {empleadoActual?.apellido}
                            {empleadoActual?.cargo && (
                              <span className="text-muted-foreground ml-1">· {empleadoActual.cargo}</span>
                            )}
                          </p>
                          <p><span className="font-medium">Rango:</span> {contratoActivo.fechaInicio} → {contratoActivo.fechaFin ?? "Indefinido"}</p>
                          <p><span className="font-medium">Horas diarias:</span> {contratoActivo.horasDiarias}h</p>
                          <p>
                            <span className="font-medium">Días:</span>{" "}
                            {(JSON.parse(contratoActivo.diasSemana as string) as number[]).map((d: number) => DIAS_SEMANA[d]).join(", ")}
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
                        </div>
                      </div>
                    </div>

                    {/* Grilla del empleado */}
                    <div className="overflow-x-auto rounded-lg border">
                      <table className="w-full text-xs border-collapse">
                        <thead>
                          <tr className="bg-muted/50">
                            <th className="w-14 p-2 text-right text-muted-foreground font-normal border-r">Hora</th>
                            {DIAS_SEMANA.map((d, i) => (
                              <th key={i} className="p-2 text-center font-medium border-r last:border-r-0">{d}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {HORAS.map(hora => (
                            <tr key={hora} className="border-t hover:bg-muted/20 transition-colors">
                              <td className="p-1 pr-2 text-right text-muted-foreground border-r align-top pt-1.5">
                                {String(hora).padStart(2, "0")}:00
                              </td>
                              {DIAS_SEMANA.map((_, diaIdx) => {
                                const bloques = bloquesEmpleado.filter(b => {
                                  if (b.diaSemana !== diaIdx) return false;
                                  const inicio = parseInt(b.horaInicio.split(":")[0]);
                                  const fin = parseInt(b.horaFin.split(":")[0]);
                                  return hora >= inicio && hora < fin;
                                });
                                return (
                                  <td key={diaIdx} className="p-0.5 border-r last:border-r-0 align-top">
                                    {bloques.length > 0 && (
                                      <div
                                        className={`${colorPorEmpleado[empleadoSeleccionado]} text-white rounded px-1 py-0.5 text-center`}
                                        title={`${bloques[0].horaInicio}–${bloques[0].horaFin}`}
                                      >
                                        ●
                                      </div>
                                    )}
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modales */}
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
    </div>
  );
}
