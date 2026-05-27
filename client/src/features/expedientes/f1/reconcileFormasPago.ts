/**
 * Alinea formas de pago con servicios Impl/Mant: una fila enlazada por servicio.
 * Implementación: semilla y cambios de total reparten el total del servicio entre cuotas.
 * Mantención: cuotas de gracia manuales vs valor unitario; si cambia el precio unitario se resetean montos de gracia.
 */
import { nanoid } from "nanoid";
import type { F1Data, FormaPago, FormaPagoHitos, ServicioContratado } from "../types";
import { createFourCuotasEmpty } from "./f1CuotasDefaults";
import { isTipoImplementacion, isTipoImplementacionHitos, isTipoMantencion } from "./f1TipoVenta";

export function formasPagoListsEqual(a: FormaPago[], b: FormaPago[]): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

export function formasPagoHitosListsEqual(a: FormaPagoHitos[], b: FormaPagoHitos[]): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

export function distributeTotalAcrossCuotas(
  total: number,
  nCuotas: number,
  baseCuotas = createFourCuotasEmpty(),
) {
  const cuotas = createFourCuotasEmpty();
  const count = Math.min(4, Math.max(1, nCuotas || 1));
  const totalCent = Math.round((Number(total) || 0) * 100);
  const baseCent = Math.floor(totalCent / count);
  const remainder = totalCent - (baseCent * count);
  for (let i = 0; i < count; i++) {
    const extra = i === count - 1 ? remainder : 0;
    cuotas[i] = { ...cuotas[i], fecha: baseCuotas?.[i]?.fecha ?? "", monto: (baseCent + extra) / 100 };
  }
  return cuotas;
}

/**
 * Suma de descuentos en cuotas de gracia.
 * Solo filas en `formasPagoMantencion` con `linkedServicioId` cuyo servicio es tipo Mantención
 * (referencia = precio unitario del servicio). Filas manuales sin vínculo no suman — no hay VU de referencia en datos.
 */
export function computeTotalDescuentoMantencion(data: F1Data): number {
  let sum = 0;
  const svcs = data.serviciosContratados ?? [];
  for (const fp of data.formasPagoMantencion ?? []) {
    if (!fp.linkedServicioId) continue;
    const s = svcs.find(x => x.id === fp.linkedServicioId);
    if (!s || !isTipoMantencion(s.tipoVenta)) continue;
    const ref = Number(s.precioUnitario) || 0;
    const n = Math.min(4, Math.max(1, fp.nCuotas || 1));
    for (let i = 0; i < n; i++) {
      const monto = Number(fp.cuotas?.[i]?.monto) || 0;
      sum += Math.max(0, ref - monto);
    }
  }
  return Math.round(sum * 100) / 100;
}

/** Busca una fila enlazada en cualquiera de las dos tablas (p. ej. al cambiar Impl ↔ Mant). */
export function findLinkedFormaPago(data: F1Data, servicioId: string): FormaPago | undefined {
  return (
    data.formasPagoImplementacion.find(fp => fp.linkedServicioId === servicioId) ||
    data.formasPagoMantencion.find(fp => fp.linkedServicioId === servicioId)
  );
}

/** Busca fila enlazada en cualquier tabla de pagos (incluye hitos). */
export function findLinkedFormaPagoHitos(data: F1Data, servicioId: string): FormaPagoHitos | undefined {
  const hitos = data.formasPagoImplementacionHitos ?? [];
  return hitos.find(fp => fp.linkedServicioId === servicioId);
}

/** Primera creación de fila Implementación enlazada. */
function seedLinkedFormaPagoImpl(servicio: ServicioContratado, item: number): FormaPago {
  const cuotas = distributeTotalAcrossCuotas(servicio.total ?? 0, 1);
  return {
    id: nanoid(),
    item,
    linkedServicioId: servicio.id,
    linkedServicioTotal: servicio.total ?? 0,
    tipoVenta: servicio.tipoVenta,
    nCuotas: 1,
    cuotas,
  };
}

function buildLinkedRowImpl(
  servicio: ServicioContratado,
  existing: FormaPago | undefined,
  item: number,
): FormaPago {
  if (existing) {
    const servicioTotal = servicio.total ?? 0;
    const hasBaseline = typeof existing.linkedServicioTotal === "number";
    const totalChanged = hasBaseline && existing.linkedServicioTotal !== servicioTotal;
    const syncedCuotas = totalChanged
      ? distributeTotalAcrossCuotas(servicioTotal, existing.nCuotas || 1, existing.cuotas)
      : existing.cuotas;
    return {
      ...existing,
      item,
      linkedServicioId: servicio.id,
      linkedServicioTotal: servicioTotal,
      cuotas: syncedCuotas,
    };
  }
  return seedLinkedFormaPagoImpl(servicio, item);
}

function resetGraceMontos(cuotas: FormaPago["cuotas"], nGrace: number): FormaPago["cuotas"] {
  const out = [...cuotas];
  const n = Math.min(4, Math.max(1, nGrace));
  for (let i = 0; i < n; i++) {
    out[i] = { ...out[i], monto: 0 };
  }
  return out;
}

