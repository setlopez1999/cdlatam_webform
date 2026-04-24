import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";

// 1. IMPORTACIONES (actas/evaluaciones/búsqueda — siempre SQLite)
import {
  getActasByUserId, getActaById, createActa, updateActa, deleteActa,
  getEvaluacionesByUserId, getEvaluacionById, createEvaluacion, updateEvaluacion, deleteEvaluacion,
  searchRegistros,
  getUserRoles, getUserRoleNames, setUserRoles, assignRoleToUser, revokeRoleFromUser,
  getEmpleados, getEmpleadoById, createEmpleado, updateEmpleado, toggleEmpleadoStatus, deleteEmpleado,
  getContratosByEmpleado, getContratoActivoByEmpleado, createContrato, updateContrato,
  getBloquesByContrato, setBloques, getBloquesSemanales,
  // Expedientes y Audit Log
  createExpediente, getExpedientes, getExpedientesByUser, getExpedienteByUuid,
  updateExpediente, deleteExpediente, createAuditLog, getAuditLog,
} from "./db";

// dataSource — abstracción SQLite / API externa (controlado por USE_API en .env)
import {
  ds_getCatalogOptions,
  ds_getCatalogSummary,
  ds_searchCatalogs,
  ds_getCatalogList,
  ds_createCatalogRecord,
  ds_updateCatalogRecord,
  ds_deleteCatalogRecord,
  ds_bulkUpdateCatalogRecords,
  ds_bulkDeleteCatalogRecords,
  ds_getUsers,
  ds_findUserByUsername,
  ds_createUser,
  ds_toggleUserStatus,
  ds_updateUser,
  ds_updateUserCredentials,
  ds_findUserById,
  ds_getRoles,
  ds_createRole,
  ds_updateRole,
  ds_deleteRole,
  ds_getUsersByRoleId,
  // Catálogos dinámicos y meta — ahora también pasan por dataSource
  ds_listCatalogMeta,
  ds_createCatalogTable,
  ds_renameCatalogTable,
  ds_deleteCatalogTable,
  ds_getCatalogListGeneric,
  ds_createCatalogRecordGeneric,
  ds_updateCatalogRecordGeneric,
  ds_deleteCatalogRecordGeneric,
  ds_bulkDeleteCatalogRecordsGeneric,
  ds_allCounts,
} from "./dataSource";

// 2. IMPORTACIONES DE LOCALAUTH (Solo para cifrado/tokens, NO BD)
import {
  verifyPassword, signLocalJWT,
  LOCAL_AUTH_COOKIE, hashPassword,
} from "./localAuth";

// 3. RBAC — verificación de roles
import { requireRole, requireAnyRole } from "./rbac";
import { getSessionCookieOptions as getCookieOpts } from "./_core/cookies";

// ─── Zod Schemas ──────────────────────────────────────────────────────────────

const ServicioContratadoSchema = z.object({
  item: z.number(),
  unidadNegocio: z.string(),
  solucion: z.string(),
  detalleServicio: z.string(),
  tipoVenta: z.string(),
  valorUnitario: z.number().min(0),
  cantidad: z.number().min(0),
  total: z.number(),
  plazo: z.string(),
});

const CuotaPagoSchema = z.object({
  monto: z.number().min(0),
  fecha: z.string(),
});

const FormaPagoSchema = z.object({
  item: z.number(),
  tipoVenta: z.string(),
  nCuotas: z.number().min(1).max(36),
  primeraCuota: CuotaPagoSchema,
  segundaCuota: CuotaPagoSchema,
  terceraCuota: CuotaPagoSchema,
});

const FilaCostoSchema = z.object({
  id: z.string(),
  centroCosto: z.string(),
  valorNeto: z.number().min(0),
  tipoMoneda: z.string(),
  cantidad: z.number().min(0),
  totalNeto: z.number(),
  iva: z.number().min(0),
  total: z.number(),
  descripcionGasto: z.string(),
  observacion: z.string(),
});

const FilaRRHHSchema = z.object({
  id: z.string(),
  tipo: z.enum(["tecnico_interno", "especialista_externo", "supervisor"]),
  centroCosto: z.string(),
  valorSinImpuesto: z.number().min(0),
  tipoMoneda: z.string(),
  cantidad: z.number().min(0),
  totalNeto: z.number(),
  impuesto: z.number().min(0),
  total: z.number(),
  descripcionGasto: z.string(),
  observacion: z.string(),
});

