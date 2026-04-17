# Error: Binario de `better-sqlite3` Movido o Faltante

Este documento explica un error común que ocurre al instalar o actualizar dependencias en proyectos que usan `better-sqlite3` con `pnpm`, y cómo solucionarlo.

## 1. Síntoma del Error

El servidor Node.js (ej. Express, Vite, tsx) falla al arrancar o al intentar conectarse a la base de datos SQLite, mostrando un error similar a este en los logs:

```
Error: Cannot find module '/home/ubuntu/cdlatam_webform/node_modules/better-sqlite3/build/Release/better_sqlite3.node'
Require stack:
- /home/ubuntu/cdlatam_webform/node_modules/better-sqlite3/lib/database.js
- /home/ubuntu/cdlatam_webform/server/db.ts
...
```

O un error de compilación nativa si el sistema intenta reconstruirlo y falla:

```
gyp ERR! build error
gyp ERR! stack Error: `make` failed with exit code: 2
...
```

## 2. Causa del Problema

`better-sqlite3` es un módulo nativo de Node.js (escrito en C++) que requiere ser compilado para la arquitectura específica del sistema operativo donde se ejecuta.

Cuando usas `pnpm add <paquete>` o `pnpm install`, `pnpm` reorganiza la carpeta `node_modules` usando enlaces simbólicos (symlinks) para optimizar el espacio. En ocasiones, este proceso de reorganización puede mover accidentalmente el binario precompilado (`better_sqlite3.node`) a una carpeta `.ignored` o eliminarlo, rompiendo la referencia que espera el código JavaScript.

## 3. Solución Rápida (Reconstrucción)

La forma más segura de solucionar este problema es forzar a `pnpm` a reconstruir los módulos nativos del proyecto.

Ejecuta el siguiente comando en la raíz del proyecto:

```bash
pnpm rebuild better-sqlite3
```

O, si el problema persiste con otras dependencias nativas:

```bash
pnpm rebuild
```

Este comando le dice a `pnpm` que vuelva a ejecutar los scripts de instalación (como `node-gyp rebuild`) para el paquete especificado, generando un nuevo binario `.node` en la ubicación correcta.

## 4. Solución Manual (Si la reconstrucción falla)

Si `pnpm rebuild` falla (por ejemplo, por falta de herramientas de compilación como `python3` o `make`), puedes intentar buscar el binario perdido y copiarlo manualmente.

1.  **Busca el binario en `node_modules`:**
    ```bash
    find ./node_modules -name "better_sqlite3.node"
    ```
2.  **Si lo encuentras (ej. en `.ignored`), cópialo a la ruta esperada:**
    ```bash
    mkdir -p ./node_modules/better-sqlite3/build/Release/
    cp <ruta_encontrada>/better_sqlite3.node ./node_modules/better-sqlite3/build/Release/
    ```

## 5. Prevención

Para minimizar la probabilidad de que esto ocurra:

*   Evita interrumpir procesos de instalación (`pnpm install`) a la mitad.
*   Si cambias de versión de Node.js, siempre ejecuta `pnpm rebuild` o borra `node_modules` y reinstala.
*   Asegúrate de tener las herramientas de compilación básicas instaladas en tu entorno de desarrollo (`sudo apt-get install build-essential python3`).
