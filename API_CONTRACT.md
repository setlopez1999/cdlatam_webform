# API Contract — CDLatam Gestión Administrativa

**Versión:** 1.0  
**Fecha:** 2026-02-25  
**Audiencia:** Desarrollador de backend responsable de implementar el servidor REST

---

## Introducción

Este documento describe todos los endpoints REST que el frontend de **CDLatam Gestión Administrativa** consume. El frontend está configurado para apuntar a una URL base mediante la variable de entorno `VITE_API_URL` en el archivo `.env`. Basta con cambiar esa URL para conectar el frontend a cualquier backend compatible.

```env
# .env (en la raíz del proyecto frontend)
VITE_API_URL=https://api.tudominio.com/v1
```

Si `VITE_API_URL` está vacía o no definida, el frontend opera en **modo offline** usando `localStorage` como almacenamiento temporal.

---

## Convenciones Generales

### Base URL

Todos los endpoints son relativos a `VITE_API_URL`. Ejemplo:

```
VITE_API_URL = https://api.tudominio.com/v1
Endpoint     = /auth/login
URL completa = https://api.tudominio.com/v1/auth/login
```

### Autenticación

El frontend usa **JWT almacenado en `localStorage`** bajo la clave `cdlatam_token`. Cada request protegido incluye el header:

```
Authorization: Bearer <jwt_token>
```

El token debe contener en su payload:

```json
{
  "id": 1,
  "username": "admin",
  "nombre": "Administrador",
  "email": "admin@empresa.com",
  "role": "admin"
}
```

### Formato de respuesta

Todas las respuestas deben ser `Content-Type: application/json`.

**Respuesta exitosa:**
```json
{
  "data": { ... }
}
```
O directamente el objeto/array sin wrapper (ambos formatos son aceptados por el frontend).

**Respuesta de error:**
```json
{
  "error": "Mensaje de error legible",
  "code": "ERROR_CODE"
}
```

### Códigos HTTP esperados

| Código | Uso |
|--------|-----|
| `200` | Operación exitosa (GET, PUT, PATCH) |
| `201` | Recurso creado (POST) |
| `204` | Eliminado sin contenido (DELETE) |
| `400` | Datos inválidos o faltantes |
| `401` | No autenticado (token ausente o inválido) |
| `403` | Sin permisos (rol insuficiente) |
| `404` | Recurso no encontrado |
| `409` | Conflicto (ej. username ya existe) |
| `500` | Error interno del servidor |

### CORS

El backend debe permitir el origen del frontend:

```
Access-Control-Allow-Origin: <URL del frontend>
Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization
Access-Control-Allow-Credentials: true
```

---

## Módulo 1: Autenticación (`/auth`)

### `POST /auth/login`

Autentica un usuario con username y contraseña. Retorna el JWT y los datos del usuario.

**Request body:**
```json
{
  "username": "admin",
  "password": "1234"
}
```

