import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { COOKIE_NAME } from "@shared/const";
import { mergeImplementacionFromCatalog } from "@shared/implementacionChecklist";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { clausulasRouter } from "./routers/clausulas";
import { buildActaCodigo } from "./documentCodes";
import { mayAccessAllExpedientes } from "./expedienteAccess";

// 1. IMPORTACIONES (actas/evaluaciones/búsqueda — siempre SQLite)
import {
  getActasByUserId, getActaById, createActa, updateActa, deleteActa,
  getEvaluacionesByUserId, getEvaluacionById, createEvaluacion, updateEvaluacion, deleteEvaluacion,
  searchRegistros,
  getUserRoles, getUserRoleNames, setUserRoles, assignRoleToUser, revokeRoleFromUser,
  toggleHorariosEasterEgg,
  getEmpleados, getEmpleadoById, createEmpleado, updateEmpleado, toggleEmpleadoStatus, deleteEmpleado,
  getContratosByEmpleado, getContratoActivoByEmpleado, createContrato, updateContrato,
  getBloquesByContrato, setBloques, getBloquesSemanales,
  // Expedientes y Audit Log
  getExpedientesByUser, getExpedienteById,
  updateExpediente, getAuditLog, getAuditLogFiltered,
  crearExpedienteConActa,
  // Actas por expediente
  getActaByExpedienteId,
  getEvaluacionByExpedienteId,
  upsertResultadoExpediente,
  deleteExpedienteCascadeById,
  moverExpedienteAPapelera,
  restaurarExpedienteDePapelera,
  getExpedientesEnPapelera,
  listExpedientesResumen,
  listExpedientesResumenGlobal,
  getExpedienteDetalle,
  getExpedienteDetalleGlobal,
  listImplementacionesByExpedienteId,
  upsertImplementacionCheck,
  listImplementacionCatalogActivos,
  getSqliteDbPath,
  getRawDb,
  isActiveImplementacionCatalogKey,
  findUserById,
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
  ds_deleteUser,
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
  verifyPassword, signLocalJWT, verifyLocalJWT,
  LOCAL_AUTH_COOKIE, hashPassword,
} from "./localAuth";
import { recordAuditFromTrpc, recordAuditDirect, getClientIp } from "./audit/record";

// 3. RBAC — verificación de roles
import { requireRole, requireAnyRole } from "./rbac";
import { getSessionCookieOptions as getCookieOpts } from "./_core/cookies";

// ─── Zod Schemas ──────────────────────────────────────────────────────────────

const ServicioContratadoSchema = z.object({
  // Campos del frontend (store de Zustand)
  id: z.string().optional(),           // nanoid del frontend
  item: z.number().optional(),         // número de ítem (backend legacy)
  unidadNegocio: z.string(),
  solucion: z.string(),
  detalleServicio: z.string(),
  tipoVenta: z.string(),
  moneda: z.string().optional(),       // campo del frontend
  precioUnitario: z.number().min(0).optional(),  // campo del frontend
  valorUnitario: z.number().min(0).optional(),   // campo legacy del backend
  cantidad: z.number().min(0),
  total: z.number(),
  plazo: z.string(),
});

const CuotaPagoSchema = z.object({
  monto: z.number().min(0),
  fecha: z.string(),
});

const FormaPagoSchema = z.object({
  id: z.string().optional(),   // nanoid del frontend
  item: z.number().optional(), // número de ítem (backend legacy)
  linkedServicioId: z.string().optional(),
  linkedServicioTotal: z.number().optional(),
  tipoVenta: z.string(),
  nCuotas: z.number().min(1).max(36),
  cuotas: z.array(CuotaPagoSchema),
});

const HitoPagoSchema = z.object({
  id: z.string().optional(),
  nombreHito: z.string(),
  precioHito: z.number().min(0),
  condicion: z.string(),
});

const FormaPagoHitosSchema = z.object({
  id: z.string().optional(),
  item: z.number().optional(),
  linkedServicioId: z.string().optional(),
  tipoVenta: z.string(),
  hitos: z.array(HitoPagoSchema),
});

const CuotaSchema = z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]);

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
  cuota: CuotaSchema.optional(),
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
  cuota: CuotaSchema.optional(),
}).passthrough();

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
  mes: CuotaSchema,
}).passthrough();

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
  formasPagoImplementacionHitos: z.array(FormaPagoHitosSchema).optional(),
  status: z.enum(["borrador", "completado", "exportado"]).optional(),
  /** Snapshot completo F1Data (JSON) */
  f1Datos: z.any().optional(),
  f1FormStatus: z.enum(["nuevo", "sin_guardar", "guardado"]).optional(),
  f1SavedAt: z.string().optional(),
});

