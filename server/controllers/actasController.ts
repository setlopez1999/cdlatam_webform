/**
 * server/controllers/actasController.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Lógica de negocio para el módulo de Actas (Formulario 1).
 *
 * Separación de responsabilidades:
 *   routes/routers.ts → validación de input, autenticación (tRPC procedures)
 *   controllers/      → lógica de negocio, transformaciones de datos
 *   db.ts             → helpers de queries a la base de datos
 *
 * TODO: Conectar con API de Base de Datos externa aquí si se migra a microservicios.
 */

import { getDb } from "../db";
import { actas } from "../../drizzle/schema";
import { eq, like, desc } from "drizzle-orm";
import type { InsertActa } from "../../drizzle/schema";

export type ActaStatus = "borrador" | "completado" | "exportado";

export interface CreateActaInput {
  userId: number;
  noActa?: string;
  atencion?: string;
  fecha?: Date;
  razonSocial?: string;
  nombreFantasia?: string;
  rucDniRut?: string;
  direccionComercial?: string;
  representanteLegal?: string;
  representanteDni?: string;
  representanteEmail?: string;
  representanteFono?: string;
  contactoTecnico?: string;
  contactoTecnicoEmail?: string;
  contactoTecnicoFono?: string;
  contactoFacturacion?: string;
  contactoFacturacionEmail?: string;
  contactoFacturacionFono?: string;
  serviciosContratados?: unknown;
  formasPagoImplementacion?: unknown;
  formasPagoMantencion?: unknown;
  status?: ActaStatus;
}

export interface ListActasFilter {
  userId?: number;
  search?: string;
  status?: string;
  isAdmin?: boolean;
}

/**
 * Crea una nueva Acta en la base de datos.
 * TODO: Conectar con API de Base de Datos aquí
 */
export async function createActa(input: CreateActaInput) {
  const db = await getDb();
  if (!db) throw new Error("Base de datos no disponible");

  const values: InsertActa = {
    userId: input.userId,
    noActa: input.noActa,
    atencion: input.atencion,
    fecha: input.fecha,
    razonSocial: input.razonSocial,
    nombreFantasia: input.nombreFantasia,
    rucDniRut: input.rucDniRut,
    direccionComercial: input.direccionComercial,
    representanteLegal: input.representanteLegal,
    representanteDni: input.representanteDni,
    representanteEmail: input.representanteEmail,
    representanteFono: input.representanteFono,
    contactoTecnico: input.contactoTecnico,
    contactoTecnicoEmail: input.contactoTecnicoEmail,
    contactoTecnicoFono: input.contactoTecnicoFono,
    contactoFacturacion: input.contactoFacturacion,
    contactoFacturacionEmail: input.contactoFacturacionEmail,
    contactoFacturacionFono: input.contactoFacturacionFono,
    serviciosContratados: input.serviciosContratados,
    formasPagoImplementacion: input.formasPagoImplementacion,
    formasPagoMantencion: input.formasPagoMantencion,
    status: input.status ?? "borrador",
  };

  const [result] = await db.insert(actas).values(values);
  return result;
}

/**
 * Lista Actas con filtros opcionales.
 * Admin ve todas; usuario regular solo ve las propias.
 * TODO: Conectar con API de Base de Datos aquí
 */
export async function listActas(filter: ListActasFilter) {
  const db = await getDb();
  if (!db) throw new Error("Base de datos no disponible");

  const baseQuery = db.select().from(actas);

  // Control de acceso: usuario normal solo ve sus propias actas
  if (!filter.isAdmin && filter.userId) {
    return baseQuery
      .where(eq(actas.userId, filter.userId))
      .orderBy(desc(actas.createdAt));
  }

  // Búsqueda por texto (solo admin)
  if (filter.search) {
    const q = `%${filter.search}%`;
    return baseQuery
      .where(like(actas.razonSocial, q))
      .orderBy(desc(actas.createdAt));
  }

  return baseQuery.orderBy(desc(actas.createdAt));
}

/**
 * Obtiene una Acta por ID con verificación de acceso.
 */
export async function getActaById(id: number, userId: number, isAdmin: boolean) {
  const db = await getDb();
  if (!db) throw new Error("Base de datos no disponible");

  const [acta] = await db.select().from(actas).where(eq(actas.id, id)).limit(1);
  if (!acta) throw new Error("Acta no encontrada");

  if (!isAdmin && acta.userId !== userId) {
    throw new Error("Sin permisos para ver esta Acta");
  }

  return acta;
}

/**
 * Actualiza el estado de un Acta.
 */
export async function updateActaStatus(
  id: number,
  status: ActaStatus,
  userId: number,
  isAdmin: boolean
) {
  const db = await getDb();
  if (!db) throw new Error("Base de datos no disponible");

  await getActaById(id, userId, isAdmin);
  await db.update(actas).set({ status }).where(eq(actas.id, id));
  return { success: true };
}

/**
 * Elimina un Acta. Solo admin puede eliminar.
 */
export async function deleteActaById(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Base de datos no disponible");

  await db.delete(actas).where(eq(actas.id, id));
  return { success: true };
}
