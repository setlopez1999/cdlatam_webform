# SGA CDLatam — Contexto del Proyecto

> **Última actualización:** Julio 2026
>
> Este archivo es la fuente de contexto para sesiones de opencode.
> Se carga automáticamente vía `instructions` en `opencode.json`.
>
> **Para actualizar:** editar este archivo (no requiere rebuild, solo restart de opencode).

---

## 1. Stack

| Capa | Tecnología |
|------|-----------|
| Frontend | React 19 + TypeScript + Vite 7 |
| Estilos | Tailwind CSS v4 + shadcn/ui |
| Backend | Express + tRPC (end-to-end typesafe) |
| ORM | Drizzle ORM |
| DB Producción | PostgreSQL 16 (vía `pg`) |
| DB Desarrollo | SQLite (vía `better-sqlite3`) |
| Auth | JWT (`jose`) + cookies (`local_session`) |
| PDF | `jspdf` v4 + `jspdf-autotable` + `pdf-lib` v1 |
| Contenedores | Docker Compose (postgres + app + nginx) |
| Proxy | Nginx 1.27 (SSL + reverse proxy + landing) |

---

## 2. Estructura del Proyecto

```
/opt/sga/
├── client/                          # Frontend React
│   ├── src/
│   │   ├── components/              # UI components (shadcn/ui + custom)
│   │   │   └── ui/                  # shadcn/ui primitives
│   │   ├── config/                  # catalogConfig.ts (catálogos hardcodeados)
│   │   ├── features/
│   │   │   └── expedientes/         # ★ Módulo principal
│   │   │       ├── store.ts         # Singleton store (useSyncExternalStore)
│   │   │       ├── fromServer.ts    # Mapeo DB → tipos cliente
│   │   │       ├── types.ts         # Expediente, F1Data, F2Data, F3Calculado
│   │   │       ├── f1/              # Formulario Acta
│   │   │       ├── f2/              # Evaluación de Proyecto
│   │   │       ├── f3/              # Resultados (calculado)
│   │   │       └── implementacion/  # Estado de implementación
│   │   ├── hooks/                   # Custom hooks (useLocalAuth, etc.)
│   │   ├── lib/                     # Utilidades
│   │   │   ├── pdf/                 # ★ Motor de PDF (acta-pdf.ts, etc.)
│   │   │   ├── formatters.ts        # formatCurrency, formatDate, getStatusLabel
│   │   │   └── errorUtils.ts        # APP_DEBUG, USE_API desde window.__ENV__
│   │   └── pages/                   # Páginas del SPA
│   └── index.html
├── server/                          # Backend Express + tRPC
│   ├── _core/                       # Core: index.ts, context.ts, trpc.ts, env.ts
│   ├── routers.ts                   # ★ Router tRPC único (agrega todos los submódulos)
│   ├── routers/
│   │   └── clausulas.ts             # Router de cláusulas legales
│   ├── dataSource.ts                # Abstracción DB local vs API externa
│   ├── dataSource-clausulas.ts      # Data source de cláusulas
│   ├── db.ts                        # Conexión SQLite/PostgreSQL
│   ├── schemaBootstrap.ts           # CREATE TABLE IF NOT EXISTS
│   ├── rbac.ts                      # Role-Based Access Control
│   └── expedienteAccess.ts          # Lógica de acceso a expedientes
├── drizzle/                         # Schema Drizzle + migraciones
│   ├── schema.ts                    # ★ Modelo de datos (todas las tablas)
│   ├── migrations/                  # Migraciones SQLite
│   └── migrations-pg/               # Migraciones PostgreSQL
├── data/
│   └── clausulas/                   # PDFs de cláusulas subidos (volumen persistente)
├── docker-compose.yml               # postgres + sga + nginx
├── Dockerfile                       # Multi-stage build
└── .env                             # Config de producción (NO commitear)
```

---

## 3. Arquitectura General

### 3.1 Servidor (Express + tRPC)

```
Request → Express → tRPC middleware → createContext()
  ├── Lee cookie "local_session"
  ├── Verifica JWT con jose
  └── Carga usuario desde DB → ctx.user / ctx.localUser

Procedures:
  publicProcedure    → sin auth (health, login)
  protectedProcedure → requiere ctx.user
  adminProcedure     → requiere ctx.user.role === "admin"
  requireRole()      → check N:N user_roles
```

