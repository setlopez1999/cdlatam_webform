/**
 * seed-catalogs.mjs
 * Importa todos los catálogos del Excel (hoja "Base de datos") a MySQL.
 * Ejecutar: node scripts/seed-catalogs.mjs
 */

import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import dotenv from "dotenv";
dotenv.config();

// ─── Datos extraídos del Excel ────────────────────────────────────────────────

const MONEDAS = [
  { codigo: "USD", nombre: "USD-DÓLAR" },
  { codigo: "ARS", nombre: "ARS-ARGENTINA" },
  { codigo: "CLP", nombre: "CLP-CHILE" },
  { codigo: "COP", nombre: "COP-COLOMBIA" },
  { codigo: "SOL", nombre: "SOL-PERÚ" },
  { codigo: "UF",  nombre: "UF-CHILE" },
];

const PAISES = [
  "CHILE", "PERÚ", "COLOMBIA", "COSTA RICA", "ECUADOR",
  "ARGENTINA", "PANAMA", "ESPAÑA", "NICARAGUA",
  "REPUBLICA DOMINICANA", "HONDURAS", "CANADA", "MEXICO", "PUERTO RICO",
];

const UNIDADES_NEGOCIO = [
  "TV SOLUTION",
  "TX CHANNEL",
  "SERVICIOS DE INGENIERÍA",
  "SVA",
  "HOSPITALITY",
];

const SOLUCIONES = [
  "INTEGRADOR PÚBLICO CABLEOPERADOR",
  "INTEGRADOR PRIVADO CABLEOPERADOR",
  "ISP INDEPENDIENTE",
  "CABLEOPERADOR INDEPENDIENTE",
  "INTEGRADOR PÚBLICO ISP",
  "INTEGRADOR PRIVADO ISP",
  "INTEGRADOR PÚBLICO TELCO",
  "INTEGRADOR PRIVADO TELCO",
  "INTEGRADOR PÚBLICO GOBIERNO",
  "INTEGRADOR PRIVADO GOBIERNO",
  "INTEGRADOR PÚBLICO CORPORATIVO",
  "INTEGRADOR PRIVADO CORPORATIVO",
  "INTEGRADOR PÚBLICO HOTEL",
  "INTEGRADOR PRIVADO HOTEL",
  "PINES GAMING",
  "TVSOLUTION BÁSICA HOTEL",
  "TVSOLUTION AVANZADA HOTEL",
];

const DETALLE_SERVICIO = [
  "CABECERA PRINCIPAL",
  "CABECERA SECUNDARIA",
  "SUCURSAL IP",
  "SUCURSAL RF",
  "SUCURSAL IP + RF",
  "ENCODER",
  "TRANSCODIFICADOR",
  "PLAYOUT",
  "MONITOREO",
  "MIDDLEWARE",
  "APLICACIONES OTT",
  "APLICACIONES IPTV",
  "SOPORTE Y MANTENCIÓN",
  "CAPACITACIÓN",
  "CONSULTORÍA",
  "INSTALACIÓN",
  "CONFIGURACIÓN",
  "INTEGRACIÓN",
  "DELIVERY SEÑAL IP A.NACIONAL",
  "DELIVERY SEÑAL IP A.INTERNACIONAL",
  "APLICACIONES STREAMING",
  "APLICACIONES GAMING",
];

const TIPO_VENTA = [
  "IMPLEMENTACIÓN",
  "MANTENCIÓN",
  "VENTA EQUIPOS",
  "HABILITACIÓN",
  "DELIVERY",
  "ACTIVACIÓN",
  "EPG",
];

const PLAZOS = [
  "15 DÍAS",
  "30 DÍAS",
  "45 DÍAS",
  "60 DÍAS",
  "12 MESES",
  "24 MESES",
  "36 MESES",
  "48 MESES",
];

const DOCUMENTOS = ["RUC", "CC", "DNI", "RUT"];

