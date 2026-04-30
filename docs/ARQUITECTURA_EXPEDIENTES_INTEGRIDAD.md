# Integridad de Expedientes en Base de Datos

Este documento describe el estado actual de la persistencia de expedientes y los pasos necesarios para completar la migración desde `localStorage` hacia la base de datos SQLite.

---

## Estado Actual (Fase 1 completada)

Actualmente, el sistema maneja un **CRUD esqueleto** para los expedientes. Esto significa que la base de datos conoce la existencia del expediente, pero no su contenido detallado.

| Capa | Dónde se guarda | Qué contiene |
|---|---|---|
| **Metadata** | BD (`expedientes`) | `id`, `uuid`, `nombre`, `creadorId`, `status`, timestamps |
| **Formulario F1 (Acta)** | BD (`actas`) | Todos los campos del acta (servicios, pagos, consideraciones). Sincronizado vía tRPC. |
| **Formulario F2 (EP)** | `localStorage` (Zustand) | Todos los campos de la evaluación de proyecto (Pendiente de migración). |
| **Auditoría** | BD (`audit_log`) | Acciones de creación, actualización y sincronización. |

**Problema actual:** Si el usuario borra el caché del navegador, pierde el contenido de F1 y F2, aunque el expediente siga existiendo en la base de datos (vacío).

---

## Plan de Migración (Fase 2)

Para lograr la integridad completa y permitir la auditoría a nivel de campos, se deben ejecutar los siguientes pasos una vez que se definan los campos definitivos con el equipo de negocio.

### 1. Sincronizar F1 (Acta) con la BD ✅
**ESTADO: COMPLETADO**
- Las tablas `actas` ya reciben datos JSON.
- `useF1.ts` llama a `trpc.actas.syncF1` en cada guardado.
- Se implementó la lógica de pagos dinámicos (1-4 cuotas) con validación de montos cruzados.

### 2. Sincronizar F2 (Evaluación de Proyecto) con la BD

1. Repetir el proceso de F1 para F2, usando la tabla `evaluaciones`.
2. Actualizar el campo `evaluacionId` en la tabla `expedientes`.

### 3. Auditoría a nivel de campos

Una vez que los datos viajen al backend, se debe modificar el router para que registre en `audit_log` exactamente qué campos cambiaron.

```ts
// Ejemplo de lo que debería hacer el router al actualizar un acta:
await createAuditLog({
  userId: ctx.localUser.id,
  username: ctx.localUser.username,
  action: "UPDATE",
  entity: "acta",
  entityId: acta.id,
  changes: {
    before: { status: "borrador" },
    after: { status: "completado" }
  }
});
```

### 4. Visibilidad de campos (F1)

El requerimiento de ocultar campos sensibles (como montos o consideraciones) a comerciales que no crearon el acta depende de esta migración.

Una vez que el acta esté en la BD, el frontend podrá saber quién es el `creadorId` del expediente y compararlo con el usuario actual para decidir qué campos renderizar.

---

## Nota sobre la regla de exclusión

Existe una regla histórica en el proyecto que indica: *"Nunca se debe guardar información de expedientes en la base de datos"*.

Esta regla fue implementada temporalmente durante la fase de prototipado rápido. Sin embargo, los nuevos requerimientos de **auditoría, roles y visibilidad de campos** hacen obligatoria la persistencia en base de datos. Este documento sirve como guía para ejecutar esa transición de manera ordenada.