**Response `200`:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "username": "admin",
    "nombre": "Administrador CDLatam",
    "email": "admin@cdlatam.com",
    "role": "admin"
  }
}
```

**Response `401`:**
```json
{ "error": "Credenciales inválidas" }
```

**Uso en frontend:** `authService.login()` → guarda el token en `localStorage` y actualiza el estado de sesión.

---

### `POST /auth/logout`

Invalida la sesión del usuario. El frontend elimina el token de `localStorage` independientemente de la respuesta.

**Headers requeridos:** `Authorization: Bearer <token>`

**Response `200`:**
```json
{ "success": true }
```

---

### `GET /auth/me`

Retorna los datos del usuario autenticado. Se llama al cargar la aplicación para restaurar la sesión.

**Headers requeridos:** `Authorization: Bearer <token>`

**Response `200`:**
```json
{
  "id": 1,
  "username": "admin",
  "nombre": "Administrador CDLatam",
  "email": "admin@cdlatam.com",
  "role": "admin"
}
```

**Response `401`:** Token inválido o expirado → el frontend redirige al login.

---

## Módulo 2: Catálogos (`/catalogs`)

Los catálogos alimentan los **comboboxes** de los formularios. Se cachean en memoria durante la sesión.

### `GET /catalogs/all`

Retorna todos los catálogos en una sola llamada (recomendado para reducir requests al cargar los formularios).

**Headers requeridos:** `Authorization: Bearer <token>`

**Response `200`:**
```json
{
  "monedas": [
    { "value": "USD", "label": "Dólar Americano" },
    { "value": "CLP", "label": "Peso Chileno" },
    { "value": "COP", "label": "Peso Colombiano" },
    { "value": "PEN", "label": "Sol Peruano" }
  ],
  "paises": [
    { "value": "CL", "label": "Chile" },
    { "value": "CO", "label": "Colombia" },
    { "value": "PE", "label": "Perú" }
  ],
  "unidadesNegocio": [
    { "value": "BROADCAST", "label": "Broadcast" },
    { "value": "TELECOM", "label": "Telecom" }
  ],
  "soluciones": [
    { "value": "HEADEND", "label": "Headend" },
    { "value": "CDN", "label": "CDN" }
  ],
  "tiposVenta": [
    { "value": "IMPLEMENTACIÓN", "label": "Implementación" },
    { "value": "MANTENCIÓN", "label": "Mantención" }
  ],
  "plazos": [
    { "value": "30 DÍAS", "label": "30 Días" },
    { "value": "12 MESES", "label": "12 Meses" }
  ],
  "cecos": [
    {
      "value": "20101 GN Legal",
      "label": "20101 GN Legal",
      "empresa": "GN",
      "departamento": "ADM",
      "area": "LEGAL"
    }
  ],
  "detalleServicio": [
    { "value": "CABECERA PRINCIPAL", "label": "Cabecera Principal" }
  ],
  "documentosIdentidad": [
    { "value": "RUT", "label": "RUT" },
    { "value": "RUC", "label": "RUC" },
    { "value": "DNI", "label": "DNI" }
  ]
}
```

### Endpoints individuales (opcionales)

Si el backend no implementa `/catalogs/all`, el frontend puede llamar a cada uno por separado:

| Endpoint | Descripción |
|----------|-------------|
| `GET /catalogs/monedas` | Lista de monedas |
| `GET /catalogs/paises` | Lista de países |
| `GET /catalogs/unidades-negocio` | Unidades de negocio |
| `GET /catalogs/soluciones` | Soluciones disponibles |
| `GET /catalogs/tipos-venta` | Tipos de venta |
| `GET /catalogs/plazos` | Plazos disponibles |
| `GET /catalogs/cecos` | Centros de costo (CECOs) |
| `GET /catalogs/detalle-servicio` | Detalle de servicio |
| `GET /catalogs/documentos-identidad` | Tipos de documento |

Todos retornan un array de `{ value: string, label: string, ...extras }`.

---

## Módulo 3: Formularios — Actas (`/formularios/actas`)

### `GET /formularios/actas`

Lista las actas del usuario autenticado. Un usuario normal solo ve las suyas; el admin ve todas.

**Headers requeridos:** `Authorization: Bearer <token>`

**Query params opcionales:**
```
?search=nombre_cliente
?status=borrador|completado|exportado
?page=1&limit=20
```

**Response `200`:**
```json
[
  {
    "id": "acta_001",
    "noActa": "2026-001",
    "fecha": "2026-02-25",
    "atencion": "Gerencia Técnica",
    "razonSocial": "Empresa S.A.",
    "nombreFantasia": "Empresa",
    "rucDniRut": "12345678-9",
    "tipoDocumento": "RUT",
    "direccion": "Av. Principal 123",
    "representanteLegal": "Juan Pérez",
    "contactoTecnico": "María García",
    "contactoFacturacion": "Carlos López",
    "servicios": [
      {
        "item": 1,
        "unidadNegocio": "BROADCAST",
        "solucion": "HEADEND",
        "detalleServicio": "CABECERA PRINCIPAL",
        "tipoVenta": "IMPLEMENTACIÓN",
        "valorUnitario": 5000,
        "cantidad": 1,
        "total": 5000,
        "plazo": "30 DÍAS"
      }
    ],
    "formasPago": [
      {
        "tipo": "implementacion",
        "cuotas": 1,
        "monto": 5000,
        "fechaVencimiento": "2026-03-25"
      }
    ],
    "status": "borrador",
    "creadoEn": "2026-02-25T10:00:00Z",
    "actualizadoEn": "2026-02-25T10:00:00Z"
  }
]
```

---

### `GET /formularios/actas/:id`

Retorna el detalle completo de un acta por su ID.

**Response `200`:** Mismo objeto que el ítem del listado.  
**Response `404`:** `{ "error": "Acta no encontrada" }`

---

### `POST /formularios/actas`

Crea una nueva acta.

**Request body:** Mismo esquema que el objeto de respuesta, sin `id`, `creadoEn`, `actualizadoEn`.

**Response `201`:** El objeto creado con `id`, `creadoEn` y `actualizadoEn` asignados por el servidor.

---

### `PUT /formularios/actas/:id`

Actualiza un acta existente (reemplazo completo).

**Request body:** Mismo esquema del objeto acta.

**Response `200`:** El objeto actualizado.

---

### `DELETE /formularios/actas/:id`

Elimina un acta.

**Response `204`:** Sin contenido.

---

## Módulo 4: Formularios — Evaluaciones de Proyecto (`/formularios/eps`)

### `GET /formularios/eps`

Lista los EPs del usuario autenticado.

**Query params opcionales:**
```
?search=nombre_cliente
?status=borrador|completado|exportado
?page=1&limit=20
```

**Response `200`:**
```json
[
  {
    "id": "ep_001",
    "noEP": "EP-2026-001",
    "unidadNegocio": "BROADCAST",
    "nombreCliente": "Empresa S.A.",
    "solucion": "HEADEND",
    "tipoMoneda": "USD",
    "montoProyecto": 50000,
    "plazo": "30 DÍAS",
    "pais": "CL",
    "fechaEvaluacion": "2026-02-25",
    "hardware": [
      {
        "ceco": "20101 GN Legal",
        "descripcion": "Switch Core",
        "valorNeto": 3000,
        "cantidad": 2,
        "totalNeto": 6000,
        "iva": 1140,
        "total": 7140
      }
    ],
    "materiales": [],
    "rrhh": [
      {
        "tipo": "tecnico",
        "nombre": "Técnico Interno",
        "horasDia": 8,
        "diasMes": 20,
        "valorHora": 25,
        "totalMes": 4000
      }
    ],
    "otrosGastos": [
      {
        "tipo": "movilizacion",
        "descripcion": "Viaje a cliente",
        "valor": 500
      }
    ],
    "status": "completado",
    "creadoEn": "2026-02-25T10:00:00Z",
    "actualizadoEn": "2026-02-25T10:00:00Z"
  }
]
```

### `GET /formularios/eps/:id`

Detalle de un EP por ID.

### `POST /formularios/eps`

Crea un nuevo EP. El **Formulario 3 (Resultado)** se calcula en el frontend a partir de los datos del EP:

```
Total Hardware   = Σ hardware[].total
Total Materiales = Σ materiales[].total
Total RRHH       = Σ rrhh[].totalMes
Total Otros      = Σ otrosGastos[].valor
Total Gastos     = Hardware + Materiales + RRHH + Otros
Resultado        = montoProyecto - Total Gastos
GIM (10%)        = Resultado × 0.10
GP (90%)         = Resultado × 0.90
Bruto Factura    = montoProyecto
IVA (19%)        = montoProyecto × 0.19
Neto Factura     = montoProyecto + IVA
```

**Request body:** Mismo esquema sin `id`, `creadoEn`, `actualizadoEn`.

**Response `201`:** El objeto creado.

### `PUT /formularios/eps/:id`

Actualiza un EP existente.

### `DELETE /formularios/eps/:id`

Elimina un EP.

---

## Módulo 5: Historial (`/formularios/historial`)

### `GET /formularios/historial`

Retorna el historial combinado de actas y EPs del usuario autenticado, ordenado por fecha descendente.

**Query params opcionales:**
```
?tipo=acta|ep
?search=texto
```

**Response `200`:**
```json
[
  {
    "id": "acta_001",
    "tipo": "acta",
    "titulo": "Acta 2026-001",
    "fecha": "2026-02-25T10:00:00Z",
    "status": "completado",
    "cliente": "Empresa S.A."
  },
  {
    "id": "ep_001",
    "tipo": "ep",
    "titulo": "EP EP-2026-001",
    "fecha": "2026-02-25T09:00:00Z",
    "status": "borrador",
    "cliente": "Empresa S.A."
  }
]
```

---

## Módulo 6: Administración (`/admin`) — Solo rol admin

Todos los endpoints de este módulo requieren `role: "admin"` en el JWT. El backend debe retornar `403` si el usuario no es admin.

### `GET /admin/usuarios`

Lista todos los usuarios del sistema.

**Response `200`:**
```json
[
  {
    "id": 1,
    "username": "admin",
    "nombre": "Administrador CDLatam",
    "email": "admin@cdlatam.com",
    "role": "admin",
    "isActive": true,
    "creadoEn": "2026-01-01T00:00:00Z",
    "ultimoAcceso": "2026-02-25T10:00:00Z",
    "totalFormularios": 15
  }
]
```

---

### `POST /admin/usuarios`

Crea un nuevo usuario.

**Request body:**
```json
{
  "username": "nuevo_usuario",
  "password": "contraseña_segura",
  "nombre": "Nombre Completo",
  "email": "usuario@empresa.com",
  "role": "user"
}
```

**Response `201`:** El usuario creado (sin `password`).  
**Response `409`:** `{ "error": "El username ya existe" }`

---

### `PUT /admin/usuarios/:id`

Actualiza datos básicos de un usuario (nombre, email).

**Request body:**
```json
{
  "nombre": "Nuevo Nombre",
  "email": "nuevo@email.com"
}
```

---

### `PATCH /admin/usuarios/:id/role`

Cambia el rol de un usuario.

**Request body:**
```json
{ "role": "admin" }
```

---

### `PATCH /admin/usuarios/:id/status`

Activa o desactiva un usuario.

**Request body:**
```json
{ "isActive": false }
```

---

### `PATCH /admin/usuarios/:id/password`

Cambia la contraseña de un usuario (solo admin puede hacer esto).

**Request body:**
```json
{ "newPassword": "nueva_contraseña" }
```

---

### `DELETE /admin/usuarios/:id`

Elimina un usuario. No se puede eliminar el propio usuario admin.

---

### `GET /admin/bd/stats`

Estadísticas generales del sistema para el Dashboard del admin.

**Response `200`:**
```json
{
  "totalActas": 42,
  "totalEPs": 38,
  "totalUsuarios": 5,
  "actasPorEstado": {
    "borrador": 10,
    "completado": 25,
    "exportado": 7
  },
  "epsPorEstado": {
    "borrador": 8,
    "completado": 20,
    "exportado": 10
  },
  "actividadReciente": [
    {
      "id": "acta_042",
      "tipo": "acta",
      "titulo": "Acta 2026-042",
      "fecha": "2026-02-25T10:00:00Z",
      "status": "completado",
      "cliente": "Empresa XYZ"
    }
  ]
}
```

---

### `GET /admin/bd/actas`

Lista todas las actas del sistema (admin ve las de todos los usuarios).

**Query params:**
```
?search=texto
?status=borrador|completado|exportado
?userId=123
?page=1&limit=20
```

**Response `200`:**
```json
{
  "items": [ /* array de ActaData */ ],
  "total": 42
}
```

---

### `GET /admin/bd/eps`

Lista todos los EPs del sistema.

**Query params:** Mismos que `/admin/bd/actas`.

**Response `200`:**
```json
{
  "items": [ /* array de EPData */ ],
  "total": 38
}
```

---

### `GET /admin/historial`

Historial global de todos los usuarios.

**Query params:**
```
?userId=123    → filtrar por usuario específico
?tipo=acta|ep
```

**Response `200`:** Array de `HistorialItem`.

---

## Resumen de Endpoints

| Método | Endpoint | Auth | Rol | Descripción |
|--------|----------|------|-----|-------------|
| `POST` | `/auth/login` | No | Todos | Login |
| `POST` | `/auth/logout` | Sí | Todos | Logout |
| `GET` | `/auth/me` | Sí | Todos | Sesión actual |
| `GET` | `/catalogs/all` | Sí | Todos | Todos los catálogos |
| `GET` | `/catalogs/:nombre` | Sí | Todos | Catálogo individual |
| `GET` | `/formularios/actas` | Sí | Todos | Listar actas |
| `GET` | `/formularios/actas/:id` | Sí | Todos | Detalle acta |
| `POST` | `/formularios/actas` | Sí | Todos | Crear acta |
| `PUT` | `/formularios/actas/:id` | Sí | Todos | Actualizar acta |
| `DELETE` | `/formularios/actas/:id` | Sí | Todos | Eliminar acta |
| `GET` | `/formularios/eps` | Sí | Todos | Listar EPs |
| `GET` | `/formularios/eps/:id` | Sí | Todos | Detalle EP |
| `POST` | `/formularios/eps` | Sí | Todos | Crear EP |
| `PUT` | `/formularios/eps/:id` | Sí | Todos | Actualizar EP |
| `DELETE` | `/formularios/eps/:id` | Sí | Todos | Eliminar EP |
| `GET` | `/formularios/historial` | Sí | Todos | Historial del usuario |
| `GET` | `/admin/usuarios` | Sí | Admin | Listar usuarios |
| `POST` | `/admin/usuarios` | Sí | Admin | Crear usuario |
| `PUT` | `/admin/usuarios/:id` | Sí | Admin | Actualizar usuario |
| `PATCH` | `/admin/usuarios/:id/role` | Sí | Admin | Cambiar rol |
| `PATCH` | `/admin/usuarios/:id/status` | Sí | Admin | Activar/desactivar |
| `PATCH` | `/admin/usuarios/:id/password` | Sí | Admin | Reset contraseña |
| `DELETE` | `/admin/usuarios/:id` | Sí | Admin | Eliminar usuario |
| `GET` | `/admin/bd/stats` | Sí | Admin | Estadísticas |
| `GET` | `/admin/bd/actas` | Sí | Admin | Todas las actas |
| `GET` | `/admin/bd/eps` | Sí | Admin | Todos los EPs |
| `GET` | `/admin/historial` | Sí | Admin | Historial global |

---

## Configuración del Frontend

### Archivo `.env`

```env
# URL base de la API REST (requerido para conectar el backend)
VITE_API_URL=https://api.tudominio.com/v1

# Si se deja vacío, el frontend opera con localStorage (modo offline)
```

### Cómo conectar el backend

1. Implementar todos los endpoints descritos en este documento.
2. Asegurarse de que el servidor responde con `Content-Type: application/json`.
3. Configurar CORS para permitir el origen del frontend.
4. Editar el archivo `.env` del proyecto frontend con la URL del backend.
5. Reiniciar el servidor de desarrollo (`pnpm dev`) o reconstruir (`pnpm build`).

### Archivos clave del Service Layer

```
client/src/core/services/
├── apiService.ts          ← Cliente HTTP base (fetch + token)
├── authService.ts         ← Login, logout, me
├── catalogsService.ts     ← Catálogos para comboboxes
├── formulariosService.ts  ← Actas, EPs, historial
├── adminService.ts        ← Gestión de usuarios y BD (admin)
└── index.ts               ← Barrel de exportación
```

Cada función tiene comentarios `// TODO: Conectar con API de Base de Datos aquí` marcando exactamente dónde se hace la llamada REST.

---

*Documento generado automáticamente por CDLatam Gestión Administrativa v1.0*
