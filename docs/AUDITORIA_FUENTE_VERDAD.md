# Auditoría de Arquitectura: Fuente de Verdad y Flujo de Peticiones

Este documento detalla el estado actual de la arquitectura de datos del proyecto `cdlatam_webform`, analizando cómo fluyen las peticiones desde el cliente hasta la base de datos, dónde está centralizada la lógica y qué inconsistencias o áreas de mejora existen.

## 1. Arquitectura General y Flujo de Peticiones

El proyecto utiliza una arquitectura cliente-servidor basada en **React + tRPC** en el frontend y **Express + tRPC + Drizzle ORM + SQLite** en el backend.

El flujo de una petición típica es el siguiente:

1. **Cliente (React):** Los componentes y hooks (ej. `useFormStore.ts`) hacen llamadas a través del cliente tRPC (`trpc.ts`).
2. **Capa de Transporte (tRPC):** Las peticiones viajan al servidor y son recibidas por los routers definidos en `server/routers.ts`.
3. **Capa de Abstracción (dataSource.ts):** Para los catálogos y usuarios, los routers delegan la llamada a `dataSource.ts`. Esta capa actúa como un "switch" o proxy.
4. **Fuente de Verdad (SQLite o API Externa):** Dependiendo de la variable de entorno `USE_API`, `dataSource.ts` decide si:
   - Hace un `fetch` a una API externa (`API_URL`).
   - Llama directamente a las funciones de acceso a datos locales en `server/db.ts` (SQLite).

## 2. Centralización de la Fuente de Verdad

La lógica de la fuente de verdad está **parcialmente centralizada**. Existe un esfuerzo claro por abstraer el origen de los datos mediante el archivo `dataSource.ts`, pero esta abstracción no cubre el 100% de las entidades del sistema.

### Lo que SÍ está centralizado (Pasa por `dataSource.ts`)

Las siguientes entidades respetan la variable `USE_API` y pueden alternar entre SQLite local y una API externa:

*   **Catálogos Fijos:** Monedas, Países, Empresas, Documentos de Identidad, Unidades de Negocio, Soluciones, Detalle de Servicio, Tipos de Venta, Plazos, Documentos, CECOs, Departamentos, Áreas, Nombres.
*   **Usuarios Locales:** Creación, listado, búsqueda y cambio de estado de usuarios (`localUsers`).

### Lo que NO está centralizado (Va directo a `db.ts` / SQLite)

Las siguientes entidades ignoran `USE_API` y siempre leen/escriben en la base de datos SQLite local (`gestion.db`):

*   **Actas de Aceptación:** Todo el CRUD (`getActasByUserId`, `createActa`, etc.) se importa directamente desde `db.ts` en `routers.ts`.
*   **Evaluaciones de Proyecto (EP):** Todo el CRUD se importa directamente desde `db.ts`.
*   **Búsqueda Global:** La función `searchRegistros` (que busca en actas y evaluaciones) va directo a SQLite.
*   **Catálogos Dinámicos (Custom Tables):** La gestión de la estructura de las tablas dinámicas (`catalog_meta`) y su CRUD genérico (`getCatalogListGeneric`, `createCatalogRecordGeneric`, etc.) se importan directamente desde `db.ts` en `routers.ts`.
*   **Autenticación Local (Login):** El endpoint REST `/api/auth/login` en `localAuth.ts` consulta directamente a `db.ts` (`findLocalUserByUsername`) para verificar credenciales, saltándose `dataSource.ts`.

## 3. Inconsistencias y Áreas de Mejora Detectadas

Durante la auditoría se detectaron las siguientes inconsistencias arquitectónicas:

### A. Fuga de Abstracción en Catálogos Dinámicos
Mientras que los catálogos fijos pasan por `dataSource.ts` (ej. `ds_getCatalogList`), los catálogos dinámicos creados por el usuario (ej. `catalog_custom_gerencias`) tienen sus propios endpoints en `routers.ts` (ej. `listGeneric`, `createGeneric`) que llaman directamente a `db.ts`. Esto significa que si `USE_API=true`, los catálogos fijos vendrán de la API externa, pero los dinámicos seguirán leyendo de SQLite local.

### B. Estado Híbrido en el Cliente (localStorage vs tRPC)
El archivo `client/src/hooks/useFormStore.ts` revela que el estado de los formularios (Actas y Evaluaciones) se persiste actualmente en `localStorage` del navegador, no en la base de datos.
Existen comentarios explícitos en el código indicando que esto debe cambiarse:
> `TODO: Conectar con API de Base de Datos aquí - reemplazar localStorage con tRPC mutations.`
Esto genera una inconsistencia grave: el backend tiene tablas y endpoints para Actas y Evaluaciones, pero el frontend no los está utilizando para guardar la información final.

### C. Autenticación Mixta (tRPC vs REST)
El sistema utiliza tRPC para casi todo, pero mantiene endpoints REST tradicionales (`/api/auth/login`, `/api/auth/me`) en `localAuth.ts` para la autenticación. Además, el router tRPC `localAuth.login` duplica la lógica del endpoint REST.

### D. Conteo de Resumen (allCounts)
El endpoint `allCounts` agregado recientemente en `routers.ts` itera sobre `listCatalogMeta()` y llama a `getCatalogListGeneric` (que va directo a SQLite). Si `USE_API=true`, este conteo no reflejará los datos de la API externa, sino los de la base local.

## 4. Recomendaciones

Para lograr una arquitectura robusta y verdaderamente centralizada, se recomienda:

1.  **Completar la abstracción en `dataSource.ts`:** Mover las funciones genéricas de catálogos dinámicos (`getCatalogListGeneric`, etc.) hacia `dataSource.ts` para que también respeten la variable `USE_API`.
2.  **Migrar el frontend de localStorage a tRPC:** Actualizar `useFormStore.ts` para que las funciones `saveActa`, `saveEP`, `deleteActa`, etc., ejecuten mutaciones tRPC hacia el backend en lugar de guardar en el navegador.
3.  **Unificar la Autenticación:** Decidir si la autenticación se manejará vía REST o tRPC y eliminar la duplicidad de código entre `localAuth.ts` y el router `localAuth` en `routers.ts`.
4.  **Documentar la API Externa:** Crear un documento detallando los endpoints que la API externa debe implementar para ser compatible con `dataSource.ts` cuando `USE_API=true`.
