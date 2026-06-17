#!/usr/bin/env tsx
/**
 * migrate-sqlite-to-pg.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Migra datos de una base de datos SQLite (gestion.db) a PostgreSQL.
 *
 * Uso:
 *   # Dentro del contenedor sga (después de docker-compose up):
 *   docker exec -it sga_app npx tsx scripts/migrate-sqlite-to-pg.ts
 *
 *   # O directamente si tienes acceso al VPS:
 *   SQLITE_PATH=/ruta/a/gestion.db DATABASE_URL=postgresql://... npx tsx scripts/migrate-sqlite-to-pg.ts
 *
 * Variables de entorno:
 *   SQLITE_PATH   Ruta al archivo SQLite (default: ./gestion.db)
 *   DATABASE_URL  URL de PostgreSQL (requerido)
 *   DRY_RUN       Si es "true", solo muestra conteos sin insertar (default: false)
 *
 * Orden de migración (respeta FK):
 *   1. roles
 *   2. users
 *   3. user_roles
 *   4. expedientes
 *   5. actas
 *   6. evaluaciones
 *   7. resultados_expediente
 *   8. implementaciones
 *   9. sch_empleados
 *  10. sch_contratos
 *  11. sch_bloques_horario
 *  12. audit_log
 *  13. catalog_* (todos los catálogos)
 *  14. catalog_meta
 * ─────────────────────────────────────────────────────────────────────────────
 */

import * as BetterSqlite from 'better-sqlite3';
import { Pool } from 'pg';
import { join } from 'path';
import { existsSync } from 'fs';

// ── Config ────────────────────────────────────────────────────────────────────
const SQLITE_PATH = process.env.SQLITE_PATH ?? join(process.cwd(), 'gestion.db');
const DATABASE_URL = process.env.DATABASE_URL;
const DRY_RUN = process.env.DRY_RUN === 'true';

if (!DATABASE_URL) {
  console.error('[ERROR] DATABASE_URL no definido. Ejemplo:');
  console.error('  DATABASE_URL=postgresql://sga_user:pass@localhost:5432/sga_db npx tsx scripts/migrate-sqlite-to-pg.ts');
  process.exit(1);
}

if (!existsSync(SQLITE_PATH)) {
  console.error(`[ERROR] No se encontró el archivo SQLite en: ${SQLITE_PATH}`);
  console.error('  Define SQLITE_PATH=/ruta/a/gestion.db');
  process.exit(1);
}

// ── Conexiones ────────────────────────────────────────────────────────────────
const sqlite = new (BetterSqlite as any).default(SQLITE_PATH, { readonly: true }) as BetterSqlite.Database;
const pg = new Pool({ connectionString: DATABASE_URL });

// ── Helpers ───────────────────────────────────────────────────────────────────
function log(msg: string) { console.log(`[MIGRATE] ${msg}`); }
function warn(msg: string) { console.warn(`[WARN]    ${msg}`); }

/** Convierte timestamp SQLite (segundos epoch) a Date o null */
function toDate(val: number | null | undefined): Date | null {
  if (val == null) return null;
  // SQLite guarda timestamps en segundos, PostgreSQL espera Date
  return new Date(val * 1000);
}

