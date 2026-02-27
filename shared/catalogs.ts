/**
 * Catálogos de datos de referencia extraídos de la hoja "Base de datos" del Excel.
 * Estos catálogos alimentan los dropdowns y validaciones de los formularios.
 * Fuente: ActaEP_V6_mlecaros_19_102_2026.xlsx - Hoja "Base de datos"
 */

export const MONEDAS = [
  { value: "USD-DÓLAR", label: "USD - Dólar" },
  { value: "ARS-ARGENTINA", label: "ARS - Peso Argentino" },
  { value: "CLP-CHILE", label: "CLP - Peso Chileno" },
  { value: "COP-COLOMBIA", label: "COP - Peso Colombiano" },
  { value: "SOL-PERÚ", label: "SOL - Sol Peruano" },
  { value: "UF-CHILE", label: "UF - Unidad de Fomento Chile" },
] as const;

export const PAISES = [
  { value: "CHILE", label: "Chile" },
  { value: "PERÚ", label: "Perú" },
  { value: "COLOMBIA", label: "Colombia" },
  { value: "COSTA RICA", label: "Costa Rica" },
  { value: "ECUADOR", label: "Ecuador" },
  { value: "ARGENTINA", label: "Argentina" },
  { value: "PANAMA", label: "Panamá" },
  { value: "ESPAÑA", label: "España" },
  { value: "NICARAGUA", label: "Nicaragua" },
  { value: "REPUBLICA DOMINICANA", label: "República Dominicana" },
  { value: "HONDURAS", label: "Honduras" },
  { value: "CANADA", label: "Canadá" },
  { value: "MEXICO", label: "México" },
  { value: "PUERTO RICO", label: "Puerto Rico" },
] as const;

export const UNIDADES_NEGOCIO = [
  { value: "TV SOLUTION", label: "TV Solution" },
  { value: "TX CHANNEL", label: "TX Channel" },
  { value: "SERVICIOS DE INGENIERÍA", label: "Servicios de Ingeniería" },
  { value: "SVA", label: "SVA" },
  { value: "HOSPITALITY", label: "Hospitality" },
  { value: "SOLUCIÓN ESTÁNDAR", label: "Solución Estándar" },
  { value: "SOLUCIÓN AVANZADA", label: "Solución Avanzada" },
  { value: "UP GRADE", label: "Up Grade" },
  { value: "LANDING PAGE", label: "Landing Page" },
  { value: "BUNDLE APLICACIONES", label: "Bundle Aplicaciones" },
  { value: "KAIROS", label: "Kairos" },
  { value: "CÁMARAS", label: "Cámaras" },
  { value: "PINES GAMING", label: "Pines Gaming" },
  { value: "TVSOLUTION BÁSICA HOTEL", label: "TVSolution Básica Hotel" },
  { value: "TVSOLUTION AVANZADA HOTEL", label: "TVSolution Avanzada Hotel" },
] as const;

export const SOLUCIONES = [
  { value: "INTEGRADOR PÚBLICO CABLEOPERADOR", label: "Integrador Público Cableoperador" },
  { value: "INTEGRADOR PRIVADO CABLEOPERADOR", label: "Integrador Privado Cableoperador" },
  { value: "ISP INDEPENDIENTE", label: "ISP Independiente" },
  { value: "CABLEOPERADOR INDEPENDIENTE", label: "Cableoperador Independiente" },
  { value: "INTEGRADOR PÚBLICO ISP", label: "Integrador Público ISP" },
  { value: "INTEGRADOR PRIVADO ISP", label: "Integrador Privado ISP" },
] as const;

