# TODO — 3 entregables ordenados (próxima sesión)

> Guardado el 2026-05-04. Plan completo, ordenado para retomar mañana.

## Estado de cada tarea

- [ ] **fix-delete-transaction** — Quitar/sustituir `db.transaction(async ...)` en `deleteExpedienteCascadeByUuid` (`server/db.ts`)
- [ ] **db-listar-admin** — `listExpedientesAdminRows` con `leftJoin(users)` + procedure `expediente.listarAdmin` con `requireRole("admin")`
- [ ] **ui-expedientes-admin** — Permisos `/expedientes-admin` + `App.tsx` + `AppLayout` + página `ExpedientesAdmin` con tabla y acciones
- [ ] **deps-pdf** — Instalar dependencias `pdf-lib`, `jspdf` y `jspdf-autotable`
- [ ] **trpc-clausulas-publicas** — Procedure `clausulas.getByUnidades` (`protectedProcedure`, sin admin) que devuelve campos mínimos y solo `activo=1`
- [ ] **ui-clausulas-en-f1** — `F1Consideraciones`: lista auto de cláusulas según unidades en `serviciosContratados`, deduplicada por unidad e id
- [ ] **export-merged** — Reescribir `generateActaPDF` a `jsPDF` + `jspdf-autotable` y fusión con `pdf-lib` (descarga única)
- [ ] **wire-f1form** — `F1Form` pasa la lista de cláusulas vigentes al export y maneja toasts si una cláusula falla

---

# Plan: 3 entregables ordenados

Orden propuesto: bloqueador primero, entrega rápida después, feature grande al final.

```mermaid
flowchart LR
  P1[1 Fix delete cascade]
  P2[2 Pantalla admin todos expedientes]
  P3[3 Clausulas mapeadas en F1 y export con anexo]
  P1 --> P2
  P2 --> P3
```

---

## Parte 1 - Fix `Transaction function cannot return a promise`

**Causa:** En [`server/db.ts`](../server/db.ts) (`deleteExpedienteCascadeByUuid`, líneas 968-975) se usa `db.transaction(async (tx) => ...)`. `better-sqlite3` exige un callback **síncrono**; un `async` devuelve `Promise` y la librería lanza ese error.

**Cambio:** quitar el wrapper de transacción y hacer 4 `await db.delete(...)` en orden actual (resultados, evaluaciones, actas, expedientes). En SQLite mono-proceso la ventana de inconsistencia es despreciable y el flujo deja de fallar. Tras el cambio, eliminar desde Historial y desde la nueva pantalla admin debe funcionar sin error.

---

## Parte 2 - Pantalla "todos los expedientes" solo admin

1. **Backend - DB query enriquecida**
   En [`server/db.ts`](../server/db.ts), nueva `listExpedientesAdminRows()` que hace `select` de `expedientes` con `leftJoin(users, eq(expedientes.creadorId, users.id))` y devuelve filas con `creadorUsername`/`creadorDisplayName`. Reusa el patrón de `listExpedientesResumen` para anexar acta/evaluación/resultado por uuid.

2. **Backend - tRPC**
   Nuevo procedure `expediente.listarAdmin` en [`server/routers.ts`](../server/routers.ts) con `await requireRole(ctx, "admin")` (estrictamente admin, no `perfil_full`).

3. **Frontend - permisos y ruta**
   Entrada `/expedientes-admin` en [`client/src/config/permissions.ts`](../client/src/config/permissions.ts) con `roles: [ROLE_ADMIN]`, `showInNav: true`, icon (p. ej. `Folders`). Registrar la ruta con `ProtectedRoute` en [`client/src/App.tsx`](../client/src/App.tsx) y ampliar `ICON_MAP` en [`client/src/components/AppLayout.tsx`](../client/src/components/AppLayout.tsx) si hace falta.

4. **Frontend - página**
   Nueva [`client/src/pages/ExpedientesAdmin.tsx`](../client/src/pages/ExpedientesAdmin.tsx) con tabla: código, UUID, nombre, creador, status, fechas, indicadores F1/F2/F3. Acciones reusando lo ya existente: **Renombrar** (`expediente.renombrar`), **Eliminar** (`expediente.eliminar`, ya OK tras Parte 1), **Abrir** (mismo nav que Historial).

---

## Parte 3 - Cláusulas mapeadas en F1 + export con anexo

### 3.1 Estrategia de export elegida

Tras confirmar que no hay Puppeteer/pdf-lib instalado, y dado el requisito "como antes pero el más eficiente", la vía más fluida y sin server-side pesado es **fusión en cliente con `pdf-lib` + render del acta a PDF real**:

- Añadir dependencias **`pdf-lib`** (fusión/append) y **`jspdf` + `jspdf-autotable`** (render del acta a PDF real, sin Chromium).
- Reescribir [`generateActaPDF`](../client/src/lib/pdfExport.ts) para que:
  1. Construya el PDF base del acta con `jspdf` + `jspdf-autotable` (mismo contenido y orden actual: cabecera, datos, servicios, pagos, consideraciones, firma).
  2. Fetch a `/clauses/<filename>` por cada cláusula relevante (las que ya están públicas vía [`server/_core/index.ts`](../server/_core/index.ts)).
  3. Con `pdf-lib`, **append** las páginas de cada PDF de cláusula al final del PDF del acta.
  4. Descargar como `Acta_<noActa>_<cliente>.pdf` (un solo archivo).
