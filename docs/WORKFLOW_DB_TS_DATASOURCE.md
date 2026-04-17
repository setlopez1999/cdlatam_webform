# Flujo de Trabajo: El Filtro `db.ts` → `dataSource.ts`

Este documento explica la arquitectura de fuente de verdad centralizada del proyecto, cómo funciona el filtro entre SQLite y una API externa, y cómo agregar nuevas funciones correctamente.

## 1. Arquitectura de Fuente de Verdad

El proyecto utiliza un patrón de diseño donde `dataSource.ts` actúa como un "switch" o "filtro" centralizado.

*   **`server/db.ts`**: Contiene **únicamente** la lógica de acceso directo a la base de datos local SQLite usando Drizzle ORM. No sabe nada sobre APIs externas.
*   **`server/dataSource.ts`**: Es la **única fuente de verdad** para el resto de la aplicación. Importa las funciones de `db.ts` y decide si ejecutar esa lógica local o hacer una petición HTTP a una API externa, basándose en la variable de entorno `USE_API`.
*   **`server/routers.ts`** (y otros servicios): **Nunca** deben importar directamente de `db.ts`. Siempre deben importar las funciones prefijadas con `ds_` desde `dataSource.ts`.

## 2. Cómo Agregar una Nueva Función

Para mantener esta arquitectura, cualquier nueva operación de base de datos debe seguir este flujo:

### Paso 1: Implementar en `db.ts`

Crea la función que interactúa con SQLite.

```typescript
// server/db.ts
export const getRoles = async () => {
  return await db.select().from(roles);
};
```

### Paso 2: Exponer en `dataSource.ts`

Importa la función de `db.ts` y crea un wrapper `ds_` que implemente el switch `USE_API`.

```typescript
// server/dataSource.ts
import { getRoles } from "./db";
import { ENV } from "./_core/env";

export const ds_getRoles = async () => {
  if (ENV.useApi) {
    // Lógica para llamar a la API externa
    const res = await fetch(`${ENV.apiUrl}/roles`);
    return await res.json();
  }
  // Fallback a SQLite local
  return await getRoles();
};
```

*Nota: Para funciones que son exclusivamente locales (ej. gestión de estructura de tablas DDL), el wrapper puede simplemente llamar a la función de `db.ts` sin el condicional `USE_API`, pero **siempre** debe existir el wrapper `ds_`.*

### Paso 3: Consumir en `routers.ts`

Importa el wrapper `ds_` y úsalo en los endpoints tRPC.

```typescript
// server/routers.ts
import { ds_getRoles } from "./dataSource";

export const appRouter = router({
  roles: router({
    list: protectedProcedure.query(async () => {
      return await ds_getRoles();
    }),
  }),
});
```

## 3. Errores Comunes al Editar `dataSource.ts`

### Error: `Unexpected "export"`

**Causa:** Este es un error de sintaxis de TypeScript/JavaScript, generalmente causado por olvidar cerrar una llave `}` en la función anterior antes de declarar un nuevo `export`.

**Solución:** Revisa cuidadosamente el archivo `dataSource.ts`, especialmente alrededor de la línea indicada en el error. Asegúrate de que todas las funciones estén correctamente cerradas.

```typescript
// Incorrecto (falta llave de cierre)
export const ds_funcionA = async () => {
  if (condicion) { return true; }
// Falta } aquí

export const ds_funcionB = async () => { ... } // Error: Unexpected "export"

// Correcto
export const ds_funcionA = async () => {
  if (condicion) { return true; }
};

export const ds_funcionB = async () => { ... }
```

### Error: Importar directamente de `db.ts` en `routers.ts`

**Causa:** Se rompió la arquitectura de fuente de verdad. Si `USE_API` se activa, esa función seguirá consultando SQLite localmente, causando inconsistencias de datos.

**Solución:** Reemplaza el import de `db.ts` por el correspondiente `ds_` de `dataSource.ts`. Si el wrapper `ds_` no existe, créalo siguiendo el Paso 2.