**Router único** en `server/routers.ts` con submódulos:
| Router | Propósito |
|--------|-----------|
| `system` | Health check |
| `auth` | Me, logout |
| `localAuth` | Login, CRUD usuarios, cambio credentials |
| `roles` | CRUD roles |
| `userRoles` | Asignación N:N usuario ↔ rol |
| `actas` | CRUD actas (F1) + `syncF1` |
| `evaluaciones` | CRUD evaluaciones (F2) + `syncF2` |
| `expediente` | Ciclo de vida completo: crear, detalle, renombrar, eliminar, papelera, implementacion, syncResultado |
| `catalogs` | Opciones para comboboxes |
| `catalogsDB` | CRUD genérico de catálogos + meta + dinámicos |
| `clausulas` | CRUD cláusulas PDF + upload + replace |
| `horario` | Gestión de horarios (empleados, contratos, bloques) |
| `dashboard` | Stats de actas/evaluaciones |
| `search` | Búsqueda global |

### 3.2 Cliente

**Store de expedientes:** Módulo singleton (NO Zustand). Usa `useSyncExternalStore` para Reactividad.
- `_state: Expediente[]` — variable de módulo
- Persiste a localStorage (`cdlatam_expedientes`) con debounce de 400ms
- `flushExpedientePersist()` para escritura inmediata (save, merge)
- `beforeunload` → flush para no perder datos al cerrar

**Data pipeline (fromServer.ts):**
```
tRPC (SQLite rows) → fromServer.ts (mapResumenRowToExpediente) → Expediente[] (store)
```

### 3.3 FormStatus (estado de formulario)

```
"nuevo" → (primer edit) → "sin_guardar" → (save exitoso) → "guardado"
"guardado" → (cualquier edit) → "sin_guardar"
```

**No optimista:** el status cambia a `"guardado"` solo tras respuesta exitosa del servidor.
Si falla, queda `"sin_guardar"` y el usuario ve un badge ámbar.

---

## 4. F1 (Acta) — Datos y Lógica

**Archivos clave:** `f1/F1Form.tsx`, `f1/useF1.ts`, `f1/sections/`, `f1/reconcileFormasPago.ts`, `f1/f1TipoVenta.ts`

**Tipo:** `F1Data` en `types.ts`

### Campos de Encabezado
| Campo | Tipo | Descripción |
|-------|------|-------------|
| `sres` | string | Empresa destinataria (catálogo) |
| `noActa` | string | Número de acta |
| `atencion` | string | Persona de atención (catálogo) |
| `activacionNueva` | string | Fecha de activación |
| `fecha` | string | Fecha del acta |

### Datos de Empresa
| Campo | Tipo | Descripción |
|-------|------|-------------|
| `razonSocial` | string | Razón social del cliente |
| `nombreFantasia` | string | Nombre de fantasía |
| `rucDniRut` | string | RUT/DNI |
| `tipoDocumento` | string | Tipo de documento |
| `direccionComercial` | string | Dirección |
| `pais` | string | Catálogo países |
| `moneda` | string | Catálogo monedas |

### Contactos (3 columnas en UI)
**Representante Legal:** nombre, tipoDoc, dni, email, telFijo, telMovil
**Contacto Técnico:** nombre, email, telFijo, telMovil
**Contacto Facturación:** nombre, email, telFijo, telMovil

### Servicios Contratados
```ts
ServicioContratado[]  — array dinámico
  id, unidadNegocio, solucion, detalleServicio, tipoVenta,
  moneda, cantidad, precioUnitario, plazo, total
```

### Formas de Pago (2 tablas)
| Tabla | Activación |
|-------|-----------|
| `formasPagoImplementacion` | Si existe servicio con `tipoVenta` que contenga "implementacion", "impl" |
| `formasPagoMantencion` | Si existe servicio con `tipoVenta` que contenga "mantencion", "mant" |

**Lógica de cuotas (1-4):**
- Arreglo dinámico, columnas se expanden/contraen según `max(nCuotas)`
- Si una fila tiene 2 cuotas, campos de cuota 3-4 aparecen deshabilitados
- **Validación financiera:** suma de cuotas debe coincidir con total de servicios (alerta si diff > 0.1)

**Auto-sincronización:** cada `FormaPago` puede tener `linkedServicioId`. Cuando el servicio cambia su total, se actualiza automáticamente el monto total de la forma de pago.

