-- Migración 0004: Agregar roles de perfil y gestor_horarios
-- Idempotente: INSERT OR IGNORE no falla si el rol ya existe
-- Fecha: 2025-04-24

INSERT OR IGNORE INTO `roles` (`nombre`, `label`, `descripcion`, `activo`) VALUES
  ('gestor_horarios',       'Gestor de Horarios',    'Acceso al modulo de gestion de horarios', 1),
  ('perfil_full',           'Perfil Full',           'Acceso completo: F1-Acta, F2-EP, Resultados e Implementacion', 1),
  ('perfil_ventas',         'Perfil Ventas',         'Acceso restringido unicamente al modulo F1-Acta', 1),
  ('perfil_implementacion', 'Perfil Implementacion', 'Acceso restringido unicamente al modulo de Implementacion', 1);