- Se reemplaza la impresión vía `window.print()` por descarga directa. UX mantiene el mismo botón "Exportar PDF" en [`F1Form.tsx`](../client/src/features/expedientes/f1/F1Form.tsx) (línea 285) llamando al nuevo flujo.

### 3.2 Mapeo en el formulario (UI nueva)

- **Hooks de datos:** crear procedure pública `clausulas.getByUnidades` (autenticada, no admin-only) en lugar de reutilizar `getByUnidadNegocio` (admin-only).
- **Catalog id por unidad:** el formulario ya conoce el id por el patrón de [`F1Servicios.tsx`](../client/src/features/expedientes/f1/sections/F1Servicios.tsx) líneas 64-67 (`unidadesNegocio?.find(u => u.value === servicio.unidadNegocio)`). Aplicar la misma idea para resolver `unidadNegocioId` desde cada `servicio` y deduplicar por id.
- **Carga eficiente:** un solo query `clausulas.getByUnidades({ ids: number[] })`. Evita N consultas si hay muchos servicios.
- **Render en F1:** en [`F1Consideraciones.tsx`](../client/src/features/expedientes/f1/sections/F1Consideraciones.tsx), bajo el textarea actual de "Cláusulas legales" (texto libre, **se conserva** para condiciones a mano), agregar bloque "Cláusulas legales adjuntas (auto)":
  - Lista de bullets `- <clausula.valor>` agrupadas o etiquetadas con la unidad.
  - Texto vacío: "No hay cláusulas para las unidades seleccionadas".
  - Cada item con link "Ver PDF" abriendo `/clauses/<filename>` en nueva pestaña.

### 3.3 Lógica de selección de PDFs a anexar

- Origen de unidades: `data.serviciosContratados` del store F1.
- Para cada servicio con `unidadNegocio` no vacío, resolver su `unidadNegocioId` vía `catalogs.unidadesNegocio`.
- Construir `Set<unidadNegocioId>` para deduplicar (cumple "no añadir el mismo PDF dos veces si se repite la unidad").
- Pedir cláusulas de esos ids al servidor (procedure público filtrando `activo=1`).
- Deduplicar otra vez por `clausula.id` por seguridad (un PDF asignado a varias unidades no se duplica).
- Orden de anexado: misma orden de aparición de unidades en `serviciosContratados` y, dentro de cada unidad, por `valor` ascendente.

### 3.4 Backend (cambios)

- [`server/routers/clausulas.ts`](../server/routers/clausulas.ts): nuevo procedure
  `getByUnidades: protectedProcedure.input(z.object({ unidadNegocioIds: z.array(z.number()) })).query(...)` que solo expone `{ id, valor, filePath, fileName, unidadNegocioId }` con `activo = 1`. **Sin** `requireRole("admin")`: cualquier usuario autenticado lo puede leer (necesario para que un usuario normal pueda exportar su acta).
- Sigue siendo solo admin para crear/editar/eliminar cláusulas y para listar todas (los procedures ya existentes no se tocan).
- `/clauses/<file>` ya está servido como estático en [`server/_core/index.ts`](../server/_core/index.ts) línea 81. Verificar que la cookie `local_session` no es requisito para leer estáticos (lo es solo para el upload).

### 3.5 Implementación del export (cliente)

Esquema funcional:

```ts
async function generateActaPDF(acta, clausulas) {
  const baseDoc = await renderActaWithJsPDF(acta);     // ArrayBuffer
  const merged = await PDFDocument.load(baseDoc);
  for (const c of clausulas) {
    const bytes = await fetch(c.filePath).then(r => r.arrayBuffer());
    const pdf = await PDFDocument.load(bytes);
    const pages = await merged.copyPages(pdf, pdf.getPageIndices());
    pages.forEach(p => merged.addPage(p));
  }
  const finalBytes = await merged.save();
  triggerDownload(finalBytes, `Acta_${acta.noActa}_${acta.razonSocial}.pdf`);
}
```

`F1Form.tsx` recibe la lista de cláusulas vigentes (calculada en F1 con el mismo dedup) y la pasa a `generateActaPDF`. Si fetch de un PDF falla, se omite ese anexo y se muestra un toast warning, pero el acta se descarga igual (no bloquear).

### 3.6 Riesgos y mitigaciones

- **PDFs cifrados/encriptados o inválidos:** `pdf-lib` puede fallar al `load`. Mitigación: try/catch por cláusula, omitir y avisar.
- **Calidad visual del acta:** `jspdf-autotable` rinde tablas y texto bien; el diseño actual con CSS (gradientes, bordes finos) será aproximado. Aceptable como tradeoff; si la diferencia es grande, queda como mejora futura migrar a server-side.
- **Sesión para `/clauses/...`:** son archivos estáticos públicos hoy; si se decide protegerlos (admin only en lectura), entonces el fetch desde un usuario normal no funcionará y habría que mover la fusión a un endpoint server (`/api/expedientes/:uuid/acta.pdf`) como Plan B.

---

## Criterios de aceptación

- Eliminar expedientes deja de mostrar el error y borra la fila + hijos.
- Existe `/expedientes-admin` accesible solo a admin con tabla completa (creador, estado), con renombrar/eliminar/abrir.
- En F1, al elegir unidades de negocio en servicios contratados, aparecen automáticamente las cláusulas correspondientes en la sección "Cláusulas legales adjuntas".
- Exportar PDF descarga **un solo archivo** que incluye el acta seguida de los PDFs de cláusulas, deduplicados por unidad y por id, en el orden definido. Sin cláusulas, se descarga solo el acta. Cualquier cláusula con archivo inválido se omite con un warning, pero el acta sigue saliendo.