/** Migra una tabla genérica de SQLite a PostgreSQL */
async function migrateTable(
  tableName: string,
  transform: (row: Record<string, any>) => Record<string, any>,
  conflictColumn = 'id'
): Promise<number> {
  const rows = sqlite.prepare(`SELECT * FROM ${tableName}`).all() as Record<string, any>[];

  if (rows.length === 0) {
    log(`  ${tableName}: 0 filas — omitida`);
    return 0;
  }

  if (DRY_RUN) {
    log(`  ${tableName}: ${rows.length} filas (DRY_RUN — no insertado)`);
    return rows.length;
  }

  let inserted = 0;
  let skipped = 0;

  for (const row of rows) {
    const transformed = transform(row);
    const keys = Object.keys(transformed);
    const values = Object.values(transformed);
    const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
    const cols = keys.map(k => `"${k}"`).join(', ');

    try {
      await pg.query(
        `INSERT INTO ${tableName} (${cols}) VALUES (${placeholders})
         ON CONFLICT ("${conflictColumn}") DO NOTHING`,
        values
      );
      inserted++;
    } catch (err: any) {
      warn(`  ${tableName} id=${row.id}: ${err.message}`);
      skipped++;
    }
  }

  log(`  ${tableName}: ${inserted} insertadas, ${skipped} omitidas (de ${rows.length})`);
  return inserted;
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  log('═══════════════════════════════════════════════════════');
  log(`SQLite: ${SQLITE_PATH}`);
  log(`PostgreSQL: ${DATABASE_URL!.replace(/:([^@]+)@/, ':***@')}`);
  log(`DRY_RUN: ${DRY_RUN}`);
  log('═══════════════════════════════════════════════════════');

  // Verificar conexión PG
  try {
    await pg.query('SELECT 1');
    log('Conexión PostgreSQL: OK');
  } catch (err: any) {
    console.error('[ERROR] No se pudo conectar a PostgreSQL:', err.message);
    process.exit(1);
  }

  // Verificar tablas SQLite
  const tables = sqlite.prepare(
    "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
  ).all() as { name: string }[];
  log(`Tablas SQLite encontradas: ${tables.map(t => t.name).join(', ')}`);

  // ── Migración en orden (respeta FK) ──────────────────────────────────────
  log('\n── 1. roles ──');
  await migrateTable('roles', row => ({
    id: row.id,
    nombre: row.nombre,
    label: row.label,
    descripcion: row.descripcion ?? null,
    activo: row.activo ?? 1,
    createdAt: toDate(row.createdAt) ?? new Date(),
    updatedAt: toDate(row.updatedAt) ?? new Date(),
  }));

  log('\n── 2. users ──');
  await migrateTable('users', row => ({
    id: row.id,
    username: row.username,
    passwordHash: row.passwordHash,
    displayName: row.displayName ?? null,
    role: row.role ?? 'user',
    roleId: row.roleId ?? null,
    isActive: row.isActive ?? 1,
    createdAt: toDate(row.createdAt) ?? new Date(),
    updatedAt: toDate(row.updatedAt) ?? new Date(),
    lastSignedIn: toDate(row.lastSignedIn),
  }));

  log('\n── 3. user_roles ──');
  await migrateTable('user_roles', row => ({
    id: row.id,
    userId: row.userId,
    roleId: row.roleId,
    assignedAt: toDate(row.assignedAt) ?? new Date(),
  }));

  log('\n── 4. expedientes ──');
  await migrateTable('expedientes', row => ({
    id: row.id,
    nombre: row.nombre,
    creadorId: row.creadorId,
    status: row.status ?? 'borrador',
    createdAt: toDate(row.createdAt) ?? new Date(),
    updatedAt: toDate(row.updatedAt) ?? new Date(),
    deleted_at: row.deleted_at ?? null,
  }));

  log('\n── 5. actas ──');
  await migrateTable('actas', row => ({
    id: row.id,
    userId: row.userId,
    expedienteId: row.expedienteId,
    nro_acta: row.nro_acta ?? null,
    codigo: row.codigo ?? null,
    noActa: row.noActa ?? null,
    atencion: row.atencion ?? null,
    fecha: row.fecha ? new Date(row.fecha * 1000) : null,
    razonSocial: row.razonSocial ?? null,
    nombreFantasia: row.nombreFantasia ?? null,
    rucDniRut: row.rucDniRut ?? null,
    direccionComercial: row.direccionComercial ?? null,
    representanteLegal: row.representanteLegal ?? null,
    representanteDni: row.representanteDni ?? null,
    representanteEmail: row.representanteEmail ?? null,
    representanteFono: row.representanteFono ?? null,
    contactoTecnico: row.contactoTecnico ?? null,
    contactoTecnicoEmail: row.contactoTecnicoEmail ?? null,
    contactoTecnicoFono: row.contactoTecnicoFono ?? null,
    contactoFacturacion: row.contactoFacturacion ?? null,
    contactoFacturacionEmail: row.contactoFacturacionEmail ?? null,
    contactoFacturacionFono: row.contactoFacturacionFono ?? null,
    serviciosContratados: row.serviciosContratados ?? null,
    formasPagoImplementacion: row.formasPagoImplementacion ?? null,
    formasPagoMantencion: row.formasPagoMantencion ?? null,
    status: row.status ?? 'borrador',
    f1Datos: row.f1Datos ?? null,
    f1FormStatus: row.f1FormStatus ?? 'nuevo',
    f1SavedAt: toDate(row.f1SavedAt),
    createdAt: toDate(row.createdAt) ?? new Date(),
    updatedAt: toDate(row.updatedAt) ?? new Date(),
  }));

  log('\n── 6. evaluaciones ──');
  await migrateTable('evaluaciones', row => ({
    id: row.id,
    userId: row.userId,
    expedienteId: row.expedienteId,
    unidadNegocios: row.unidadNegocios ?? null,
    empresa: row.empresa ?? null,
    centroCostoHeader: row.centroCostoHeader ?? null,
    solucion: row.solucion ?? null,
    tipoMoneda: row.tipoMoneda ?? null,
    montoProyecto: row.montoProyecto ?? null,
    tipoCambio: row.tipoCambio ?? null,
    totalClp: row.totalClp ?? null,
    descripcion: row.descripcion ?? null,
    preventa: row.preventa ?? null,
    fechaEntrega: toDate(row.fechaEntrega),
    ejecutivoComercial: row.ejecutivoComercial ?? null,
    plazoImplementacion: row.plazoImplementacion ?? null,
    propuestaNumero: row.propuestaNumero ?? null,
    paisImplementacion: row.paisImplementacion ?? null,
    rut: row.rut ?? null,
    nombreCliente: row.nombreCliente ?? null,
    nombreFantasia: row.nombreFantasia ?? null,
    hardware: row.hardware ?? null,
    materiales: row.materiales ?? null,
    rrhh: row.rrhh ?? null,
    otrosGastos: row.otrosGastos ?? null,
    totalHardware: row.totalHardware ?? null,
    totalMateriales: row.totalMateriales ?? null,
    totalRrhh: row.totalRrhh ?? null,
    totalOtros: row.totalOtros ?? null,
    totalGastos: row.totalGastos ?? null,
    firmaImagen: row.firmaImagen ?? null,
    f2FormStatus: row.f2FormStatus ?? 'nuevo',
    f2SavedAt: toDate(row.f2SavedAt),
    status: row.status ?? 'borrador',
    createdAt: toDate(row.createdAt) ?? new Date(),
    updatedAt: toDate(row.updatedAt) ?? new Date(),
  }));

  log('\n── 7. resultados_expediente ──');
  await migrateTable('resultados_expediente', row => ({
    id: row.id,
    expedienteId: row.expedienteId,
    payload: row.payload,
    f3FormStatus: row.f3FormStatus ?? 'nuevo',
    f3SavedAt: toDate(row.f3SavedAt),
    createdAt: toDate(row.createdAt) ?? new Date(),
    updatedAt: toDate(row.updatedAt) ?? new Date(),
  }));

  log('\n── 8. implementaciones ──');
  await migrateTable('implementaciones', row => ({
    id: row.id,
    expedienteId: row.expedienteId,
    checkKey: row.checkKey,
    estado: row.estado ?? 0,
    createdAt: toDate(row.createdAt) ?? new Date(),
    updatedAt: toDate(row.updatedAt) ?? new Date(),
  }));

  log('\n── 9. sch_empleados ──');
  await migrateTable('sch_empleados', row => ({
    id: row.id,
    nombre: row.nombre,
    apellido: row.apellido,
    cargo: row.cargo ?? null,
    activo: row.activo ?? 1,
    createdAt: toDate(row.createdAt) ?? new Date(),
    updatedAt: toDate(row.updatedAt) ?? new Date(),
  }));

  log('\n── 10. sch_contratos ──');
  await migrateTable('sch_contratos', row => ({
    id: row.id,
    empleadoId: row.empleadoId,
    fechaInicio: row.fechaInicio,
    fechaFin: row.fechaFin ?? null,
    horasDiarias: row.horasDiarias,
    diasSemana: row.diasSemana,
    tipoDistribucion: row.tipoDistribucion ?? 'normal',
    mismasHorasDiarias: row.mismasHorasDiarias ?? 1,
    activo: row.activo ?? 1,
    createdAt: toDate(row.createdAt) ?? new Date(),
    updatedAt: toDate(row.updatedAt) ?? new Date(),
  }));

  log('\n── 11. sch_bloques_horario ──');
  await migrateTable('sch_bloques_horario', row => ({
    id: row.id,
    contratoId: row.contratoId,
    diaSemana: row.diaSemana,
    horaInicio: row.horaInicio,
    horaFin: row.horaFin,
    createdAt: toDate(row.createdAt) ?? new Date(),
  }));

  log('\n── 12. audit_log ──');
  await migrateTable('audit_log', row => ({
    id: row.id,
    userId: row.userId ?? null,
    username: row.username,
    action: row.action,
    entity: row.entity,
    entityId: row.entityId ?? null,
    expedienteId: row.expedienteId ?? null,
    actaCodigo: row.actaCodigo ?? null,
    changes: row.changes ?? null,
    ip: row.ip ?? null,
    createdAt: toDate(row.createdAt) ?? new Date(),
  }));

  // ── Catálogos simples (id, valor, activo) ─────────────────────────────────
  const simpleCatalogs = [
    'catalog_monedas', 'catalog_paises', 'catalog_empresas',
    'catalog_documento_identidad', 'catalog_unidades_negocio',
    'catalog_tipo_venta', 'catalog_plazos', 'catalog_documentos',
    'catalog_cecos', 'catalog_departamentos', 'catalog_areas',
    'catalog_preventas', 'catalog_conceptos_gasto', 'catalog_gerencias',
    'catalog_solicitantes', 'catalog_flujos_aprobacion', 'catalog_tipos_gasto',
    'catalog_proyectos', 'catalog_tipos_pago', 'catalog_especialistas_externos',
    'catalog_tecnicos_internos', 'catalog_nros_acta', 'catalog_ejecutivos_atencion',
    'catalog_sets', 'catalog_nombres',
  ];

  log('\n── 13. Catálogos simples ──');
  for (const tbl of simpleCatalogs) {
    // Verificar si la tabla existe en SQLite
    const exists = sqlite.prepare(
      `SELECT name FROM sqlite_master WHERE type='table' AND name='${tbl}'`
    ).get();
    if (!exists) { warn(`  ${tbl}: no existe en SQLite — omitida`); continue; }
    await migrateTable(tbl, row => ({
      id: row.id,
      valor: row.valor,
      activo: row.activo ?? 1,
    }));
  }

  log('\n── catalog_soluciones (con FK unidadNegocioId) ──');
  const solExists = sqlite.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='catalog_soluciones'").get();
  if (solExists) {
    await migrateTable('catalog_soluciones', row => ({
      id: row.id,
      valor: row.valor,
      unidadNegocioId: row.unidadNegocioId ?? null,
      activo: row.activo ?? 1,
    }));
  }

  log('\n── catalog_detalle_servicio (con FK solucionId) ──');
  const detExists = sqlite.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='catalog_detalle_servicio'").get();
  if (detExists) {
    await migrateTable('catalog_detalle_servicio', row => ({
      id: row.id,
      valor: row.valor,
      solucionId: row.solucionId ?? null,
      activo: row.activo ?? 1,
    }));
  }

  log('\n── catalog_consideraciones_comerciales ──');
  const ccExists = sqlite.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='catalog_consideraciones_comerciales'").get();
  if (ccExists) {
    await migrateTable('catalog_consideraciones_comerciales', row => ({
      id: row.id,
      valor: row.valor,
      orden: row.orden ?? 0,
      activo: row.activo ?? 1,
      persistente: row.persistente ?? 0,
    }));
  }

  log('\n── catalog_implementacion_items ──');
  const ciExists = sqlite.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='catalog_implementacion_items'").get();
  if (ciExists) {
    await migrateTable('catalog_implementacion_items', row => ({
      id: row.id,
      key: row.key,
      label: row.label,
      descripcion: row.descripcion ?? '',
      orden: row.orden ?? 0,
      activo: row.activo ?? 1,
    }));
  }

  log('\n── catalog_clausulas ──');
  const clExists = sqlite.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='catalog_clausulas'").get();
  if (clExists) {
    await migrateTable('catalog_clausulas', row => ({
      id: row.id,
      valor: row.valor,
      unidadNegocioId: row.unidadNegocioId ?? null,
      filePath: row.filePath,
      fileName: row.fileName,
      fileSize: row.fileSize ?? null,
      activo: row.activo ?? 1,
      siempre_incluir: row.siempre_incluir ?? 0,
      tipo: row.tipo ?? 'clausula',
      orden_global: row.orden_global ?? 50,
      createdAt: toDate(row.createdAt) ?? new Date(),
    }));
  }

  log('\n── 14. catalog_meta ──');
  const cmExists = sqlite.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='catalog_meta'").get();
  if (cmExists) {
    await migrateTable('catalog_meta', row => ({
      id: row.id,
      table_name: row.table_name ?? row.tableName,
      title: row.title,
      is_custom: row.is_custom ?? row.isCustom ?? 0,
      linked_field: row.linked_field ?? row.linkedField ?? null,
      created_at: toDate(row.created_at ?? row.createdAt) ?? new Date(),
    }), 'table_name');
  }

  // ── Actualizar secuencias de PostgreSQL (SERIAL) ──────────────────────────
  if (!DRY_RUN) {
    log('\n── Actualizando secuencias SERIAL de PostgreSQL ──');
    const seqTables = [
      'roles', 'users', 'user_roles', 'expedientes', 'actas', 'evaluaciones',
      'resultados_expediente', 'implementaciones', 'sch_empleados', 'sch_contratos',
      'sch_bloques_horario', 'audit_log', 'catalog_monedas', 'catalog_paises',
      'catalog_empresas', 'catalog_documento_identidad', 'catalog_unidades_negocio',
      'catalog_soluciones', 'catalog_detalle_servicio', 'catalog_tipo_venta',
      'catalog_plazos', 'catalog_documentos', 'catalog_cecos', 'catalog_departamentos',
      'catalog_areas', 'catalog_nombres', 'catalog_consideraciones_comerciales',
      'catalog_implementacion_items', 'catalog_preventas', 'catalog_conceptos_gasto',
      'catalog_gerencias', 'catalog_solicitantes', 'catalog_flujos_aprobacion',
      'catalog_tipos_gasto', 'catalog_proyectos', 'catalog_tipos_pago',
      'catalog_especialistas_externos', 'catalog_tecnicos_internos', 'catalog_nros_acta',
      'catalog_ejecutivos_atencion', 'catalog_sets', 'catalog_clausulas', 'catalog_meta',
    ];

    for (const tbl of seqTables) {
      try {
        await pg.query(`SELECT setval(pg_get_serial_sequence('${tbl}', 'id'), COALESCE(MAX(id), 1)) FROM ${tbl}`);
        log(`  Secuencia ${tbl}.id actualizada`);
      } catch (err: any) {
        warn(`  Secuencia ${tbl}: ${err.message}`);
      }
    }
  }

  log('\n═══════════════════════════════════════════════════════');
  log('✅ Migración completada.');
  log('═══════════════════════════════════════════════════════');

  sqlite.close();
  await pg.end();
}

main().catch(err => {
  console.error('[ERROR FATAL]', err);
  process.exit(1);
});
