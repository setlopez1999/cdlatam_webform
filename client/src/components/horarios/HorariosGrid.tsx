/**
 * HorariosGrid
 * Componente reutilizable que renderiza la grilla semanal de horarios.
 * Usado tanto en la vista semanal general como en la vista por empleado.
 */

const DIAS_SEMANA = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

export type BloqueGrilla = {
  diaSemana: number;       // 0=Dom … 6=Sáb
  horaInicio: string;      // "HH:MM"
  horaFin: string;         // "HH:MM"
  empleadoId: number;
  /** Texto corto a mostrar en el chip (ej. iniciales "CG") */
  chipLabel: string;
  /** Tooltip completo */
  tooltip: string;
};

export type HorariosGridProps = {
  bloques: BloqueGrilla[];
  /** Mapa empleadoId → clase CSS de color Tailwind (ej. "bg-blue-500") */
  colorPorEmpleado: Record<number, string>;
  /** Primera hora visible (0–23). Por defecto 0. */
  horaInicio?: number;
  /** Última hora visible EXCLUSIVA (1–24). Por defecto 24. */
  horaFin?: number;
  /** Fechas opcionales para mostrar en la cabecera (array de 7 Date, lun→dom) */
  fechasPorDia?: Date[];
};

function formatFecha(date: Date): string {
  return date.toLocaleDateString("es-CL", { day: "numeric", month: "short" });
}

export default function HorariosGrid({
  bloques,
  colorPorEmpleado,
  horaInicio = 0,
  horaFin = 24,
  fechasPorDia,
}: HorariosGridProps) {
  const horas = Array.from(
    { length: horaFin - horaInicio },
    (_, i) => horaInicio + i
  );

  function getBloquesEnCelda(diaSemana: number, hora: number) {
    return bloques.filter(b => {
      if (b.diaSemana !== diaSemana) return false;
      const inicio = parseInt(b.horaInicio.split(":")[0]);
      const fin = parseInt(b.horaFin.split(":")[0]);
      return hora >= inicio && hora < fin;
    });
  }

  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-xs border-collapse min-w-[500px]">
        <thead>
          <tr className="bg-muted/50">
            <th className="w-14 p-2 text-right text-muted-foreground font-normal border-r">
              Hora
            </th>
            {DIAS_SEMANA.map((dia, i) => (
              <th key={i} className="p-2 text-center font-medium border-r last:border-r-0">
                <div>{dia}</div>
                {fechasPorDia && (
                  <div className="text-muted-foreground font-normal">
                    {formatFecha(fechasPorDia[i])}
                  </div>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {horas.map(hora => (
            <tr key={hora} className="border-t hover:bg-muted/20 transition-colors">
              <td className="p-1 pr-2 text-right text-muted-foreground border-r align-top pt-1.5 whitespace-nowrap">
                {String(hora).padStart(2, "0")}:00
              </td>
              {DIAS_SEMANA.map((_, diaIdx) => {
                const celdaBloques = getBloquesEnCelda(diaIdx, hora);
                return (
                  <td
                    key={diaIdx}
                    className="p-0.5 border-r last:border-r-0 align-top min-h-[28px]"
                  >
                    <div className="flex flex-col gap-0.5">
                      {celdaBloques.map((b, bi) => (
                        <div
                          key={bi}
                          className={`${colorPorEmpleado[b.empleadoId] ?? "bg-gray-400"} text-white rounded px-1 py-0.5 truncate cursor-default text-center font-medium`}
                          title={b.tooltip}
                        >
                          {b.chipLabel}
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
  );
}
