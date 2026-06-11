# Integridad de Expedientes en Base de Datos

Este documento describe el estado actual de la persistencia y sincronización de expedientes.

---

## Estado Actual (Fase 1 y 2 completadas)

El sistema cuenta con persistencia completa en BD para todas las capas del expediente:

| Capa | Dónde se guarda | Cómo se sincroniza |
|---|---|---|
| **Metadata** | BD (`expedientes`) | `trpc.expediente.crear`, `trpc.expediente.renombrar`, `trpc.expediente.eliminar` |
| **Formulario F1 (Acta)** | BD (`actas`) | `trpc.actas.syncF1` — guarda el snapshot completo |
| **Formulario F2 (EP)** | BD (`evaluaciones`) | `trpc.evaluaciones.syncF2` — guarda el snapshot completo |
| **Formulario F3 (Resultados)** | BD (`resultados_expediente`) | `trpc.expediente.syncResultado` — guarda el cálculo |
| **Implementación** | BD (`implementaciones`) | `trpc.expediente.implementacion.setEstado` |
| **Auditoría** | BD (`audit_log`) | Registro automático vía `recordAuditFromTrpc` |

**El contenido de F1, F2 y F3 ya no se pierde al borrar caché del navegador.** Todo persiste en SQLite en el servidor.

---

## Flujo de sincronización

### F1 (Acta) — `useF1.ts`
1. Usuario edita campos en el formulario F1.
2. `useF1` llama `trpc.actas.syncF1.mutateAsync(...)` con el snapshot completo de F1.
3. El servidor guarda en `actas.f1Datos` (JSON) y actualiza `actas.f1SavedAt`.
4. El store cliente sincroniza el `f1SavedAt` para saber si está al día.

### F2 (Evaluación de Proyecto) — `useF2.ts`
1. Usuario edita campos en el formulario F2.
2. `useF2` llama `trpc.evaluaciones.syncF2.mutateAsync(...)` con el snapshot completo.
3. El servidor guarda en `evaluaciones.f2Datos` (JSON) y actualiza `evaluaciones.f2SavedAt`.

### F3 (Resultados) — `storeMergeDetalleEnStore`
1. Al guardar F2, se dispara el cálculo automático de F3.
2. `storeMergeDetalleEnStore` calcula y persiste los resultados.
3. `trpc.expediente.syncResultado` guarda en `resultados_expediente`.

---

## Vista de detalle (historial expandido)

El componente `ExpedienteLayout` permite al usuario navegar entre F1, F2, F3 e Implementación.
Los datos se cargan desde el servidor (`trpc.expediente.detalle`) y se mezclan con el store local.
La fuente de verdad es lo que está en BD; el store local es una caché de edición.

---

## Auditoría

Cada sincronización registra en `audit_log`:
- `entidad`: `"acta"` / `"evaluacion"` / `"resultado"`
- `accion`: `"SYNC_F1"` / `"SYNC_F2"` / `"SYNC_RESULTADO"`
- `actaCodigo`: número de acta asociada
- `userId` / `username`: quién realizó la acción
