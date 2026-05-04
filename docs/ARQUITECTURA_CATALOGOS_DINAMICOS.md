# Arquitectura de Catálogos Dinámicos

Este documento explica cómo funciona el sistema de catálogos "flexibles" del proyecto, permitiendo gestionar múltiples tablas con un solo conjunto de componentes y servicios.

## 1. El Corazón: `catalog_meta` y `schema.ts`
El sistema se basa en una tabla maestra llamada `catalog_meta`.
- Cada vez que se crea un catálogo nuevo (dinámico), se añade una fila aquí.
- Las tablas físicas se dividen en dos:
    1. **Tablas del Sistema**: Definidas estáticamente en `drizzle/schema.ts` (ej: `catalog_soluciones`).
    2. **Tablas Dinámicas**: Creadas en tiempo de ejecución con el prefijo `catalog_custom_`.

## 2. Definición de Interfaz: `catalogConfig.ts`
Para que el sistema sepa cómo dibujar los formularios de cada tabla, usamos un objeto de configuración. Cada entrada define:
- `tableName`: Nombre técnico.
- `fields`: Arreglo de campos (`valor`, `activo`, y ahora `solucionId`).
- `type`: Define si es un input de texto, un checkbox (booleano) o un select.

## 3. Capa de Datos Genérica: `server/db.ts`
El backend no tiene funciones "saveSolucion" o "saveEmpresa". En su lugar, tiene:
- `getCatalogListGeneric(tableName)`
- `createCatalogRecordGeneric(tableName, data)`
- `updateCatalogRecordGeneric(tableName, id, data)`

Estas funciones reciben el nombre de la tabla y un objeto `data`. Gracias a esto, si mañana añades un campo `descripcion` a la tabla de soluciones en la BD y en el config, el backend lo guardará automáticamente sin cambiar ni una sola línea de código SQL.

## 4. El Componente Universal: `CatalogCrudView.tsx`
Es un componente de React que:
1. Recibe una `config`.
2. Itera sobre `config.fields`.
3. Renderiza automáticamente el modal de creación/edición.
4. Se encarga de las mutaciones (crear/editar/borrar) hablando con el servidor a través de tRPC.

## 5. El "Truco" de la Integridad
Para las relaciones (como la de Solución -> Unidad de Negocio):
- El frontend envía el `unidadNegocioId`.
- `CatalogCrudView` se asegura de que ese ID sea un número (`parseInt`).
- Drizzle lo inserta en la columna correspondiente de la tabla indicada.

---

## 6. Nueva Tabla: `catalog_clausulas` (Gestión de PDFs)
Creada para almacenar metadatos de cláusulas legales en formato PDF.

- **Archivo de Definición**: `drizzle/schema.ts` (final del archivo).
- **Migración**: `drizzle/migrations/0007_catalog_clausulas.sql`.
- **Lógica BD**: `server/db-clausulas.ts`.
- **DataSource**: `server/dataSource-clausulas.ts`.
- **Router tRPC**: `server/routers/clausulas.ts`.
- **Upload**: `server/routes/clausulas-upload.ts` (usa multer).
- **UI**: `client/src/pages/ClausulasPage.tsx`.

### Estructura de la tabla:
| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | integer PK | Autoincremental |
| `valor` | text | Nombre de la cláusula |
| `unidadNegocioId` | integer (FK) | Relación a `catalog_unidades_negocio` |
| `filePath` | text | Ruta relativa al archivo PDF (`/clauses/xyz.pdf`) |
| `fileName` | text | Nombre original del archivo subido |
| `fileSize` | integer | Tamaño en bytes |
| `activo` | integer | 1 = activo, 0 = inactivo |
| `createdAt` | integer | Timestamp de creación |

### Relaciones:
- **`catalog_clausulas`** N:1 **`catalog_unidades_negocio`** (vía `unidadNegocioId`).

### Almacenamiento de Archivos:
- **Físico**: `data/clauses/` (Compatible Windows/Linux vía `path.join`).
- **Servidor Estático**: Configurado en `server/_core/index.ts` (`app.use('/clauses', express.static(...))`).
- **Límite**: 10MB por archivo (configurado en `server/multer-config.ts`).

### Permisos:
- **Ruta**: `/clausulas` (agregada en `client/src/config/permissions.ts`).
- **Acceso**: Solo administradores (`roles: [ROLE_ADMIN]`).
- **Sidebar**: Aparece automáticamente en el aside (icono `FileText`).

---

## Beneficios de esta Arquitectura
- **Escalabilidad**: Añadir un catálogo nuevo toma 1 minuto.
- **Mantenimiento**: Si cambias el diseño de un botón, cambia en todos los catálogos a la vez.
- **Flexibilidad**: Soporta relaciones complejas simplemente añadiendo campos tipo `select` al objeto de configuración.
