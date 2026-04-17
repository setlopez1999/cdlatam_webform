# Guía de Despliegue en Servidor (Docker)

Esta guía explica cómo actualizar el sistema en el servidor de producción después de que se han hecho cambios en el repositorio (como los nuevos catálogos dinámicos o el manejo de errores).

## 1. Conectarse al servidor

Conéctate por SSH a tu servidor de producción:

```bash
ssh usuario@tu-servidor
```

## 2. Actualizar el código

Navega a la carpeta donde está clonado el proyecto y trae los últimos cambios de la rama correcta (en este caso, `feature/single-source-of-truth` o `dev_manus` si ya hiciste merge):

```bash
cd /ruta/a/tu/proyecto/cdlatam_webform

# Asegúrate de estar en la rama correcta
git checkout feature/single-source-of-truth

# Traer los últimos cambios
git pull origin feature/single-source-of-truth
```

## 3. Configurar variables de entorno (Importante)

Asegúrate de que tu archivo `.env` en el servidor tenga la nueva variable `APP_DEBUG`. Puedes editarlo con `nano .env`:

```env
# ─── Debug ────────────────────────────────────────────────────────────────────
# true  → muestra stack trace completo en errores (solo desarrollo)
# false → muestra solo código de error genérico (usuarios finales)
APP_DEBUG=false

# Exponer al cliente Vite (para ocultar usuarios de prueba en Login)
VITE_APP_DEBUG=false
```

> **Nota:** Al poner `APP_DEBUG=false` y `VITE_APP_DEBUG=false`, los usuarios de prueba (`admin/1234`) desaparecerán de la pantalla de Login y los errores técnicos se ocultarán.

## 4. Reconstruir y levantar Docker

Como hubo cambios en las dependencias (se instaló `gsap`) y en el código fuente, es necesario reconstruir la imagen de Docker:

```bash
# Detener contenedores actuales
docker-compose down

# Reconstruir la imagen y levantar en background
docker-compose up --build -d
```

## 5. Verificar que todo funciona

Revisa los logs para asegurarte de que el servidor arrancó correctamente y la base de datos SQLite se conectó:

```bash
docker-compose logs -f web
```

Deberías ver algo como:
```
[DB] Conectando a base de datos en: ./data/gestion.db
Server running on http://0.0.0.0:3000/
```

Presiona `Ctrl+C` para salir de los logs. ¡El sistema ya está actualizado!
