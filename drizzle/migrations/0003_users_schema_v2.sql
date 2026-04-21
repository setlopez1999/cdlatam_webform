-- Migracion 0003: Transformar tabla users del esquema OAuth (openId) al esquema local (username/password)
-- Esta migracion es segura: renombra la tabla vieja, crea la nueva con el schema correcto,
-- y crea la tabla roles si no existe.

-- 1. Renombrar tabla vieja para preservar datos
ALTER TABLE `users` RENAME TO `users_v1_backup`;

-- 2. Crear tabla roles si no existe (columnas: nombre, label, descripcion, activo)
CREATE TABLE IF NOT EXISTS `roles` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `nombre` text NOT NULL UNIQUE,
  `label` text NOT NULL,
  `descripcion` text,
  `activo` integer DEFAULT 1 NOT NULL,
  `createdAt` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
  `updatedAt` integer DEFAULT (strftime('%s', 'now')) NOT NULL
);

-- 3. Insertar roles base si la tabla estaba vacia
INSERT OR IGNORE INTO `roles` (`nombre`, `label`, `descripcion`, `activo`) VALUES
  ('admin',   'Administrador', 'Acceso total al sistema', 1),
  ('manager', 'Gerente',       'Puede ver todo, no puede gestionar usuarios', 1),
  ('viewer',  'Solo lectura',  'Acceso de solo lectura', 1),
  ('user',    'Usuario',       'Acceso basico al sistema', 1);

-- 4. Crear nueva tabla users con schema v2
CREATE TABLE `users` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `username` text NOT NULL UNIQUE,
  `passwordHash` text NOT NULL,
  `displayName` text,
  `role` text DEFAULT 'user' NOT NULL,
  `roleId` integer,
  `isActive` integer DEFAULT 1 NOT NULL,
  `createdAt` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
  `updatedAt` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
  `lastSignedIn` integer
);

-- 5. Crear tabla catalog_meta si no existe
CREATE TABLE IF NOT EXISTS `catalog_meta` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `table_name` text NOT NULL UNIQUE,
  `title` text NOT NULL,
  `is_custom` integer DEFAULT 0 NOT NULL,
  `linked_field` text,
  `created_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL
);
