# Documentación del Proyecto: Gestión Administrativa CD-LATAM

Este documento provee una guía completa sobre la arquitectura, seguridad, base de datos y despliegue del sistema de gestión administrativa.

---

## 1. Visión General del Proyecto

El sistema es una aplicación full-stack diseñada para la gestión de formularios (Actas y Evaluaciones de Proyecto) y catálogos de datos maestros. Utiliza las siguientes tecnologías:

- **Frontend**: React 18 + TypeScript + Vite
- **Backend**: Node.js + Express + tRPC
- **Base de Datos**: SQLite con Drizzle ORM
- **Despliegue**: Docker + Nginx (como proxy reverso con SSL)

---

## 2. Seguridad del Sistema

El sistema de autenticación fue diseñado para ser robusto y seguro para un entorno interno.

### 2.1. Funcionamiento de la Autenticación

El flujo de inicio de sesión es el siguiente:

1.  **Ingreso de Credenciales**: El usuario introduce su nombre de usuario y contraseña.
2.  **Verificación en Servidor**: El backend busca el usuario en la tabla `users` de la base de datos SQLite.
3.  **Hashing de Contraseña**: La contraseña enviada se compara con el hash almacenado usando **bcrypt**. Las contraseñas nunca se comparan en texto plano.
4.  **Generación de Token**: Si las credenciales son válidas, el servidor firma un **JSON Web Token (JWT)** que contiene la información del usuario (ID, rol, etc.). Este token está firmado con una clave secreta (`JWT_SECRET`) definida en el archivo `.env`.
5.  **Sesión del Cliente**: El JWT es enviado al cliente, que lo almacena y lo adjunta en el encabezado `Authorization` de cada petición subsecuente a la API.

### 2.2. Almacenamiento de Contraseñas

Las contraseñas **nunca se guardan como texto plano**. Se utiliza `bcryptjs` con 12 rondas de "salting", un estándar de la industria que hace que los hashes sean extremadamente difíciles de revertir por fuerza bruta.

```
Contraseña "1234"  →  Hash almacenado: "$2b$12$xK9..." (irreversible)
```

### 2.3. Expiración de Sesión

Los tokens JWT tienen una **expiración de 8 horas**. Una vez transcurrido este tiempo, el usuario deberá iniciar sesión nuevamente.

### 2.4. Usuarios por Defecto (¡Importante!)

El sistema crea dos usuarios automáticamente si la base de datos está vacía. Es **crítico** cambiar sus contraseñas en el primer despliegue a producción.

| Usuario | Contraseña | Rol |
| :-------- | :--------- | :---- |
| `admin` | `1234` | **Admin**: Acceso total al sistema. |
| `usuario` | `5678` | **User**: Acceso limitado a sus propios formularios. |

### 2.5. Puntos a Mejorar en Producción

- **Cambiar Contraseñas por Defecto**: Es la medida de seguridad más importante a tomar.
- **Secretos Robustos**: Asegurarse de que `JWT_SECRET` y `COOKIE_SECRET` en el archivo `.env` sean cadenas de texto largas y aleatorias.
- **Invalidación de Tokens**: El sistema de logout actual no invalida el token en el servidor. Si un token es robado, sigue siendo válido por hasta 8 horas. Para entornos de alta seguridad, se podría implementar una "blacklist" de tokens en la base de datos.

---

## 3. Funcionamiento de la Base de Datos

### 3.1. SQLite y Drizzle ORM

El proyecto utiliza **SQLite** como motor de base de datos, lo que simplifica el despliegue al no requerir un servidor de base de datos separado. El archivo de la base de datos se encuentra en `data/gestion.db`.

**Drizzle ORM** se utiliza para definir el esquema de la base de datos en TypeScript (`drizzle/schema.ts`) y para ejecutar las migraciones.

### 3.2. Migraciones

Las migraciones son scripts SQL que actualizan la estructura de la base de datos. El sistema de migraciones es robusto:

1.  Al arrancar, el servidor intenta aplicar las migraciones de Drizzle (`drizzle/migrations`).
2.  Si esto falla (por ejemplo, si una base de datos está a medio migrar), el sistema tiene un **mecanismo de fallback**: ejecuta comandos `CREATE TABLE IF NOT EXISTS` para asegurar que todas las tablas existan y el servidor pueda arrancar sin errores.

