-- Migración 0005: Eliminar roles obsoletos viewer y manager
-- Estos roles ya no forman parte del sistema de perfiles de acceso
-- Fecha: 2025-04-24

-- Primero desasignar estos roles de cualquier usuario que los tenga
DELETE FROM user_roles WHERE roleId IN (
  SELECT id FROM roles WHERE nombre IN ('viewer', 'manager')
);

-- Luego eliminar los roles
DELETE FROM roles WHERE nombre IN ('viewer', 'manager');