const EvaluacionInputSchema = z.object({
  expedienteId: z.number().optional(),
  unidadNegocios: z.string().optional(),
  empresa: z.string().optional(),
  centroCostoHeader: z.string().optional(),
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
  nombreFantasia: z.string().optional(),
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
  firmaImagen: z.string().optional(),
});

// ─── Router ───────────────────────────────────────────────────────────────────
export const appRouter = router({
  system: systemRouter,

  /** Auditoría: listado filtrado (solo admin). */
  audit: router({
    list: protectedProcedure
      .input(z.object({
        fromSec: z.number().optional(),
        toSec: z.number().optional(),
        actions: z.array(z.string()).optional(),
        entities: z.array(z.string()).optional(),
        userId: z.number().optional(),
        usernameContains: z.string().optional(),
        expedienteId: z.number().optional(),
        limit: z.number().min(1).max(500).default(100),
        cursor: z.object({
          id: z.number(),
          createdAtSec: z.number(),
        }).optional(),
      }))
      .query(async ({ ctx, input }) => {
        await requireAnyRole(ctx, ["admin"]);
        const cursor = input.cursor
          ? {
              id: input.cursor.id,
              createdAt: new Date(input.cursor.createdAtSec * 1000),
            }
          : undefined;
        return getAuditLogFiltered({
          from: input.fromSec != null ? new Date(input.fromSec * 1000) : undefined,
          to: input.toSec != null ? new Date(input.toSec * 1000) : undefined,
          actions: input.actions,
          entities: input.entities,
          userId: input.userId,
          usernameContains: input.usernameContains,
          expedienteId: input.expedienteId,
          limit: input.limit,
          cursor,
        });
      }),
  }),

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
        const ip = getClientIp(ctx.req);
        const user = await ds_findUserByUsername(input.username);
        if (!user || user.isActive !== 1) {
          await recordAuditDirect({
            username: input.username,
            userId: null,
            action: "LOGIN_FAILED",
            entity: "auth",
            ip,
            changes: { after: { reason: "user_or_inactive" } },
          });
          throw new Error("Usuario o contraseña incorrectos");
        }
        const valid = await verifyPassword(input.password, user.passwordHash);
        if (!valid) {
          await recordAuditDirect({
            username: user.username,
            userId: user.id,
            action: "LOGIN_FAILED",
            entity: "auth",
            ip,
            changes: { after: { reason: "bad_password" } },
          });
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
        await recordAuditDirect({
          username: user.username,
          userId: user.id,
          action: "LOGIN",
          entity: "auth",
          ip,
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

    logout: publicProcedure.mutation(async ({ ctx }) => {
      const cookieOpts = getCookieOpts(ctx.req);
      const cookieHeader = ctx.req.headers.cookie ?? "";
      const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${LOCAL_AUTH_COOKIE}=([^;]+)`));
      const token = match ? decodeURIComponent(match[1]) : null;
      let userId: number | null = null;
      let username = "desconocido";
      if (token) {
        const p = await verifyLocalJWT(token);
        if (p) {
          userId = p.id;
          username = p.username;
        }
      }
      const ip = getClientIp(ctx.req);
      ctx.res.clearCookie(LOCAL_AUTH_COOKIE, { ...cookieOpts, maxAge: -1 });
      if (userId != null) {
        await recordAuditDirect({
          userId,
          username,
          action: "LOGOUT",
          entity: "auth",
          ip,
        });
      }
      return { success: true } as const;
    }),

    me: publicProcedure.query(({ ctx }) => {
      return ctx.localUser ?? null;
    }),

    listUsers: protectedProcedure.query(async ({ ctx }) => {
      await requireRole(ctx, "admin");
      return await ds_getUsers();
    }),

    /** Lista reducida de usuarios activos para selects (preventa, ejecutivo comercial, etc.).
     *  Accesible para cualquier usuario autenticado — no expone passwordHash ni datos sensibles. */
    listUsersForSelect: protectedProcedure.query(async () => {
      const all = await ds_getUsers();
      return all
        .filter(u => u.isActive === 1)
        .map(u => ({ id: u.id, value: u.username, label: u.displayName || u.username }));
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
        const created = await ds_findUserByUsername(input.username);
        await recordAuditFromTrpc(ctx, {
          action: "CREATE",
          entity: "user",
          entityId: created?.id,
          changes: { after: { username: input.username, role: input.role } },
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
        await recordAuditFromTrpc(ctx, {
          action: "UPDATE",
          entity: "user",
          entityId: id,
          changes: { after: data },
        });
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
        await recordAuditFromTrpc(ctx, {
          action: "UPDATE",
          entity: "user",
          entityId: input.id,
          changes: { after: { isActive: input.isActive } },
        });
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
        await recordAuditFromTrpc(ctx, {
          action: "PASSWORD_CHANGE",
          entity: "user",
          entityId: input.targetUserId,
          changes: { after: { self: isSelf, admin: isAdmin } },
        });
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
        await recordAuditFromTrpc(ctx, {
          action: "USERNAME_CHANGE",
          entity: "user",
          entityId: input.targetUserId,
          changes: { after: { newUsername: input.newUsername } },
        });
        return { success: true };
      }),

    /**
     * Elimina permanentemente un usuario.
     * Reglas: solo admin, solo cuentas desactivadas (isActive=0), no puede borrarse a sí mismo.
     * Los expedientes del usuario quedan huérfanos (se muestran en workspace con indicador visual).
     */
    deleteUser: protectedProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => {
        await requireRole(ctx, "admin");

        // No puede borrarse a sí mismo
        if (Number(ctx.localUser?.id) === input.id) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "No podés eliminar tu propia cuenta" });
        }

        // Solo cuentas desactivadas
        const target = await ds_findUserById(input.id);
        if (!target) throw new TRPCError({ code: "NOT_FOUND", message: "Usuario no encontrado" });
        if (target.isActive !== 0) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Solo se pueden eliminar cuentas desactivadas" });
        }

        await ds_deleteUser(input.id);

        await recordAuditFromTrpc(ctx, {
          action: "DELETE",
          entity: "user",
          entityId: input.id,
          changes: { before: { username: target.username, displayName: target.displayName } },
        });

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
    /**
     * Easter egg: toggle del rol gestor_horarios para el usuario actual.
     * No requiere ser admin — cualquier usuario autenticado puede llamarlo.
     * El frontend lo activa con 5 clicks seguidos en el ícono del Dashboard.
     */
    toggleHorarios: protectedProcedure.mutation(async ({ ctx }) => {
      return await toggleHorariosEasterEgg(ctx.user.id);
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
        const { f1SavedAt: f1s, ...restIn } = input;
        const result = await (createActa as (data: Record<string, unknown>) => Promise<unknown>)({
          userId: ctx.user.id,
          ...restIn,
          fecha: input.fecha ? new Date(input.fecha) : undefined,
          serviciosContratados: input.serviciosContratados ?? [],
          formasPagoImplementacion: input.formasPagoImplementacion ?? [],
          formasPagoMantencion: input.formasPagoMantencion ?? [],
          f1SavedAt: f1s ? new Date(f1s) : undefined,
        });
        return result;
      }),

    update: protectedProcedure
      .input(z.object({ id: z.number(), data: ActaInputSchema }))
      .mutation(async ({ ctx, input }) => {
        const acta = await getActaById(input.id);
        if (!acta || acta.userId !== ctx.user.id) throw new Error("Acta no encontrada");
        const { f1SavedAt: f1s, ...dataRest } = input.data;
        return updateActa(input.id, {
          ...dataRest,
          fecha: input.data.fecha ? new Date(input.data.fecha) : undefined,
          f1SavedAt: f1s ? new Date(f1s) : undefined,
        });
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const acta = await getActaById(input.id);
        if (!acta || acta.userId !== ctx.user.id) throw new Error("Acta no encontrada");
        return deleteActa(input.id);
      }),

    /**
     * syncF1 — Crea o actualiza el acta vinculada a un expediente.
     * Recibe el expedienteId y todos los campos de F1.
     * Si ya existe un acta para ese expediente, la actualiza; si no, la crea.
     */
    syncF1: protectedProcedure
      .input(ActaInputSchema.extend({
        expedienteId: z.number().min(1),
      }))
      .mutation(async ({ ctx, input }) => {
        const expedienteRow = await getExpedienteById(input.expedienteId);
        if (!expedienteRow) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Expediente no encontrado" });
        }
        if (!mayAccessAllExpedientes(ctx.user.role) && expedienteRow.creadorId !== ctx.user.id) {
          throw new TRPCError({ code: "FORBIDDEN", message: "No autorizado" });
        }
        const ownerUserId = expedienteRow.creadorId;
        const { expedienteId, f1SavedAt: f1SavedAtStr, ...actaRest } = input;
        const f1SavedAt = f1SavedAtStr ? new Date(f1SavedAtStr) : undefined;
        const f1DatosSinFirma = (raw: unknown): unknown => {
          if (!raw || typeof raw !== "object" || Array.isArray(raw)) return raw;
          const o = { ...(raw as Record<string, unknown>) };
          delete o.firmaImagen;
          return o;
        };
        const f1DatosMerged = f1DatosSinFirma(actaRest.f1Datos);
        const existing = await getActaByExpedienteId(expedienteId);
        let acta;
        if (existing) {
          const prevF1 = f1DatosSinFirma(existing.f1Datos);
          await updateActa(existing.id, {
            ...actaRest,
            fecha: actaRest.fecha ? new Date(actaRest.fecha) : undefined,
            serviciosContratados: actaRest.serviciosContratados ?? existing.serviciosContratados,
            formasPagoImplementacion: actaRest.formasPagoImplementacion ?? existing.formasPagoImplementacion,
            formasPagoMantencion: actaRest.formasPagoMantencion ?? existing.formasPagoMantencion,
            f1Datos: (f1DatosMerged ?? prevF1) as typeof actaRest.f1Datos,
            f1FormStatus: actaRest.f1FormStatus ?? existing.f1FormStatus ?? "nuevo",
            f1SavedAt: f1SavedAt ?? existing.f1SavedAt ?? undefined,
          });
          acta = await getActaById(existing.id);
        } else {
          const raw = getRawDb();
          const maxRow = raw.prepare(`SELECT COALESCE(MAX(nro_acta), 0) as max_nro FROM actas`).get() as { max_nro: number };
          const nextNroActa = maxRow.max_nro + 1;
          const codigoActa = buildActaCodigo("", nextNroActa);
          acta = await createActa({
            userId: ownerUserId,
            expedienteId,
            nroActa: nextNroActa,
            codigo: codigoActa,
            noActa: codigoActa,
            ...actaRest,
            fecha: actaRest.fecha ? new Date(actaRest.fecha) : undefined,
            serviciosContratados: actaRest.serviciosContratados ?? [],
            formasPagoImplementacion: actaRest.formasPagoImplementacion ?? [],
            formasPagoMantencion: actaRest.formasPagoMantencion ?? [],
            status: actaRest.status ?? "borrador",
            f1Datos: f1DatosMerged as typeof actaRest.f1Datos,
            f1FormStatus: actaRest.f1FormStatus ?? "nuevo",
            f1SavedAt: f1SavedAt ?? undefined,
          });
        }
        return acta;
      }),

    /** Obtiene el acta vinculada a un expediente por su id. */
    getByExpedienteId: protectedProcedure
      .input(z.object({ expedienteId: z.number().min(1) }))
      .query(async ({ ctx, input }) => {
        const expediente = await getExpedienteById(input.expedienteId);
        if (!expediente) return null;
        if (!mayAccessAllExpedientes(ctx.user.role) && expediente.creadorId !== ctx.user.id) {
          throw new TRPCError({ code: "FORBIDDEN", message: "No autorizado" });
        }
        return getActaByExpedienteId(input.expedienteId);
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
        return (createEvaluacion as (data: Record<string, unknown>) => Promise<unknown>)({
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

    /**
     * syncF2 — Crea o actualiza la evaluación vinculada al expediente (1:1 por expedienteId).
     */
    syncF2: protectedProcedure
      .input(z.object({
        expedienteId: z.number().min(1),
        f2FormStatus: z.enum(["nuevo", "sin_guardar", "guardado"]),
        f2SavedAt: z.string().optional(),
        data: EvaluacionInputSchema,
      }))
      .mutation(async ({ ctx, input }) => {
        const expediente = await getExpedienteById(input.expedienteId);
        if (!expediente) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Expediente no encontrado" });
        }
        if (!mayAccessAllExpedientes(ctx.user.role) && expediente.creadorId !== ctx.user.id) {
          throw new TRPCError({ code: "FORBIDDEN", message: "No autorizado" });
        }
        const ownerUserId = expediente.creadorId;
        const acta = await getActaByExpedienteId(input.expedienteId);
        const existing = await getEvaluacionByExpedienteId(input.expedienteId);
        const d = input.data;
        const stripLabel = <T extends { label?: unknown }>(row: T) => {
          const { label: _l, ...rest } = row;
          return rest;
        };
        const basePatch = {
          expedienteId: input.expedienteId,
          unidadNegocios: d.unidadNegocios,
          empresa: d.empresa,
          centroCostoHeader: d.centroCostoHeader,
          solucion: d.solucion,
          tipoMoneda: d.tipoMoneda,
          montoProyecto: d.montoProyecto,
          tipoCambio: d.tipoCambio,
          totalClp: d.totalClp,
          descripcion: d.descripcion,
          preventa: d.preventa,
          fechaEntrega: d.fechaEntrega ? new Date(d.fechaEntrega) : undefined,
          ejecutivoComercial: d.ejecutivoComercial,
          plazoImplementacion: d.plazoImplementacion,
          propuestaNumero: d.propuestaNumero,
          paisImplementacion: d.paisImplementacion,
          rut: d.rut,
          nombreCliente: d.nombreCliente,
          nombreFantasia: d.nombreFantasia,
          hardware: d.hardware ?? [],
          materiales: d.materiales ?? [],
          rrhh: (d.rrhh ?? []).map(r => stripLabel(r as { label?: unknown })),
          otrosGastos: (d.otrosGastos ?? []).map(o => stripLabel(o as { label?: unknown })),
          totalHardware: d.totalHardware,
          totalMateriales: d.totalMateriales,
          totalRrhh: d.totalRrhh,
          totalOtros: d.totalOtros,
          totalGastos: d.totalGastos,
          status: d.status ?? "borrador",
          firmaImagen: d.firmaImagen,
          f2FormStatus: input.f2FormStatus,
          f2SavedAt: input.f2SavedAt ? new Date(input.f2SavedAt) : new Date(),
        };
        let row;
        if (existing) {
          await updateEvaluacion(existing.id, basePatch);
          row = await getEvaluacionById(existing.id);
        } else {
          row = await createEvaluacion({
            userId: ownerUserId,
            ...basePatch,
          });
        }
        return row;
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
      .mutation(async ({ ctx, input }) => {
        const r = await ds_createCatalogRecord(input.tableName, input.data);
        await recordAuditFromTrpc(ctx, {
          action: "CREATE",
          entity: `catalog:${input.tableName}`,
          changes: { after: { data: input.data } },
        });
        return r;
      }),

    update: protectedProcedure
      .input(z.object({ tableName: z.string(), id: z.number(), data: z.any() }))
      .mutation(async ({ ctx, input }) => {
        const r = await ds_updateCatalogRecord(input.tableName, input.id, input.data);
        await recordAuditFromTrpc(ctx, {
          action: "UPDATE",
          entity: `catalog:${input.tableName}`,
          entityId: input.id,
          changes: { after: { data: input.data } },
        });
        return r;
      }),

    delete: protectedProcedure
      .input(z.object({ tableName: z.string(), id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const r = await ds_deleteCatalogRecord(input.tableName, input.id);
        await recordAuditFromTrpc(ctx, {
          action: "DELETE",
          entity: `catalog:${input.tableName}`,
          entityId: input.id,
        });
        return r;
      }),

    bulkUpdate: protectedProcedure
      .input(z.object({ tableName: z.string(), ids: z.array(z.number()), data: z.any() }))
      .mutation(async ({ ctx, input }) => {
        const r = await ds_bulkUpdateCatalogRecords(input.tableName, input.ids, input.data);
        await recordAuditFromTrpc(ctx, {
          action: "UPDATE",
          entity: "catalog",
          changes: { after: { tableName: input.tableName, idsCount: input.ids.length, op: "bulkUpdate" } },
        });
        return r;
      }),

    bulkDelete: protectedProcedure
      .input(z.object({ tableName: z.string(), ids: z.array(z.number()) }))
      .mutation(async ({ ctx, input }) => {
        const r = await ds_bulkDeleteCatalogRecords(input.tableName, input.ids);
        await recordAuditFromTrpc(ctx, {
          action: "DELETE",
          entity: "catalog",
          changes: { after: { tableName: input.tableName, idsCount: input.ids.length, op: "bulkDelete" } },
        });
        return r;
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
      .mutation(async ({ ctx, input }) => {
        const r = await ds_createCatalogTable(input.tableName, input.title);
        await recordAuditFromTrpc(ctx, {
          action: "CREATE",
          entity: "catalog_meta",
          changes: { after: { tableName: input.tableName, title: input.title } },
        });
        return r;
      }),

    renameTable: protectedProcedure
      .input(z.object({ tableName: z.string(), newTitle: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const r = await ds_renameCatalogTable(input.tableName, input.newTitle);
        await recordAuditFromTrpc(ctx, {
          action: "UPDATE",
          entity: "catalog_meta",
          changes: { after: { tableName: input.tableName, newTitle: input.newTitle } },
        });
        return r;
      }),

    deleteTable: protectedProcedure
      .input(z.object({ tableName: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const r = await ds_deleteCatalogTable(input.tableName);
        await recordAuditFromTrpc(ctx, {
          action: "DELETE",
          entity: "catalog_meta",
          changes: { after: { tableName: input.tableName } },
        });
        return r;
      }),

    // CRUD genérico que soporta tablas fijas y dinámicas
    listGeneric: protectedProcedure
      .input(z.object({ tableName: z.string() }))
      .query(async ({ input }) => {
        return ds_getCatalogListGeneric(input.tableName);
      }),

    createGeneric: protectedProcedure
      .input(z.object({ tableName: z.string(), data: z.any() }))
      .mutation(async ({ ctx, input }) => {
        const r = await ds_createCatalogRecordGeneric(input.tableName, input.data);
        await recordAuditFromTrpc(ctx, {
          action: "CREATE",
          entity: `catalog_custom:${input.tableName}`,
          changes: { after: { data: input.data } },
        });
        return r;
      }),

    updateGeneric: protectedProcedure
      .input(z.object({ tableName: z.string(), id: z.number(), data: z.any() }))
      .mutation(async ({ ctx, input }) => {
        const r = await ds_updateCatalogRecordGeneric(input.tableName, input.id, input.data);
        await recordAuditFromTrpc(ctx, {
          action: "UPDATE",
          entity: `catalog_custom:${input.tableName}`,
          entityId: input.id,
          changes: { after: { data: input.data } },
        });
        return r;
      }),

    deleteGeneric: protectedProcedure
      .input(z.object({ tableName: z.string(), id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const r = await ds_deleteCatalogRecordGeneric(input.tableName, input.id);
        await recordAuditFromTrpc(ctx, {
          action: "DELETE",
          entity: `catalog_custom:${input.tableName}`,
          entityId: input.id,
        });
        return r;
      }),

    bulkDeleteGeneric: protectedProcedure
      .input(z.object({ tableName: z.string(), ids: z.array(z.number()) }))
      .mutation(async ({ ctx, input }) => {
        const r = await ds_bulkDeleteCatalogRecordsGeneric(input.tableName, input.ids);
        await recordAuditFromTrpc(ctx, {
          action: "DELETE",
          entity: "catalog_custom",
          changes: { after: { tableName: input.tableName, idsCount: input.ids.length, op: "bulkDeleteGeneric" } },
        });
        return r;
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
  // Metadata + vínculos a actas / evaluaciones / resultados en SQLite.
  expediente: router({
    /** Crea un nuevo expediente con su acta (F1) en el servidor. */
    crear: protectedProcedure
      .input(z.object({
        nombre: z.string().min(1),
      }))
      .mutation(async ({ ctx, input }) => {
        const userId = ctx.user!.id;
        const result = await crearExpedienteConActa({
          nombre: input.nombre,
          creadorId: userId,
        });
        await recordAuditFromTrpc(ctx, {
          action: "CREATE",
          entity: "expediente",
          entityId: result.expediente.id,
          expedienteCodigo: result.acta.codigo ?? null,
          changes: { after: { id: result.expediente.id, nombre: input.nombre } },
        });
        return result;
      }),

    /** Lista expedientes del usuario actual (sin listado global). */
    listar: protectedProcedure.query(async ({ ctx }) => {
      const userId = Number(ctx.localUser?.id);
      return getExpedientesByUser(userId);
    }),

    /** Lista expedientes con acta, evaluación y resultado (historial: solo del usuario autenticado). */
    listarResumen: protectedProcedure.query(async ({ ctx }) => {
      if (!ctx.user) throw new Error("No autenticado");
      return listExpedientesResumen(ctx.user.id);
    }),

    /**
     * Todos los expedientes + resumen F1/F2/F3. Solo roles en EXPEDIENTES_WORKSPACE_GLOBAL_ROLES (servidor).
     * Incluye `creadorDisplay` para la tabla admin.
     */
    listarResumenWorkspace: protectedProcedure.query(async ({ ctx }) => {
      if (!ctx.user) throw new Error("No autenticado");
      if (!mayAccessAllExpedientes(ctx.user.role)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "No autorizado" });
      }
      const rows = await listExpedientesResumenGlobal();
      const ids = Array.from(new Set(rows.map(r => r.expediente.creadorId)));
      // Map: id → { label, exists }
      const userMap = new Map<number, { label: string; exists: boolean }>();
      for (const id of ids) {
        const u = await findUserById(id);
        if (u) {
          userMap.set(id, { label: u.displayName?.trim() || u.username || `#${id}`, exists: true });
        } else {
          userMap.set(id, { label: `#${id}`, exists: false });
        }
      }
      return rows.map(r => {
        const info = userMap.get(r.expediente.creadorId);
        return {
          expediente: r.expediente,
          acta: r.acta,
          evaluacion: r.evaluacion,
          resultado: r.resultado,
          creadorDisplay: info?.exists ? info.label : null,
          creadorEliminado: !(info?.exists ?? true),
        };
      });
    }),

    /** Detalle completo de un expediente por id (F1/F2/F3 desde tablas). Dueño o rol workspace global. */
    detalle: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        if (!ctx.user) throw new Error("No autenticado");
        return mayAccessAllExpedientes(ctx.user.role)
          ? getExpedienteDetalleGlobal(input.id)
          : getExpedienteDetalle(input.id, ctx.user.id);
      }),

    implementacion: router({
      listar: protectedProcedure
        .input(z.object({ id: z.number() }))
        .query(async ({ ctx, input }) => {
          if (!ctx.user) throw new Error("No autenticado");
          try {
            const det = mayAccessAllExpedientes(ctx.user.role)
              ? await getExpedienteDetalleGlobal(input.id)
              : await getExpedienteDetalle(input.id, ctx.user.id);
            if (!det) {
              throw new TRPCError({ code: "NOT_FOUND", message: "Expediente no encontrado" });
            }
            const catalog = await listImplementacionCatalogActivos();
            const rows = await listImplementacionesByExpedienteId(det.expediente.id);
            return mergeImplementacionFromCatalog(catalog, rows);
          } catch (err: unknown) {
            if (err instanceof TRPCError) throw err;
            const msg = err instanceof Error ? err.message : String(err);
            if (/malformed|SQLITE_CORRUPT|database disk image/i.test(msg)) {
              const path = getSqliteDbPath();
              console.error("[implementacion.listar] SQLite corrupta o ilegible:", path, err);
              throw new TRPCError({
                code: "INTERNAL_SERVER_ERROR",
                message:
                  `La base de datos SQLite está dañada o ilegible. Restaurar desde un backup o ejecutar reparación (p. ej. sqlite3 .recover). Archivo: ${path}`,
              });
            }
            throw err;
          }
        }),

      setEstado: protectedProcedure
        .input(
          z.object({
            id: z.number(),
            checkKey: z.string().min(1),
            estado: z.boolean(),
          }),
        )
        .mutation(async ({ ctx, input }) => {
          if (!ctx.user) throw new Error("No autenticado");
          if (!(await isActiveImplementacionCatalogKey(input.checkKey))) {
            throw new TRPCError({ code: "BAD_REQUEST", message: "checkKey inválido o inactivo" });
          }
          const det = mayAccessAllExpedientes(ctx.user.role)
            ? await getExpedienteDetalleGlobal(input.id)
            : await getExpedienteDetalle(input.id, ctx.user.id);
          if (!det) {
            throw new TRPCError({ code: "NOT_FOUND", message: "Expediente no encontrado" });
          }
          await upsertImplementacionCheck(det.expediente.id, input.checkKey, input.estado);
          await recordAuditFromTrpc(ctx, {
            action: "UPDATE",
            entity: "implementacion",
            entityId: det.expediente.id,
            expedienteCodigo: null,
            changes: { after: { checkKey: input.checkKey, estado: input.estado } },
          });
          return { success: true as const };
        }),
    }),

    /** Persiste snapshot de resultados F3. */
    syncResultado: protectedProcedure
      .input(z.object({
        expedienteId: z.number(),
        payload: z.unknown(),
        f3FormStatus: z.enum(["nuevo", "sin_guardar", "guardado"]),
      }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user) throw new Error("No autenticado");
        const det = mayAccessAllExpedientes(ctx.user.role)
          ? await getExpedienteDetalleGlobal(input.expedienteId)
          : await getExpedienteDetalle(input.expedienteId, ctx.user.id);
        if (!det) throw new Error("Expediente no encontrado");
        await upsertResultadoExpediente({
          expedienteId: input.expedienteId,
          payload: input.payload,
          f3FormStatus: input.f3FormStatus,
        });
        await recordAuditFromTrpc(ctx, {
          action: "UPDATE",
          entity: "expediente",
          entityId: det.expediente.id,
          expedienteCodigo: null,
          changes: { after: { resultado: true, f3FormStatus: input.f3FormStatus } },
        });
        return { success: true as const };
      }),

    /** Renombra un expediente por id. Solo el creador. */
    renombrar: protectedProcedure
      .input(z.object({
        id: z.number(),
        nombre: z.string().min(1),
      }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user) throw new Error("No autenticado");
        const row = await getExpedienteById(input.id);
        if (!row) throw new Error("Expediente no encontrado");
        if (row.creadorId !== ctx.user.id && !mayAccessAllExpedientes(ctx.user.role)) {
          throw new Error("No autorizado");
        }
        const updated = await updateExpediente(row.id, { nombre: input.nombre });
        await recordAuditFromTrpc(ctx, {
          action: "UPDATE",
          entity: "expediente",
          entityId: row.id,
          expedienteCodigo: null,
          changes: { after: { nombre: input.nombre } },
        });
        return updated;
      }),

    /** Elimina expediente y registros hijos (acta, evaluación, resultado). Solo el creador. */
    eliminar: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user) throw new Error("No autenticado");
        const row = await getExpedienteById(input.id);
        if (!row) throw new Error("Expediente no encontrado");
        if (row.creadorId !== ctx.user.id && !mayAccessAllExpedientes(ctx.user.role)) {
          throw new Error("No autorizado");
        }
        await deleteExpedienteCascadeById(input.id);
        await recordAuditFromTrpc(ctx, {
          action: "DELETE",
          entity: "expediente",
          entityId: row.id,
          expedienteCodigo: null,
        });
        return { success: true as const };
      }),

    /** Mueve un expediente a la papelera (soft-delete). Solo el creador o admin. */
    moverAPapelera: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user) throw new Error("No autenticado");
        const row = await getExpedienteById(input.id);
        if (!row) throw new Error("Expediente no encontrado");
        if (row.creadorId !== ctx.user.id && !mayAccessAllExpedientes(ctx.user.role)) {
          throw new Error("No autorizado");
        }
        await moverExpedienteAPapelera(input.id);
        await recordAuditFromTrpc(ctx, {
          action: "UPDATE",
          entity: "expediente",
          entityId: row.id,
          expedienteCodigo: null,
          changes: { after: { papelera: true } },
        });
        return { success: true as const };
      }),

    /** Restaura un expediente desde la papelera. Solo el creador o admin. */
    restaurarDePapelera: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user) throw new Error("No autenticado");
        const row = await getExpedienteById(input.id);
        if (!row) throw new Error("Expediente no encontrado");
        if (row.creadorId !== ctx.user.id && !mayAccessAllExpedientes(ctx.user.role)) {
          throw new Error("No autorizado");
        }
        await restaurarExpedienteDePapelera(input.id);
        await recordAuditFromTrpc(ctx, {
          action: "UPDATE",
          entity: "expediente",
          entityId: row.id,
          expedienteCodigo: null,
          changes: { after: { papelera: false } },
        });
        return { success: true as const };
      }),

    /** Lista expedientes en papelera del usuario actual. */
    listarPapelera: protectedProcedure.query(async ({ ctx }) => {
      if (!ctx.user) throw new Error("No autenticado");
      return getExpedientesEnPapelera(ctx.user.id);
    }),

    /** Obtiene el audit log. Solo admin. */
    auditLog: protectedProcedure
      .input(z.object({ limit: z.number().min(1).max(1000).default(200) }))
      .query(async ({ ctx, input }) => {
        await requireAnyRole(ctx, ["admin"]);
        return await getAuditLog(input.limit);
      }),
  }),

  // ─── Cláusulas Legales (PDFs) ────────────────────────────────
  clausulas: clausulasRouter,
});

export type AppRouter = typeof appRouter;
