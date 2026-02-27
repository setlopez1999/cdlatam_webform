import { z } from "zod";
import { eq, like } from "drizzle-orm";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import {
  getActasByUserId, getActaById, createActa, updateActa, deleteActa,
  getEvaluacionesByUserId, getEvaluacionById, createEvaluacion, updateEvaluacion, deleteEvaluacion,
  searchRegistros,
  getDb,
} from "./db";
import {
  catalogMonedas, catalogPaises, catalogUnidadesNegocio, catalogSoluciones,
  catalogDetalleServicio, catalogTipoVenta, catalogPlazos, catalogDocumentos,
  catalogCecos, catalogContactos,
} from "../drizzle/schema";
import {
  MONEDAS, PAISES, UNIDADES_NEGOCIO, SOLUCIONES, DETALLE_SERVICIO,
  TIPO_VENTA, PLAZOS, DOCUMENTO_IDENTIDAD, CECOS, EMPRESAS_REFERENCIA, NOMBRES_REFERENCIA, MESES,
} from "../shared/catalogs";
import {
  findLocalUserByUsername, verifyPassword, signLocalJWT, getAllLocalUsers,
  LOCAL_AUTH_COOKIE, hashPassword, createLocalUser, findLocalUserById,
} from "./localAuth";
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

  // ─── Autenticación Local (username/password) ──────────────────────────────────
  localAuth: router({
    /**
     * Login con username y password.
     * Devuelve el usuario y setea cookie httpOnly con JWT.
     * TODO: Conectar con API de Base de Datos aquí para auditoría de accesos.
     */
    login: publicProcedure
      .input(z.object({
        username: z.string().min(1),
        password: z.string().min(1),
      }))
      .mutation(async ({ ctx, input }) => {
        const user = await findLocalUserByUsername(input.username);
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
          role: user.role,
        });
        const cookieOpts = getCookieOpts(ctx.req);
        ctx.res.cookie(LOCAL_AUTH_COOKIE, token, {
          ...cookieOpts,
          maxAge: 8 * 60 * 60 * 1000, // 8 horas
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

    /**
     * Cierra la sesión local eliminando la cookie.
     */
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOpts = getCookieOpts(ctx.req);
      ctx.res.clearCookie(LOCAL_AUTH_COOKIE, { ...cookieOpts, maxAge: -1 });
      return { success: true } as const;
    }),

    /**
     * Retorna el usuario local actualmente autenticado.
     */
    me: publicProcedure.query(({ ctx }) => {
      return ctx.localUser ?? null;
    }),

    /**
     * Lista todos los usuarios del sistema (solo admin).
     * TODO: Conectar con API de Base de Datos aquí para gestión de usuarios.
     */
    listUsers: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user?.role !== "admin") {
        throw new Error("Acceso denegado: se requiere rol admin");
      }
      return getAllLocalUsers();
    }),

    /**
     * Crea un nuevo usuario (solo admin).
     * TODO: Conectar con API de Base de Datos aquí para notificaciones de bienvenida.
     */
    createUser: protectedProcedure
      .input(z.object({
        username: z.string().min(3).max(64),
        password: z.string().min(4),
        displayName: z.string().optional(),
        role: z.enum(["user", "admin"]).default("user"),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user?.role !== "admin") {
          throw new Error("Acceso denegado: se requiere rol admin");
        }
        const existing = await findLocalUserByUsername(input.username);
        if (existing) throw new Error("El nombre de usuario ya existe");
        const passwordHash = await hashPassword(input.password);
        await createLocalUser({
          username: input.username,
          passwordHash,
          displayName: input.displayName ?? input.username,
          role: input.role,
          isActive: 1,
        });
        return { success: true };
      }),
  }),

  // ─── Catálogos (públicos para dropdowns) ──────────────────────────────────
  catalogs: router({
    /**
     * Retorna todos los catálogos de referencia para poblar dropdowns.
     * TODO: Conectar con API de Base de Datos aquí para catálogos dinámicos.
     */
    getAll: publicProcedure.query(() => ({
      monedas: MONEDAS,
      paises: PAISES,
      unidadesNegocio: UNIDADES_NEGOCIO,
      soluciones: SOLUCIONES,
      detalleServicio: DETALLE_SERVICIO,
      tipoVenta: TIPO_VENTA,
      plazos: PLAZOS,
      documentoIdentidad: DOCUMENTO_IDENTIDAD,
      cecos: CECOS,
      empresas: EMPRESAS_REFERENCIA,
      nombres: NOMBRES_REFERENCIA,
      meses: MESES,
    })),
  }),

  // ─── Actas (Formulario 1) ──────────────────────────────────────────────────
  actas: router({
    /**
     * Lista todas las actas del usuario autenticado.
     * TODO: Conectar con API de Base de Datos aquí para paginación y filtros.
     */
    list: protectedProcedure.query(async ({ ctx }) => {
      return getActasByUserId(ctx.user.id);
    }),

    /**
     * Obtiene una acta por ID.
     * TODO: Conectar con API de Base de Datos aquí para validación de permisos.
     */
    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        const acta = await getActaById(input.id);
        if (!acta || acta.userId !== ctx.user.id) throw new Error("Acta no encontrada");
        return acta;
      }),

    /**
     * Crea una nueva acta.
     * TODO: Conectar con API de Base de Datos aquí para notificaciones y auditoría.
     */
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

    /**
     * Actualiza una acta existente.
     * TODO: Conectar con API de Base de Datos aquí para historial de versiones.
     */
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

    /**
     * Elimina una acta.
     */
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const acta = await getActaById(input.id);
        if (!acta || acta.userId !== ctx.user.id) throw new Error("Acta no encontrada");
        return deleteActa(input.id);
      }),
  }),

  // ─── Evaluaciones de Proyecto (Formulario 2) ──────────────────────────────
  evaluaciones: router({
    /**
     * Lista todas las evaluaciones del usuario.
     * TODO: Conectar con API de Base de Datos aquí para filtros avanzados.
     */
    list: protectedProcedure.query(async ({ ctx }) => {
      return getEvaluacionesByUserId(ctx.user.id);
    }),

    /**
     * Obtiene una evaluación por ID.
     */
    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        const ev = await getEvaluacionById(input.id);
        if (!ev || ev.userId !== ctx.user.id) throw new Error("Evaluación no encontrada");
        return ev;
      }),

    /**
     * Crea una nueva evaluación de proyecto.
     * TODO: Conectar con API de Base de Datos aquí para auto-generación de número de propuesta.
     */
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
          montoProyecto: input.montoProyecto?.toString(),
          tipoCambio: input.tipoCambio?.toString(),
          totalClp: input.totalClp?.toString(),
          totalHardware: input.totalHardware?.toString(),
          totalMateriales: input.totalMateriales?.toString(),
          totalRrhh: input.totalRrhh?.toString(),
          totalOtros: input.totalOtros?.toString(),
          totalGastos: input.totalGastos?.toString(),
        });
      }),

    /**
     * Actualiza una evaluación existente y recalcula Formulario 3.
     * TODO: Conectar con API de Base de Datos aquí para recalcular y notificar cambios.
     */
    update: protectedProcedure
      .input(z.object({ id: z.number(), data: EvaluacionInputSchema }))
      .mutation(async ({ ctx, input }) => {
        const ev = await getEvaluacionById(input.id);
        if (!ev || ev.userId !== ctx.user.id) throw new Error("Evaluación no encontrada");
        return updateEvaluacion(input.id, {
          ...input.data,
          fechaEntrega: input.data.fechaEntrega ? new Date(input.data.fechaEntrega) : undefined,
          montoProyecto: input.data.montoProyecto?.toString(),
          tipoCambio: input.data.tipoCambio?.toString(),
          totalClp: input.data.totalClp?.toString(),
          totalHardware: input.data.totalHardware?.toString(),
          totalMateriales: input.data.totalMateriales?.toString(),
          totalRrhh: input.data.totalRrhh?.toString(),
          totalOtros: input.data.totalOtros?.toString(),
          totalGastos: input.data.totalGastos?.toString(),
        });
      }),

    /**
     * Elimina una evaluación.
     */
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const ev = await getEvaluacionById(input.id);
        if (!ev || ev.userId !== ctx.user.id) throw new Error("Evaluación no encontrada");
        return deleteEvaluacion(input.id);
      }),
  }),

  // ─── Búsqueda global ──────────────────────────────────────────────────────
  search: router({
    /**
     * Búsqueda global en actas y evaluaciones.
     * TODO: Conectar con API de Base de Datos aquí para búsqueda full-text con índices.
     */
    global: protectedProcedure
      .input(z.object({ query: z.string().min(1) }))
      .query(async ({ ctx, input }) => {
        return searchRegistros(ctx.user.id, input.query);
      }),
  }),

  // ─── Catálogos desde Base de Datos (MySQL) ──────────────────────────────────
  catalogsDB: router({
    /** Obtiene todos los catálogos desde MySQL con conteo de registros */
    summary: protectedProcedure.query(async () => {
      const db = await getDb();
      if (!db) throw new Error("Base de datos no disponible");
      const [monedas, paises, unidades, soluciones, detalles, tipos, plazos, docs, cecos, contactos] = await Promise.all([
        db.select().from(catalogMonedas).where(eq(catalogMonedas.activo, 1)),
        db.select().from(catalogPaises).where(eq(catalogPaises.activo, 1)),
        db.select().from(catalogUnidadesNegocio).where(eq(catalogUnidadesNegocio.activo, 1)),
        db.select().from(catalogSoluciones).where(eq(catalogSoluciones.activo, 1)),
        db.select().from(catalogDetalleServicio).where(eq(catalogDetalleServicio.activo, 1)),
        db.select().from(catalogTipoVenta).where(eq(catalogTipoVenta.activo, 1)),
        db.select().from(catalogPlazos).where(eq(catalogPlazos.activo, 1)),
        db.select().from(catalogDocumentos).where(eq(catalogDocumentos.activo, 1)),
        db.select().from(catalogCecos).where(eq(catalogCecos.activo, 1)),
        db.select().from(catalogContactos).where(eq(catalogContactos.activo, 1)),
      ]);
      return { monedas, paises, unidades, soluciones, detalles, tipos, plazos, docs, cecos, contactos };
    }),

    /** Obtiene CECOs agrupados por empresa */
    cecosByEmpresa: protectedProcedure.query(async () => {
      const db = await getDb();
      if (!db) throw new Error("Base de datos no disponible");
      const all = await db.select().from(catalogCecos).where(eq(catalogCecos.activo, 1));
      const grouped: Record<string, typeof all> = {};
      for (const c of all) {
        if (!grouped[c.empresa]) grouped[c.empresa] = [];
        grouped[c.empresa].push(c);
      }
      return grouped;
    }),

    /** Busca en cualquier catálogo por texto */
    search: protectedProcedure
      .input(z.object({ query: z.string(), catalog: z.string().optional() }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Base de datos no disponible");
        const q = `%${input.query}%`;
        const [cecos, soluciones, detalles] = await Promise.all([
          db.select().from(catalogCecos).where(like(catalogCecos.nombreCompleto, q)),
          db.select().from(catalogSoluciones).where(like(catalogSoluciones.nombre, q)),
          db.select().from(catalogDetalleServicio).where(like(catalogDetalleServicio.nombre, q)),
        ]);
        return { cecos, soluciones, detalles };
      }),
  }),

  // ─── Dashboard Stats ───────────────────────────────────────────────────────
  dashboard: router({
    /**
     * Estadísticas del dashboard para el usuario actual.
     * TODO: Conectar con API de Base de Datos aquí para métricas avanzadas.
     */
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
});

export type AppRouter = typeof appRouter;