**Mantención especial:** incluye lógica de `total_descuento_mantencion` — diferencia entre precio unitario y monto de cuota en cuotas de gracia.

### Consideraciones y Cláusulas
- `consideracionesPersonalizadas: string[]` — ítems editables adicionales
- `clausulasLegales: string` — texto libre de cláusulas

### Firma
- `firmaImagen?: string` — base64 data URL de la firma digital

### Persistencia
- `useF1.ts` → `trpc.actas.syncF1` con snapshot completo → BD `actas.f1Datos` (JSON)

---

## 5. F2 (Evaluación de Proyecto) — Datos y Lógica

**Archivos clave:** `f2/F2Form.tsx`, `f2/useF2.ts`, `f2/f2RowDerivation.ts`, `f2/TipoCambioInput.tsx`, `f2/sections/`

**Tipo:** `F2Data` en `types.ts`

### Encabezado
| Campo | Tipo | Origen |
|-------|------|--------|
| `unidadNegocios` | string | Catálogo |
| `empresa` | string | Desde F1 (razón social) |
| `centroCostoHeader` | string | Catálogo CECOs |
| `solucion` | string | Catálogo |
| `tipoMoneda` | string | Desde F1 |
| `montoProyecto` | number | |
| `tipoCambio` | number \| null | |
| `totalClp` | number | Calculado |
| `descripcion` | string | |
| `preventa` | string | |
| `fechaEntrega` | string | |
| `ejecutivoComercial` | string | |
| `plazoImplementacion` | string | |
| `propuestaNumero` | string | |
| `paisImplementacion` | string | Catálogo |
| `rut` | string | |
| `nombreCliente` | string | |
| `nombreFantasia` | string | |

### Tablas de Costos

| Tabla | Tipo de fila | Campos clave |
|-------|-------------|--------------|
| `hardware[]` | `FilaCosto` | centroCosto, valorNeto, moneda, tipoCambio, cantidad, totalNeto, iva, total, descripcion, observacion, cuota |
| `materiales[]` | `FilaCosto` | (mismo que hardware) |
| `rrhh[]` | `FilaRRHH` | tipo (`tecnico_interno` \| `especialista_externo` \| `supervisor`), label, valorSinImpuesto, impuesto, cuota |
| `otrosGastos[]` | `FilaOtros` | tipo (`comision` \| `movilizacion` \| `viatico` \| `alojamiento` \| `varios`), label, **mes** (1-4) en vez de cuota |

**Nota:** `tipoCambio: number | null` — ha causado errores TypeScript al asignarlo a funciones que esperan `number` (sin null). Prestar atención al pasar a `formatCurrency` u otras utilidades.

### Pipeline de Sync (checklist 4 capas para campo nuevo)

```
1. F2Data + UI (F2InfoGeneral)
2. F2_SYNC_SCALAR_KEYS en fromServer.ts
3. EvaluacionInputSchema + syncF2 basePatch en server/routers.ts
4. Columna en drizzle/schema.ts + migración + tryAlter en server/db.ts
```

**Regla de oro:** Al guardar, el `guardar()` en `useF2.ts` envía el **store completo** (`freshData`), nunca solo la vista derivada. Tras éxito, `storeGuardarF2` recibe el `F2Data` completo.

### Persistencia
- `useF2.ts` → `trpc.evaluaciones.syncF2` con snapshot completo → BD `evaluaciones.f2Datos` (JSON)
- Cost rows (`hardware`, `materiales`, `rrhh`, `otrosGastos`) van en el payload de sync

---

## 6. F3 (Resultados) — Calculado

**Archivos clave:** `f3/F3View.tsx`, `f3/calcularResultadoF3.ts`

**NO tiene formulario editable.** Se calcula desde `F2Data` (con opciones de `F1Data`).

### Output (`F3Calculado`)
```
resumen:
  hardware/materiales/rh/otros: { mes1, mes2, mes3, mes4 }
  totalGastos: { mes1..mes4 }
ingreso: { mes1..mes4 }
gasto: { mes1..mes4 }
resultado: { mes1..mes4 }
distribucion:
  gim: { porcentaje, mes1..mes4 }
  gp: { porcentaje, mes1..mes4 }
facturacion:
  bruto: { mes1..mes4 }
  impuesto: { tasa, mes1..mes4 }
  neto: { mes1..mes4 }
```

