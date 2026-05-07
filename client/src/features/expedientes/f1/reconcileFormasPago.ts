/**
 * Alinea formas de pago con servicios Impl/Mant: una fila enlazada por servicio,
 * nCuotas=1, monto cuota 1 = total del servicio.
 */
import { nanoid } from "nanoid";
import type { F1Data, FormaPago, ServicioContratado } from "../types";
import { isTipoImplementacion, isTipoMantencion } from "./f1TipoVenta";

function emptyCuotas(): FormaPago["cuotas"] {
  const empty = { monto: 0, fecha: "" };
  return [{ ...empty }, { ...empty }, { ...empty }, { ...empty }];
}

function buildLinkedFormaPago(
  servicio: ServicioContratado,
  existing: FormaPago | undefined,
  item: number,
): FormaPago {
  const cuotas =
    existing?.cuotas?.length === 4
      ? existing.cuotas.map(c => ({ ...c }))
      : emptyCuotas();

  cuotas[0] = {
    monto: servicio.total ?? 0,
    fecha: existing?.cuotas?.[0]?.fecha ?? "",
  };
  for (let i = 1; i < 4; i++) {
    cuotas[i] = { monto: 0, fecha: "" };
  }

  return {
    id: existing?.id ?? nanoid(),
    item,
    linkedServicioId: servicio.id,
    tipoVenta: servicio.tipoVenta,
    nCuotas: 1,
    cuotas,
  };
}

export function reconcileFormasPagoDesdeServicios(
  data: F1Data,
): Pick<F1Data, "formasPagoImplementacion" | "formasPagoMantencion"> {
  const implServicios = data.serviciosContratados.filter(s => isTipoImplementacion(s.tipoVenta));
  const mantServicios = data.serviciosContratados.filter(s => isTipoMantencion(s.tipoVenta));

  const manualImpl = data.formasPagoImplementacion.filter(fp => !fp.linkedServicioId);
  const manualMant = data.formasPagoMantencion.filter(fp => !fp.linkedServicioId);

  const linkedImpl = implServicios.map((s, idx) => {
    const existing = data.formasPagoImplementacion.find(fp => fp.linkedServicioId === s.id);
    return buildLinkedFormaPago(s, existing, idx + 1);
  });

  const linkedMant = mantServicios.map((s, idx) => {
    const existing = data.formasPagoMantencion.find(fp => fp.linkedServicioId === s.id);
    return buildLinkedFormaPago(s, existing, idx + 1);
  });

  return {
    formasPagoImplementacion: [...linkedImpl, ...manualImpl],
    formasPagoMantencion: [...linkedMant, ...manualMant],
  };
}
