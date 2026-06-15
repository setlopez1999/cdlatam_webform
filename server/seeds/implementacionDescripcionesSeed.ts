/**
 * Seed de descripciones técnicas para `catalog_implementacion_items`.
 * Extraídas del PDF "Especificaciones y Matriz de Features" (nro_acta_000001).
 *
 * IMPORTANTE: Solo actualiza registros con descripcion = '' para no sobreescribir
 * ediciones manuales realizadas desde el panel de administración.
 */

const DESCRIPTIONS: Record<string, string> = {
  admin_contenido_lineal:
    "Gestión centralizada de canales de televisión en vivo, permitiendo la organización de grillas de programación y configuraciones de transmisión en tiempo real.",
  admin_paquetes_tv_premium:
    "Configuración y empaquetamiento flexible de canales premium, permitiendo crear ofertas personalizadas y control de acceso bajo suscripción.",
  control_parental:
    "Sistema de seguridad que permite restringir el acceso a contenidos específicos mediante contraseñas o PIN, garantizando un entorno seguro para el hogar.",
  admin_usuarios:
    "Módulo integral para la gestión de perfiles de clientes, altas, bajas, asignación de dispositivos y control de sesiones activas.",
  app_deco_stb_android:
    "Aplicación optimizada nativamente para dispositivos Set-Top Box basados en Android, garantizando estabilidad y rendimiento.",
  integracion_deco_stb_linux:
    "Soporte y compatibilidad con decodificadores basados en sistemas Linux para despliegues personalizados de infraestructura de hardware.",
  app_android_smart_tv:
    "Interfaz diseñada exclusivamente para pantallas grandes bajo el ecosistema Android TV, compatible con control remoto estándar.",
  app_tv_lg:
    "Desarrollo compatible con el sistema operativo webOS de LG, cumpliendo con los estándares de rendimiento de la tienda oficial.",
  app_tv_samsung:
    "Aplicación optimizada para el sistema operativo Tizen de Samsung, asegurando una experiencia fluida y alta fidelidad visual.",
  app_telefonos_android:
    "Diseño responsivo y versátil enfocado en movilidad, optimizado para el consumo eficiente de datos y streaming en smartphones.",
  app_telefonos_iphone:
    "Versión nativa desarrollada para iOS, cumpliendo con las pautas estéticas de Apple y soporte para transmisiones seguras.",
  app_windows:
    "Cliente de escritorio dedicado para sistemas operativos de Microsoft que maximiza el uso del hardware local para la decodificación de flujos de video de alta tasa de bits.",
  app_mac:
    "Software optimizado para macOS, aprovechando las capacidades gráficas y de rendimiento del hardware de Apple para garantizar una reproducción fluida.",
  epg:
    "Visualización interactiva en pantalla de los horarios de programas, metadatos, sinopsis y programación futura de los canales.",
  reportes_sistema_estadisticas:
    "Panel analítico que recopila métricas de consumo de los usuarios, canales más vistos, tiempos de permanencia y rendimiento de red.",
  solucion_multi_cdn:
    "Arquitectura de distribución de contenido que conmuta entre múltiples proveedores de CDN para optimizar la latencia y disponibilidad mundial.",
  ingenieria_red_head_end:
    "Diseño y estructuración de la cabecera técnica para la correcta recepción, procesamiento y retransmisión de las señales de video.",
  sucursal:
    "Capacidad de segmentación del sistema para operar de manera independiente o centralizada bajo entornos sedes u oficinas.",
  integracion_otros_sistemas:
    "Disponibilidad de APIs y conectores para enlazar la plataforma con pasarelas de pago, CRMs, ERPs y sistemas externos de facturación.",
  portal_autogestion:
    "Espacio web donde el usuario final puede administrar sus suscripciones, actualizar sus métodos de pago y visualizar su historial.",
  multiplan:
    "Estructura comercial jerárquica que permite la creación y coexistencia de planes de servicio con diferentes capacidades y precios.",
  restriccion_ip:
    "Mecanismo de seguridad geográfica o de red que limita el acceso al contenido únicamente a rangos de direcciones IP autorizados.",
  landing_multiempresas:
    "Páginas de destino configurables de manera dinámica para operar bajo esquemas de marca blanca y múltiples operadores en paralelo.",
  fail_over_streaming:
    "Sistema de respaldo automático que conmuta la transmisión a un flujo alternativo de inmediato ante cualquier caída de la señal principal.",
  fail_over_cdn_cloud:
    "Mecanismo de alta disponibilidad en la nube que conmuta automáticamente entre proveedores de infraestructura de red ante degradaciones de tráfico para evitar interrupciones.",
  channel_cloud:
    "Plataforma de procesamiento y virtualización de canales directamente en la nube, permitiendo la ingesta, transcodificación y empaquetado sin dependencia de hardware local.",
  acceso_contenido:
    "Módulo de gestión de derechos digitales (DRM) y control de autenticación de credenciales para asegurar la visualización autorizada de activos multimedia protegidos.",
  transporte_cabecera:
    "Protocolo robusto de transporte de flujos de video profesionales (como SRT o Zixi) desde la cabecera principal hasta los nodos periféricos de distribución.",
};

function escapeSql(val: string): string {
  return val.replace(/'/g, "''");
}

/**
 * Genera sentencias UPDATE idempotentes que solo actualizan registros
 * cuya descripcion está vacía (no sobreescribe ediciones manuales).
 */
export function sqlSeedImplementacionDescripciones(): string {
  const stmts = Object.entries(DESCRIPTIONS).map(
    ([key, desc]) =>
      `UPDATE catalog_implementacion_items SET descripcion = '${escapeSql(desc)}' WHERE \`key\` = '${key}' AND (descripcion IS NULL OR descripcion = '');`,
  );
  return stmts.join("\n");
}