const FilaOtrosSchema = z.object({
  id: z.string(),
  tipo: z.enum(["comision", "movilizacion", "viatico", "alojamiento", "varios"]),
  centroCosto: z.string(),
  valorNeto: z.number().min(0),
  tipoMoneda: z.string(),
  cantidad: z.number().min(0),
  totalNeto: z.number(),
  iva: z.number().min(0),
  total: z.number(),
  descripcionGasto: z.string(),
  observacion: z.string(),
  mes: z.union([z.literal(1), z.literal(2), z.literal(3)]),
});

const ActaInputSchema = z.object({
  noActa: z.string().optional(),
  atencion: z.string().optional(),
  fecha: z.string().optional(),
  razonSocial: z.string().optional(),
  nombreFantasia: z.string().optional(),
  rucDniRut: z.string().optional(),
  direccionComercial: z.string().optional(),
  representanteLegal: z.string().optional(),
  representanteDni: z.string().optional(),
  representanteEmail: z.string().email().optional().or(z.literal("")),
  representanteFono: z.string().optional(),
  contactoTecnico: z.string().optional(),
  contactoTecnicoEmail: z.string().email().optional().or(z.literal("")),
  contactoTecnicoFono: z.string().optional(),
  contactoFacturacion: z.string().optional(),
  contactoFacturacionEmail: z.string().email().optional().or(z.literal("")),
  contactoFacturacionFono: z.string().optional(),
  serviciosContratados: z.array(ServicioContratadoSchema).optional(),
  formasPagoImplementacion: z.array(FormaPagoSchema).optional(),
  formasPagoMantencion: z.array(FormaPagoSchema).optional(),
  status: z.enum(["borrador", "completado", "exportado"]).optional(),
});

const EvaluacionInputSchema = z.object({
  actaId: z.number().optional(),
  unidadNegocios: z.string().optional(),
  empresa: z.string().optional(),
  solucion: z.string().optional(),
  tipoMoneda: z.string().optional(),
  montoProyecto: z.number().min(0).optional(),
  tipoCambio: z.number().min(0).optional(),
  totalClp: z.number().optional(),
  descripcion: z.string().optional(),
  preventa: z.string().optional(),
  fechaEntrega: z.string().optional(),
  ejecutivoComercial: z.string().optional(),
  plazoImplementacion: z.string().optional(),
  propuestaNumero: z.string().optional(),
  paisImplementacion: z.string().optional(),
  rut: z.string().optional(),
  nombreCliente: z.string().optional(),
  hardware: z.array(FilaCostoSchema).optional(),
  materiales: z.array(FilaCostoSchema).optional(),
  rrhh: z.array(FilaRRHHSchema).optional(),
  otrosGastos: z.array(FilaOtrosSchema).optional(),
  totalHardware: z.number().optional(),
  totalMateriales: z.number().optional(),
  totalRrhh: z.number().optional(),
  totalOtros: z.number().optional(),
  totalGastos: z.number().optional(),
  status: z.enum(["borrador", "completado", "exportado"]).optional(),
});

