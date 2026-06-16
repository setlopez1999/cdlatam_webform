import { z } from "zod";
import { publicProcedure, protectedProcedure, router } from "../_core/trpc";
import {
  ds_getClausulas,
  ds_getClausulaById,
  ds_getClausulasByUnidadNegocio,
  ds_getClausulasByUnidades,
  ds_createClausula,
  ds_updateClausula,
  ds_deleteClausula,
  ds_toggleClausulaStatus,
  ds_toggleSiempreIncluir,
  ds_getClausulasSiempreIncluir,
  ds_getUnidadesNegocioForSelect,
} from "../dataSource-clausulas";
import { requireRole } from "../rbac";
import { recordAuditFromTrpc } from "../audit/record";

export const clausulasRouter = router({
  // â”€â”€â”€ Queries â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  list: protectedProcedure.query(async ({ ctx }) => {
    await requireRole(ctx, "admin");
    return await ds_getClausulas();
  }),

  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      await requireRole(ctx, "admin");
      return await ds_getClausulaById(input.id);
    }),

  getByUnidadNegocio: protectedProcedure
    .input(z.object({ unidadNegocioId: z.number() }))
    .query(async ({ ctx, input }) => {
      await requireRole(ctx, "admin");
      return await ds_getClausulasByUnidadNegocio(input.unidadNegocioId);
    }),

  /**
   * Devuelve clÃ¡usulas activas para un conjunto de unidades de negocio.
   * Pensado para que F1 (export PDF) las anexe automÃ¡ticamente al final del
   * Acta. Es `protectedProcedure` (NO admin) porque cualquier usuario que
   * pueda ver F1 debe poder exportar su acta con clÃ¡usulas. Solo expone los
   * campos mÃ­nimos necesarios.
   */
  getByUnidades: protectedProcedure
    .input(z.object({ unidadNegocioIds: z.array(z.number().int()) }))
    .query(async ({ input }) => {
      const rows = await ds_getClausulasByUnidades(input.unidadNegocioIds);
      return rows.map((r) => ({
        id: r.id,
        valor: r.valor,
        filePath: r.filePath,
        fileName: r.fileName,
        unidadNegocioId: r.unidadNegocioId,
        tipo: r.tipo ?? undefined,
        ordenGlobal: r.ordenGlobal ?? undefined,
      }));
    }),

  /**
   * Devuelve clÃ¡usulas activas con siempre_incluir=1.
   * Cualquier usuario autenticado puede acceder (para adjuntar al Acta).
   */
  getSiempreIncluir: protectedProcedure.query(async () => {
    const rows = await ds_getClausulasSiempreIncluir();
    return rows.map((r) => ({
      id: r.id,
      valor: r.valor,
      filePath: r.filePath,
      fileName: r.fileName,
      tipo: r.tipo ?? undefined,
      ordenGlobal: r.ordenGlobal ?? undefined,
    }));
  }),

  getUnidadesNegocio: protectedProcedure.query(async ({ ctx }) => {
    await requireRole(ctx, "admin");
    return await ds_getUnidadesNegocioForSelect();
  }),

  // â”€â”€â”€ Mutations â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  create: protectedProcedure
    .input(z.object({
      valor: z.string().min(1),
      unidadNegocioId: z.number().optional().nullable(),
      filePath: z.string().min(1),
      fileName: z.string().min(1),
      fileSize: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      await requireRole(ctx, "admin");
      const rows = await ds_createClausula(input);
      const row = Array.isArray(rows) ? rows[0] : rows;
      if (row && typeof row === "object" && "id" in row) {
        await recordAuditFromTrpc(ctx, {
          action: "CREATE",
          entity: "catalog_clausulas",
          entityId: row.id as number,
          changes: { after: { valor: row.valor, fileName: row.fileName, filePath: row.filePath } },
        });
      }
      return rows;
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      valor: z.string().min(1).optional(),
      unidadNegocioId: z.number().optional().nullable(),
      activo: z.number().min(0).max(1).optional(),
      /** Tipo de documento: 'clausula' | 'features' | 'anexo_soporte' */
      tipo: z.enum(["clausula", "anexo_soporte"]).optional(),
      /** Orden de apariciÃ³n en el PDF final (editable) */
      ordenGlobal: z.number().int().min(1).max(999).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      await requireRole(ctx, "admin");
      const { id, ...data } = input;
      const updated = await ds_updateClausula(id, data);
      await recordAuditFromTrpc(ctx, {
        action: "UPDATE",
        entity: "catalog_clausulas",
        entityId: id,
        changes: { after: data },
      });
      return updated;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await requireRole(ctx, "admin");
      const prev = await ds_getClausulaById(input.id);
      const deleted = await ds_deleteClausula(input.id);
      if (prev) {
        await recordAuditFromTrpc(ctx, {
          action: "DELETE",
          entity: "catalog_clausulas",
          entityId: input.id,
          changes: { before: { valor: prev.valor, fileName: prev.fileName } },
        });
      }
      return deleted;
    }),

  toggleStatus: protectedProcedure
    .input(z.object({ id: z.number(), activo: z.number().min(0).max(1) }))
    .mutation(async ({ ctx, input }) => {
      await requireRole(ctx, "admin");
      const updated = await ds_toggleClausulaStatus(input.id, input.activo);
      await recordAuditFromTrpc(ctx, {
        action: "UPDATE",
        entity: "catalog_clausulas",
        entityId: input.id,
        changes: { after: { activo: input.activo } },
      });
      return updated;
    }),

  toggleSiempreIncluir: protectedProcedure
    .input(z.object({ id: z.number(), siempreIncluir: z.number().min(0).max(1) }))
    .mutation(async ({ ctx, input }) => {
      await requireRole(ctx, "admin");
      const updated = await ds_toggleSiempreIncluir(input.id, input.siempreIncluir);
      await recordAuditFromTrpc(ctx, {
        action: "UPDATE",
        entity: "catalog_clausulas",
        entityId: input.id,
        changes: { after: { siempreIncluir: input.siempreIncluir } },
      });
      return updated;
    }),
});

