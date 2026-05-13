/**
 * ResultadoView — DEPRECADO
 *
 * Esta ruta (/resultado) ya no existe en el flujo nuevo.
 * Los resultados se acceden desde /expediente/:id/resultados.
 *
 * Redirige automáticamente al historial de expedientes.
 */
import { Redirect } from "wouter";

export default function ResultadoView() {
  return <Redirect to="/historial" />;
}