### Flujo
1. `F3View` llama `calcularResultadoF3(f2.data, f1.data, opts)` en `useMemo`
2. Resultado se sincroniza al servidor via `trpc.expediente.syncResultado`
3. Store solo guarda `f3.status` — los resultados de cálculo son efímeros a la vista

---

## 7. PDF Export

**Librerías:** `jspdf` v4 (cuerpo) + `jspdf-autotable` (tablas) + `pdf-lib` v1 (merge/scale)
**Todo client-side** — no hay server-side PDF.

**Archivos:** `client/src/lib/pdf/`

### `acta-pdf.ts` — función principal `createActaPdfBlob(acta, clausulas, opts)`

**Orden de ensamblado del PDF final:**

| # | Sección | Implementación |
|---|---------|---------------|
| 1 | Header (banda + logo + título "Acta de Aceptación de Servicios") | `draw-header.ts` |
| 2 | Encabezado (Sres., Atención, Fecha) | `acta-sections.ts` |
| 3 | Información Legal del Cliente (Razón Social, RUT, Moneda, etc.) | `acta-sections.ts` |
| 4 | Información de Contacto (grid 3 columnas) | `acta-sections.ts` |
| 5 | Servicios Contratados (tabla) | `acta-sections.ts` + autotable |
| 6 | Formas de Pago — Implementación (tabla dinámica, condicional) | `acta-sections.ts` |
| 7 | Formas de Pago — Mantención (tabla dinámica, condicional) | `acta-sections.ts` |
| 8 | Consideraciones y Alcances (lista) | `acta-sections.ts` |
| 9 | Cláusulas Legales (texto plano desde `acta.clausulasLegales`) | `acta-sections.ts` |
| 10 | Bloque de Firma | `acta-sections.ts` |
| 11 | Footer (en cada página) | `acta-sections.ts` |
| — | **Features Resumido** (insertado tras acta, antes de cláusulas) | `features-resumido.ts` |
| — | **Cláusulas** (PDFs externos, ordenados por `ordenGlobal`) | `acta-pdf.ts` merge loop |

### Features Resumido
- PDF independiente: "Especificaciones y Matriz de Features"
- Tabla: Módulo/Componente | Descripción | Incluye (SI=verde, NO=rojo)
- Se inserta como primer documento tras el acta (orden 20 en convención)

### Cláusulas
- PDFs almacenados en `/app/data/clausulas/` (volumen Docker `sga_clausulas`)
- Se fetchan en runtime via `fetch(c.filePath, { credentials: "include" })`
- Se ordenan por `ordenGlobal` ascendente
- Se mergean con `pdf-lib`, escalando a Letter
- Se dibuja header "Condiciones de Servicio" (con unidad de negocio si aplica) en cada página de tipo `clausula`

### Resultado EP
- **NO usa jsPDF/pdf-lib** — genera HTML con tablas y tarjetas KPI, imprime vía `iframe.contentWindow.print()`

---

## 8. Catálogos Dinámicos

**Archivos clave:** `config/catalogConfig.ts`, `components/CatalogCrudView.tsx`, `components/ManageCatalogsModal.tsx`

### Funcionamiento
1. Tabla `catalog_meta` define metadatos de cada catálogo (tableName, title, isCustom, etc.)
2. `CatalogCrudView` renderiza CRUD genérico basado en `catalog_meta + catalogConfig`
3. `catalogConfig[tableName]` en `catalogConfig.ts` tiene configuraciones hardcodeadas para catálogos conocidos
4. Si no hay hardcode, se genera config genérica (`{ valor, activo }`)
5. Tablas dinámicas: `catalog_custom_*` — creadas en runtime, NO en schemaBootstrap

**Catálogos fijos** (con config hardcodeada): monedas, países, empresas, documento_identidad, unidades_negocio, soluciones, detalle_servicio, tipo_venta, plazos, documentos, cecos, departamentos, áreas, nombres, consideraciones_comerciales, implementacion_items

---

## 9. Auth y Roles

**Archivos clave:** `server/_core/context.ts`, `server/_core/trpc.ts`, `server/rbac.ts`, `hooks/useLocalAuth.ts`

