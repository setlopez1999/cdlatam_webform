# Sistema de Gestión Administrativa - TODO

## Fase 1: Análisis
- [x] Analizar archivo Excel (ACTA, EP, Resultado, Base de datos)
- [x] Identificar relaciones entre formularios
- [x] Mapear catálogos de datos

## Fase 2: Infraestructura y Base de Datos
- [x] Crear esquema Drizzle (actas, evaluaciones, resultados)
- [x] Ejecutar migración de base de datos
- [x] Configurar Service Layer desacoplado en servidor

## Fase 3: Service Layer y Catálogos
- [x] Implementar catálogos de referencia (monedas, países, soluciones, etc.)
- [x] Implementar routers tRPC para CRUD de Actas
- [x] Implementar routers tRPC para CRUD de Evaluaciones de Proyecto (EP)
- [x] Implementar lógica de auto-cálculo Formulario 3 desde Formulario 2
- [x] Implementar búsqueda y filtrado de registros
- [x] Implementar funciones deleteActa y deleteEP en Service Layer

## Fase 4: Layout y Dashboard
- [x] Configurar AppLayout con sidebar Enterprise SaaS oscuro
- [x] Implementar tema Inter + paleta de colores profesional (OKLCH)
- [x] Crear Dashboard principal con indicadores de estado
- [x] Implementar navegación por sidebar (Dashboard, Acta, EP, Resultado, Base de Datos)
- [x] Crear tarjetas de estado para cada formulario

## Fase 5: Formulario 1 (Acta)
- [x] Sección Encabezado (Atención, Fecha, No. Acta)
- [x] Sección Datos Empresa (Razón Social, Fantasía, RUC/DNI/RUT, Dirección)
- [x] Sección Datos de Contacto (Representante Legal, Técnico, Facturación)
- [x] Sección Servicios Contratados (tabla con ITEM, Unidad, Solución, etc.)
- [x] Sección Formas de Pago Implementación y Mantención
- [x] Validaciones de campos requeridos y tipos de datos
- [x] Exportación PDF del Acta con diseño membretado

## Fase 6: Formulario 2 (EP)
- [x] Sección Información General del Proyecto
- [x] Tabla Hardware con cálculos automáticos
- [x] Tabla Materiales con cálculos automáticos
- [x] Tabla RRHH (Técnico interno, Especialista externo, Supervisor)
- [x] Tabla Otros Gastos (Comisión, Movilización, Viático, Alojamiento, Varios)
- [x] Totales automáticos por categoría
- [x] Validaciones numéricas y de fechas

## Fase 7: Formulario 3 (Resultado)
- [x] Auto-fill en tiempo real desde Formulario 2
- [x] Live Preview badge con indicador "En vivo"
- [x] Resumen Evaluación (Hardware, Materiales, RH, Otros por mes)
- [x] Resultado Evaluación (Ingreso, Gastos, Resultado, Distribución GIM/GP)
- [x] Facturación Inter-Empresa (Bruto, Impuesto 19%, Neto)
- [x] Exportación PDF del Resultado con diseño membretado
- [x] KPIs visuales (Ingreso Total, Total Gastos, Resultado Neto, Margen %)

## Fase 8: Base de Datos y Catálogos
- [x] Vista de Base de Datos con tabs (Actas, EP, Catálogos, Estadísticas)
- [x] Búsqueda por múltiples campos (razón social, N° acta, RUT, cliente)
- [x] Filtrado por estado (borrador, completado, exportado)
- [x] Ordenamiento por columnas con indicador visual
- [x] Visualización de catálogos del sistema con contadores
- [x] Estadísticas con barras de progreso por estado

## Fase 9: Integración Final y Tests
- [x] Tests vitest para motor de cálculo F3 (10 casos de negocio)
- [x] Tests vitest para catálogos (3 tests)
- [x] Tests vitest para auth (3 tests + 1 logout)
- [x] 18/18 tests pasando
- [x] Corrección error PostCSS @import orden
- [x] Corrección errores TypeScript (0 errores)

## Pendiente (Post-MVP)
- [ ] Conectar Service Layer con tRPC (reemplazar localStorage con DB calls)
- [ ] Paginación en Base de Datos
- [ ] Búsqueda full-text con índices en MySQL
- [ ] Historial de versiones de documentos
- [ ] Notificaciones por email al exportar PDF
- [ ] Roles de usuario (admin vs. viewer)
- [ ] Importación masiva desde Excel

