# Flujo de Trabajo: Verificación de Cambios en la UI

Este documento describe el proceso estándar para verificar que los cambios realizados en el frontend (React/Vite) se han compilado correctamente y funcionan como se espera en el navegador, antes de realizar un commit o push.

## 1. Levantar el Servidor de Desarrollo

Asegúrate de que el servidor Vite esté corriendo. Si no lo está, levántalo en segundo plano:

```bash
pkill -f "tsx" 2>/dev/null; pkill -f "vite" 2>/dev/null
nohup pnpm dev > /tmp/dev_server.log 2>&1 &
```

## 2. Verificar la Compilación (HMR)

Después de guardar un archivo `.tsx` o `.ts` en el cliente, Vite intentará aplicar el cambio en caliente (Hot Module Replacement - HMR).

1.  **Revisa los logs del servidor:**
    ```bash
    tail -15 /tmp/dev_server.log
    ```
2.  **Busca mensajes de éxito:**
    Debes ver algo como `[vite] (client) hmr update /src/pages/TuComponente.tsx`.
3.  **Busca errores de compilación:**
    Si ves `[vite] Internal server error` o mensajes de error de sintaxis, el cambio no se aplicó. Corrige el error en el código y vuelve a guardar.

## 3. Verificación Visual en el Navegador

1.  **Accede a la URL local:** Abre la aplicación en tu navegador (ej. `http://localhost:3000`).
2.  **Navega a la vista modificada:** Ve a la página o componente que cambiaste.
3.  **Comprueba el renderizado:** ¿Se ve como esperabas? ¿Los estilos (Tailwind) se aplican correctamente?
4.  **Prueba la interactividad:** Haz clic en botones, abre modales, envía formularios. ¿Funcionan los eventos (`onClick`, `onSubmit`)?
5.  **Revisa la consola del navegador:** Abre las DevTools (F12) y revisa la pestaña "Console". Busca errores de React (ej. `Warning: Each child in a list should have a unique "key" prop`), errores de red (404, 500) o excepciones de JavaScript.

## 4. Verificación de Tipos (TypeScript)

Antes de hacer commit, es crucial verificar que no has introducido errores de tipado que podrían romper la build de producción, incluso si la aplicación funciona en desarrollo.

Ejecuta el compilador de TypeScript en modo de solo verificación:

```bash
npx tsc --noEmit
```

Si este comando no devuelve ninguna salida, significa que no hay errores de TypeScript. Si muestra errores, corrígelos antes de continuar.

## 5. Flujo Completo Recomendado

1.  Escribir código.
2.  Guardar archivo.
3.  Verificar logs de Vite (`tail /tmp/dev_server.log`).
4.  Verificar visualmente en el navegador.
5.  Probar interactividad y revisar consola del navegador.
6.  Ejecutar `npx tsc --noEmit`.
7.  Hacer commit y push.