export const DETALLE_SERVICIO = [
  { value: "CABECERA PRINCIPAL", label: "Cabecera Principal" },
  { value: "CABECERA SECUNDARIA", label: "Cabecera Secundaria" },
  { value: "SUCURSAL IP", label: "Sucursal IP" },
  { value: "SUCURSAL RF", label: "Sucursal RF" },
  { value: "SUCURSAL IP + RF", label: "Sucursal IP + RF" },
  { value: "SUCURSAL MULTICDN", label: "Sucursal MultiCDN" },
  { value: "SUCURSAL HOSTEADA", label: "Sucursal Hosteada" },
  { value: "CABECERA SECUNDARIA MULTICDN", label: "Cabecera Secundaria MultiCDN" },
  { value: "CABECERA SECUNDARIA MULTIMARCA RF", label: "Cabecera Secundaria Multimarca RF" },
  { value: "CABECERA SECUNDARIA MULTIMARCA IP + RF", label: "Cabecera Secundaria Multimarca IP + RF" },
  { value: "DIAGNÓSTICO RED CORE", label: "Diagnóstico Red Core" },
  { value: "DISTRIBUCIÓN SEÑAL IP - INCLUYE CDN - DASHBOARD", label: "Distribución Señal IP - CDN - Dashboard" },
  { value: "DISTRIBUCIÓN SEÑAL IP - INCLUYE CDN - DASHBOARD - TRANSCODER", label: "Distribución Señal IP - CDN - Dashboard - Transcoder" },
  { value: "TRANSICIÓN", label: "Transición" },
  { value: "DELIVERY SEÑAL IP PLAYBOY", label: "Delivery Señal IP Playboy" },
  { value: "DELIVERY SEÑAL IP VENUS", label: "Delivery Señal IP Venus" },
  { value: "DELIVERY SEÑAL IP CLIC", label: "Delivery Señal IP Clic" },
  { value: "DELIVERY SEÑAL IP CORAZÓN", label: "Delivery Señal IP Corazón" },
  { value: "DELIVERY SEÑAL IP CINEMA", label: "Delivery Señal IP Cinema" },
  { value: "DELIVERY SEÑAL IP A.INTERNACIONAL", label: "Delivery Señal IP A. Internacional" },
  { value: "APLICACIONES STREAMING", label: "Aplicaciones Streaming" },
  { value: "APLICACIONES GAMING", label: "Aplicaciones Gaming" },
  { value: "EPG", label: "EPG" },
] as const;

export const TIPO_VENTA = [
  { value: "IMPLEMENTACIÓN", label: "Implementación" },
  { value: "MANTENCIÓN", label: "Mantención" },
  { value: "VENTA EQUIPOS", label: "Venta Equipos" },
  { value: "HABILITACIÓN", label: "Habilitación" },
  { value: "DELIVERY", label: "Delivery" },
  { value: "ACTIVACIÓN", label: "Activación" },
] as const;

export const PLAZOS = [
  { value: "15 DÍAS", label: "15 Días" },
  { value: "30 DÍAS", label: "30 Días" },
  { value: "45 DÍAS", label: "45 Días" },
  { value: "60 DÍAS", label: "60 Días" },
  { value: "12 MESES", label: "12 Meses" },
  { value: "24 MESES", label: "24 Meses" },
  { value: "36 MESES", label: "36 Meses" },
  { value: "48 MESES", label: "48 Meses" },
] as const;

export const DOCUMENTO_IDENTIDAD = [
  { value: "RUC", label: "RUC" },
  { value: "CC", label: "CC" },
  { value: "DNI", label: "DNI" },
  { value: "RUT", label: "RUT" },
] as const;

