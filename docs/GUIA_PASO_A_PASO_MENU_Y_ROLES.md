# Guía Rápida: Agregar Items al Menú por Rol

Esta guía explica cómo agregar una nueva opción al menú lateral (Sidebar) basándose en los roles del usuario. El sistema usa un patrón de **Fuente Única de Verdad**, por lo que casi todo se hace en un solo archivo.

---

## Paso 1: Configurar el Permiso (El Cerebro)
Abre el archivo `client/src/config/permissions.ts`. Aquí es donde defines quién tiene acceso a qué.

### Caso A: Rol Existente
Si quieres que una ruta existente aparezca en el menú para un rol que ya existe:
1. Busca la ruta en el objeto `ROUTE_PERMISSIONS`.
2. Asegúrate de que `showInNav: true`.
3. Agrega el rol al arreglo `roles`.

```ts
// Ejemplo: Hacer que "Historial" sea visible para el rol "manager"
"/historial": {
  roles: [ROLE_ADMIN, "manager"], // ← Agregamos "manager"
  label: "Historial",
  icon: "History",
  showInNav: true,
},
```

### Caso B: Rol Nuevo
Si el rol no existe todavía en el código:
1. Agrégalo al tipo `RbacRole` al principio de `permissions.ts`:
   ```ts
   export type RbacRole = "gestor_horarios" | "manager" | "mi_rol_nuevo";
   ```
2. Úsalo en la configuración de la ruta como en el Caso A.

---

## Paso 2: Registrar el Icono (Visual)
Si usaste un icono nuevo (ej: `"Settings"`), el Sidebar necesita saber cómo dibujarlo.
Abre `client/src/components/AppLayout.tsx`.

1. Importa el icono de `lucide-react`.
2. Agrégalo al objeto `ICON_MAP`.

```tsx
// client/src/components/AppLayout.tsx
import { ..., Settings } from "lucide-react"; // 1. Importar

const ICON_MAP: Record<string, LucideIcon> = {
  ...,
  Settings, // 2. Registrar
};
```

---

## Paso 3: Proteger la Ruta (Seguridad)
Para que el usuario no pueda entrar escribiendo la URL manualmente, debes registrarla en `client/src/App.tsx` usando el componente `ProtectedRoute`.

```tsx
// client/src/App.tsx
<Route path="/mi-nueva-ruta">
  {() => <ProtectedRoute component={MiComponente} routePath="/mi-nueva-ruta" />}
</Route>
```

> [!NOTE]
> `ProtectedRoute` es inteligente: él irá a `permissions.ts`, verá qué roles pusiste para esa ruta y dejará pasar al usuario solo si tiene el rol adecuado.

---

## Resumen de Archivos a Tocar
| Acción | Archivo |
|---|---|
| **Lógica y Roles** | `client/src/config/permissions.ts` |
| **Icono Visual** | `client/src/components/AppLayout.tsx` |
| **Ruta del Navegador** | `client/src/App.tsx` |

---

## ¿Cómo se ve en el Sidebar?
El Sidebar divide los items automáticamente:
- **General**: Rutas que solo tienen el rol `admin`.
- **Principal**: Rutas que tienen el rol `*` (cualquier usuario).
- **Herramientas**: Rutas que tienen roles específicos (ej: `gestor_horarios`, `manager`).

¡Listo! Con estos 3 pasos, tu nueva opción aparecerá mágicamente en el menú solo para los usuarios autorizados.
