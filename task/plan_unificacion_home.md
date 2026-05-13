# Plan de Unificación de Inicio (Home / Dashboard)

## Objetivo
Eliminar la ruta `/home` y centralizar todo el acceso inicial en la ruta raíz `/`. La aplicación debe mostrar el `Dashboard` (para admins) o el `UserHome` (para usuarios normales) de forma inteligente.

## Tareas a realizar

### 1. Configuración de Permisos (`client/src/config/permissions.ts`)
- [ ] Cambiar el acceso de `/` de `[ROLE_ADMIN]` a `[ROLE_ANY]`.
- [ ] Cambiar la etiqueta de `/` a "Inicio".
- [ ] Eliminar la entrada de `/home`.
- [ ] **Opcional:** Evaluar si `/historial` debe permitir `ROLE_ANY` (actualmente está restringido a admin pero el UserHome lo usa).

### 2. Lógica del Router (`client/src/App.tsx`)
- [ ] Crear el componente `HomeDispatcher` que renderice `<Dashboard />` o `<UserHome />` basado en `isAdmin`.
- [ ] Actualizar la ruta `/` para que use el `HomeDispatcher`.
- [ ] Cambiar la redirección de `LoginRoute` para que siempre apunte a `/`.
- [ ] Actualizar el "fallback" de `ProtectedRoute` para que en caso de error mande a `/` en lugar de `/home`.
- [ ] Eliminar la definición de la ruta `/home`.

### 3. Ajustes de Navegación (`client/src/components/AppLayout.tsx`)
- [ ] Verificar que el sidebar no muestre duplicados y que el componente `isActive` reconozca `/` correctamente para ambos roles.

## Beneficios
- URL más limpia y profesional (`/` en lugar de `/home`).
- Menos confusión para el usuario final.
- Código más mantenible al centralizar la entrada principal.

---
**Nota:** Una vez aprobado este plan, procederé con los cambios en los archivos correspondientes.
