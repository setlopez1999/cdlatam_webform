# Resumen de Modificaciones - Feature: Permisos Dinámicos y Auditoría

Este documento resume los cambios realizados en la rama `feature2` para implementar un sistema de permisos basado en base de datos y un log de auditoría centralizado, manteniendo la integridad arquitectónica del proyecto.

## 1. Frontend (Cliente)

### [App.tsx](file:///c:/Users/PC1/Desktop/P/cdlatam_webform/client/src/App.tsx)
- Registro de la nueva ruta `/permisos` para la gestión de la matriz de permisos.
- Integración del hook `useDynamicPermissions` para alimentar el sistema de navegación y protección de rutas con datos de la BD.
- Actualización de `ProtectedRoute` para evaluar tanto los roles estáticos como las reglas dinámicas provenientes de la base de datos.

### [AppLayout.tsx](file:///c:/Users/PC1/Desktop/P/cdlatam_webform/client/src/components/AppLayout.tsx)
- Integración de `useDynamicPermissions` para filtrar los ítems del Sidebar dinámicamente. Si una ruta no tiene permiso en la BD para el rol actual, el ítem desaparece del menú.

### [permissions.ts](file:///c:/Users/PC1/Desktop/P/cdlatam_webform/client/src/config/permissions.ts)
- Refactorización de la lógica `evaluatePermission` y `getNavItemsForRoles` para priorizar las reglas dinámicas (`permission_rules` de la BD) sobre la configuración estática.

### [useDynamicPermissions.ts](file:///c:/Users/PC1/Desktop/P/cdlatam_webform/client/src/hooks/useDynamicPermissions.ts) [NUEVO]
- Hook personalizado para obtener y formatear las reglas de permisos desde el backend tRPC.

### [Permisos.tsx](file:///c:/Users/PC1/Desktop/P/cdlatam_webform/client/src/pages/Permisos.tsx) [NUEVO]
- Interfaz administrativa (Matriz de Permisos) que permite marcar/desmarcar qué roles tienen acceso a qué rutas.

### [AuditLog.tsx](file:///c:/Users/PC1/Desktop/P/cdlatam_webform/client/src/pages/AuditLog.tsx) [NUEVO]
- Vista de tabla para visualizar el historial de acciones del sistema (Auditoría).

---

## 2. Backend (Servidor)

### [schema.ts](file:///c:/Users/PC1/Desktop/P/cdlatam_webform/drizzle/schema.ts)
- Definición de las nuevas tablas:
    - `audit_log`: Para el registro de acciones CRUD.
    - `permission_rules`: Para el mapeo dinámico N:N entre rutas y roles.

### [db.ts](file:///c:/Users/PC1/Desktop/P/cdlatam_webform/server/db.ts)
- Implementación de las funciones de bajo nivel (SQLite/Drizzle) para interactuar con las nuevas tablas.
- Exportación de utilidades de verificación de roles (`userHasRole`, `userHasAnyRole`).

### [dataSource.ts](file:///c:/Users/PC1/Desktop/P/cdlatam_webform/server/dataSource.ts)
- **Cambio Arquitectónico Crítico**: Se añadieron wrappers `ds_*` para **todas** las operaciones del sistema (Actas, Evaluaciones, Expedientes, Usuarios, Roles, Permisos y Auditoría).
- Este archivo actúa como el "Switch Central": si `USE_API=true`, redirige a una API externa; si es `false`, usa la BD local.

### [rbac.ts](file:///c:/Users/PC1/Desktop/P/cdlatam_webform/server/rbac.ts)
- Refactorización para usar la capa `dataSource` en lugar de llamadas directas a la BD.
- **Fix de Acceso**: Se implementó un bypass para el rol `admin` legacy. Esto evita errores de "Forbidden" al acceder a la Matriz de Permisos si el usuario es el administrador principal del sistema.

### [routers.ts](file:///c:/Users/PC1/Desktop/P/cdlatam_webform/server/routers.ts)
- Refactorización masiva para eliminar todas las importaciones de `db.ts`. 
- Ahora todos los procedimientos tRPC consumen exclusivamente `dataSource.ts`, cumpliendo con la arquitectura de "Única Fuente de Verdad".
- Implementación de los nuevos routers `permissions` y `auditLog`.

---

## 3. Resolución de Fallos (Para Referencia Técnica)

### El problema del "Loading" y "Forbidden":
Al implementar RBAC dinámico, las peticiones a `roles.list` y `permissions.getRules` fallaban con error `403 Forbidden` porque el sistema no reconocía al usuario administrador como poseedor del rol `admin` en la nueva tabla `user_roles`. 

**Solución**:
1. Se añadió un bypass en `rbac.ts` para que si `ctx.user.role === 'admin'` (campo legacy de la tabla users), se otorgue acceso total sin consultar la tabla de roles N:N.
2. Se movió toda la lógica de acceso a datos a `dataSource.ts` para evitar que imports circulares o conexiones directas a la BD causaran bloqueos en el hilo principal del servidor (congelamiento).
