# F1 Consideraciones — alcance (solo UI)

## Qué es en la práctica

**Un solo archivo:** [`client/src/features/expedientes/f1/sections/F1Consideraciones.tsx`](client/src/features/expedientes/f1/sections/F1Consideraciones.tsx).

**Qué se hace:**

1. **Quitar** las dos tablas actuales (catálogo con “Añadir” / “En el acta” + segunda tabla editable).
2. **Mostrar** los mismos ítems que ya vienen de la tabla en BD (`plantillasCatalogo` ↔ `catalogs.getAll().consideracionesComerciales`) como **lista con checkboxes**: marcar = incluir esa línea en el acta.
3. **Debajo**, **input + botón Agregar** para texto libre, y cada línea libre con **botón para quitar** (X / papelera).

No hay cambios de servidor, migraciones ni tipos nuevos: sigue guardándose todo en **`consideracionesPersonalizadas`** como hoy; solo cambia **cómo se arma esa lista en pantalla** (marcados del catálogo + líneas extra).

## Por qué había “varias cosas” antes

Solo era la **forma técnica** de seguir usando un solo array (`consideracionesPersonalizadas`) para el PDF sin romper datos viejos: al marcar/desmarcar y al agregar/borrar líneas libres se reconstruye ese array. En código son pocas funciones helper dentro del mismo componente — **no** son features nuevas ni otras pantallas.

## Fuera de alcance

- Backend, Drizzle, PDF, `F1Form` (salvo pasar las mismas props que ya existen).