## Fase 10: Sistema de Autenticación con Roles
- [x] Actualizar esquema Drizzle: tabla localUsers con username, passwordHash, role
- [x] Implementar login con bcrypt (hash de contraseña) y JWT session propia
- [x] Crear seed de usuarios predefinidos (admin/1234 y usuario/5678)
- [x] Construir página de Login con UI profesional
- [x] Proteger rutas por rol: admin ve todo, usuario solo Acta y EP propios
- [x] Actualizar AppLayout con menú diferenciado por rol
- [x] Agregar logout desde sidebar
- [x] Tests Vitest para login y control de acceso (35/35 pasando)

## Fase 11: Reestructuración y Rediseño CD Latam

- [ ] Reestructurar frontend: config/routes, config/themes, core/screens, core/providers, core/utils
- [ ] Reestructurar backend: separar en routes/, controllers/, models/, middleware/
- [ ] Aplicar identidad visual CD Latam sin tocar lógica
- [ ] Actualizar alias de imports tras mover archivos
- [ ] Verificar build y tests post-reestructuración
- [ ] Documentar arquitectura para despliegue en servidor propio

## Fase 12: Logo, Simplificación UI y Sidebar de Formularios
- [x] Subir logo real CDLatam a CDN y aplicarlo en sidebar y login
- [x] Simplificar Dashboard: menos cards, menos colores, más limpio
- [x] Simplificar Login: diseño minimalista centrado
- [x] Agregar sección "Formularios" en sidebar con todos los formularios disponibles por rol
- [x] Sidebar usuario: solo ve la sección Formularios con sus formularios asignados
- [x] 0 errores TypeScript

## Fase 13: UX Improvements
- [ ] Fix espacio blanco en login (min-h-screen overflow)
- [ ] Sidebar usuario: sección Formularios plegable (acordeón)
- [ ] Separar ActaForm en componentes modulares (ActaHeader, ActaEmpresa, ActaServicios, ActaPago)
- [ ] Separar EPForm en componentes modulares (EPHeader, EPCostos, EPResumen)
- [ ] Pantalla de inicio con grid de botones (no formulario directo)
- [ ] Módulo de historial de formularios realizados

## Fase 14: Migración a API REST Externa

- [ ] Crear .env.example con VITE_API_URL
- [ ] Crear core/services/apiService.ts con capa HTTP desacoplada
- [ ] Crear core/services/authService.ts para login/logout/me
- [ ] Crear core/services/formulariosService.ts para Actas y EPs
- [ ] Crear core/services/catalogsService.ts para comboboxes
- [ ] Crear core/services/adminService.ts para gestión de usuarios y BD
- [ ] Migrar useLocalAuth a consumir authService (REST)
- [ ] Migrar hooks de formularios a consumir formulariosService (REST)
- [ ] Migrar catálogos de comboboxes a consumir catalogsService (REST)
- [ ] Generar documento API_CONTRACT.md con todos los endpoints
- [ ] 0 errores TypeScript, tests pasando

## Fase 15: Actualización Formulario 1 (Acta) - Estructura exacta del Excel

- [x] Agregar campo "Sres." (combobox) en encabezado del Acta - alimentado desde BD (EMPRESAS_REFERENCIA)
- [x] Agregar campo "Atención" (combobox) en encabezado - alimentado desde BD (NOMBRES_REFERENCIA)
- [x] Agregar texto introductorio del Acta en el encabezado
- [x] Agregar campos "País" y "Moneda" (comboboxes BD) en sección Empresa
- [x] Agregar campo "activacionNueva" (boolean) en interfaz ActaData y createDefaultActa
- [x] Crear componente ActaConsideraciones con checkbox "Activación nueva" + lista de consideraciones
- [x] Crear componente ActaFirmas con bloques de firma Cliente y CDLatam
- [x] Actualizar ActaFormasPago con tabla exacta del Excel (ITEM | Tipo Venta | N°Cuotas | 3 cuotas con Monto+Fecha)
- [x] Agregar botones "Agregar fila" y "Eliminar" en FormasPago
- [x] Actualizar index.ts para exportar ActaConsideraciones y ActaFirmas
- [x] Actualizar ActaForm.tsx principal con todos los componentes en orden del Excel
- [x] Pasar catálogos correctos a cada componente (sres→empresas, atencion→nombres, pais, moneda)
- [x] 42/42 tests pasando (7 nuevos tests para campos Acta actualizada)
- [x] 0 errores TypeScript

## Fase 16: Mejoras Formulario 1 (Acta) - Ronda 2

- [x] ActaEncabezado: texto introductorio editable con botón "Restaurar texto original"
- [x] ActaEmpresa: quitar campo País, mantener Moneda como valor global del formulario
- [x] ActaServicios y ActaFormasPago: mostrar símbolo de moneda según el valor seleccionado
- [x] ActaConsideraciones: cambiar activacionNueva de checkbox a campo de texto plano
- [x] ActaFirmas: solo campo del Representante Legal con canvas de dibujo de firma
- [x] Canvas de firma: botón Borrar (rehacer), botón Importar imagen, indicador "Firmado"
- [x] Guardar componente ActaFirmas original antes de modificar