### Flujo de autenticación
1. Login: POST username/password → valida contra BD → firma JWT con `jose`
2. JWT se almacena en cookie `local_session` (httpOnly, secure)
3. Cada request tRPC: `createContext` extrae cookie, verifica JWT, carga usuario de BD
4. `useLocalAuth` hook en cliente expone `currentUser`, `isAdmin`, `isLoading`

### Roles
| Sistema | Descripción |
|---------|-------------|
| **Legacy** | Columna `role` en `users` ("admin" \| "user") |
| **Moderno** | Tabla N:N `user_roles` con roles definidos en `roles` |
| **Roles semilla** | `admin`, `user`, `gestor_horarios`, `perfil_full`, `perfil_ventas`, `perfil_implementacion` |
| **Easter egg** | 5 clicks en ícono Dashboard → toggle `gestor_horarios` |

### Authorization Procedures
| Procedure | Check |
|-----------|-------|
| `publicProcedure` | Sin auth |
| `protectedProcedure` | `ctx.user` ≠ null |
| `adminProcedure` | `ctx.user.role === "admin"` |
| `requireRole(ctx, name)` | Check N:N user_roles |
| `requireAnyRole(ctx, names[])` | Check OR sobre múltiples roles |

### Expediente Access
- Usuarios con `perfil_full` o `admin` ven todos los expedientes (workspace global)
- Otros usuarios ven solo sus propios expedientes

---

## 10. DB Schema y Migraciones

**Archivos clave:**
| Capa | Archivo | Propósito |
|------|---------|-----------|
| Modelo | `drizzle/schema.ts` | Definición Drizzle de todas las tablas |
| Migraciones SQLite | `drizzle/migrations/` | Historial versionado |
| Migraciones PostgreSQL | `drizzle/migrations-pg/` | Para producción |
| Bootstrap | `server/schemaBootstrap.ts` | `CREATE TABLE IF NOT EXISTS` (fallback) |
| Alter incremental | `server/db.ts` → `tryAlter()` | `ALTER TABLE ADD COLUMN` para BDs existentes |

### Tablas por Área
| Área | Tablas |
|------|--------|
| RBAC | `roles`, `users`, `user_roles` |
| Catálogos maestros | `catalog_monedas`, `catalog_paises`, `catalog_empresas`, `catalog_documento_identidad`, `catalog_unidades_negocio`, `catalog_soluciones`, `catalog_detalle_servicio`, `catalog_tipo_venta`, `catalog_plazos`, `catalog_documentos`, `catalog_cecos`, `catalog_departamentos`, `catalog_areas`, `catalog_nombres`, `catalog_consideraciones_comerciales`, `catalog_implementacion_items` |
| Meta catálogos | `catalog_meta` |
| Formularios | `actas` (f1Datos JSON), `evaluaciones` (f2Datos JSON) |
| Expedientes | `expedientes`, `resultados_expediente`, `implementaciones` |
| Auditoría | `audit_log` |
| Cláusulas | `catalog_clausulas` |
| Horarios | `sch_empleados`, `sch_contratos`, `sch_bloques_horario` |

### Flujo para cambios de schema
1. Editar `drizzle/schema.ts`
2. Generar migración: `pnpm drizzle-kit generate` (y revisar SQL)
3. Actualizar `server/schemaBootstrap.ts`
4. Si es columna nueva: añadir `tryAlter(...)` en `server/db.ts` Paso 2
5. Actualizar `docs/CONTEXT.md`

---

## 11. Docker y Variables de Entorno

### Lección aprendida: Build vs Runtime

| Tipo | Cómo se pasa | Cuándo se lee | Para cambiar |
|------|-------------|---------------|-------------|
| **Build-time** | `ENV` en `Dockerfile` (ej: `NODE_ENV`) | Durante `npm run build` | Requiere `--build` |
| **Runtime** | `env_file` + `environment` en `docker-compose.yml` | Al arrancar el contenedor | Solo restart: `docker compose restart sga` |

**Importante:** `.env` se carga via `env_file` en `docker-compose.yml`. Las variables como `DATABASE_URL`, `APP_DEBUG`, `USE_API`, `JWT_SECRET` son **runtime** — cambiar `.env` y hacer `docker compose up -d sga` (sin `--build`) es suficiente.