export const CECOS = [
  // GN - Grupo Negocios
  { value: "20101 GN Legal", label: "20101 GN Legal", empresa: "GN", departamento: "ADM", area: "LEGAL" },
  { value: "20102 GN Administración Control y Gestión", label: "20102 GN Administración Control y Gestión", empresa: "GN", departamento: "ADM", area: "CONT Y FIN" },
  { value: "20103 GN Contabilidad y Finanzas", label: "20103 GN Contabilidad y Finanzas", empresa: "GN", departamento: "ADM", area: "DESARROLLO COMER" },
  { value: "20110 GN Refacturación", label: "20110 GN Refacturación", empresa: "GN", departamento: "ADM", area: "VENTAS" },
  { value: "20204 GN Desarrollo Comercial atencion cliente", label: "20204 GN Desarrollo Comercial", empresa: "GN", departamento: "COM", area: "MERCADO" },
  { value: "20205 GN Ventas", label: "20205 GN Ventas", empresa: "GN", departamento: "COM", area: "ITI" },
  { value: "20206 GN Mercadeo", label: "20206 GN Mercadeo", empresa: "GN", departamento: "COM", area: "DESARROLLO" },
  { value: "20307 GN Ingenieria Teleco e Infraest", label: "20307 GN Ingeniería Teleco e Infraest", empresa: "GN", departamento: "OPE", area: "CONTINUIDAD OPER" },
  { value: "20308 GN Desarrollo", label: "20308 GN Desarrollo", empresa: "GN", departamento: "OPE", area: "" },
  { value: "20309 GN Continuidad Operacional", label: "20309 GN Continuidad Operacional", empresa: "GN", departamento: "OPE", area: "" },
  { value: "20401 GN Gerencia General", label: "20401 GN Gerencia General", empresa: "GN", departamento: "OPE", area: "" },
  // TP - Trapemn
  { value: "30101 TP Legal", label: "30101 TP Legal", empresa: "TR", departamento: "ADM", area: "LEGAL" },
  { value: "30102 TP Administración Control y Gestión", label: "30102 TP Administración Control y Gestión", empresa: "TR", departamento: "ADM", area: "CONT Y FIN" },
  { value: "30103 TP Contabilidad y Finanzas", label: "30103 TP Contabilidad y Finanzas", empresa: "TR", departamento: "ADM", area: "" },
  { value: "30204 TP Desarrollo Comercial atencion cliente", label: "30204 TP Desarrollo Comercial", empresa: "TR", departamento: "COM", area: "" },
  { value: "30205 TP Ventas", label: "30205 TP Ventas", empresa: "TR", departamento: "COM", area: "" },
  { value: "30206 TP Mercadeo", label: "30206 TP Mercadeo", empresa: "TR", departamento: "COM", area: "" },
  { value: "30307 TP Ingenieria Telecomunicaciones e Infraestructura", label: "30307 TP Ingeniería Teleco e Infraestructura", empresa: "TR", departamento: "OPE", area: "" },
  { value: "30308 TP Desarrollo", label: "30308 TP Desarrollo", empresa: "TR", departamento: "OPE", area: "" },
  { value: "30309 TP Continuidad Operacional", label: "30309 TP Continuidad Operacional", empresa: "TR", departamento: "OPE", area: "" },
  { value: "30401 TP Gerencia General", label: "30401 TP Gerencia General", empresa: "TR", departamento: "OPE", area: "" },
  // CD - CDLatam
  { value: "40101 CD Legal", label: "40101 CD Legal", empresa: "CD", departamento: "ADM", area: "" },
  { value: "40102 CD Administración Control y Gestión", label: "40102 CD Administración Control y Gestión", empresa: "CD", departamento: "ADM", area: "" },
  { value: "40103 CD Contabilidad y Finanzas", label: "40103 CD Contabilidad y Finanzas", empresa: "CD", departamento: "ADM", area: "" },
  { value: "40204 CD Desarrollo Comercial atencion cliente", label: "40204 CD Desarrollo Comercial", empresa: "CD", departamento: "COM", area: "" },
  { value: "40205 CD Ventas", label: "40205 CD Ventas", empresa: "CD", departamento: "COM", area: "" },
  { value: "40206 CD Mercadeo", label: "40206 CD Mercadeo", empresa: "CD", departamento: "COM", area: "" },
  { value: "40307 CD Ingenieria Telecomunicaciones e Infraest", label: "40307 CD Ingeniería Teleco e Infraest", empresa: "CD", departamento: "OPE", area: "" },
  { value: "40308 CD Desarrollo", label: "40308 CD Desarrollo", empresa: "CD", departamento: "OPE", area: "" },
  { value: "40309 CD Continuidad Operacional", label: "40309 CD Continuidad Operacional", empresa: "CD", departamento: "OPE", area: "" },
  { value: "40401 CD Gerencia General", label: "40401 CD Gerencia General", empresa: "CD", departamento: "OPE", area: "" },
  // GIM
  { value: "50101 GIM Legal", label: "50101 GIM Legal", empresa: "GIM", departamento: "ADM", area: "" },
  { value: "50102 GIM Administración Control y Gestión", label: "50102 GIM Administración Control y Gestión", empresa: "GIM", departamento: "ADM", area: "" },
  { value: "50103 GIM Contabilidad y Finanzas", label: "50103 GIM Contabilidad y Finanzas", empresa: "GIM", departamento: "ADM", area: "" },
  { value: "50204 GIM Desarrollo Comercial atencion cliente", label: "50204 GIM Desarrollo Comercial", empresa: "GIM", departamento: "COM", area: "" },
  { value: "50205 GIM Ventas", label: "50205 GIM Ventas", empresa: "GIM", departamento: "COM", area: "" },
  { value: "50206 GIM Mercadeo", label: "50206 GIM Mercadeo", empresa: "GIM", departamento: "COM", area: "" },
  { value: "50307 GIM Ingenieria Telecomunicaciones e Infraest", label: "50307 GIM Ingeniería Teleco e Infraest", empresa: "GIM", departamento: "OPE", area: "" },
  { value: "50308 GIM Desarrollo", label: "50308 GIM Desarrollo", empresa: "GIM", departamento: "OPE", area: "" },
  { value: "50309 GIM Continuidad Operacional", label: "50309 GIM Continuidad Operacional", empresa: "GIM", departamento: "OPE", area: "" },
  { value: "50401 GIM Gerencia General", label: "50401 GIM Gerencia General", empresa: "GIM", departamento: "OPE", area: "" },
] as const;