## Fase 17: Mejoras Formulario 1 - Ronda 3

- [x] ActaConsideraciones: activacionNueva como ítem de lista (guión), no combobox
- [x] Propagar moneda global a ActaServicios (prefijo símbolo en valores)
- [x] Propagar moneda global a ActaFormasPago (prefijo símbolo en montos de cuotas)
- [x] PDF: incluir todos los campos (incluso vacíos) con espacio reservado
- [x] PDF: agregar logo CDLatam y color turquesa corporativo
- [x] Validación al guardar: indicar campo faltante + scroll automático
- [x] Redirección al inicio (/) tras login exitoso

## Fase 18: Correcciones Formulario 1 - Ronda 4

- [x] Tablas con scroll horizontal en ActaServicios y ActaFormasPago
- [x] PDF: page-break-inside:avoid en secciones, firma nunca cortada
- [x] Corregir bug de fechas -1 día en formatDate
- [x] Activación nueva como texto plano (no input) en Consideraciones
- [x] Activación nueva aparece en el PDF como ítem de lista

## Fase 19: Correcciones Formulario 1 - Ronda 5

- [x] Corregir superposición de comboboxes en ActaServicios (z-index / portal)
- [x] Agregar ítem fijo "Activación nueva" en ActaConsideraciones

## Fase 20: Correcciones PDF - Ronda 6

- [x] Secciones no se cortan entre páginas (Formas de Pago Mantención, Consideraciones, Firma)
- [x] Margen superior en salto de página
- [x] Firma visible en el PDF

## Fase 21: Mejora visual PDF - Logo con fondo azul oscuro

- [x] Contenedor del logo con fondo azul oscuro (#0f2027) en el PDF del Acta

## Fase 22: Mejoras Formulario 2 (EP) - Ronda 1

- [x] Corregir superposición de comboboxes en EP (SelectContent con portal)
- [x] Propagar moneda de Información General a Otros Gastos (mes 1, 2 y 3)
- [x] Ítems fijos en gastos mes 1/2/3: Comisión, Movilización, Viático, Movilización, Viático, Movilización, Alojamiento, Varios
- [x] Botón "Regenerar ítems" por mes con confirmación si hay datos

## Fase 23: Scroll horizontal en tablas Form 1 y EP

- [x] Form 1: overflow-x-auto + min-w en ActaServicios y ActaFormasPago
- [x] EP: overflow-x-auto + min-w en todas las tablas (Costos, Otros Gastos)

## Fase 24: EP - Tablas HTML reales con portal

- [x] CostTable y OtrosTable del EP convertidas a tabla HTML real con SelectContent portal

## Fase 25: EP - Tabla RRHH como tabla HTML real

- [x] Tabla RRHH del EP convertida a tabla HTML real con SelectContent portal

## Fase 26: EP - Ítems fijos por defecto en Otros Gastos

- [x] createDefaultEP inicializa otrosMes1/2/3 con los 8 ítems fijos

## Fase 27: Reestructuración en torno a Expediente

- [x] Sidebar: grupo colapsable "Expediente" con F1, F2, Resumen de Evaluación, Resultado de Evaluación
- [x] ResumenEvaluacion.tsx: Tabla 1 (costos EP por mes)
- [x] ResultadoEvaluacion.tsx: Tablas 2 y 3 (ingresos Acta vs gastos EP, distribución GIM/GP, facturación)
- [x] Historial renombrado a Expedientes con columnas de estado (F1, F2, Resultados)
- [x] Página de inicio: botones "Expediente nuevo" e "Historial"
- [x] App.tsx: rutas /resumen-evaluacion y /resultado-evaluacion

## Fase 28: Flujo de Expediente completo

- [x] useFormStore: agregar expedienteActual (id, nombre, estadoF1, estadoF2, expedientes[])
- [x] ExpedienteLayout.tsx: navbar interno con F1, F2, Resultados y nombre editable
- [x] NuevoExpediente.tsx: crear expediente con nombre autogenerado (Expediente #N)
- [x] Historial: cada expediente con estado F1/F2 y botón Continuar/Ver
- [x] App.tsx y sidebar: rutas /expediente/:id/acta, /expediente/:id/ep, /expediente/:id/resultados

## Fase 29: Simplificación sidebar y limpieza de rutas

- [ ] Sidebar: solo Inicio e Historial (eliminar grupo Expediente y Resultados)
- [ ] App.tsx: eliminar rutas obsoletas /acta, /ep, /resumen-evaluacion, /resultado-evaluacion
- [ ] Mantener solo rutas /expediente/:id/acta, /expediente/:id/ep, /expediente/:id/resultados
