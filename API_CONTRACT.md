> Creado por Manus.im

# Contrato de API Externa

Este documento define los endpoints que el backend espera que una API externa implemente cuando la variable de entorno `USE_API` está configurada como `true`. El sistema hará `fetch` a estos endpoints en lugar de usar la base de datos SQLite local.

**URL Base**: La URL base de la API se configura con la variable de entorno `API_URL`.

---

## 1. Endpoints de Catálogos

Estos endpoints gestionan los datos maestros del sistema.

### 1.1. Obtener lista de un catálogo

-   **Método**: `GET`
-   **Path**: `/catalogs/{tableName}`
-   **Parámetros de URL**:
    -   `tableName`: Nombre de la tabla de catálogo (ej: `monedas`, `paises`, `empresas`, etc.).
-   **Respuesta esperada**: `200 OK`
    -   **Body**: Un array de objetos, donde cada objeto es un registro del catálogo.

    ```json
    [
      {
        "id": 1,
        "valor": "Dólar Americano",
        "activo": 1
      },
      {
        "id": 2,
        "valor": "Euro",
        "activo": 1
      }
    ]
    ```

### 1.2. Crear un registro en un catálogo

-   **Método**: `POST`
-   **Path**: `/catalogs/{tableName}`
-   **Request Body**: Un objeto con el campo `valor`.

    ```json
    {
      "valor": "Nuevo Valor"
    }
    ```

-   **Respuesta esperada**: `201 OK`
    -   **Body**: El objeto recién creado, incluyendo su `id`.

    ```json
    {
      "id": 3,
      "valor": "Nuevo Valor",
      "activo": 1
    }
    ```

### 1.3. Actualizar un registro de un catálogo

-   **Método**: `PUT`
-   **Path**: `/catalogs/{tableName}/{id}`
-   **Request Body**: Un objeto con los campos a actualizar.

    ```json
    {
      "valor": "Valor Actualizado",
      "activo": 0
    }
    ```

-   **Respuesta esperada**: `200 OK`

### 1.4. Eliminar un registro de un catálogo

-   **Método**: `DELETE`
-   **Path**: `/catalogs/{tableName}/{id}`
-   **Respuesta esperada**: `204 No Content`

### 1.5. Actualización masiva de registros

-   **Método**: `PUT`
-   **Path**: `/catalogs/{tableName}/bulk-update`
-   **Request Body**:

    ```json
    {
      "ids": [1, 2, 3],
      "data": { "activo": 0 }
    }
    ```

-   **Respuesta esperada**: `200 OK`

### 1.6. Eliminación masiva de registros

-   **Método**: `DELETE`
-   **Path**: `/catalogs/{tableName}/bulk-delete`
-   **Request Body**:

    ```json
    {
      "ids": [1, 2, 3]
    }
    ```

-   **Respuesta esperada**: `200 OK`

### 1.7. Obtener todas las opciones de catálogos (para comboboxes)

-   **Método**: `GET`
-   **Path**: `/catalogs/options`
-   **Respuesta esperada**: `200 OK`
    -   **Body**: Un objeto donde cada clave es el nombre de un catálogo y el valor es un array de opciones para un combobox.

    ```json
    {
      "empresas": [{ "value": "Empresa A", "label": "Empresa A" }],
      "nombres": [{ "value": "Nombre 1", "label": "Nombre 1" }],
      "monedas": [{ "value": "USD", "label": "USD" }],
      "documentoIdentidad": [],
      "unidadesNegocio": [],
      "soluciones": [],
      "detalleServicio": [],
      "tipoVenta": [],
      "plazos": [],
      "paises": [],
      "cecos": [],
      "meses": [{ "value": "Enero", "label": "Enero" }]
    }
    ```

### 1.8. Obtener resumen de catálogos

-   **Método**: `GET`
-   **Path**: `/catalogs/summary`
-   **Respuesta esperada**: `200 OK`
    -   **Body**: Un objeto donde cada clave es el nombre de un catálogo y el valor es un array con los registros activos.

    ```json
    {
      "monedas": [{ "id": 1, "valor": "USD", "activo": 1 }],
      "paises": [],
      "empresas": [],
      "doctos": [],
      "unidades": [],
      "soluciones": [],
      "detalles": [],
      "tipos": [],
      "plazos": [],
      "docs": [],
      "cecos": [],
      "deptos": [],
      "areas": [],
      "nombres": []
    }
    ```

### 1.9. Búsqueda en catálogos

-   **Método**: `GET`
-   **Path**: `/catalogs/search?q={query}`
-   **Respuesta esperada**: `200 OK`
    -   **Body**: Un objeto con los resultados de la búsqueda en los catálogos `cecos`, `soluciones` y `detalles`.

    ```json
    {
      "cecos": [{ "id": 1, "valor": "Centro de Costo 1", "activo": 1 }],
      "soluciones": [],
      "detalles": []
    }
    ```

---

## 2. Endpoints de Usuarios

### 2.1. Obtener lista de usuarios

-   **Método**: `GET`
-   **Path**: `/users`
-   **Respuesta esperada**: `200 OK`
    -   **Body**: Un array de objetos de usuario (sin el hash de la contraseña).

    ```json
    [
      {
        "id": 1,
        "username": "admin",
        "displayName": "Administrador",
        "role": "admin",
        "isActive": 1,
        "createdAt": "2023-01-01T00:00:00.000Z",
        "updatedAt": "2023-01-01T00:00:00.000Z",
        "lastSignedIn": "2023-01-01T00:00:00.000Z"
      }
    ]
    ```

### 2.2. Obtener un usuario por su nombre de usuario

-   **Método**: `GET`
-   **Path**: `/users/by-username/{username}`
-   **Respuesta esperada**: `200 OK`
    -   **Body**: El objeto de usuario completo, **incluyendo el `passwordHash`**.

    ```json
    {
      "id": 1,
      "username": "admin",
      "passwordHash": "$2b$12$xK9...",
      "displayName": "Administrador",
      "role": "admin",
      "isActive": 1,
      "createdAt": "2023-01-01T00:00:00.000Z",
      "updatedAt": "2023-01-01T00:00:00.000Z",
      "lastSignedIn": "2023-01-01T00:00:00.000Z"
    }
    ```

### 2.3. Obtener un usuario por su ID

-   **Método**: `GET`
-   **Path**: `/users/{id}`
-   **Respuesta esperada**: `200 OK`
    -   **Body**: El objeto de usuario completo, **incluyendo el `passwordHash`**.

### 2.4. Crear un usuario

-   **Método**: `POST`
-   **Path**: `/users`
-   **Request Body**:

    ```json
    {
      "username": "nuevo.usuario",
      "passwordHash": "$2b$12$...",
      "displayName": "Nuevo Usuario",
      "role": "user"
    }
    ```

-   **Respuesta esperada**: `201 OK`

### 2.5. Activar/desactivar un usuario

-   **Método**: `PUT`
-   **Path**: `/users/{id}/toggle`
-   **Request Body**:

    ```json
    {
      "isActive": 0
    }
    ```

-   **Respuesta esperada**: `200 OK`