**`/config.js` endpoint:** El servidor sirve `window.__ENV__` en runtime (línea `server/_core/index.ts:88-92`). El cliente lee `APP_DEBUG`, `USE_API`, `DB_ENGINE` desde ahí. No están en el bundle de Vite. Refrescar el navegador tras restart es suficiente.

⚠️ **Lección: Duplicado de `/config.js` (Jul 2026)**

**Problema:** Al agregar `DB_ENGINE` al `config.js` en `server/_core/vite.ts:80` (`runtimeEnv()`), el cambio **no se reflejaba** porque `server/_core/index.ts:88` tenía su propia ruta `/config.js` registrada **antes** que la de `vite.ts`. Express usa la primera ruta que coincide, así que la vieja (sin `DB_ENGINE`) ganaba siempre.

**Síntoma:** El badge en BaseDatos mostraba "SQLite conectado" aunque el servidor usara PostgreSQL. El `config.js` devolvía `{"APP_DEBUG":false,"USE_API":false}` sin `DB_ENGINE`.

**Solución:** Agregar `DB_ENGINE: ENV.databaseUrl.startsWith("postgresql://") ? "postgresql" : "sqlite"` al `config.js` en `server/_core/index.ts:91`.

**Para debuggear cambios no reflejados en el futuro:**
1. `docker compose exec sga curl -s http://localhost:3000/config.js` — verificar `window.__ENV__`
2. `docker compose exec sga grep "DB_ENGINE\|USE_API" dist/index.js` — verificar que el código compilado contenga el cambio
3. Si Docker muestra `CACHED` en `COPY . .` durante el build, usar `--no-cache`

### Comandos comunes
```bash
# Build + deploy (cambios en código fuente)
docker compose up --build -d sga

# Solo restart (cambios en .env)
docker compose restart sga

# Logs
docker logs sga_app --tail 50 -f

# Health check
curl -f http://localhost:3000/api/health
```

### Docker Compose services
| Service | Puerto expuesto | Propósito |
|---------|----------------|-----------|
| `postgres` | — (red interna) | PostgreSQL 16 |
| `sga` | 3000 (red interna) | Node.js Express |
| `nginx` | 80/443 (host) | Proxy reverso + SSL + landing |

### Volúmenes persistentes
- `postgres_data` → `/var/lib/postgresql/data`
- `sga_clausulas` → `/app/data/clausulas` (PDFs subidos)

---

## 12. Protección Chrome Translate

**Problema:** Chrome Translate modifica el DOM (textContent, placeholders, aria-label), lo que causa `NotFoundError` en React con elementos controlados.

**Reglas aplicadas** (ver `docs/TRADUCCION-CHROME-REACT.md`):
- Inputs controlados `<Input value={state}>` → `translate="no"`
- Texto dinámico de API/estado → `translate="no"`
- Texto estático en español → **traducible** (sin `translate="no"`)
- NO poner `translate="no"` en wrappers gigantes — matar traducción útil

**Files blindados:** `Login.tsx`, `ClausulasPage.tsx`, `Usuarios.tsx`, `GestorHorarios.tsx`, `BaseDatos.tsx`, `SpreadsheetView.tsx`, `NuevoExpediente.tsx`, `NotFound.tsx`

---

## 13. Convenciones de Código

- **Sin comentarios** en código (salvo `// ─── separadores ───`)
- **Nombres:** camelCase (variables/funciones), PascalCase (tipos/componentes), snake_case (DB columns)
- **Archivos feature:** `NombreFeature.tsx` para componentes, `useNombre.ts` para hooks
- **Store:** módulo singleton, no Zustand. Usar `useSyncExternalStore` para Reactividad
- **tRPC:** mutations en `useMutation` con `onSuccess`/`onError` inline
- **Errores:** `toast.error()` desde `sonner`, no `alert()` ni console

---

## 14. Testing

| Tipo | Herramienta | Ubicación |
|------|-------------|-----------|
| Unit tests | Vitest | Co-locados: `*.test.ts` junto al fuente |
| PDF tests | Vitest | `client/src/lib/pdf/*.test.ts` |
| Store tests | Vitest | `features/expedientes/store.test.ts` |

Comando: `npm test` o `pnpm test`

---

## Historial de cambios en este documento

| Fecha | Cambio |
|-------|--------|
| Jul 2026 | Creación inicial — contexto completo del SGA CDLatam |
| Jul 2026 | Documentado bug duplicado `/config.js` + fix `DB_ENGINE` |
