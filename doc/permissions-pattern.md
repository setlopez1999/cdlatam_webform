# Patrón de Centralización de Permisos y Roles (RBAC)

Este documento describe el patrón arquitectónico implementado para centralizar la gestión de permisos y roles en el frontend de la aplicación. El objetivo principal de este patrón es establecer una única fuente de verdad que controle el acceso a rutas, la generación de la navegación y la visibilidad de elementos en la interfaz de usuario.

## Problema Original

Antes de la implementación de este patrón, la lógica de permisos se encontraba dispersa en múltiples archivos del proyecto. Las rutas protegidas definían sus requisitos de acceso directamente en el componente `App.tsx` mediante propiedades como `adminOnly` o `requiredRole`. Por otro lado, la barra de navegación lateral (`AppLayout.tsx`) mantenía sus propias listas estáticas de elementos (`ADMIN_NAV_ITEMS`, `ROLE_NAV_ITEMS`), lo que obligaba a los desarrolladores a duplicar la lógica de acceso. Además, los componentes individuales verificaban los permisos utilizando comprobaciones directas sobre el rol del usuario, lo que dificultaba la auditoría y el mantenimiento del sistema.

## Solución Implementada

La solución consiste en centralizar toda la configuración de permisos en un único archivo, `client/src/config/permissions.ts`. Este archivo actúa como el diccionario maestro de la aplicación, definiendo qué roles tienen acceso a qué recursos.

### Estructura de la Fuente de Verdad

El archivo `permissions.ts` exporta dos diccionarios principales. El primero es `ROUTE_PERMISSIONS`, que mapea las rutas de la aplicación con los roles autorizados para acceder a ellas, además de incluir metadatos para la generación de la interfaz, como etiquetas e iconos. El segundo es `ACTION_PERMISSIONS`, que define permisos granulares para acciones específicas dentro de los componentes, como la capacidad de gestionar usuarios o editar catálogos.

Para manejar casos especiales, se definieron dos constantes: `ROLE_ADMIN`, que representa el acceso de superusuario, y `ROLE_ANY`, que permite el acceso a cualquier usuario autenticado independientemente de sus roles específicos.

### Integración con el Enrutador

El componente `ProtectedRoute` en `App.tsx` fue refactorizado para consumir directamente `ROUTE_PERMISSIONS`. En lugar de recibir los roles requeridos como propiedades, ahora recibe únicamente la ruta que intenta proteger. El componente consulta el diccionario centralizado, evalúa los roles del usuario actual contra los roles requeridos por la ruta, y determina si debe permitir el acceso o redirigir al usuario.

### Generación Dinámica de la Navegación

El componente `AppLayout.tsx` fue modificado para eliminar las listas estáticas de elementos de navegación. En su lugar, utiliza una función auxiliar exportada desde `permissions.ts` que filtra `ROUTE_PERMISSIONS` basándose en los roles del usuario actual y la propiedad `showInNav`. Esto garantiza que la barra lateral siempre refleje exactamente las rutas a las que el usuario tiene acceso, eliminando cualquier posibilidad de desincronización entre la navegación y el enrutador.

### Control de Acceso en Componentes

Para reemplazar las comprobaciones directas de roles en los componentes, se creó el hook personalizado `useCan`. Este hook expone una función que recibe el identificador de una acción (definida en `ACTION_PERMISSIONS`) y devuelve un valor booleano indicando si el usuario actual tiene permiso para ejecutarla. Esto abstrae la lógica de evaluación de roles y permite a los componentes centrarse en la presentación.

## Flujo de Trabajo para Futuras Modificaciones

Cuando sea necesario agregar una nueva ruta protegida o una nueva acción restringida, el flujo de trabajo es el siguiente:

1. **Definir el permiso:** Abrir `client/src/config/permissions.ts` y agregar la nueva entrada en `ROUTE_PERMISSIONS` o `ACTION_PERMISSIONS`, especificando los roles autorizados.
2. **Registrar la ruta:** Si se trata de una ruta, agregar el componente correspondiente en el `Switch` de `App.tsx`, utilizando `ProtectedRoute` y pasando la ruta exacta definida en el paso anterior.
3. **Aplicar en componentes:** Si se trata de una acción, utilizar el hook `useCan` en el componente correspondiente para condicionar la renderización de elementos o la ejecución de funciones.

Este patrón asegura que cualquier cambio en la política de acceso se realice en un solo lugar, propagándose automáticamente a todas las capas de la aplicación frontend.