---

## 4. Cómo Ejecutar el Proyecto

### 4.1. Ejecución Local (Sin Docker)

Ideal para desarrollo y pruebas rápidas.

**Requisitos**: Node.js v20+

1.  **Clonar y entrar al proyecto**:
    ```bash
    git clone https://github.com/setlopez1999/cdlatam_webform.git
    cd cdlatam_webform
    git checkout dev_manus
    ```

2.  **Instalar dependencias**:
    ```bash
    npm install --legacy-peer-deps
    ```

3.  **Crear archivo `.env`**:
    Copia `.env.example` a `.env` y asegúrate de que contenga las claves básicas.

4.  **Borrar BD antigua (si existe)**:
    Si has corrido el proyecto antes, borra `gestion.db` para evitar conflictos de migración.

5.  **Ejecutar el servidor de desarrollo**:
    ```bash
    npm run dev
    ```

6.  **Abrir en el navegador**: [http://localhost:3000](http://localhost:3000)

### 4.2. Ejecución Local (Con Docker)

Simula el entorno de producción en tu máquina local.

**Requisitos**: Docker y Docker Compose

1.  **Clonar y entrar al proyecto** (si no lo has hecho).

2.  **Crear archivo `.env`** (si no existe).

3.  **Parar contenedores antiguos** (si los hay ocupando el puerto):
    ```bash
    # Reemplaza <ID_DEL_CONTENEDOR> con el ID que ocupa el puerto 3002
    docker stop <ID_DEL_CONTENEDOR>
    ```

4.  **Ejecutar el servicio `web` en el puerto 3002**:
    ```bash
    docker-compose run --rm -p 3002:3000 web
    ```
    - `run`: Ejecuta un comando único en un servicio.
    - `--rm`: Elimina el contenedor cuando se detiene.
    - `-p 3002:3000`: Mapea el puerto 3002 de tu PC al puerto 3000 del contenedor.

5.  **Abrir en el navegador**: [http://localhost:3002](http://localhost:3002)

    > **Nota**: Si el puerto 3002 está ocupado, puedes usar otro. Por ejemplo, para usar el 3003:
    > `docker-compose run --rm -p 3003:3000 web`

---

## 5. Documentacion por casos

Para cambios integrales (BD + backend + frontend + deploy), usa el indice central:

- [`docs/README.md`](./docs/README.md)

## 6. Despliegue en Servidor de Producción

### 6.1. Configuración Inicial (Solo la primera vez)

1.  **Clonar el repositorio**:
    ```bash
    git clone https://github.com/setlopez1999/cdlatam_webform.git
    cd cdlatam_webform
    git checkout dev_manus
    ```

2.  **Crear el archivo `.env`** con las variables de producción.

3.  **Crear la carpeta de datos**:
    ```bash
    mkdir -p data
    ```

4.  **Configurar Nginx y SSL**:
    - Crea la carpeta `nginx/conf.d`.
    - Crea el archivo `nginx/conf.d/default.conf` con la configuración del proxy reverso.
    - Copia tus certificados `fullchain.pem` y `privkey.pem` a `nginx/conf.d/`.

### 6.2. Despliegue o Actualización

Para desplegar cambios desde el repositorio:

1.  **Entrar a la carpeta del proyecto**:
    ```bash
    cd /home/trapemn/cdlatam_webform
    ```

2.  **Traer los últimos cambios**:
    ```bash
    git pull origin dev_manus
    ```

3.  **Reconstruir y levantar los contenedores**:
    ```bash
    docker-compose down && docker-compose up --build -d
    ```
    - `down`: Detiene y elimina los contenedores actuales.
    - `up`: Crea y levanta los nuevos contenedores.
    - `--build`: Fuerza la reconstrucción de la imagen con el código más reciente.
    - `-d`: Modo "detached" (se ejecuta en segundo plano).

4.  **Verificar que todo funciona**:
    ```bash
    docker-compose ps
    docker logs cdlatam_webform_web_1 --tail 20
    ```

5.  **Acceder a la aplicación**: `https://administracion.cd-latam.com:3002`
