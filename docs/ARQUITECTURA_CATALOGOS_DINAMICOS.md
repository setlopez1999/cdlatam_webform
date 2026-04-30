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
- `fields`: Arreglo de campos (`valor`, `activo`, y ahora `unidadNegocioId`).
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

## Beneficios de esta Arquitectura
- **Escalabilidad**: Añadir un catálogo nuevo toma 1 minuto.
- **Mantenimiento**: Si cambias el diseño de un botón, cambia en todos los catálogos a la vez.
- **Flexibilidad**: Soporta relaciones complejas simplemente añadiendo campos tipo `select` al objeto de configuración.
