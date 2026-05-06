# Tarea Pendiente: Audit Log y Permisos Dinámicos

Esta tarea agrupa la creación de la vista de auditoría y el plan para flexibilizar la visibilidad de los items del menú.

## Estado Actual
- [x] Refactorización de Formas de Pago (F1) completada y sincronizada con BD.
- [x] Documentación de la lógica de pagos creada (`docs/LOGICA_NEGOCIO_FORMAS_PAGO.md`).
- [x] Guía de gestión de menús y roles creada (`docs/GUIA_PASO_A_PASO_MENU_Y_ROLES.md`).

## Checklist de Próximos Pasos

### 1. Implementación de Audit Log (Fase 1)
- [ ] Actualizar `server/routers.ts` para permitir el acceso al log desde `perfil_full`.
- [ ] Registrar la ruta `/audit-log` en `client/src/config/permissions.ts`.
- [ ] Registrar el icono `ClipboardList` en `client/src/components/AppLayout.tsx`.
- [ ] Crear la página `client/src/pages/AuditLog.tsx` con una tabla interactiva.
- [ ] Registrar la nueva página en `client/src/App.tsx`.

### 2. Panel de Matriz de Permisos (Fase 2 - Planeación)
- [ ] Diseñar la tabla `permissions_map` en el esquema de la BD.
- [ ] Crear el router de backend para CRUD de permisos por rol.
- [ ] Implementar la interfaz de Matrix de Permisos (Checkboxes por ruta/rol).
- [ ] Refactorizar `permissions.ts` para que use el store de Zustand como fuente primaria.

## Contexto Adicional
- El usuario `perfil_full` debe tener visibilidad del log para auditar cambios en actas y expedientes.
- La gestión dinámica busca que el usuario administrador pueda quitar o poner items del sidebar sin necesidad de editar código.

---
*Ultima actualización: 2026-04-30*
