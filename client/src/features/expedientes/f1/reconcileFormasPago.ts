/**
 * Alinea formas de pago con servicios Impl/Mant: una fila enlazada por servicio.
 * La semilla (nCuotas=1, monto cuota 1 = total del servicio) solo se aplica al crear la fila;
 * si ya existe, solo se actualiza el número de ítem y se preservan los cambios del usuario.
 */
import { nanoid } from "nanoid";
import type { F1Data, FormaPago, ServicioContratado } from "../types";
import { createFourCuotasEmpty } from "./f1CuotasDefaults";
import { isTipoImplementacion, isTipoMantencion } from "./f1TipoVenta";

export function formasPagoListsEqual(a: FormaPago[], b: FormaPago[]): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

/** Busca una fila enlazada en cualquiera de las dos tablas (p. ej. al cambiar Impl ↔ Mant). */
export function findLinkedFormaPago(data: F1Data, servicioId: string): FormaPago | undefined {
  return (
    data.formasPagoImplementacion.find(fp => fp.linkedServicioId === servicioId) ||
    data.formasPagoMantencion.find(fp => fp.linkedServicioId === servicioId)
  );
}

/** Primera creación de fila para un servicio Impl/Mant. */
function seedLinkedFormaPago(servicio: ServicioContratado, item: number): FormaPago {
  const cuotas = createFourCuotasEmpty();
  cuotas[0] = { monto: servicio.total ?? 0, fecha: "" };
  return {
    id: nanoid(),
    item,
    linkedServicioId: servicio.id,
    tipoVenta: servicio.tipoVenta,
    nCuotas: 1,
    cuotas,
  };
}

function buildLinkedRow(
  servicio: ServicioContratado,
  existing: FormaPago | undefined,
  item: number,
): FormaPago {
  if (existing) {
    return {
      ...existing,
      item,
      linkedServicioId: servicio.id,
    };
  }
  return seedLinkedFormaPago(servicio, item);
}

export function reconcileFormasPagoDesdeServicios(
  data: F1Data,
): Pick<F1Data, "formasPagoImplementacion" | "formasPagoMantencion"> {
  const implServicios = data.serviciosContratados.filter(s => isTipoImplementacion(s.tipoVenta));
  const mantServicios = data.serviciosContratados.filter(s => isTipoMantencion(s.tipoVenta));

  const manualImpl = data.formasPagoImplementacion.filter(fp => !fp.linkedServicioId);
  const manualMant = data.formasPagoMantencion.filter(fp => !fp.linkedServicioId);

  const linkedImpl = implServicios.map((s, idx) => {
    const existing = findLinkedFormaPago(data, s.id);
    return buildLinkedRow(s, existing, idx + 1);
  });

  const linkedMant = mantServicios.map((s, idx) => {
    const existing = findLinkedFormaPago(data, s.id);
    return buildLinkedRow(s, existing, idx + 1);
  });

  return {
    formasPagoImplementacion: [...linkedImpl, ...manualImpl],
    formasPagoMantencion: [...linkedMant, ...manualMant],
  };
}

/**
 * Una sola reconciliación: si no hay cambios respecto al estado actual, devuelve null.
 */
export function formasReconcilePatchOrNull(
  data: F1Data,
): Pick<F1Data, "formasPagoImplementacion" | "formasPagoMantencion"> | null {
  const rec = reconcileFormasPagoDesdeServicios(data);
  if (
    formasPagoListsEqual(rec.formasPagoImplementacion, data.formasPagoImplementacion) &&
    formasPagoListsEqual(rec.formasPagoMantencion, data.formasPagoMantencion)
  ) {
    return null;
  }
  return rec;
}
