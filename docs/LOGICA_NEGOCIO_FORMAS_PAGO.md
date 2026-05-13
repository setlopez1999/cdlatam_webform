# Lógica de Negocio: Formas de Pago (F1)

Este documento detalla el funcionamiento dinámico y las reglas de validación de las tablas de pago en el Acta de Aceptación.

## 1. Activación Dinámica
Las tablas de pago (**Implementación** y **Mantención**) son inteligentes y reactivas:
- **Disparador**: Se activan solo si en la sección de "Servicios Contratados" existe al menos un servicio cuyo campo `tipoVenta` contenga palabras clave como `implementacion`, `mantencion`, `impl` o `mant`.
- **Propósito**: Evitar el ruido visual en expedientes que no requieren ciertos tipos de pago.

## 2. Estructura de Cuotas (Rango 1-4)
A diferencia de versiones anteriores con campos fijos, el sistema ahora utiliza un arreglo dinámico:
- **Flexibilidad**: El usuario puede elegir entre 1 y 4 cuotas por cada fila de pago.
- **Renderizado Adaptativo**: La tabla expande o contrae sus columnas basándose en el valor máximo de `nCuotas` presente en los registros.
- **Validación de UI**: Si una fila tiene definidas 2 cuotas, los campos para la 3ra y 4ta cuota aparecerán deshabilitados y sombreados.

## 3. Validación de Integridad Financiera
El sistema realiza un cruce de datos en tiempo real:
1. **Monto de Referencia**: Se suma el total de todos los registros de servicios del tipo correspondiente (ej: Total Servicios de Implementación).
2. **Monto de Pago**: Se suma el total de todas las cuotas ingresadas en la tabla de pagos.
3. **Alerta**: Si existe una diferencia (mayor a 0.1), el sistema activa un **indicador de advertencia (Badge)** y resalta el total en naranja, informando al usuario que los pagos no cubren (o exceden) el valor de los servicios contratados.

## 4. Persistencia e Impresión (PDF)
- **Base de Datos**: Los pagos se almacenan como un objeto JSON estructurado en la tabla `actas`.
- **Exportación**: El motor de PDF (`pdfExport.ts`) replica exactamente la lógica de columnas dinámicas. Si el usuario solo utilizó 2 cuotas en la web, el PDF tendrá 2 columnas, garantizando un documento legal limpio y sin campos vacíos innecesarios.

---

## Mantenimiento Técnico
- **Frontend**: Componente `F1FormasPago.tsx`.
- **Backend Schema**: `ActaInputSchema` en `server/routers.ts`.
- **Tipos**: `FormaPago` en `client/src/features/expedientes/types.ts`.
