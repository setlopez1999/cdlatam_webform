import { z } from "zod";
import { publicProcedure, protectedProcedure, router } from "../_core/trpc";
import {
  ds_getClausulas,
  ds_getClausulaById,
  ds_getClausulasBySolucion,
  ds_createClausula,
  ds_updateClausula,
  ds_deleteClausula,
  ds_toggleClausulaStatus,
  ds_getSolucionesForSelect,
} from "../dataSource-clausulas";
import { requireRole } from "../rbac";

export const clausulasRouter = router({
  // ─── Queries ───────────────────────────────────────────────────────
  list: protectedProcedure.query(async () => {
    return await ds_getClausulas();
  }),

  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      return await ds_getClausulaById(input.id);
    }),

  getBySolucion: protectedProcedure
    .input(z.object({ solucionId: z.number() }))
    .query(async ({ input }) => {
      return await ds_getClausulasBySolucion(input.solucionId);
    }),

  getSoluciones: protectedProcedure.query(async () => {
    return await ds_getSolucionesForSelect();
  }),

  // ─── Mutations ──────────────────────────────────────────────────────
  create: protectedProcedure
    .input(z.object({
      valor: z.string().min(1),
      solucionId: z.number().optional().nullable(),
      filePath: z.string().min(1),
      fileName: z.string().min(1),
      fileSize: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      await requireRole(ctx, "admin");
      return await ds_createClausula(input);
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      valor: z.string().min(1).optional(),
      solucionId: z.number().optional().nullable(),
      activo: z.number().min(0).max(1).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      await requireRole(ctx, "admin");
      const { id, ...data } = input;
      return await ds_updateClausula(id, data);
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await requireRole(ctx, "admin");
      return await ds_deleteClausula(input.id);
    }),

  toggleStatus: protectedProcedure
    .input(z.object({ id: z.number(), activo: z.number().min(0).max(1) }))
    .mutation(async ({ ctx, input }) => {
      await requireRole(ctx, "admin");
      return await ds_toggleClausulaStatus(input.id, input.activo);
    }),
});
