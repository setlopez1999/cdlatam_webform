/**
 * server/controllers/evaluacionesController.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Lógica de negocio para Evaluaciones de Proyecto (Formulario 2)
 * y cálculo automático del Resultado (Formulario 3).
 *
 * TODO: Conectar con API de Base de Datos aquí si se migra a microservicios.
 */

import { getDb } from "../db";
import { evaluaciones } from "../../drizzle/schema";
import { eq, like, desc } from "drizzle-orm";
import type { InsertEvaluacion } from "../../drizzle/schema";

// ─── Constantes de negocio ────────────────────────────────────────────────────
const DISTRIBUCION_GIM = 0.10;  // 10%
const DISTRIBUCION_GP  = 0.90;  // 90%
const TASA_IMPUESTO    = 0.19;  // 19% IVA/impuesto

export type EvaluacionStatus = "borrador" | "completado" | "exportado";

export interface CreateEvaluacionInput {
  userId: number;
  actaId?: number;
  unidadNegocios?: string;
  empresa?: string;
  solucion?: string;
  tipoMoneda?: string;
  montoProyecto?: number;
  plazoImplementacion?: string;
  paisImplementacion?: string;
  nombreCliente?: string;
  hardware?: unknown;
  materiales?: unknown;
  rrhh?: unknown;
  otrosGastos?: unknown;
  totalHardware?: number;
  totalMateriales?: number;
  totalRrhh?: number;
  totalOtros?: number;
  totalGastos?: number;
  status?: EvaluacionStatus;
}

export interface ResultadoCalculado {
  totalHardware: number;
  totalMateriales: number;
  totalRRHH: number;
  totalOtros: number;
  totalGastos: number;
  ingreso: number;
  resultado: number;
  distribucionGIM: number;
  distribucionGP: number;
  facturacionBruto: number;
  facturacionImpuesto: number;
  facturacionNeto: number;
  margenPorcentaje: number;
}

/**
 * Calcula el Resultado (Formulario 3) a partir de los datos del EP (Formulario 2).
 * Esta función es el núcleo del auto-fill entre F2 → F3.
 *
 * Lógica de cálculo:
 *   - totalGastos = hardware + materiales + rrhh + otros
 *   - resultado = ingreso (montoProyecto) - totalGastos
 *   - distribucionGIM = resultado * 10%
 *   - distribucionGP  = resultado * 90%
 *   - facturacionBruto = resultado
 *   - facturacionImpuesto = bruto * 19%
 *   - facturacionNeto = bruto - impuesto
 */
export function calcularResultado(
  montoProyecto: number,
  totalHardware: number,
  totalMateriales: number,
  totalRRHH: number,
  totalOtros: number
): ResultadoCalculado {
  const totalGastos = totalHardware + totalMateriales + totalRRHH + totalOtros;
  const ingreso = montoProyecto;
  const resultado = ingreso - totalGastos;
  const distribucionGIM = resultado * DISTRIBUCION_GIM;
  const distribucionGP  = resultado * DISTRIBUCION_GP;
  const facturacionBruto = resultado;
  const facturacionImpuesto = facturacionBruto * TASA_IMPUESTO;
  const facturacionNeto = facturacionBruto - facturacionImpuesto;
  const margenPorcentaje = ingreso > 0 ? (resultado / ingreso) * 100 : 0;

  return {
    totalHardware,
    totalMateriales,
    totalRRHH,
    totalOtros,
    totalGastos,
    ingreso,
    resultado,
    distribucionGIM,
    distribucionGP,
    facturacionBruto,
    facturacionImpuesto,
    facturacionNeto,
    margenPorcentaje,
  };
}

/**
 * Crea una nueva Evaluación de Proyecto en la base de datos.
 * TODO: Conectar con API de Base de Datos aquí
 */
export async function createEvaluacion(input: CreateEvaluacionInput) {
  const db = await getDb();
  if (!db) throw new Error("Base de datos no disponible");

  const values: InsertEvaluacion = {
    userId: input.userId,
    actaId: input.actaId,
    unidadNegocios: input.unidadNegocios,
    empresa: input.empresa,
    solucion: input.solucion,
    tipoMoneda: input.tipoMoneda,
    montoProyecto: input.montoProyecto?.toString(),
    plazoImplementacion: input.plazoImplementacion,
    paisImplementacion: input.paisImplementacion,
    nombreCliente: input.nombreCliente,
    hardware: input.hardware,
    materiales: input.materiales,
    rrhh: input.rrhh,
    otrosGastos: input.otrosGastos,
    totalHardware: input.totalHardware?.toString(),
    totalMateriales: input.totalMateriales?.toString(),
    totalRrhh: input.totalRrhh?.toString(),
    totalOtros: input.totalOtros?.toString(),
    totalGastos: input.totalGastos?.toString(),
    status: input.status ?? "borrador",
  };

  const [result] = await db.insert(evaluaciones).values(values);
  return result;
}

/**
 * Lista Evaluaciones con control de acceso por rol.
 * Admin ve todas; usuario regular solo ve las propias.
 * TODO: Conectar con API de Base de Datos aquí
 */
export async function listEvaluaciones(filter: {
  userId?: number;
  search?: string;
  isAdmin?: boolean;
}) {
  const db = await getDb();
  if (!db) throw new Error("Base de datos no disponible");

  const baseQuery = db.select().from(evaluaciones);

  if (!filter.isAdmin && filter.userId) {
    return baseQuery
      .where(eq(evaluaciones.userId, filter.userId))
      .orderBy(desc(evaluaciones.createdAt));
  }

  if (filter.search) {
    const q = `%${filter.search}%`;
    return baseQuery
      .where(like(evaluaciones.nombreCliente, q))
      .orderBy(desc(evaluaciones.createdAt));
  }

  return baseQuery.orderBy(desc(evaluaciones.createdAt));
}

/**
 * Obtiene una Evaluación por ID con verificación de acceso.
 */
export async function getEvaluacionById(id: number, userId: number, isAdmin: boolean) {
  const db = await getDb();
  if (!db) throw new Error("Base de datos no disponible");

  const [ev] = await db.select().from(evaluaciones).where(eq(evaluaciones.id, id)).limit(1);
  if (!ev) throw new Error("Evaluación no encontrada");

  if (!isAdmin && ev.userId !== userId) {
    throw new Error("Sin permisos para ver esta Evaluación");
  }

  return ev;
}

/**
 * Elimina una Evaluación. Solo admin puede eliminar.
 */
export async function deleteEvaluacionById(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Base de datos no disponible");

  await db.delete(evaluaciones).where(eq(evaluaciones.id, id));
  return { success: true };
}