// 61 CECOs completos del Excel
const CECOS = [
  // GN — Grupo Negocio (11)
  { codigo: "20101", empresa: "GN", departamento: "Legal",                                    nombreCompleto: "20101 GN Legal" },
  { codigo: "20102", empresa: "GN", departamento: "Administración Control y Gestión",         nombreCompleto: "20102 GN Administración Control y Gestión" },
  { codigo: "20103", empresa: "GN", departamento: "Contabilidad y Finanzas",                  nombreCompleto: "20103 GN Contabilidad y Finanzas" },
  { codigo: "20110", empresa: "GN", departamento: "Refacturación",                            nombreCompleto: "20110 GN Refacturación" },
  { codigo: "20204", empresa: "GN", departamento: "Desarrollo Comercial atención cliente",    nombreCompleto: "20204 GN Desarrollo Comercial atencion cliente" },
  { codigo: "20205", empresa: "GN", departamento: "Ventas",                                   nombreCompleto: "20205 GN Ventas" },
  { codigo: "20206", empresa: "GN", departamento: "Mercadeo",                                 nombreCompleto: "20206 GN Mercadeo" },
  { codigo: "20307", empresa: "GN", departamento: "Ingeniería Telecomunicaciones e Infraest", nombreCompleto: "20307 GN Ingenieria Teleco e Infraest" },
  { codigo: "20308", empresa: "GN", departamento: "Desarrollo",                               nombreCompleto: "20308 GN Desarrollo" },
  { codigo: "20309", empresa: "GN", departamento: "Continuidad Operacional",                  nombreCompleto: "20309 GN Continuidad Operacional" },
  { codigo: "20401", empresa: "GN", departamento: "Gerencia General",                         nombreCompleto: "20401 GN Gerencia General" },
  // TP — Trapemn (10)
  { codigo: "30101", empresa: "TP", departamento: "Legal",                                    nombreCompleto: "30101 TP Legal" },
  { codigo: "30102", empresa: "TP", departamento: "Administración Control y Gestión",         nombreCompleto: "30102 TP Administración Control y Gestión" },
  { codigo: "30103", empresa: "TP", departamento: "Contabilidad y Finanzas",                  nombreCompleto: "30103 TP Contabilidad y Finanzas" },
  { codigo: "30204", empresa: "TP", departamento: "Desarrollo Comercial atención cliente",    nombreCompleto: "30204 TP Desarrollo Comercial atencion cliente" },
  { codigo: "30205", empresa: "TP", departamento: "Ventas",                                   nombreCompleto: "30205 TP Ventas" },
  { codigo: "30206", empresa: "TP", departamento: "Mercadeo",                                 nombreCompleto: "30206 TP Mercadeo" },
  { codigo: "30307", empresa: "TP", departamento: "Ingeniería Telecomunicaciones e Infraest", nombreCompleto: "30307 TP Ingenieria Telecomunicaciones e Infraest" },
  { codigo: "30308", empresa: "TP", departamento: "Desarrollo",                               nombreCompleto: "30308 TP Desarrollo" },
  { codigo: "30309", empresa: "TP", departamento: "Continuidad Operacional",                  nombreCompleto: "30309 TP Continuidad Operacional" },
  { codigo: "30401", empresa: "TP", departamento: "Gerencia General",                         nombreCompleto: "30401 TP Gerencia General" },
  // CD — CDLatam (10)
  { codigo: "40101", empresa: "CD", departamento: "Legal",                                    nombreCompleto: "40101 CD Legal" },
  { codigo: "40102", empresa: "CD", departamento: "Administración Control y Gestión",         nombreCompleto: "40102 CD Administración Control y Gestión" },
  { codigo: "40103", empresa: "CD", departamento: "Contabilidad y Finanzas",                  nombreCompleto: "40103 CD Contabilidad y Finanzas" },
  { codigo: "40204", empresa: "CD", departamento: "Desarrollo Comercial atención cliente",    nombreCompleto: "40204 CD Desarrollo Comercial atencion cliente" },
  { codigo: "40205", empresa: "CD", departamento: "Ventas",                                   nombreCompleto: "40205 CD Ventas" },
  { codigo: "40206", empresa: "CD", departamento: "Mercadeo",                                 nombreCompleto: "40206 CD Mercadeo" },
  { codigo: "40307", empresa: "CD", departamento: "Ingeniería Telecomunicaciones e Infraest", nombreCompleto: "40307 CD Ingenieria Telecomunicaciones e Infraest" },
  { codigo: "40308", empresa: "CD", departamento: "Desarrollo",                               nombreCompleto: "40308 CD Desarrollo" },
  { codigo: "40309", empresa: "CD", departamento: "Continuidad Operacional",                  nombreCompleto: "40309 CD Continuidad Operacional" },
  { codigo: "40401", empresa: "CD", departamento: "Gerencia General",                         nombreCompleto: "40401 CD Gerencia General" },
  // GIM — GIM SAS (20)
  { codigo: "50101", empresa: "GIM", departamento: "Legal",                                    nombreCompleto: "50101 GIM Legal" },
  { codigo: "50102", empresa: "GIM", departamento: "Administración Control y Gestión",         nombreCompleto: "50102 GIM Administración Control y Gestión" },
  { codigo: "50103", empresa: "GIM", departamento: "Contabilidad y Finanzas",                  nombreCompleto: "50103 GIM Contabilidad y Finanzas" },
  { codigo: "50204", empresa: "GIM", departamento: "Desarrollo Comercial atención cliente",    nombreCompleto: "50204 GIM Desarrollo Comercial atencion cliente" },
  { codigo: "50205", empresa: "GIM", departamento: "Ventas",                                   nombreCompleto: "50205 GIM Ventas" },
  { codigo: "50206", empresa: "GIM", departamento: "Mercadeo",                                 nombreCompleto: "50206 GIM Mercadeo" },
  { codigo: "50307", empresa: "GIM", departamento: "Ingeniería Telecomunicaciones e Infraest", nombreCompleto: "50307 GIM Ingenieria Telecomunicaciones e Infraest" },
  { codigo: "50308", empresa: "GIM", departamento: "Desarrollo",                               nombreCompleto: "50308 GIM Desarrollo" },
  { codigo: "50309", empresa: "GIM", departamento: "Continuidad Operacional",                  nombreCompleto: "50309 GIM Continuidad Operacional" },
  { codigo: "50401", empresa: "GIM", departamento: "Gerencia General",                         nombreCompleto: "50401 GIM Gerencia General" },
  { codigo: "60101", empresa: "GIM", departamento: "SAS Legal",                                nombreCompleto: "60101 GIM SAS Legal" },
  { codigo: "60102", empresa: "GIM", departamento: "SAS Administración Control y Gestión",     nombreCompleto: "60102 GIM SAS Administración Control y Gestión" },
  { codigo: "60103", empresa: "GIM", departamento: "SAS Contabilidad y Finanzas",              nombreCompleto: "60103 GIM SAS Contabilidad y Finanzas" },
  { codigo: "60204", empresa: "GIM", departamento: "SAS Desarrollo Comercial atención cliente",nombreCompleto: "60204 GIM SAS Desarrollo Comercial atencion cliente" },
  { codigo: "60205", empresa: "GIM", departamento: "SAS Ventas",                               nombreCompleto: "60205 GIM SAS Ventas" },
  { codigo: "60206", empresa: "GIM", departamento: "SAS Mercadeo",                             nombreCompleto: "60206 GIM SAS Mercadeo" },
  { codigo: "60307", empresa: "GIM", departamento: "SAS Ingeniería Telecomunicaciones e Infraest", nombreCompleto: "60307 GIM SAS Ingenieria Telecomunicaciones e Infraest" },
  { codigo: "60308", empresa: "GIM", departamento: "SAS Desarrollo Comercial atención cliente",nombreCompleto: "60308 GIM SAS Desarrollo Comercial atencion cliente" },
  { codigo: "60309", empresa: "GIM", departamento: "SAS Continuidad Operacional",              nombreCompleto: "60309 GIM SAS Continuidad Operacional" },
  { codigo: "60401", empresa: "GIM", departamento: "SAS Gerencia General",                     nombreCompleto: "60401 GIM SAS Gerencia General" },
  // IPTV (10)
  { codigo: "70101", empresa: "IPTV", departamento: "Legal",                                    nombreCompleto: "70101 IPTV Legal" },
  { codigo: "70102", empresa: "IPTV", departamento: "Administración Control y Gestión",         nombreCompleto: "70102 IPTV Administración Control y Gestión" },
  { codigo: "70103", empresa: "IPTV", departamento: "Contabilidad y Finanzas",                  nombreCompleto: "70103 IPTV Contabilidad y Finanzas" },
  { codigo: "70204", empresa: "IPTV", departamento: "Desarrollo Comercial atención cliente",    nombreCompleto: "70204 IPTV Desarrollo Comercial atencion cliente" },
  { codigo: "70205", empresa: "IPTV", departamento: "Ventas",                                   nombreCompleto: "70205 IPTV Ventas" },
  { codigo: "70206", empresa: "IPTV", departamento: "Mercadeo",                                 nombreCompleto: "70206 IPTV Mercadeo" },
  { codigo: "70307", empresa: "IPTV", departamento: "Ingeniería Telecomunicaciones e Infraest", nombreCompleto: "70307 IPTV Ingenieria Telecomunicaciones e Infraest" },
  { codigo: "70308", empresa: "IPTV", departamento: "Desarrollo",                               nombreCompleto: "70308 IPTV Desarrollo" },
  { codigo: "70309", empresa: "IPTV", departamento: "Continuidad Operacional",                  nombreCompleto: "70309 IPTV Continuidad Operacional" },
  { codigo: "70401", empresa: "IPTV", departamento: "Gerencia General",                         nombreCompleto: "70401 IPTV Gerencia General" },
];