// ─── Router ───────────────────────────────────────────────────────────────────
export const appRouter = router({
  system: systemRouter,

  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // ─── Autenticación Local ──────────────────────────────────────────────────
  localAuth: router({
    login: publicProcedure
      .input(z.object({
        username: z.string().min(1),
        password: z.string().min(1),
      }))
      .mutation(async ({ ctx, input }) => {
        const user = await ds_findUserByUsername(input.username);
        if (!user || user.isActive !== 1) {
          throw new Error("Usuario o contraseña incorrectos");
        }
        const valid = await verifyPassword(input.password, user.passwordHash);
        if (!valid) {
          throw new Error("Usuario o contraseña incorrectos");
        }
        const token = await signLocalJWT({
          id: user.id,
          username: user.username,
          displayName: user.displayName,
          role: user.role as "user" | "admin",
        });
        const cookieOpts = getCookieOpts(ctx.req);
        ctx.res.cookie(LOCAL_AUTH_COOKIE, token, {
          ...cookieOpts,
          maxAge: 8 * 60 * 60 * 1000,
        });
        return {
          success: true,
          user: {
            id: user.id,
            username: user.username,
            displayName: user.displayName,
            role: user.role,
          },
        };
      }),

    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOpts = getCookieOpts(ctx.req);
      ctx.res.clearCookie(LOCAL_AUTH_COOKIE, { ...cookieOpts, maxAge: -1 });
      return { success: true } as const;
    }),

    me: publicProcedure.query(({ ctx }) => {
      return ctx.localUser ?? null;
    }),

    listUsers: protectedProcedure.query(async ({ ctx }) => {
      await requireRole(ctx, "admin");
      return await ds_getUsers();
    }),

    createUser: protectedProcedure
      .input(z.object({
        username: z.string().min(3).max(64),
        password: z.string().min(4),
        displayName: z.string().optional(),
        role: z.enum(["user", "admin"]).default("user"),
        roleId: z.number().optional().nullable(),
      }))
      .mutation(async ({ ctx, input }) => {
        await requireRole(ctx, "admin");
        const existing = await ds_findUserByUsername(input.username);
        if (existing) throw new Error("El nombre de usuario ya existe");
        const passwordHash = await hashPassword(input.password);
        await ds_createUser({
          username: input.username,
          passwordHash,
          displayName: input.displayName,
          role: input.role,
          roleId: input.roleId ?? null,
        });
        return { success: true };
      }),

    updateUser: protectedProcedure
      .input(z.object({
        id: z.number(),
        displayName: z.string().optional(),
        roleId: z.number().nullable().optional(),
        role: z.enum(["user", "admin"]).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        await requireRole(ctx, "admin");
        const { id, ...data } = input;
        await ds_updateUser(id, data);
        return { success: true };
      }),

    toggleStatus: protectedProcedure
      .input(z.object({
        id: z.number(),
        isActive: z.number().min(0).max(1),
      }))
      .mutation(async ({ ctx, input }) => {
        await requireRole(ctx, "admin");
        await ds_toggleUserStatus(input.id, input.isActive);
        return { success: true };
      }),

    /**
     * Cambia la contraseña de un usuario.
     * - Admin: puede cambiar la de cualquier usuario sin verificar la actual.
     * - Usuario normal: solo puede cambiar la suya propia, debe proveer la contraseña actual.
     */
    changePassword: protectedProcedure
      .input(z.object({
        targetUserId: z.number().int().positive(),
        currentPassword: z.string().optional(), // requerido si no es admin
        newPassword: z.string().min(4, "La contraseña debe tener al menos 4 caracteres"),
        confirmPassword: z.string().min(4),
      }))
      .mutation(async ({ ctx, input }) => {
        const isAdmin = ctx.localUser?.role === "admin";
        const isSelf = Number(ctx.localUser?.id) === Number(input.targetUserId);

        // Solo admin puede cambiar la contraseña de otro usuario
        if (!isSelf && !isAdmin) {
          throw new Error("No tenés permiso para cambiar la contraseña de otro usuario");
        }

        // Validar que las contraseñas coincidan
        if (input.newPassword !== input.confirmPassword) {
          throw new Error("Las contraseñas no coinciden");
        }

        // Si no es admin cambiando a otro, verificar contraseña actual
        if (!isAdmin || isSelf) {
          if (!input.currentPassword) {
            throw new Error("Debés ingresar tu contraseña actual");
          }
          const target = await ds_findUserById(input.targetUserId);
          if (!target) throw new Error("Usuario no encontrado");
          const valid = await verifyPassword(input.currentPassword, target.passwordHash);
          if (!valid) throw new Error("La contraseña actual es incorrecta");
        }

        const passwordHash = await hashPassword(input.newPassword);
        await ds_updateUserCredentials(input.targetUserId, { passwordHash });
        return { success: true };
      }),

    /**
     * Cambia el username de un usuario.
     * - Admin: puede cambiar el de cualquier usuario.
     * - Usuario normal: solo puede cambiar el suyo propio.
     * Verifica que el nuevo username no esté ya en uso.
     */
    changeUsername: protectedProcedure
      .input(z.object({
        targetUserId: z.number().int().positive(),
        newUsername: z
          .string()
          .min(3, "El usuario debe tener al menos 3 caracteres")
          .max(64, "El usuario no puede superar 64 caracteres")
          .regex(/^[a-zA-Z0-9_.-]+$/, "Solo se permiten letras, números, puntos, guiones y guiones bajos"),
      }))
      .mutation(async ({ ctx, input }) => {
        const isAdmin = ctx.localUser?.role === "admin";
        const isSelf = Number(ctx.localUser?.id) === Number(input.targetUserId);

        // Solo admin puede cambiar el username de otro usuario
        if (!isSelf && !isAdmin) {
          throw new Error("No tenés permiso para cambiar el usuario de otra persona");
        }

        // Verificar que el nuevo username no esté en uso
        const existing = await ds_findUserByUsername(input.newUsername);
        if (existing && existing.id !== input.targetUserId) {
          throw new Error(`El nombre de usuario "${input.newUsername}" ya está en uso`);
        }

        await ds_updateUserCredentials(input.targetUserId, { username: input.newUsername });
        return { success: true };
      }),
  }),

  // ─── Roles ────────────────────────────────────────────────────────────────────
  roles: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      await requireRole(ctx, "admin");
      return await ds_getRoles();
    }),

    create: protectedProcedure
      .input(z.object({
        nombre: z.string().min(2).max(64),
        label: z.string().min(2).max(128),
        descripcion: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        await requireRole(ctx, "admin");
        const result = await ds_createRole(input);
        return result[0];
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        nombre: z.string().min(2).max(64).optional(),
        label: z.string().min(2).max(128).optional(),
        descripcion: z.string().optional(),
        activo: z.number().min(0).max(1).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        await requireRole(ctx, "admin");
        const { id, ...data } = input;
        await ds_updateRole(id, data);
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await requireRole(ctx, "admin");
        const affected = await ds_getUsersByRoleId(input.id);
        if (affected.length > 0) {
          return { success: false, affected, requiresConfirm: true };
        }
        await ds_deleteRole(input.id);
        return { success: true, affected: [] };
      }),

    deleteForce: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await requireRole(ctx, "admin");
        // Desasignar el rol de todos los usuarios antes de borrar
        await ds_updateUser(0, {});
        const affected = await ds_getUsersByRoleId(input.id);
        for (const u of affected) {
          await ds_updateUser(u.id, { roleId: null });
        }
        await ds_deleteRole(input.id);
        return { success: true };
      }),

    getUsersByRole: protectedProcedure
      .input(z.object({ roleId: z.number() }))
      .query(async ({ ctx, input }) => {
        await requireRole(ctx, "admin");
        return await ds_getUsersByRoleId(input.roleId);
      }),
  }),

  // ─── User Roles (RBAC N:N) ──────────────────────────────────────────────────────────────────────
  userRoles: router({
    /** Obtiene los roleIds asignados a un usuario (solo admin) */
    getByUser: protectedProcedure
      .input(z.object({ userId: z.number() }))
      .query(async ({ ctx, input }) => {
        await requireRole(ctx, "admin");
        return await getUserRoles(input.userId);
      }),

    /** Obtiene los nombres de roles del usuario autenticado (para el cliente) */
    myRoles: protectedProcedure.query(async ({ ctx }) => {
      return await getUserRoleNames(ctx.user.id);
    }),

    /** Reemplaza todos los roles de un usuario por un nuevo set */
    setRoles: protectedProcedure
      .input(z.object({ userId: z.number(), roleIds: z.array(z.number()) }))
      .mutation(async ({ ctx, input }) => {
        await requireRole(ctx, "admin");
        await setUserRoles(input.userId, input.roleIds);
        return { success: true };
      }),

    /** Asigna un rol a un usuario */
    assign: protectedProcedure
      .input(z.object({ userId: z.number(), roleId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await requireRole(ctx, "admin");
        await assignRoleToUser(input.userId, input.roleId);
        return { success: true };
      }),

    /** Revoca un rol de un usuario */
    revoke: protectedProcedure
      .input(z.object({ userId: z.number(), roleId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await requireRole(ctx, "admin");
        await revokeRoleFromUser(input.userId, input.roleId);
        return { success: true };
      }),
  }),

  // ─── Catálogos — opciones para comboboxes (fuente controlada por USE_API) ──
  catalogs: router({
    getAll: publicProcedure.query(async () => {
      return ds_getCatalogOptions();
    }),
  }),

  // ─── Actas (siempre SQLite) ───────────────────────────────────────────────
  actas: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return getActasByUserId(ctx.user.id);
    }),

    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        const acta = await getActaById(input.id);
        if (!acta || acta.userId !== ctx.user.id) throw new Error("Acta no encontrada");
        return acta;
      }),

    create: protectedProcedure
      .input(ActaInputSchema)
      .mutation(async ({ ctx, input }) => {
        const result = await createActa({
          userId: ctx.user.id,
          ...input,
          fecha: input.fecha ? new Date(input.fecha) : undefined,
          serviciosContratados: input.serviciosContratados ?? [],
          formasPagoImplementacion: input.formasPagoImplementacion ?? [],
          formasPagoMantencion: input.formasPagoMantencion ?? [],
        });
        return result;
      }),

    update: protectedProcedure
      .input(z.object({ id: z.number(), data: ActaInputSchema }))
      .mutation(async ({ ctx, input }) => {
        const acta = await getActaById(input.id);
        if (!acta || acta.userId !== ctx.user.id) throw new Error("Acta no encontrada");
        return updateActa(input.id, {
          ...input.data,
          fecha: input.data.fecha ? new Date(input.data.fecha) : undefined,
        });
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const acta = await getActaById(input.id);
        if (!acta || acta.userId !== ctx.user.id) throw new Error("Acta no encontrada");
        return deleteActa(input.id);
      }),
  }),

  // ─── Evaluaciones (siempre SQLite) ───────────────────────────────────────
  evaluaciones: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return getEvaluacionesByUserId(ctx.user.id);
    }),

    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        const ev = await getEvaluacionById(input.id);
        if (!ev || ev.userId !== ctx.user.id) throw new Error("Evaluación no encontrada");
        return ev;
      }),

    create: protectedProcedure
      .input(EvaluacionInputSchema)
      .mutation(async ({ ctx, input }) => {
        return createEvaluacion({
          userId: ctx.user.id,
          ...input,
          fechaEntrega: input.fechaEntrega ? new Date(input.fechaEntrega) : undefined,
          hardware: input.hardware ?? [],
          materiales: input.materiales ?? [],
          rrhh: input.rrhh ?? [],
          otrosGastos: input.otrosGastos ?? [],
          montoProyecto: input.montoProyecto,
          tipoCambio: input.tipoCambio,
          totalClp: input.totalClp,
          totalHardware: input.totalHardware,
          totalMateriales: input.totalMateriales,
          totalRrhh: input.totalRrhh,
          totalOtros: input.totalOtros,
          totalGastos: input.totalGastos,
        });
      }),

    update: protectedProcedure
      .input(z.object({ id: z.number(), data: EvaluacionInputSchema }))
      .mutation(async ({ ctx, input }) => {
        const ev = await getEvaluacionById(input.id);
        if (!ev || ev.userId !== ctx.user.id) throw new Error("Evaluación no encontrada");
        return updateEvaluacion(input.id, {
          ...input.data,
          fechaEntrega: input.data.fechaEntrega ? new Date(input.data.fechaEntrega) : undefined,
          montoProyecto: input.data.montoProyecto,
          tipoCambio: input.data.tipoCambio,
          totalClp: input.data.totalClp,
          totalHardware: input.data.totalHardware,
          totalMateriales: input.data.totalMateriales,
          totalRrhh: input.data.totalRrhh,
          totalOtros: input.data.totalOtros,
          totalGastos: input.data.totalGastos,
        });
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const ev = await getEvaluacionById(input.id);
        if (!ev || ev.userId !== ctx.user.id) throw new Error("Evaluación no encontrada");
        return deleteEvaluacion(input.id);
      }),
  }),

  // ─── Búsqueda global (siempre SQLite) ────────────────────────────────────
  search: router({
    global: protectedProcedure
      .input(z.object({ query: z.string().min(1) }))
      .query(async ({ ctx, input }) => {
        return searchRegistros(ctx.user.id, input.query);
      }),
  }),

  // ─── Catálogos CRUD (fuente controlada por USE_API) ──────────────────────
  catalogsDB: router({
    list: protectedProcedure
      .input(z.object({ tableName: z.string() }))
      .query(async ({ input }) => {
        return await ds_getCatalogList(input.tableName);
      }),

    create: protectedProcedure
      .input(z.object({ tableName: z.string(), data: z.any() }))
      .mutation(async ({ input }) => {
        return await ds_createCatalogRecord(input.tableName, input.data);
      }),

    update: protectedProcedure
      .input(z.object({ tableName: z.string(), id: z.number(), data: z.any() }))
      .mutation(async ({ input }) => {
        return await ds_updateCatalogRecord(input.tableName, input.id, input.data);
      }),

    delete: protectedProcedure
      .input(z.object({ tableName: z.string(), id: z.number() }))
      .mutation(async ({ input }) => {
        return await ds_deleteCatalogRecord(input.tableName, input.id);
      }),

    bulkUpdate: protectedProcedure
      .input(z.object({ tableName: z.string(), ids: z.array(z.number()), data: z.any() }))
      .mutation(async ({ input }) => {
        return await ds_bulkUpdateCatalogRecords(input.tableName, input.ids, input.data);
      }),

    bulkDelete: protectedProcedure
      .input(z.object({ tableName: z.string(), ids: z.array(z.number()) }))
      .mutation(async ({ input }) => {
        return await ds_bulkDeleteCatalogRecords(input.tableName, input.ids);
      }),

    summary: protectedProcedure.query(async () => {
      return ds_getCatalogSummary();
    }),

    search: protectedProcedure
      .input(z.object({ query: z.string(), catalog: z.string().optional() }))
      .query(async ({ input }) => {
        return ds_searchCatalogs(input.query);
      }),

    // ─── Gestión de tablas dinámicas ───
    listTables: protectedProcedure.query(async () => {
      return ds_listCatalogMeta();
    }),

    createTable: protectedProcedure
      .input(z.object({ tableName: z.string(), title: z.string() }))
      .mutation(async ({ input }) => {
        return ds_createCatalogTable(input.tableName, input.title);
      }),

    renameTable: protectedProcedure
      .input(z.object({ tableName: z.string(), newTitle: z.string() }))
      .mutation(async ({ input }) => {
        return ds_renameCatalogTable(input.tableName, input.newTitle);
      }),

    deleteTable: protectedProcedure
      .input(z.object({ tableName: z.string() }))
      .mutation(async ({ input }) => {
        return ds_deleteCatalogTable(input.tableName);
      }),

    // CRUD genérico que soporta tablas fijas y dinámicas
    listGeneric: protectedProcedure
      .input(z.object({ tableName: z.string() }))
      .query(async ({ input }) => {
        return ds_getCatalogListGeneric(input.tableName);
      }),

    createGeneric: protectedProcedure
      .input(z.object({ tableName: z.string(), data: z.any() }))
      .mutation(async ({ input }) => {
        return ds_createCatalogRecordGeneric(input.tableName, input.data);
      }),

    updateGeneric: protectedProcedure
      .input(z.object({ tableName: z.string(), id: z.number(), data: z.any() }))
      .mutation(async ({ input }) => {
        return ds_updateCatalogRecordGeneric(input.tableName, input.id, input.data);
      }),

    deleteGeneric: protectedProcedure
      .input(z.object({ tableName: z.string(), id: z.number() }))
      .mutation(async ({ input }) => {
        return ds_deleteCatalogRecordGeneric(input.tableName, input.id);
      }),

    bulkDeleteGeneric: protectedProcedure
      .input(z.object({ tableName: z.string(), ids: z.array(z.number()) }))
      .mutation(async ({ input }) => {
        return ds_bulkDeleteCatalogRecordsGeneric(input.tableName, input.ids);
      }),

    // Conteo de registros activos para todas las tablas (fijas + dinámicas)
    allCounts: protectedProcedure.query(async () => {
      return ds_allCounts();
    }),
  }),

  // ─── Gestor de Horarios ──────────────────────────────────────────────────
  horario: router({
    // Empleados
    listEmpleados: protectedProcedure.query(async ({ ctx }) => {
      await requireAnyRole(ctx, ["admin", "gestor_horarios"]);
      return getEmpleados();
    }),

    getEmpleado: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        await requireAnyRole(ctx, ["admin", "gestor_horarios"]);
        return getEmpleadoById(input.id);
      }),

    createEmpleado: protectedProcedure
      .input(z.object({
        nombre: z.string().min(1).max(100),
        apellido: z.string().min(1).max(100),
        cargo: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        await requireAnyRole(ctx, ["admin", "gestor_horarios"]);
        return createEmpleado(input);
      }),

    updateEmpleado: protectedProcedure
      .input(z.object({
        id: z.number(),
        nombre: z.string().min(1).max(100).optional(),
        apellido: z.string().min(1).max(100).optional(),
        cargo: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        await requireAnyRole(ctx, ["admin", "gestor_horarios"]);
        const { id, ...data } = input;
        await updateEmpleado(id, data);
        return { success: true };
      }),

    toggleEmpleado: protectedProcedure
      .input(z.object({ id: z.number(), activo: z.number().min(0).max(1) }))
      .mutation(async ({ ctx, input }) => {
        await requireAnyRole(ctx, ["admin", "gestor_horarios"]);
        await toggleEmpleadoStatus(input.id, input.activo);
        return { success: true };
      }),

    deleteEmpleado: protectedProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => {
        await requireAnyRole(ctx, ["admin", "gestor_horarios"]);
        await deleteEmpleado(input.id);
        return { success: true };
      }),

    // Contratos
    getContratos: protectedProcedure
      .input(z.object({ empleadoId: z.number() }))
      .query(async ({ ctx, input }) => {
        await requireAnyRole(ctx, ["admin", "gestor_horarios"]);
        return getContratosByEmpleado(input.empleadoId);
      }),

    getContratoActivo: protectedProcedure
      .input(z.object({ empleadoId: z.number() }))
      .query(async ({ ctx, input }) => {
        await requireAnyRole(ctx, ["admin", "gestor_horarios"]);
        return getContratoActivoByEmpleado(input.empleadoId) ?? null;
      }),

    createContrato: protectedProcedure
      .input(z.object({
        empleadoId: z.number(),
        fechaInicio: z.string(),
        fechaFin: z.string().optional().nullable(),
        horasDiarias: z.number().min(0.5).max(24),
        diasSemana: z.string(),
        tipoDistribucion: z.enum(["normal", "lun_sab", "personalizado"]).default("normal"),
        mismasHorasDiarias: z.number().min(0).max(1).default(1),
      }))
      .mutation(async ({ ctx, input }) => {
        await requireAnyRole(ctx, ["admin", "gestor_horarios"]);
        return createContrato(input);
      }),

    updateContrato: protectedProcedure
      .input(z.object({
        id: z.number(),
        fechaInicio: z.string().optional(),
        fechaFin: z.string().optional().nullable(),
        horasDiarias: z.number().min(0.5).max(24).optional(),
        diasSemana: z.string().optional(),
        tipoDistribucion: z.enum(["normal", "lun_sab", "personalizado"]).optional(),
        mismasHorasDiarias: z.number().min(0).max(1).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        await requireAnyRole(ctx, ["admin", "gestor_horarios"]);
        const { id, ...data } = input;
        await updateContrato(id, data);
        return { success: true };
      }),

    // Bloques de horario
    getBloques: protectedProcedure
      .input(z.object({ contratoId: z.number() }))
      .query(async ({ ctx, input }) => {
        await requireAnyRole(ctx, ["admin", "gestor_horarios"]);
        return getBloquesByContrato(input.contratoId);
      }),

    setBloques: protectedProcedure
      .input(z.object({
        contratoId: z.number(),
        bloques: z.array(z.object({
          diaSemana: z.number().min(0).max(6),
          horaInicio: z.string().regex(/^\d{2}:\d{2}$/),
          horaFin: z.string().regex(/^\d{2}:\d{2}$/),
        })),
      }))
      .mutation(async ({ ctx, input }) => {
        await requireAnyRole(ctx, ["admin", "gestor_horarios"]);
        await setBloques(input.contratoId, input.bloques);
        return { success: true };
      }),

    // Vista semanal general
    bloquesSemanales: protectedProcedure.query(async ({ ctx }) => {
      await requireAnyRole(ctx, ["admin", "gestor_horarios"]);
      return getBloquesSemanales();
    }),
  }),

  // ─── Dashboard Stats (siempre SQLite) ────────────────────────────────────
  dashboard: router({
    stats: protectedProcedure.query(async ({ ctx }) => {
      const [userActas, userEvaluaciones] = await Promise.all([
        getActasByUserId(ctx.user.id),
        getEvaluacionesByUserId(ctx.user.id),
      ]);

      return {
        totalActas: userActas.length,
        actasBorrador: userActas.filter(a => a.status === "borrador").length,
        actasCompletadas: userActas.filter(a => a.status === "completado").length,
        actasExportadas: userActas.filter(a => a.status === "exportado").length,
        totalEvaluaciones: userEvaluaciones.length,
        evaluacionesBorrador: userEvaluaciones.filter(e => e.status === "borrador").length,
        evaluacionesCompletadas: userEvaluaciones.filter(e => e.status === "completado").length,
        evaluacionesExportadas: userEvaluaciones.filter(e => e.status === "exportado").length,
        ultimasActas: userActas.slice(0, 5),
        ultimasEvaluaciones: userEvaluaciones.slice(0, 5),
      };
    }),
  }),

  // ─── Sub-router: expediente ──────────────────────────────────────────────────
  // Maneja solo metadata del expediente en BD.
  // Los datos de formulario (F1/F2) siguen en localStorage via Zustand.
  // Ver doc/pendiente-integridad-expedientes.md para la migración futura.
  expediente: router({
    /** Crea o recupera un expediente en BD a partir de su uuid (nanoid de Zustand). */
    sync: protectedProcedure
      .input(z.object({
        uuid: z.string().min(1),
        nombre: z.string().min(1),
      }))
      .mutation(async ({ ctx, input }) => {
        const userId = Number(ctx.localUser?.id);
        // Si ya existe en BD, devolver el existente
        const existing = await getExpedienteByUuid(input.uuid);
        if (existing) return existing;
        // Si no existe, crear
        const created = await createExpediente({
          uuid: input.uuid,
          nombre: input.nombre,
          creadorId: userId,
        });
        await createAuditLog({
          userId,
          username: ctx.localUser?.username ?? "desconocido",
          action: "CREATE",
          entity: "expediente",
          entityId: created.id,
          changes: { after: { uuid: input.uuid, nombre: input.nombre } },
        });
        return created;
      }),

    /** Lista expedientes. Admin/manager ven todos; el resto solo los propios. */
    listar: protectedProcedure.query(async ({ ctx }) => {
      const userId = Number(ctx.localUser?.id);
      const role = ctx.localUser?.role;
      const canViewAll = role === "admin" || role === "manager";
      return canViewAll ? await getExpedientes() : await getExpedientesByUser(userId);
    }),

    /** Renombra un expediente. Solo el creador o admin. */
    renombrar: protectedProcedure
      .input(z.object({
        id: z.number(),
        nombre: z.string().min(1),
      }))
      .mutation(async ({ ctx, input }) => {
        const userId = Number(ctx.localUser?.id);
        const role = ctx.localUser?.role;
        const expediente = await getExpedienteByUuid(""); // placeholder
        // Actualizar directamente — la validación de propietario se hará en la siguiente fase
        const updated = await updateExpediente(input.id, { nombre: input.nombre });
        await createAuditLog({
          userId,
          username: ctx.localUser?.username ?? "desconocido",
          action: "UPDATE",
          entity: "expediente",
          entityId: input.id,
          changes: { after: { nombre: input.nombre } },
        });
        return updated;
      }),

    /** Elimina un expediente. Solo el creador o admin. */
    eliminar: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const userId = Number(ctx.localUser?.id);
        const role = ctx.localUser?.role;
        await deleteExpediente(input.id);
        await createAuditLog({
          userId,
          username: ctx.localUser?.username ?? "desconocido",
          action: "DELETE",
          entity: "expediente",
          entityId: input.id,
        });
        return { success: true };
      }),

    /** Obtiene el audit log. Solo admin y manager. */
    auditLog: protectedProcedure
      .input(z.object({ limit: z.number().min(1).max(1000).default(200) }))
      .query(async ({ ctx, input }) => {
        await requireAnyRole(ctx, ["admin", "manager"]);
        return await getAuditLog(input.limit);
      }),
  }),
});

export type AppRouter = typeof appRouter;
