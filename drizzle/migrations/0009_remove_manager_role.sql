-- Eliminar rol obsoleto manager (referencias en user_roles y fila en roles)
DELETE FROM user_roles WHERE role_id IN (SELECT id FROM roles WHERE nombre = 'manager');
DELETE FROM roles WHERE nombre = 'manager';