const CONTACTOS = [
  { nombre: "Bladi Gómez",      empresa: "Trapemn SPA" },
  { nombre: "Juan Garcia",      empresa: "Group In Motion SPA" },
  { nombre: "Martín Vernengo",  empresa: "CDLatam Chile" },
  { nombre: "Pablo Balaguero",  empresa: "CDLatam Chile" },
  { nombre: "Gustavo Ale",      empresa: "CDLatam Perú" },
  { nombre: "Dennis Reyes",     empresa: "CDLatam Perú" },
  { nombre: "Matias Lasalle",   empresa: "Group In Motion SPA" },
];

// ─── Seed ─────────────────────────────────────────────────────────────────────

async function seed() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL);
  const db = drizzle(connection);

  console.log("🌱 Iniciando seed de catálogos...\n");

  // Monedas
  for (const m of MONEDAS) {
    await connection.execute(
      "INSERT INTO catalog_monedas (codigo, nombre, activo) VALUES (?, ?, 1) ON DUPLICATE KEY UPDATE nombre=VALUES(nombre)",
      [m.codigo, m.nombre]
    );
  }
  console.log(`✓ Monedas: ${MONEDAS.length} registros`);

  // Países
  for (const p of PAISES) {
    await connection.execute(
      "INSERT INTO catalog_paises (nombre, activo) VALUES (?, 1) ON DUPLICATE KEY UPDATE nombre=VALUES(nombre)",
      [p]
    );
  }
  console.log(`✓ Países: ${PAISES.length} registros`);

  // Unidades de Negocio
  for (const u of UNIDADES_NEGOCIO) {
    await connection.execute(
      "INSERT INTO catalog_unidades_negocio (nombre, activo) VALUES (?, 1) ON DUPLICATE KEY UPDATE nombre=VALUES(nombre)",
      [u]
    );
  }
  console.log(`✓ Unidades de Negocio: ${UNIDADES_NEGOCIO.length} registros`);

  // Soluciones
  for (const s of SOLUCIONES) {
    await connection.execute(
      "INSERT INTO catalog_soluciones (nombre, activo) VALUES (?, 1) ON DUPLICATE KEY UPDATE nombre=VALUES(nombre)",
      [s]
    );
  }
  console.log(`✓ Soluciones: ${SOLUCIONES.length} registros`);

  // Detalle Servicio
  for (const d of DETALLE_SERVICIO) {
    await connection.execute(
      "INSERT INTO catalog_detalle_servicio (nombre, activo) VALUES (?, 1) ON DUPLICATE KEY UPDATE nombre=VALUES(nombre)",
      [d]
    );
  }
  console.log(`✓ Detalle Servicio: ${DETALLE_SERVICIO.length} registros`);

  // Tipo Venta
  for (const t of TIPO_VENTA) {
    await connection.execute(
      "INSERT INTO catalog_tipo_venta (nombre, activo) VALUES (?, 1) ON DUPLICATE KEY UPDATE nombre=VALUES(nombre)",
      [t]
    );
  }
  console.log(`✓ Tipos de Venta: ${TIPO_VENTA.length} registros`);

  // Plazos
  for (const p of PLAZOS) {
    await connection.execute(
      "INSERT INTO catalog_plazos (nombre, activo) VALUES (?, 1) ON DUPLICATE KEY UPDATE nombre=VALUES(nombre)",
      [p]
    );
  }
  console.log(`✓ Plazos: ${PLAZOS.length} registros`);

  // Documentos
  for (const d of DOCUMENTOS) {
    await connection.execute(
      "INSERT INTO catalog_documentos (nombre, activo) VALUES (?, 1) ON DUPLICATE KEY UPDATE nombre=VALUES(nombre)",
      [d]
    );
  }
  console.log(`✓ Documentos de Identidad: ${DOCUMENTOS.length} registros`);

  // CECOs
  for (const c of CECOS) {
    await connection.execute(
      "INSERT INTO catalog_cecos (codigo, empresa, departamento, nombreCompleto, activo) VALUES (?, ?, ?, ?, 1) ON DUPLICATE KEY UPDATE empresa=VALUES(empresa), departamento=VALUES(departamento), nombreCompleto=VALUES(nombreCompleto)",
      [c.codigo, c.empresa, c.departamento, c.nombreCompleto]
    );
  }
  console.log(`✓ CECOs: ${CECOS.length} registros`);

  // Contactos
  for (const c of CONTACTOS) {
    await connection.execute(
      "INSERT INTO catalog_contactos (nombre, empresa, activo) VALUES (?, ?, 1)",
      [c.nombre, c.empresa]
    );
  }
  console.log(`✓ Contactos: ${CONTACTOS.length} registros`);

  console.log("\n✅ Seed completado exitosamente!");
  console.log(`   Total: ${MONEDAS.length + PAISES.length + UNIDADES_NEGOCIO.length + SOLUCIONES.length + DETALLE_SERVICIO.length + TIPO_VENTA.length + PLAZOS.length + DOCUMENTOS.length + CECOS.length + CONTACTOS.length} registros importados`);

  await connection.end();
}

seed().catch(err => {
  console.error("❌ Error en seed:", err);
  process.exit(1);
});