/** Primera creación de fila Mantención enlazada — montos en cero; referencia = precio unitario.
 * nCuotas arranca en 4 para mostrar siempre las 4 columnas de gracia al crear la fila. */
function seedLinkedFormaPagoMant(servicio: ServicioContratado, item: number): FormaPago {
  const pu = servicio.precioUnitario ?? 0;
  return {
    id: nanoid(),
    item,
    linkedServicioId: servicio.id,
    linkedServicioTotal: servicio.total ?? 0,
    linkedServicioPrecioUnitario: pu,
    tipoVenta: servicio.tipoVenta,
    nCuotas: 4,
    cuotas: createFourCuotasEmpty(),
  };
}

/**
 * Si el servicio pasó de Implementación a Mantención, `findLinkedFormaPago` sigue encontrando la misma fila
 * y aquí se preservan montos/fechas (coherente con el test de reconciliación). El usuario puede ajustar montos
 * a la lógica de gracia; si cambia el valor unitario del servicio, los montos de gracia se reinician.
 */
function buildLinkedRowMant(
  servicio: ServicioContratado,
  existing: FormaPago | undefined,
  item: number,
): FormaPago {
  if (existing) {
    const pu = servicio.precioUnitario ?? 0;
    const prevPu = existing.linkedServicioPrecioUnitario;
    const puChanged = typeof prevPu === "number" && prevPu !== pu;
    const nGrace = Math.min(4, Math.max(1, existing.nCuotas || 1));
    const cuotas = puChanged ? resetGraceMontos(existing.cuotas, nGrace) : existing.cuotas;
    return {
      ...existing,
      item,
      linkedServicioId: servicio.id,
      linkedServicioTotal: servicio.total ?? 0,
      linkedServicioPrecioUnitario: pu,
      cuotas,
    };
  }
  return seedLinkedFormaPagoMant(servicio, item);
}

/** Primera creación de fila por hitos para un servicio Implementación Hitos. */
function seedLinkedFormaPagoHitos(servicio: ServicioContratado, item: number): FormaPagoHitos {
  return {
    id: nanoid(),
    item,
    linkedServicioId: servicio.id,
    tipoVenta: servicio.tipoVenta,
    hitos: [],
  };
}

function buildLinkedRowHitos(
  servicio: ServicioContratado,
  existing: FormaPagoHitos | undefined,
  item: number,
): FormaPagoHitos {
  if (existing) {
    return {
      ...existing,
      item,
      linkedServicioId: servicio.id,
    };
  }
  return seedLinkedFormaPagoHitos(servicio, item);
}

export function reconcileFormasPagoDesdeServicios(
  data: F1Data,
): Pick<F1Data, "formasPagoImplementacion" | "formasPagoMantencion" | "formasPagoImplementacionHitos"> {
  const implServicios = data.serviciosContratados.filter(s => isTipoImplementacion(s.tipoVenta));
  const mantServicios = data.serviciosContratados.filter(s => isTipoMantencion(s.tipoVenta));
  const implHitosServicios = data.serviciosContratados.filter(s => isTipoImplementacionHitos(s.tipoVenta));
  const hitosActuales = data.formasPagoImplementacionHitos ?? [];

  const manualImpl = data.formasPagoImplementacion.filter(fp => !fp.linkedServicioId);
  const manualMant = data.formasPagoMantencion.filter(fp => !fp.linkedServicioId);
  const manualImplHitos = hitosActuales.filter(fp => !fp.linkedServicioId);

  const linkedImpl = implServicios.map((s, idx) => {
    const existing = findLinkedFormaPago(data, s.id);
    return buildLinkedRowImpl(s, existing, idx + 1);
  });

  const linkedMant = mantServicios.map((s, idx) => {
    const existing = findLinkedFormaPago(data, s.id);
    return buildLinkedRowMant(s, existing, idx + 1);
  });

  const linkedImplHitos = implHitosServicios.map((s, idx) => {
    const existing = findLinkedFormaPagoHitos(data, s.id);
    return buildLinkedRowHitos(s, existing, idx + 1);
  });

  return {
    formasPagoImplementacion: [...linkedImpl, ...manualImpl],
    formasPagoMantencion: [...linkedMant, ...manualMant],
    formasPagoImplementacionHitos: [...linkedImplHitos, ...manualImplHitos],
  };
}

/**
 * Una sola reconciliación: si no hay cambios respecto al estado actual, devuelve null.
 */
export function formasReconcilePatchOrNull(
  data: F1Data,
): Pick<F1Data, "formasPagoImplementacion" | "formasPagoMantencion" | "formasPagoImplementacionHitos"> | null {
  const rec = reconcileFormasPagoDesdeServicios(data);
  const hitosActuales = data.formasPagoImplementacionHitos ?? [];
  if (
    formasPagoListsEqual(rec.formasPagoImplementacion, data.formasPagoImplementacion) &&
    formasPagoListsEqual(rec.formasPagoMantencion, data.formasPagoMantencion) &&
    formasPagoHitosListsEqual(rec.formasPagoImplementacionHitos, hitosActuales)
  ) {
    return null;
  }
  return rec;
}
