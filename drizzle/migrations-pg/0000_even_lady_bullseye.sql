CREATE TABLE "actas" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"expedienteId" integer NOT NULL,
	"nro_acta" integer,
	"codigo" text,
	"noActa" text,
	"atencion" text,
	"fecha" timestamp,
	"razonSocial" text,
	"nombreFantasia" text,
	"rucDniRut" text,
	"direccionComercial" text,
	"representanteLegal" text,
	"representanteDni" text,
	"representanteEmail" text,
	"representanteFono" text,
	"contactoTecnico" text,
	"contactoTecnicoEmail" text,
	"contactoTecnicoFono" text,
	"contactoFacturacion" text,
	"contactoFacturacionEmail" text,
	"contactoFacturacionFono" text,
	"serviciosContratados" text,
	"formasPagoImplementacion" text,
	"formasPagoMantencion" text,
	"status" text DEFAULT 'borrador' NOT NULL,
	"f1Datos" text,
	"f1FormStatus" text DEFAULT 'nuevo' NOT NULL,
	"f1SavedAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "actas_expedienteId_unique" UNIQUE("expedienteId"),
	CONSTRAINT "actas_nro_acta_unique" UNIQUE("nro_acta"),
	CONSTRAINT "actas_codigo_unique" UNIQUE("codigo")
);
--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer,
	"username" text NOT NULL,
	"action" text NOT NULL,
	"entity" text NOT NULL,
	"entityId" integer,
	"expedienteId" integer,
	"actaCodigo" text,
	"changes" text,
	"ip" text,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "catalog_areas" (
	"id" serial PRIMARY KEY NOT NULL,
	"valor" text NOT NULL,
	"activo" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "catalog_areas_valor_unique" UNIQUE("valor")
);
--> statement-breakpoint
CREATE TABLE "catalog_cecos" (
	"id" serial PRIMARY KEY NOT NULL,
	"valor" text NOT NULL,
	"activo" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "catalog_cecos_valor_unique" UNIQUE("valor")
);
--> statement-breakpoint
CREATE TABLE "catalog_clausulas" (
	"id" serial PRIMARY KEY NOT NULL,
	"valor" text NOT NULL,
	"unidadNegocioId" integer,
	"filePath" text NOT NULL,
	"fileName" text NOT NULL,
	"fileSize" integer,
	"activo" integer DEFAULT 1 NOT NULL,
	"siempre_incluir" integer DEFAULT 0 NOT NULL,
	"tipo" text DEFAULT 'clausula' NOT NULL,
	"orden_global" integer DEFAULT 50 NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "catalog_conceptos_gasto" (
	"id" serial PRIMARY KEY NOT NULL,
	"valor" text NOT NULL,
	"activo" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "catalog_conceptos_gasto_valor_unique" UNIQUE("valor")
);
--> statement-breakpoint
CREATE TABLE "catalog_consideraciones_comerciales" (
	"id" serial PRIMARY KEY NOT NULL,
	"valor" text NOT NULL,
	"orden" integer DEFAULT 0 NOT NULL,
	"activo" integer DEFAULT 1 NOT NULL,
	"persistente" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "catalog_departamentos" (
	"id" serial PRIMARY KEY NOT NULL,
	"valor" text NOT NULL,
	"activo" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "catalog_departamentos_valor_unique" UNIQUE("valor")
);
--> statement-breakpoint
CREATE TABLE "catalog_detalle_servicio" (
	"id" serial PRIMARY KEY NOT NULL,
	"valor" text NOT NULL,
	"solucionId" integer,
	"activo" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "catalog_detalle_servicio_valor_unique" UNIQUE("valor")
);
--> statement-breakpoint
CREATE TABLE "catalog_documento_identidad" (
	"id" serial PRIMARY KEY NOT NULL,
	"valor" text NOT NULL,
	"activo" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "catalog_documento_identidad_valor_unique" UNIQUE("valor")
);
--> statement-breakpoint
CREATE TABLE "catalog_documentos" (
	"id" serial PRIMARY KEY NOT NULL,
	"valor" text NOT NULL,
	"activo" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "catalog_documentos_valor_unique" UNIQUE("valor")
);
--> statement-breakpoint
CREATE TABLE "catalog_ejecutivos_atencion" (
	"id" serial PRIMARY KEY NOT NULL,
	"valor" text NOT NULL,
	"activo" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "catalog_ejecutivos_atencion_valor_unique" UNIQUE("valor")
);
--> statement-breakpoint
CREATE TABLE "catalog_empresas" (
	"id" serial PRIMARY KEY NOT NULL,
	"valor" text NOT NULL,
	"activo" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "catalog_empresas_valor_unique" UNIQUE("valor")
);
--> statement-breakpoint
CREATE TABLE "catalog_especialistas_externos" (
	"id" serial PRIMARY KEY NOT NULL,
	"valor" text NOT NULL,
	"activo" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "catalog_especialistas_externos_valor_unique" UNIQUE("valor")
);
--> statement-breakpoint
CREATE TABLE "catalog_flujos_aprobacion" (
	"id" serial PRIMARY KEY NOT NULL,
	"valor" text NOT NULL,
	"activo" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "catalog_flujos_aprobacion_valor_unique" UNIQUE("valor")
);
--> statement-breakpoint
CREATE TABLE "catalog_gerencias" (
	"id" serial PRIMARY KEY NOT NULL,
	"valor" text NOT NULL,
	"activo" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "catalog_gerencias_valor_unique" UNIQUE("valor")
);
--> statement-breakpoint
CREATE TABLE "catalog_implementacion_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"label" text NOT NULL,
	"descripcion" text DEFAULT '' NOT NULL,
	"orden" integer DEFAULT 0 NOT NULL,
	"activo" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "catalog_implementacion_items_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "catalog_meta" (
	"id" serial PRIMARY KEY NOT NULL,
	"table_name" text NOT NULL,
	"title" text NOT NULL,
	"is_custom" integer DEFAULT 0 NOT NULL,
	"linked_field" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "catalog_meta_table_name_unique" UNIQUE("table_name")
);
--> statement-breakpoint
CREATE TABLE "catalog_monedas" (
	"id" serial PRIMARY KEY NOT NULL,
	"valor" text NOT NULL,
	"activo" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "catalog_monedas_valor_unique" UNIQUE("valor")
);
--> statement-breakpoint
CREATE TABLE "catalog_nombres" (
	"id" serial PRIMARY KEY NOT NULL,
	"valor" text NOT NULL,
	"activo" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "catalog_nros_acta" (
	"id" serial PRIMARY KEY NOT NULL,
	"valor" text NOT NULL,
	"activo" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "catalog_nros_acta_valor_unique" UNIQUE("valor")
);
--> statement-breakpoint
CREATE TABLE "catalog_paises" (
	"id" serial PRIMARY KEY NOT NULL,
	"valor" text NOT NULL,
	"activo" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "catalog_paises_valor_unique" UNIQUE("valor")
);
--> statement-breakpoint
CREATE TABLE "catalog_plazos" (
	"id" serial PRIMARY KEY NOT NULL,
	"valor" text NOT NULL,
	"activo" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "catalog_plazos_valor_unique" UNIQUE("valor")
);
--> statement-breakpoint
CREATE TABLE "catalog_preventas" (
	"id" serial PRIMARY KEY NOT NULL,
	"valor" text NOT NULL,
	"activo" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "catalog_preventas_valor_unique" UNIQUE("valor")
);
--> statement-breakpoint
CREATE TABLE "catalog_proyectos" (
	"id" serial PRIMARY KEY NOT NULL,
	"valor" text NOT NULL,
	"activo" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "catalog_proyectos_valor_unique" UNIQUE("valor")
);
--> statement-breakpoint
CREATE TABLE "catalog_sets" (
	"id" serial PRIMARY KEY NOT NULL,
	"valor" text NOT NULL,
	"activo" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "catalog_sets_valor_unique" UNIQUE("valor")
);
--> statement-breakpoint
CREATE TABLE "catalog_solicitantes" (
	"id" serial PRIMARY KEY NOT NULL,
	"valor" text NOT NULL,
	"activo" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "catalog_solicitantes_valor_unique" UNIQUE("valor")
);
--> statement-breakpoint
CREATE TABLE "catalog_soluciones" (
	"id" serial PRIMARY KEY NOT NULL,
	"valor" text NOT NULL,
	"unidadNegocioId" integer,
	"activo" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "catalog_soluciones_valor_unique" UNIQUE("valor")
);
--> statement-breakpoint
CREATE TABLE "catalog_tecnicos_internos" (
	"id" serial PRIMARY KEY NOT NULL,
	"valor" text NOT NULL,
	"activo" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "catalog_tecnicos_internos_valor_unique" UNIQUE("valor")
);
--> statement-breakpoint
CREATE TABLE "catalog_tipo_venta" (
	"id" serial PRIMARY KEY NOT NULL,
	"valor" text NOT NULL,
	"activo" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "catalog_tipo_venta_valor_unique" UNIQUE("valor")
);
--> statement-breakpoint
CREATE TABLE "catalog_tipos_gasto" (
	"id" serial PRIMARY KEY NOT NULL,
	"valor" text NOT NULL,
	"activo" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "catalog_tipos_gasto_valor_unique" UNIQUE("valor")
);
--> statement-breakpoint
CREATE TABLE "catalog_tipos_pago" (
	"id" serial PRIMARY KEY NOT NULL,
	"valor" text NOT NULL,
	"activo" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "catalog_tipos_pago_valor_unique" UNIQUE("valor")
);
--> statement-breakpoint
CREATE TABLE "catalog_unidades_negocio" (
	"id" serial PRIMARY KEY NOT NULL,
	"valor" text NOT NULL,
	"activo" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "catalog_unidades_negocio_valor_unique" UNIQUE("valor")
);
--> statement-breakpoint
CREATE TABLE "evaluaciones" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"expedienteId" integer NOT NULL,
	"unidadNegocios" text,
	"empresa" text,
	"centroCostoHeader" text,
	"solucion" text,
	"tipoMoneda" text,
	"montoProyecto" double precision,
	"tipoCambio" double precision,
	"totalClp" double precision,
	"descripcion" text,
	"preventa" text,
	"fechaEntrega" timestamp,
	"ejecutivoComercial" text,
	"plazoImplementacion" text,
	"propuestaNumero" text,
	"paisImplementacion" text,
	"rut" text,
	"nombreCliente" text,
	"nombreFantasia" text,
	"hardware" text,
	"materiales" text,
	"rrhh" text,
	"otrosGastos" text,
	"totalHardware" double precision,
	"totalMateriales" double precision,
	"totalRrhh" double precision,
	"totalOtros" double precision,
	"totalGastos" double precision,
	"firmaImagen" text,
	"f2FormStatus" text DEFAULT 'nuevo' NOT NULL,
	"f2SavedAt" timestamp,
	"status" text DEFAULT 'borrador' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "evaluaciones_expedienteId_unique" UNIQUE("expedienteId")
);
--> statement-breakpoint
CREATE TABLE "expedientes" (
	"id" serial PRIMARY KEY NOT NULL,
	"nombre" text NOT NULL,
	"creadorId" integer NOT NULL,
	"status" text DEFAULT 'borrador' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"deleted_at" integer
);
--> statement-breakpoint
CREATE TABLE "implementaciones" (
	"id" serial PRIMARY KEY NOT NULL,
	"expedienteId" integer NOT NULL,
	"checkKey" text NOT NULL,
	"estado" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "resultados_expediente" (
	"id" serial PRIMARY KEY NOT NULL,
	"expedienteId" integer NOT NULL,
	"payload" text NOT NULL,
	"f3FormStatus" text DEFAULT 'nuevo' NOT NULL,
	"f3SavedAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "resultados_expediente_expedienteId_unique" UNIQUE("expedienteId")
);
--> statement-breakpoint
CREATE TABLE "roles" (
	"id" serial PRIMARY KEY NOT NULL,
	"nombre" text NOT NULL,
	"label" text NOT NULL,
	"descripcion" text,
	"activo" integer DEFAULT 1 NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "roles_nombre_unique" UNIQUE("nombre")
);
--> statement-breakpoint
CREATE TABLE "sch_bloques_horario" (
	"id" serial PRIMARY KEY NOT NULL,
	"contratoId" integer NOT NULL,
	"diaSemana" integer NOT NULL,
	"horaInicio" text NOT NULL,
	"horaFin" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sch_contratos" (
	"id" serial PRIMARY KEY NOT NULL,
	"empleadoId" integer NOT NULL,
	"fechaInicio" text NOT NULL,
	"fechaFin" text,
	"horasDiarias" double precision NOT NULL,
	"diasSemana" text NOT NULL,
	"tipoDistribucion" text DEFAULT 'normal' NOT NULL,
	"mismasHorasDiarias" integer DEFAULT 1 NOT NULL,
	"activo" integer DEFAULT 1 NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sch_empleados" (
	"id" serial PRIMARY KEY NOT NULL,
	"nombre" text NOT NULL,
	"apellido" text NOT NULL,
	"cargo" text,
	"activo" integer DEFAULT 1 NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_roles" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"roleId" integer NOT NULL,
	"assignedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"passwordHash" text NOT NULL,
	"displayName" text,
	"role" text DEFAULT 'user' NOT NULL,
	"roleId" integer,
	"isActive" integer DEFAULT 1 NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"lastSignedIn" timestamp,
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
ALTER TABLE "actas" ADD CONSTRAINT "actas_expedienteId_expedientes_id_fk" FOREIGN KEY ("expedienteId") REFERENCES "public"."expedientes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalog_detalle_servicio" ADD CONSTRAINT "catalog_detalle_servicio_solucionId_catalog_soluciones_id_fk" FOREIGN KEY ("solucionId") REFERENCES "public"."catalog_soluciones"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalog_soluciones" ADD CONSTRAINT "catalog_soluciones_unidadNegocioId_catalog_unidades_negocio_id_fk" FOREIGN KEY ("unidadNegocioId") REFERENCES "public"."catalog_unidades_negocio"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evaluaciones" ADD CONSTRAINT "evaluaciones_expedienteId_expedientes_id_fk" FOREIGN KEY ("expedienteId") REFERENCES "public"."expedientes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "implementaciones" ADD CONSTRAINT "implementaciones_expedienteId_expedientes_id_fk" FOREIGN KEY ("expedienteId") REFERENCES "public"."expedientes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resultados_expediente" ADD CONSTRAINT "resultados_expediente_expedienteId_expedientes_id_fk" FOREIGN KEY ("expedienteId") REFERENCES "public"."expedientes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "implementaciones_expedienteId_checkKey_unique" ON "implementaciones" USING btree ("expedienteId","checkKey");