export const EMPRESAS_REFERENCIA = [
  { value: "Trapemn SPA", label: "Trapemn SPA" },
  { value: "Group In Motion SPA", label: "Group In Motion SPA" },
  { value: "CDLatam Chile", label: "CDLatam Chile" },
  { value: "CDLatam Perú", label: "CDLatam Perú" },
] as const;

export const NOMBRES_REFERENCIA = [
  { value: "Bladi Gómez", label: "Bladi Gómez" },
  { value: "Juan Garcia", label: "Juan Garcia" },
  { value: "Martín Vernengo", label: "Martín Vernengo" },
  { value: "Pablo Balaguero", label: "Pablo Balaguero" },
  { value: "Gustavo Ale", label: "Gustavo Ale" },
  { value: "Dennis Reyes", label: "Dennis Reyes" },
  { value: "Matias Lasalle", label: "Matias Lasalle" },
] as const;

export const MESES = [
  { value: "Enero", label: "Enero" },
  { value: "Febrero", label: "Febrero" },
  { value: "Marzo", label: "Marzo" },
  { value: "Abril", label: "Abril" },
  { value: "Mayo", label: "Mayo" },
  { value: "Junio", label: "Junio" },
  { value: "Julio", label: "Julio" },
  { value: "Agosto", label: "Agosto" },
  { value: "Septiembre", label: "Septiembre" },
  { value: "Octubre", label: "Octubre" },
  { value: "Noviembre", label: "Noviembre" },
  { value: "Diciembre", label: "Diciembre" },
] as const;

// Distribución fija del Resultado Evaluación (extraída del Excel)
export const DISTRIBUCION_GIM = 0.1; // 10%
export const DISTRIBUCION_GP = 0.9;  // 90%
export const TASA_IMPUESTO = 0.19;   // 19%

export type Moneda = typeof MONEDAS[number]["value"];
export type Pais = typeof PAISES[number]["value"];
export type UnidadNegocio = typeof UNIDADES_NEGOCIO[number]["value"];
export type Solucion = typeof SOLUCIONES[number]["value"];
export type TipoVenta = typeof TIPO_VENTA[number]["value"];
export type Plazo = typeof PLAZOS[number]["value"];
